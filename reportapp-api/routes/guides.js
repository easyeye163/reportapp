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
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// All routes require auth
router.use(authMiddleware);

// GET /api/guides
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const list = db.prepare(`
      SELECT g.*, u.name as uploader_name
      FROM guides g
      LEFT JOIN users u ON g.uploader_id = u.id
      ORDER BY g.created_at DESC
    `).all();

    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Get guides error:', err);
    res.status(500).json({ success: false, error: '获取指南列表失败' });
  }
});

// POST /api/guides
router.post('/', upload.single('file'), (req, res) => {
  try {
    const { name, type, description } = req.body;
    const db = getDatabase();

    if (!name) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: '指南名称不能为空' });
    }

    const filePath = req.file ? req.file.path.replace(/\\/g, '/') : null;

    const result = db.prepare(`
      INSERT INTO guides (name, type, file_path, description, uploader_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, type || null, filePath, description || null, req.user.id);

    const newGuide = db.prepare(`
      SELECT g.*, u.name as uploader_name
      FROM guides g
      LEFT JOIN users u ON g.uploader_id = u.id
      WHERE g.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: newGuide, message: '指南创建成功' });
  } catch (err) {
    console.error('Create guide error:', err);
    res.status(500).json({ success: false, error: '创建指南失败' });
  }
});

module.exports = router;
