const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { generatePDF, generateDOCX } = require('../utils/export');

const router = express.Router();

// Multer config for report images
const imageUploadDir = path.join(__dirname, '..', 'uploads', 'report-images');
if (!fs.existsSync(imageUploadDir)) fs.mkdirSync(imageUploadDir, { recursive: true });

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imageUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});
const uploadImages = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持图片格式: jpg, jpeg, png, gif, bmp, webp'));
    }
  }
});

// All routes require auth
router.use(authMiddleware);

// GET /api/reports — list with pagination + search + filter
router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '', status = '', type = '', creatorId = '' } = req.query;
    const db = getDatabase();
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (r.name LIKE ? OR r.code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }

    if (type) {
      whereClause += ' AND r.type = ?';
      params.push(type);
    }

    if (creatorId) {
      whereClause += ' AND r.creator_id = ?';
      params.push(Number(creatorId));
    }

    // Engineers see their own + team reports; managers/chiefs/admins see all
    if (req.user.role === 'engineer') {
      whereClause += ' AND (r.creator_id = ? OR r.id IN (SELECT rm.report_id FROM report_members rm WHERE rm.user_id = ?))';
      params.push(req.user.id, req.user.id);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM reports r ${whereClause}`).get(...params).count;
    const list = db.prepare(`
      SELECT r.*, u.name as creator_name, f.name as frame_name
      FROM reports r
      LEFT JOIN users u ON r.creator_id = u.id
      LEFT JOIN frames f ON r.frame_id = f.id
      ${whereClause}
      ORDER BY r.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    // Get member count for each report
    const listWithMembers = list.map(report => {
      const memberCount = db.prepare('SELECT COUNT(*) as count FROM report_members WHERE report_id = ?').get(report.id).count;
      const imageCount = db.prepare('SELECT COUNT(*) as count FROM report_images WHERE report_id = ?').get(report.id).count;
      return {
        ...report,
        content: JSON.parse(report.content || '{}'),
        member_count: memberCount,
        image_count: imageCount
      };
    });

    res.json({
      success: true,
      data: { list: listWithMembers, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ success: false, error: '获取报告列表失败' });
  }
});

// POST /api/reports — create new report
router.post('/', (req, res) => {
  try {
    const { name, type, frame_id, review_level = '3' } = req.body;
    const db = getDatabase();

    if (!name || !type) {
      return res.status(400).json({ success: false, error: '报告名称和类型不能为空' });
    }

    const validTypes = ['ship', 'water', 'port', 'ocean', 'channel'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: '无效的报告类型' });
    }

    // Generate report code
    const year = new Date().getFullYear();
    const lastReport = db.prepare(`
      SELECT code FROM reports WHERE code LIKE ? ORDER BY id DESC LIMIT 1
    `).get(`FZ-${year}-%`);

    let seq = 1;
    if (lastReport) {
      const parts = lastReport.code.split('-');
      seq = Number(parts[2]) + 1;
    }
    const code = `FZ-${year}-${String(seq).padStart(3, '0')}`;

    const result = db.prepare(`
      INSERT INTO reports (code, name, type, creator_id, frame_id, status, review_level, content)
      VALUES (?, ?, ?, ?, ?, 'draft', ?, '{}')
    `).run(code, name, type, req.user.id, frame_id || null, review_level);

    // Add creator as team member
    db.prepare('INSERT INTO report_members (report_id, user_id) VALUES (?, ?)').run(result.lastInsertRowid, req.user.id);

    const newReport = db.prepare(`
      SELECT r.*, u.name as creator_name
      FROM reports r
      LEFT JOIN users u ON r.creator_id = u.id
      WHERE r.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: { ...newReport, content: JSON.parse(newReport.content || '{}') }, message: '报告创建成功' });
  } catch (err) {
    console.error('Create report error:', err);
    res.status(500).json({ success: false, error: '创建报告失败' });
  }
});

// GET /api/reports/:id — get report detail
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const report = db.prepare(`
      SELECT r.*, u.name as creator_name, f.name as frame_name, f.type as frame_type
      FROM reports r
      LEFT JOIN users u ON r.creator_id = u.id
      LEFT JOIN frames f ON r.frame_id = f.id
      WHERE r.id = ?
    `).get(id);

    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }

    // Get team members
    const members = db.prepare(`
      SELECT u.id, u.name, u.phone, u.role, rm.joined_at
      FROM report_members rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.report_id = ?
      ORDER BY rm.joined_at
    `).all(id);

    // Get images
    const images = db.prepare(`
      SELECT * FROM report_images WHERE report_id = ? ORDER BY created_at DESC
    `).all(id);

    // Get reviews
    const reviews = db.prepare(`
      SELECT rv.*, u.name as reviewer_name, u.role as reviewer_role
      FROM reviews rv
      LEFT JOIN users u ON rv.reviewer_id = u.id
      WHERE rv.report_id = ?
      ORDER BY rv.level, rv.created_at DESC
    `).all(id);

    res.json({
      success: true,
      data: {
        ...report,
        content: JSON.parse(report.content || '{}'),
        members,
        images,
        reviews
      }
    });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ success: false, error: '获取报告详情失败' });
  }
});

// PUT /api/reports/:id — save report content
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, content } = req.body;
    const db = getDatabase();

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }

    if (report.status !== 'draft' && report.status !== 'revise') {
      return res.status(400).json({ success: false, error: '当前状态不允许编辑' });
    }

    const reportContent = content || {};
    const contentFields = Object.keys(reportContent).length;
    const progress = Math.min(100, Math.round((contentFields / 10) * 100));

    if (name) {
      db.prepare(`
        UPDATE reports SET name = ?, content = ?, progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(name, JSON.stringify(reportContent), Math.max(progress, 10), id);
    } else {
      db.prepare(`
        UPDATE reports SET content = ?, progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(JSON.stringify(reportContent), Math.max(progress, 10), id);
    }

    const updatedReport = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);

    res.json({
      success: true,
      data: { ...updatedReport, content: JSON.parse(updatedReport.content || '{}') },
      message: '报告保存成功'
    });
  } catch (err) {
    console.error('Save report error:', err);
    res.status(500).json({ success: false, error: '保存报告失败' });
  }
});

// POST /api/reports/:id/submit — submit for review
router.post('/:id/submit', (req, res) => {
  try {
    const { id } = req.params;
    const { reviewers = [], description = '' } = req.body;
    const db = getDatabase();

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }

    if (report.status !== 'draft' && report.status !== 'revise') {
      return res.status(400).json({ success: false, error: '当前状态不允许提交' });
    }

    // Update report status
    db.prepare(`
      UPDATE reports SET status = 'pending', progress = 100, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);

    // Save review level settings if reviewers provided
    if (reviewers.length > 0) {
      const levelCount = req.body.levelCount || 3;
      db.prepare(`
        INSERT INTO review_levels (report_id, level_count, reviewers)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET level_count = ?, reviewers = ?, updated_at = CURRENT_TIMESTAMP
      `).run(id, levelCount, JSON.stringify(reviewers), levelCount, JSON.stringify(reviewers));
    }

    res.json({ success: true, message: '报告已提交审核' });
  } catch (err) {
    console.error('Submit report error:', err);
    res.status(500).json({ success: false, error: '提交报告失败' });
  }
});

// POST /api/reports/:id/withdraw — withdraw from review
router.post('/:id/withdraw', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }

    if (!['pending', 'reviewing', 'revise'].includes(report.status)) {
      return res.status(400).json({ success: false, error: '当前状态不允许撤回' });
    }

    db.prepare(`
      UPDATE reports SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);

    res.json({ success: true, message: '报告已撤回' });
  } catch (err) {
    console.error('Withdraw report error:', err);
    res.status(500).json({ success: false, error: '撤回报告失败' });
  }
});

// GET /api/reports/:id/export — export report
router.get('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'json', watermark = 'false', watermarkText = '福建港航船舶报告' } = req.query;
    const db = getDatabase();

    const report = db.prepare(`
      SELECT r.*, u.name as creator_name
      FROM reports r
      LEFT JOIN users u ON r.creator_id = u.id
      WHERE r.id = ?
    `).get(id);

    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }

    const members = db.prepare(`
      SELECT u.id, u.name, u.phone, u.role FROM report_members rm
      JOIN users u ON rm.user_id = u.id WHERE rm.report_id = ?
    `).all(id);

    const images = db.prepare('SELECT * FROM report_images WHERE report_id = ?').all(id);
    const reviews = db.prepare(`
      SELECT rv.*, u.name as reviewer_name FROM reviews rv
      LEFT JOIN users u ON rv.reviewer_id = u.id WHERE rv.report_id = ?
    `).all(id);

    const exportData = {
      ...report,
      content: JSON.parse(report.content || '{}'),
      members,
      images,
      reviews,
      exported_at: new Date().toISOString()
    };

    const options = {
      watermark: watermark === 'true',
      watermarkText
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${report.code}.json"`);
      return res.json({ success: true, data: exportData });
    }

    if (format === 'pdf') {
      const pdfBuffer = await generatePDF(exportData, options);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${report.code}.pdf"`);
      return res.send(pdfBuffer);
    }

    if (format === 'docx') {
      const docxBuffer = await generateDOCX(exportData, options);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${report.code}.docx"`);
      return res.send(docxBuffer);
    }

    if (format === 'html') {
      const content = exportData.content || {};
      const typeName = { ship: '船舶勘验报告', water: '水土保持监测报告', port: '港口工程报告', ocean: '海洋环境影响评价报告', channel: '航道通航条件影响评价报告' }[report.type] || report.type;
      
      let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${report.name}</title><style>
        body { font-family: 'Microsoft YaHei', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        h1 { text-align: center; color: #0A3D62; } h2 { color: #1E5A8A; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        .meta { text-align: center; color: #666; margin-bottom: 20px; } .section { margin: 20px 0; }
        .watermark { text-align: center; color: #999; font-size: 12px; }
      </style></head><body>`;
      
      html += `<h1>${report.name || '报告'}</h1>`;
      html += `<div class="meta">报告编号: ${report.code} | 类型: ${typeName} | 编制者: ${report.creator_name}</div>`;
      
      if (options.watermark) {
        html += `<div class="watermark">${options.watermarkText}</div>`;
      }
      
      if (content.shipName) {
        html += `<div class="section"><h2>船舶基本信息</h2>`;
        html += `<p>船舶名称: ${content.shipName}</p><p>船舶类型: ${content.shipType}</p>`;
        html += `<p>建造日期: ${content.buildDate}</p><p>总吨位: ${content.tonnage}</p></div>`;
      }
      
      if (content.projectBackground) html += `<div class="section"><h2>项目背景</h2><p>${content.projectBackground}</p></div>`;
      if (content.inspectionPurpose) html += `<div class="section"><h2>勘验目的</h2><p>${content.inspectionPurpose}</p></div>`;
      if (content.hullStructure) html += `<div class="section"><h2>船体结构检查</h2><p>${content.hullStructure}</p></div>`;
      if (content.engineEquipment) html += `<div class="section"><h2>轮机设备检查</h2><p>${content.engineEquipment}</p></div>`;
      if (content.electricalEquipment) html += `<div class="section"><h2>电气设备检查</h2><p>${content.electricalEquipment}</p></div>`;
      if (content.inspectionConclusion) html += `<div class="section"><h2>勘验结论</h2><p>${content.inspectionConclusion}</p></div>`;
      if (content.recommendations) html += `<div class="section"><h2>建议措施</h2><p>${content.recommendations}</p></div>`;
      
      if (members.length > 0) {
        html += `<div class="section"><h2>团队成员</h2>`;
        members.forEach(m => html += `<p>${m.name} (${m.role})</p>`);
        html += `</div>`;
      }
      
      if (reviews.length > 0) {
        html += `<div class="section"><h2>审核记录</h2>`;
        reviews.forEach(r => {
          const resultText = r.result === 'approved' ? '通过' : r.result === 'rejected' ? '退回' : '待审核';
          html += `<p>${r.reviewer_name} - ${resultText}</p>`;
          if (r.comment) html += `<p style="color:#666">意见: ${r.comment}</p>`;
        });
        html += `</div>`;
      }
      
      html += `<p style="text-align:right;color:#999">导出时间: ${new Date().toLocaleString('zh-CN')}</p>`;
      html += `</body></html>`;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${report.code}.html"`);
      return res.send(html);
    }

    res.status(400).json({ success: false, error: `不支持的导出格式: ${format}` });
  } catch (err) {
    console.error('Export report error:', err);
    res.status(500).json({ success: false, error: '导出报告失败' });
  }
});

// POST /api/reports/:id/images — upload images (max 9)
router.post('/:id/images', uploadImages.array('images', 9), (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!report) {
      // Clean up uploaded files
      if (req.files) req.files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
      return res.status(404).json({ success: false, error: '报告不存在' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: '请上传至少一张图片' });
    }

    // Check current image count
    const currentCount = db.prepare('SELECT COUNT(*) as count FROM report_images WHERE report_id = ?').get(id).count;
    if (currentCount + req.files.length > 9) {
      req.files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
      return res.status(400).json({ success: false, error: '每个报告最多上传9张图片' });
    }

    const insertImage = db.prepare(`
      INSERT INTO report_images (report_id, name, url) VALUES (?, ?, ?)
    `);

    const insertedImages = [];
    const insertMany = db.transaction((files) => {
      for (const file of files) {
        const result = insertImage.run(id, file.originalname, file.path.replace(/\\/g, '/'));
        insertedImages.push({
          id: result.lastInsertRowid,
          name: file.originalname,
          url: file.path.replace(/\\/g, '/'),
          report_id: Number(id)
        });
      }
    });
    insertMany(req.files);

    res.status(201).json({ success: true, data: insertedImages, message: `成功上传${insertedImages.length}张图片` });
  } catch (err) {
    console.error('Upload images error:', err);
    res.status(500).json({ success: false, error: '上传图片失败' });
  }
});

// DELETE /api/reports/:id/images/:imageId
router.delete('/:id/images/:imageId', (req, res) => {
  try {
    const { id, imageId } = req.params;
    const db = getDatabase();

    const image = db.prepare('SELECT * FROM report_images WHERE id = ? AND report_id = ?').get(imageId, id);
    if (!image) {
      return res.status(404).json({ success: false, error: '图片不存在' });
    }

    // Delete file
    if (image.url && fs.existsSync(image.url)) {
      fs.unlinkSync(image.url);
    }

    db.prepare('DELETE FROM report_images WHERE id = ?').run(imageId);

    res.json({ success: true, message: '图片已删除' });
  } catch (err) {
    console.error('Delete image error:', err);
    res.status(500).json({ success: false, error: '删除图片失败' });
  }
});

// GET /api/reports/:id/images/:imageId — get single image
router.get('/:id/images/:imageId', (req, res) => {
  try {
    const { id, imageId } = req.params;
    const db = getDatabase();

    const image = db.prepare('SELECT * FROM report_images WHERE id = ? AND report_id = ?').get(imageId, id);
    if (!image) {
      return res.status(404).json({ success: false, error: '图片不存在' });
    }

    if (!image.url || !fs.existsSync(image.url)) {
      return res.status(404).json({ success: false, error: '图片文件不存在' });
    }

    res.sendFile(path.resolve(image.url));
  } catch (err) {
    console.error('Get image error:', err);
    res.status(500).json({ success: false, error: '获取图片失败' });
  }
});

// PUT /api/reports/:id/images/:imageId — update image description
router.put('/:id/images/:imageId', (req, res) => {
  try {
    const { id, imageId } = req.params;
    const { description } = req.body;
    const db = getDatabase();

    const image = db.prepare('SELECT * FROM report_images WHERE id = ? AND report_id = ?').get(imageId, id);
    if (!image) {
      return res.status(404).json({ success: false, error: '图片不存在' });
    }

    db.prepare('UPDATE report_images SET description = ? WHERE id = ?').run(description || '', imageId);

    res.json({ success: true, message: '图片描述已更新' });
  } catch (err) {
    console.error('Update image error:', err);
    res.status(500).json({ success: false, error: '更新图片失败' });
  }
});

// PUT /api/reports/:id/team — update team members
router.put('/:id/team', (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds = [] } = req.body;
    const db = getDatabase();

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }

    // Creator must always be in the team
    if (!memberIds.includes(report.creator_id)) {
      memberIds.push(report.creator_id);
    }

    // Validate user IDs
    const validUsers = db.prepare(`SELECT id FROM users WHERE id IN (${memberIds.map(() => '?').join(',')}) AND status = 'active'`).all(...memberIds);
    const validIds = validUsers.map(u => u.id);

    // Replace team members
    db.prepare('DELETE FROM report_members WHERE report_id = ?').run(id);

    const insertMember = db.prepare('INSERT INTO report_members (report_id, user_id) VALUES (?, ?)');
    const insertMany = db.transaction((ids) => {
      for (const uid of ids) {
        insertMember.run(id, uid);
      }
    });
    insertMany(validIds);

    // Return updated members
    const members = db.prepare(`
      SELECT u.id, u.name, u.phone, u.role, rm.joined_at
      FROM report_members rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.report_id = ?
      ORDER BY rm.joined_at
    `).all(id);

    res.json({ success: true, data: members, message: '团队成员更新成功' });
  } catch (err) {
    console.error('Update team error:', err);
    res.status(500).json({ success: false, error: '更新团队成员失败' });
  }
});

// DELETE /api/reports/:id — delete a report (must be last to avoid route conflicts)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log('Delete report request:', { id, user: req.user.id, role: req.user.role });
    const db = getDatabase();

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    console.log('Found report:', report);
    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }

    // Only creator or admin can delete
    if (report.creator_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: '没有权限删除此报告' });
    }

    // Non-admin users can only delete draft reports
    if (req.user.role !== 'admin' && report.status !== 'draft') {
      return res.status(400).json({ success: false, error: '只有编制中的报告可以删除' });
    }

    // Delete related data
    db.prepare('DELETE FROM report_members WHERE report_id = ?').run(id);
    db.prepare('DELETE FROM report_images WHERE report_id = ?').run(id);
    db.prepare('DELETE FROM reviews WHERE report_id = ?').run(id);
    db.prepare('DELETE FROM review_levels WHERE report_id = ?').run(id);

    // Delete report
    db.prepare('DELETE FROM reports WHERE id = ?').run(id);
    console.log('Report deleted successfully:', id);

    res.json({ success: true, message: '报告已删除' });
  } catch (err) {
    console.error('Delete report error:', err);
    res.status(500).json({ success: false, error: '删除报告失败' });
  }
});

module.exports = router;
