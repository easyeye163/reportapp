const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Multer config for case uploads
const caseUploadDir = path.join(__dirname, '..', 'uploads', 'cases');
if (!fs.existsSync(caseUploadDir)) fs.mkdirSync(caseUploadDir, { recursive: true });

const caseStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, caseUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});
const uploadCase = multer({ storage: caseStorage, limits: { fileSize: 100 * 1024 * 1024 } });

// Multer config for standard uploads
const standardUploadDir = path.join(__dirname, '..', 'uploads', 'standards');
if (!fs.existsSync(standardUploadDir)) fs.mkdirSync(standardUploadDir, { recursive: true });

const standardStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, standardUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});
const uploadStandard = multer({ storage: standardStorage, limits: { fileSize: 100 * 1024 * 1024 } });

// All routes require auth
router.use(authMiddleware);

// ===== CASES =====
// 注意：带 :id 参数的路由必须定义在不带参数的路由之后，
// 但 /cases/:id 和 /standards/:id 使用不同的路径前缀，不会冲突。
// 关键修复：将 /cases/:id 和 /cases/:id/download 提前到 /standards 路由之前。

// GET /api/cases
router.get('/cases', (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '', business_type = '' } = req.query;
    const db = getDatabase();
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (c.name LIKE ? OR c.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (business_type) {
      whereClause += ' AND c.business_type = ?';
      params.push(business_type);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM cases c ${whereClause}`).get(...params).count;
    const list = db.prepare(`
      SELECT c.*, u.name as uploader_name
      FROM cases c
      LEFT JOIN users u ON c.uploader_id = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (err) {
    console.error('Get cases error:', err);
    res.status(500).json({ success: false, error: '获取案例列表失败' });
  }
});

// POST /api/cases
router.post('/cases', uploadCase.single('file'), (req, res) => {
  try {
    const { name, business_type, description } = req.body;
    const db = getDatabase();

    if (!name) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: '案例名称不能为空' });
    }

    const filePath = req.file ? req.file.path.replace(/\\/g, '/') : null;

    const result = db.prepare(`
      INSERT INTO cases (name, business_type, uploader_id, file_path, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, business_type || null, req.user.id, filePath, description || null);

    const newCase = db.prepare(`
      SELECT c.*, u.name as uploader_name FROM cases c
      LEFT JOIN users u ON c.uploader_id = u.id WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: newCase, message: '案例创建成功' });
  } catch (err) {
    console.error('Create case error:', err);
    res.status(500).json({ success: false, error: '创建案例失败' });
  }
});

// GET /api/cases/:id — get case detail for preview（必须在 DELETE /cases/:id 之前）
router.get('/cases/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const caseItem = db.prepare(`
      SELECT c.*, u.name as uploader_name
      FROM cases c
      LEFT JOIN users u ON c.uploader_id = u.id
      WHERE c.id = ?
    `).get(id);

    if (!caseItem) {
      return res.status(404).json({ success: false, error: '案例不存在' });
    }

    res.json({ success: true, data: caseItem });
  } catch (err) {
    console.error('Get case detail error:', err);
    res.status(500).json({ success: false, error: '获取案例详情失败' });
  }
});

// GET /api/cases/:id/download — download case file
router.get('/cases/:id/download', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const caseItem = db.prepare('SELECT * FROM cases WHERE id = ?').get(id);
    if (!caseItem) {
      return res.status(404).json({ success: false, error: '案例不存在' });
    }

    if (!caseItem.file_path || !fs.existsSync(caseItem.file_path)) {
      return res.status(404).json({ success: false, error: '该案例暂无上传文件，无法下载' });
    }

    const ext = path.extname(caseItem.file_path);
    const mimeType = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed'
    };

    res.setHeader('Content-Type', mimeType[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(caseItem.name + ext)}"`);
    res.sendFile(path.resolve(caseItem.file_path));
  } catch (err) {
    console.error('Download case error:', err);
    res.status(500).json({ success: false, error: '下载案例失败' });
  }
});

// DELETE /api/cases/:id
router.delete('/cases/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const caseItem = db.prepare('SELECT * FROM cases WHERE id = ?').get(id);
    if (!caseItem) {
      return res.status(404).json({ success: false, error: '案例不存在' });
    }

    if (caseItem.uploader_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: '没有权限删除此案例' });
    }

    if (caseItem.file_path && fs.existsSync(caseItem.file_path)) {
      fs.unlinkSync(caseItem.file_path);
    }

    db.prepare('DELETE FROM cases WHERE id = ?').run(id);

    res.json({ success: true, message: '案例已删除' });
  } catch (err) {
    console.error('Delete case error:', err);
    res.status(500).json({ success: false, error: '删除案例失败' });
  }
});

// ===== STANDARDS =====

// GET /api/standards
router.get('/standards', (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '', standard_type = '' } = req.query;
    const db = getDatabase();
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (s.name LIKE ? OR s.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (standard_type) {
      whereClause += ' AND s.standard_type = ?';
      params.push(standard_type);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM standards s ${whereClause}`).get(...params).count;
    const list = db.prepare(`
      SELECT s.*, u.name as uploader_name
      FROM standards s
      LEFT JOIN users u ON s.uploader_id = u.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (err) {
    console.error('Get standards error:', err);
    res.status(500).json({ success: false, error: '获取标准列表失败' });
  }
});

// POST /api/standards
router.post('/standards', uploadStandard.single('file'), (req, res) => {
  try {
    const { name, standard_type, description } = req.body;
    const db = getDatabase();

    if (!name) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: '标准名称不能为空' });
    }

    const filePath = req.file ? req.file.path.replace(/\\/g, '/') : null;

    const result = db.prepare(`
      INSERT INTO standards (name, standard_type, uploader_id, file_path, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, standard_type || null, req.user.id, filePath, description || null);

    const newStandard = db.prepare(`
      SELECT s.*, u.name as uploader_name FROM standards s
      LEFT JOIN users u ON s.uploader_id = u.id WHERE s.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: newStandard, message: '标准创建成功' });
  } catch (err) {
    console.error('Create standard error:', err);
    res.status(500).json({ success: false, error: '创建标准失败' });
  }
});

// PUT /api/standards/:id/status
router.put('/standards/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const db = getDatabase();

    if (!['现行', '作废', '废止'].includes(status)) {
      return res.status(400).json({ success: false, error: '无效的状态' });
    }

    const standard = db.prepare('SELECT * FROM standards WHERE id = ?').get(id);
    if (!standard) {
      return res.status(404).json({ success: false, error: '标准不存在' });
    }

    db.prepare('UPDATE standards SET status = ? WHERE id = ?').run(status, id);

    res.json({ success: true, data: { id, status }, message: '标准状态已更新' });
  } catch (err) {
    console.error('Update standard status error:', err);
    res.status(500).json({ success: false, error: '更新标准状态失败' });
  }
});

// DELETE /api/standards/:id
router.delete('/standards/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const standard = db.prepare('SELECT * FROM standards WHERE id = ?').get(id);
    if (!standard) {
      return res.status(404).json({ success: false, error: '标准不存在' });
    }

    if (standard.uploader_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: '没有权限删除此标准' });
    }

    if (standard.file_path && fs.existsSync(standard.file_path)) {
      fs.unlinkSync(standard.file_path);
    }

    db.prepare('DELETE FROM standards WHERE id = ?').run(id);

    res.json({ success: true, message: '标准已删除' });
  } catch (err) {
    console.error('Delete standard error:', err);
    res.status(500).json({ success: false, error: '删除标准失败' });
  }
});

// GET /api/standards/:id — get standard detail for preview
router.get('/standards/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const standard = db.prepare(`
      SELECT s.*, u.name as uploader_name
      FROM standards s
      LEFT JOIN users u ON s.uploader_id = u.id
      WHERE s.id = ?
    `).get(id);

    if (!standard) {
      return res.status(404).json({ success: false, error: '标准不存在' });
    }

    res.json({ success: true, data: standard });
  } catch (err) {
    console.error('Get standard detail error:', err);
    res.status(500).json({ success: false, error: '获取标准详情失败' });
  }
});

// GET /api/standards/:id/download — download standard file
router.get('/standards/:id/download', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const standard = db.prepare('SELECT * FROM standards WHERE id = ?').get(id);
    if (!standard) {
      return res.status(404).json({ success: false, error: '标准不存在' });
    }

    if (!standard.file_path || !fs.existsSync(standard.file_path)) {
      return res.status(404).json({ success: false, error: '该标准暂无上传文件，无法下载' });
    }

    const ext = path.extname(standard.file_path);
    const mimeType = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed'
    };

    res.setHeader('Content-Type', mimeType[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(standard.name + ext)}"`);
    res.sendFile(path.resolve(standard.file_path));
  } catch (err) {
    console.error('Download standard error:', err);
    res.status(500).json({ success: false, error: '下载标准失败' });
  }
});

module.exports = router;
