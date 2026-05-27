const express = require('express');
const { getDatabase } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 20, filter = 'all' } = req.query;
    const db = getDatabase();
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let whereClause = 'WHERE user_id = ?';
    const params = [req.user.id];

    if (filter === 'unread') {
      whereClause += ' AND is_read = 0';
    } else if (filter === 'read') {
      whereClause += ' AND is_read = 1';
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM notifications ${whereClause}`).get(...params).count;
    const list = db.prepare(`
      SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id).count;

    res.json({
      success: true,
      data: { list, total, unreadCount, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ success: false, error: '获取通知列表失败' });
  }
});

router.put('/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const notification = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!notification) {
      return res.status(404).json({ success: false, error: '通知不存在' });
    }

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);

    res.json({ success: true, message: '已标记为已读' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ success: false, error: '标记已读失败' });
  }
});

router.put('/read-all', (req, res) => {
  try {
    const db = getDatabase();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);

    res.json({ success: true, message: '全部已标记为已读' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ success: false, error: '标记全部已读失败' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const notification = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!notification) {
      return res.status(404).json({ success: false, error: '通知不存在' });
    }

    db.prepare('DELETE FROM notifications WHERE id = ?').run(id);

    res.json({ success: true, message: '通知已删除' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ success: false, error: '删除通知失败' });
  }
});

function createNotification(db, userId, type, title, message, link = null) {
  db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)
  `).run(userId, type, title, message, link);
}

module.exports = { router, createNotification };