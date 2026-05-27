const express = require('express');
const { getDatabase } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const db = getDatabase();
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const total = db.prepare('SELECT COUNT(*) as count FROM operation_logs WHERE user_id = ?').get(req.user.id).count;
    const list = db.prepare(`
      SELECT ol.*, u.name as user_name
      FROM operation_logs ol
      LEFT JOIN users u ON ol.user_id = u.id
      WHERE ol.user_id = ?
      ORDER BY ol.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user.id, limit, offset);

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (err) {
    console.error('Get operation logs error:', err);
    res.status(500).json({ success: false, error: '获取操作日志失败' });
  }
});

function logOperation(db, userId, action, target = null, targetId = null, ipAddress = null) {
  db.prepare(`
    INSERT INTO operation_logs (user_id, action, target, target_id, ip_address) VALUES (?, ?, ?, ?, ?)
  `).run(userId, action, target, targetId, ipAddress);
}

module.exports = { router, logOperation };