const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDatabase, closeDatabase } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/backups — list backup history
router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const db = getDatabase();
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const total = db.prepare('SELECT COUNT(*) as count FROM backups').get().count;
    const list = db.prepare('SELECT * FROM backups ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (err) {
    console.error('Get backups error:', err);
    res.status(500).json({ success: false, error: '获取备份列表失败' });
  }
});

// POST /api/backups — trigger manual backup (admin only)
router.post('/', adminOnly, (req, res) => {
  try {
    const db = getDatabase();
    const backupDir = path.join(__dirname, '..', 'uploads', 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create backup by copying the database file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.db`;
    const backupFilePath = path.join(backupDir, backupFileName);
    const dbPath = path.join(__dirname, '..', 'db', 'reportapp.db');

    if (!fs.existsSync(dbPath)) {
      return res.status(500).json({ success: false, error: '数据库文件不存在' });
    }

    fs.copyFileSync(dbPath, backupFilePath);

    const stats = fs.statSync(backupFilePath);
    const sizeKB = (stats.size / 1024).toFixed(2);

    const result = db.prepare(`
      INSERT INTO backups (backup_type, file_path, size, status)
      VALUES (?, ?, ?, ?)
    `).run('manual', backupFilePath.replace(/\\/g, '/'), `${sizeKB}KB`, 'success');

    const newBackup = db.prepare('SELECT * FROM backups WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: newBackup, message: '备份创建成功' });
  } catch (err) {
    console.error('Create backup error:', err);
    res.status(500).json({ success: false, error: '创建备份失败' });
  }
});

// GET /api/backups/:id/download — download backup file (admin only)
router.get('/:id/download', adminOnly, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(id);
    if (!backup) {
      return res.status(404).json({ success: false, error: '备份不存在' });
    }

    if (!backup.file_path || !fs.existsSync(backup.file_path)) {
      return res.status(404).json({ success: false, error: '备份文件不存在' });
    }

    res.download(backup.file_path, path.basename(backup.file_path));
  } catch (err) {
    console.error('Download backup error:', err);
    res.status(500).json({ success: false, error: '下载备份失败' });
  }
});

// POST /api/backups/:id/restore — restore from backup (admin only)
router.post('/:id/restore', adminOnly, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(id);
    if (!backup) {
      return res.status(404).json({ success: false, error: '备份不存在' });
    }

    if (!backup.file_path || !fs.existsSync(backup.file_path)) {
      return res.status(404).json({ success: false, error: '备份文件不存在' });
    }

    const dbPath = path.join(__dirname, '..', 'db', 'reportapp.db');

    // Create a safety backup before restoring
    const safetyBackupPath = `${dbPath}.pre-restore-${Date.now()}`;
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, safetyBackupPath);
    }

    // Copy backup file to database location
    fs.copyFileSync(backup.file_path, dbPath);

    closeDatabase();

    res.json({ success: true, message: '数据库已恢复，请重启服务以生效' });
  } catch (err) {
    console.error('Restore backup error:', err);
    res.status(500).json({ success: false, error: '恢复备份失败' });
  }
});

// GET /api/backups/settings — get backup settings (admin only)
router.get('/settings', adminOnly, (req, res) => {
  try {
    const db = getDatabase();
    const settings = db.prepare('SELECT * FROM backup_settings WHERE id = 1').get();

    if (settings) {
      settings.storage = JSON.parse(settings.storage);
    } else {
      return res.json({
        success: true,
        data: {
          id: 1,
          auto_backup: 0,
          frequency: 'daily',
          backup_time: '02:00',
          storage: ['local']
        }
      });
    }

    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Get backup settings error:', err);
    res.status(500).json({ success: false, error: '获取备份设置失败' });
  }
});

// PUT /api/backups/settings — update settings (admin only)
router.put('/settings', adminOnly, (req, res) => {
  try {
    const { auto_backup, frequency, backup_time, storage } = req.body;
    const db = getDatabase();

    const settings = db.prepare('SELECT * FROM backup_settings WHERE id = 1').get();

    if (settings) {
      const updates = [];
      const values = [];

      if (auto_backup !== undefined) { updates.push('auto_backup = ?'); values.push(Number(auto_backup)); }
      if (frequency) { updates.push('frequency = ?'); values.push(frequency); }
      if (backup_time) { updates.push('backup_time = ?'); values.push(backup_time); }
      if (storage) { updates.push('storage = ?'); values.push(JSON.stringify(storage)); }

      if (updates.length > 0) {
        values.push(1);
        db.prepare(`UPDATE backup_settings SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }
    } else {
      db.prepare(`
        INSERT INTO backup_settings (id, auto_backup, frequency, backup_time, storage)
        VALUES (1, ?, ?, ?, ?)
      `).run(
        auto_backup !== undefined ? Number(auto_backup) : 0,
        frequency || 'daily',
        backup_time || '02:00',
        storage ? JSON.stringify(storage) : '["local"]'
      );
    }

    const updated = db.prepare('SELECT * FROM backup_settings WHERE id = 1').get();
    updated.storage = JSON.parse(updated.storage);

    res.json({ success: true, data: updated, message: '备份设置已更新' });
  } catch (err) {
    console.error('Update backup settings error:', err);
    res.status(500).json({ success: false, error: '更新备份设置失败' });
  }
});

module.exports = router;
