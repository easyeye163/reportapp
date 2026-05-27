const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, error: '手机号和密码不能为空' });
    }

    const db = getDatabase();
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

    if (!user) {
      return res.status(401).json({ success: false, error: '用户不存在' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, error: '账号已被禁用' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: '密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const roleRow = db.prepare('SELECT * FROM roles WHERE name = ?').get(user.role);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          signature: user.signature,
          seal: user.seal
        },
        permissions: roleRow ? JSON.parse(roleRow.permissions) : []
      },
      message: '登录成功'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: '登录失败' });
  }
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { name, phone, password, role } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, error: '姓名、手机号和密码不能为空' });
    }

    if (phone.length < 11) {
      return res.status(400).json({ success: false, error: '手机号格式不正确' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: '密码长度不能少于6位' });
    }

    const validRoles = ['admin', 'engineer', 'manager', 'chief'];
    const userRole = role && validRoles.includes(role) ? role : 'engineer';

    const db = getDatabase();

    const existingUser = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existingUser) {
      return res.status(409).json({ success: false, error: '该手机号已注册' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = db.prepare(
      'INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)'
    ).run(name, phone, hashedPassword, userRole);

    const newUser = db.prepare('SELECT id, name, phone, role, status, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: newUser,
      message: '注册成功'
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: '注册失败' });
  }
});

module.exports = router;
