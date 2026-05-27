const express = require('express');
const { getDatabase } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/archives — list archived reports
router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '', type = '' } = req.query;
    const db = getDatabase();
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let whereClause = "WHERE r.status = 'archived'";
    const params = [];

    if (search) {
      whereClause += ' AND (r.name LIKE ? OR r.code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (type) {
      whereClause += ' AND r.type = ?';
      params.push(type);
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

    const listWithDetails = list.map(report => ({
      ...report,
      content: JSON.parse(report.content || '{}')
    }));

    res.json({
      success: true,
      data: { list: listWithDetails, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (err) {
    console.error('Get archives error:', err);
    res.status(500).json({ success: false, error: '获取归档列表失败' });
  }
});

// GET /api/archives/:id/download — download archive as DOCX/PDF/JSON
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'docx' } = req.query;
    const db = getDatabase();

    const report = db.prepare(`
      SELECT r.*, u.name as creator_name
      FROM reports r
      LEFT JOIN users u ON r.creator_id = u.id
      WHERE r.id = ? AND r.status = 'archived'
    `).get(id);

    if (!report) {
      return res.status(404).json({ success: false, error: '归档报告不存在' });
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

    const archiveData = {
      ...report,
      content: JSON.parse(report.content || '{}'),
      members,
      images,
      reviews,
      archived_at: new Date().toISOString()
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="archive-${report.code}.json"`);
      return res.json({ success: true, data: archiveData });
    }

    if (format === 'pdf') {
      const { generatePDF } = require('../utils/export');
      const pdfBuffer = await generatePDF(archiveData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="archive-${report.code}.pdf"`);
      return res.send(pdfBuffer);
    }

    // 默认导出 DOCX
    const { generateDOCX } = require('../utils/export');
    const docxBuffer = await generateDOCX(archiveData);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="archive-${report.code}.docx"`);
    return res.send(docxBuffer);
  } catch (err) {
    console.error('Download archive error:', err);
    res.status(500).json({ success: false, error: '下载归档失败' });
  }
});

module.exports = router;
