const express = require('express');
const { getDatabase } = require('../db/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const settings = db.prepare('SELECT * FROM system_settings WHERE id = 1').get();

    if (!settings) {
      return res.json({
        success: true,
        data: {
          id: 1,
          system_name: '福建港航船舶报告编制系统',
          logo_url: '',
          language: 'zh-CN',
          timezone: 'Asia/Shanghai',
          notification_report_submit: 1,
          notification_review_result: 1,
          notification_system_notice: 1,
          notification_methods: ['push'],
          report_default_review_level: 3,
          report_code_format: 'FZ-{年份}-{序号}',
          report_max_file_size: 50,
          report_max_images: 9,
          report_auto_save: 1,
          security_password_expiry: '180',
          security_session_timeout: 120,
          security_strong_password: 1,
          security_log_retention: '90'
        }
      });
    }

    settings.notification_methods = JSON.parse(settings.notification_methods || '["push"]');

    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Get system settings error:', err);
    res.status(500).json({ success: false, error: '获取系统设置失败' });
  }
});

router.put('/', adminOnly, (req, res) => {
  try {
    const db = getDatabase();
    const settings = db.prepare('SELECT * FROM system_settings WHERE id = 1').get();

    const updates = [];
    const values = [];

    const fields = [
      'system_name', 'logo_url', 'language', 'timezone',
      'notification_report_submit', 'notification_review_result', 'notification_system_notice',
      'report_default_review_level', 'report_code_format', 'report_max_file_size', 'report_max_images', 'report_auto_save',
      'security_password_expiry', 'security_session_timeout', 'security_strong_password', 'security_log_retention'
    ];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (req.body.notification_methods !== undefined) {
      updates.push('notification_methods = ?');
      values.push(JSON.stringify(req.body.notification_methods));
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(1);

    if (settings) {
      db.prepare(`UPDATE system_settings SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    } else {
      db.prepare(`
        INSERT INTO system_settings (id, system_name, language, timezone) VALUES (1, '福建港航船舶报告编制系统', 'zh-CN', 'Asia/Shanghai')
      `).run();
      db.prepare(`UPDATE system_settings SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM system_settings WHERE id = 1').get();
    updated.notification_methods = JSON.parse(updated.notification_methods || '["push"]');

    res.json({ success: true, data: updated, message: '系统设置已保存' });
  } catch (err) {
    console.error('Update system settings error:', err);
    res.status(500).json({ success: false, error: '保存系统设置失败' });
  }
});

module.exports = router;