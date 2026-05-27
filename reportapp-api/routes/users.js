const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Multer config for signature/seal uploads
const uploadDir = path.join(__dirname, '..', 'uploads', 'signatures');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// All user routes require auth
router.use(authMiddleware);

// GET /api/users — list with pagination + search + filter
router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '', role = '' } = req.query;
    const db = getDatabase();
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`).get(...params).count;
    const list = db.prepare(
      `SELECT id, name, phone, role, status, signature, seal, created_at, updated_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ success: false, error: '获取用户列表失败' });
  }
});

// POST /api/users — create user (admin only)
router.post('/', adminOnly, (req, res) => {
  try {
    const { name, phone, password, role = 'engineer' } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, error: '姓名、手机号和密码不能为空' });
    }

    const db = getDatabase();

    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existing) {
      return res.status(409).json({ success: false, error: '该手机号已存在' });
    }

    const validRoles = ['admin', 'engineer', 'manager', 'chief'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: '无效的角色' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)'
    ).run(name, phone, hashedPassword, role);

    const newUser = db.prepare('SELECT id, name, phone, role, status, signature, seal, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: newUser, message: '用户创建成功' });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ success: false, error: '创建用户失败' });
  }
});

// PUT /api/users/:id — update user (admin only)
router.put('/:id', adminOnly, (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, password, role } = req.body;
    const db = getDatabase();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (phone && phone !== user.phone) {
      const existing = db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(phone, id);
      if (existing) {
        return res.status(409).json({ success: false, error: '该手机号已被使用' });
      }
      updates.push('phone = ?');
      values.push(phone);
    }
    if (password) {
      updates.push('password = ?');
      values.push(bcrypt.hashSync(password, 10));
    }
    if (role) {
      const validRoles = ['admin', 'engineer', 'manager', 'chief'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, error: '无效的角色' });
      }
      updates.push('role = ?');
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updatedUser = db.prepare('SELECT id, name, phone, role, status, signature, seal, created_at, updated_at FROM users WHERE id = ?').get(id);

    res.json({ success: true, data: updatedUser, message: '用户更新成功' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ success: false, error: '更新用户失败' });
  }
});

// PUT /api/users/:id/status — toggle active/inactive (admin only)
router.put('/:id/status', adminOnly, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const db = getDatabase();

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, error: '无效的状态' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    db.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);

    res.json({ success: true, data: { id, status }, message: `用户已${status === 'active' ? '启用' : '禁用'}` });
  } catch (err) {
    console.error('Update user status error:', err);
    res.status(500).json({ success: false, error: '更新用户状态失败' });
  }
});

// DELETE /api/users/:id (admin only)
router.delete('/:id', adminOnly, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    if (String(user.id) === String(req.user.id)) {
      return res.status(400).json({ success: false, error: '不能删除自己的账号' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({ success: true, message: '用户已删除' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, error: '删除用户失败' });
  }
});

// GET /api/roles
router.get('/roles', (req, res) => {
  try {
    const db = getDatabase();
    const roles = db.prepare('SELECT * FROM roles ORDER BY id').all().map(r => ({
      ...r,
      permissions: JSON.parse(r.permissions)
    }));
    res.json({ success: true, data: roles });
  } catch (err) {
    console.error('Get roles error:', err);
    res.status(500).json({ success: false, error: '获取角色列表失败' });
  }
});

// PUT /api/roles/:id — update role permissions (admin only)
router.put('/roles/:id', adminOnly, (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;
    const db = getDatabase();

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
    if (!role) {
      return res.status(404).json({ success: false, error: '角色不存在' });
    }

    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (permissions) {
      updates.push('permissions = ?');
      values.push(JSON.stringify(permissions));
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    values.push(id);
    db.prepare(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updatedRole = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);
    updatedRole.permissions = JSON.parse(updatedRole.permissions);

    res.json({ success: true, data: updatedRole, message: '角色更新成功' });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ success: false, error: '更新角色失败' });
  }
});

module.exports = router;
