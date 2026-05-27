const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Multer config for frame uploads
const frameUploadDir = path.join(__dirname, '..', 'uploads', 'frames');
if (!fs.existsSync(frameUploadDir)) fs.mkdirSync(frameUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, frameUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// All routes require auth
router.use(authMiddleware);

// GET /api/frames — list with pagination + search + filter
router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '', type = '', creatorId = '' } = req.query;
    const db = getDatabase();
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (f.name LIKE ? OR f.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (type) {
      whereClause += ' AND f.type = ?';
      params.push(type);
    }

    if (creatorId) {
      whereClause += ' AND f.creator_id = ?';
      params.push(Number(creatorId));
    }

    // Show public frames + user's own frames
    whereClause += ' AND (f.is_public = 1 OR f.creator_id = ?)';
    params.push(req.user.id);

    const total = db.prepare(`SELECT COUNT(*) as count FROM frames f ${whereClause}`).get(...params).count;
    const list = db.prepare(`
      SELECT f.*, u.name as creator_name
      FROM frames f
      LEFT JOIN users u ON f.creator_id = u.id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const listWithContent = list.map(frame => ({
      ...frame,
      content: JSON.parse(frame.content || '{}')
    }));

    res.json({
      success: true,
      data: { list: listWithContent, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (err) {
    console.error('Get frames error:', err);
    res.status(500).json({ success: false, error: '获取框架列表失败' });
  }
});

// POST /api/frames — upload frame (multipart)
router.post('/', upload.single('file'), (req, res) => {
  try {
    const { name, type, description, is_public = '1', content = '{}' } = req.body;
    const db = getDatabase();

    if (!name || !type) {
      // Clean up uploaded file if validation fails
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: '名称和类型不能为空' });
    }

    const validTypes = ['ship', 'water', 'port', 'ocean', 'channel'];
    if (!validTypes.includes(type)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: `无效的框架类型，可选: ${validTypes.join(', ')}` });
    }

    const filePath = req.file ? req.file.path.replace(/\\/g, '/') : null;

    const result = db.prepare(`
      INSERT INTO frames (name, type, is_public, creator_id, description, content, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, type, Number(is_public), req.user.id, description || null, content, filePath);

    const newFrame = db.prepare(`
      SELECT f.*, u.name as creator_name
      FROM frames f
      LEFT JOIN users u ON f.creator_id = u.id
      WHERE f.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: { ...newFrame, content: JSON.parse(newFrame.content || '{}') }, message: '框架创建成功' });
  } catch (err) {
    console.error('Create frame error:', err);
    res.status(500).json({ success: false, error: '创建框架失败' });
  }
});

// PUT /api/frames/:id — update frame metadata
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, description, is_public, content } = req.body;
    const db = getDatabase();

    const frame = db.prepare('SELECT * FROM frames WHERE id = ?').get(id);
    if (!frame) {
      return res.status(404).json({ success: false, error: '框架不存在' });
    }

    // Only creator or admin can update
    if (frame.creator_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: '没有权限修改此框架' });
    }

    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (type) {
      const validTypes = ['ship', 'water', 'port', 'ocean', 'channel'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ success: false, error: '无效的框架类型' });
      }
      updates.push('type = ?');
      values.push(type);
    }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (is_public !== undefined) { updates.push('is_public = ?'); values.push(Number(is_public)); }
    if (content !== undefined) { updates.push('content = ?'); values.push(JSON.stringify(content)); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`UPDATE frames SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updatedFrame = db.prepare(`
      SELECT f.*, u.name as creator_name
      FROM frames f
      LEFT JOIN users u ON f.creator_id = u.id
      WHERE f.id = ?
    `).get(id);

    res.json({ success: true, data: { ...updatedFrame, content: JSON.parse(updatedFrame.content || '{}') }, message: '框架更新成功' });
  } catch (err) {
    console.error('Update frame error:', err);
    res.status(500).json({ success: false, error: '更新框架失败' });
  }
});

// POST /api/frames/:id/copy — duplicate a frame
router.post('/:id/copy', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const frame = db.prepare('SELECT * FROM frames WHERE id = ?').get(id);
    if (!frame) {
      return res.status(404).json({ success: false, error: '框架不存在' });
    }

    const result = db.prepare(`
      INSERT INTO frames (name, type, is_public, creator_id, description, content, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `${frame.name} (副本)`,
      frame.type,
      0, // Private by default
      req.user.id,
      frame.description,
      frame.content,
      frame.file_path
    );

    const newFrame = db.prepare(`
      SELECT f.*, u.name as creator_name
      FROM frames f
      LEFT JOIN users u ON f.creator_id = u.id
      WHERE f.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: { ...newFrame, content: JSON.parse(newFrame.content || '{}') }, message: '框架复制成功' });
  } catch (err) {
    console.error('Copy frame error:', err);
    res.status(500).json({ success: false, error: '复制框架失败' });
  }
});

// GET /api/frames/:id — get single frame detail
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const frame = db.prepare(`
      SELECT f.*, u.name as creator_name
      FROM frames f
      LEFT JOIN users u ON f.creator_id = u.id
      WHERE f.id = ?
    `).get(id);

    if (!frame) {
      return res.status(404).json({ success: false, error: '框架不存在' });
    }

    res.json({ success: true, data: { ...frame, content: JSON.parse(frame.content || '{}') } });
  } catch (err) {
    console.error('Get frame error:', err);
    res.status(500).json({ success: false, error: '获取框架详情失败' });
  }
});

// DELETE /api/frames/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const frame = db.prepare('SELECT * FROM frames WHERE id = ?').get(id);
    if (!frame) {
      return res.status(404).json({ success: false, error: '框架不存在' });
    }

    // Only creator or admin can delete
    if (frame.creator_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: '没有权限删除此框架' });
    }

    // Check if frame is used by any reports
    const usedByReports = db.prepare('SELECT COUNT(*) as count FROM reports WHERE frame_id = ?').get(id);
    if (usedByReports.count > 0) {
      return res.status(400).json({ success: false, error: '该框架正在被报告使用，无法删除' });
    }

    // Delete file if exists
    if (frame.file_path && fs.existsSync(frame.file_path)) {
      fs.unlinkSync(frame.file_path);
    }

    db.prepare('DELETE FROM frames WHERE id = ?').run(id);

    res.json({ success: true, message: '框架已删除' });
  } catch (err) {
    console.error('Delete frame error:', err);
    res.status(500).json({ success: false, error: '删除框架失败' });
  }
});

module.exports = router;
