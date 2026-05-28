const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Multer config for guide uploads
const guideUploadDir = path.join(__dirname, '..', 'uploads', 'guides');
if (!fs.existsSync(guideUploadDir)) fs.mkdirSync(guideUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, guideUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.doc', '.docx', '.pdf', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件格式: ${ext}。允许格式: ${allowedExts.join(', ')}`));
    }
  }
});

// All routes require auth
router.use(authMiddleware);

// GET /api/guides — 获取指南列表（默认只显示最新版本，?all=true 显示全部历史版本）
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { all, type } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (type) {
      whereClause += ' AND g.type = ?';
      params.push(type);
    }

    // 默认只显示每个名称的最新版本
    if (all !== 'true') {
      whereClause += ' AND g.is_current = 1';
    }

    const list = db.prepare(`
      SELECT g.*, u.name as uploader_name
      FROM guides g
      LEFT JOIN users u ON g.uploader_id = u.id
      ${whereClause}
      ORDER BY g.name ASC, g.version DESC
    `).all(...params);

    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Get guides error:', err);
    res.status(500).json({ success: false, error: '获取指南列表失败' });
  }
});

// GET /api/guides/:id/versions — 获取某个指南的所有历史版本
router.get('/:id/versions', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const guide = db.prepare('SELECT * FROM guides WHERE id = ?').get(id);
    if (!guide) {
      return res.status(404).json({ success: false, error: '指南不存在' });
    }

    const versions = db.prepare(`
      SELECT g.*, u.name as uploader_name
      FROM guides g
      LEFT JOIN users u ON g.uploader_id = u.id
      WHERE g.name = ?
      ORDER BY g.version DESC
    `).all(guide.name);

    res.json({ success: true, data: versions });
  } catch (err) {
    console.error('Get guide versions error:', err);
    res.status(500).json({ success: false, error: '获取版本历史失败' });
  }
});

// POST /api/guides — 上传指南（自动版本管理：同名文件自动递增版本号）
router.post('/', upload.single('file'), (req, res) => {
  try {
    const { name, type, description } = req.body;
    const db = getDatabase();

    if (!name) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: '指南名称不能为空' });
    }

    const filePath = req.file ? req.file.path.replace(/\\/g, '/') : null;

    // 查找同名指南的最新版本号
    const latest = db.prepare(`
      SELECT MAX(version) as max_version FROM guides WHERE name = ?
    `).get(name);
    const newVersion = (latest?.max_version || 0) + 1;

    // 将同名旧版本标记为非当前版本
    db.prepare('UPDATE guides SET is_current = 0 WHERE name = ?').run(name);

    const result = db.prepare(`
      INSERT INTO guides (name, type, file_path, description, uploader_id, version, is_current)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(name, type || null, filePath, description || null, req.user.id, newVersion);

    const newGuide = db.prepare(`
      SELECT g.*, u.name as uploader_name
      FROM guides g
      LEFT JOIN users u ON g.uploader_id = u.id
      WHERE g.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: newGuide, message: `指南上传成功（版本 v${newVersion}）` });
  } catch (err) {
    console.error('Create guide error:', err);
    res.status(500).json({ success: false, error: '创建指南失败' });
  }
});

// GET /api/guides/:id/download — 下载指南文件
router.get('/:id/download', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const guide = db.prepare('SELECT * FROM guides WHERE id = ?').get(id);
    if (!guide) {
      return res.status(404).json({ success: false, error: '指南不存在' });
    }

    if (!guide.file_path || !fs.existsSync(guide.file_path)) {
      return res.status(404).json({ success: false, error: '指南文件不存在' });
    }

    const ext = path.extname(guide.file_path);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(guide.name + '_v' + guide.version + ext)}"`);
    res.sendFile(path.resolve(guide.file_path));
  } catch (err) {
    console.error('Download guide error:', err);
    res.status(500).json({ success: false, error: '下载指南失败' });
  }
});

// DELETE /api/guides/:id — 删除指南（如果有历史版本，恢复上一个版本为当前版本）
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const guide = db.prepare('SELECT * FROM guides WHERE id = ?').get(id);
    if (!guide) {
      return res.status(404).json({ success: false, error: '指南不存在' });
    }

    // 删除文件
    if (guide.file_path && fs.existsSync(guide.file_path)) {
      fs.unlinkSync(guide.file_path);
    }

    db.prepare('DELETE FROM guides WHERE id = ?').run(id);

    // 如果删除的是当前版本，将上一个版本标记为当前版本
    if (guide.is_current) {
      const prevVersion = db.prepare(`
        SELECT id FROM guides WHERE name = ? AND id != ? ORDER BY version DESC LIMIT 1
      `).get(guide.name, id);
      if (prevVersion) {
        db.prepare('UPDATE guides SET is_current = 1 WHERE id = ?').run(prevVersion.id);
      }
    }

    res.json({ success: true, message: '指南已删除' });
  } catch (err) {
    console.error('Delete guide error:', err);
    res.status(500).json({ success: false, error: '删除指南失败' });
  }
});

module.exports = router;
