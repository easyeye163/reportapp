const express = require('express');
const { getDatabase } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/reviews — list with pagination + filter
router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 10, search = '', result = '', status = '' } = req.query;
    const db = getDatabase();
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (r.name LIKE ? OR r.code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (result) {
      whereClause += ' AND rv.result = ?';
      params.push(result);
    }

    // Filter by report status
    if (status) {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }

    // Engineers see reviews for their reports; managers/chiefs/admins see reviews assigned to them or all
    if (req.user.role === 'engineer') {
      whereClause += ' AND r.creator_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'manager' || req.user.role === 'chief') {
      whereClause += ' AND (rv.reviewer_id = ? OR r.creator_id = ?)';
      params.push(req.user.id, req.user.id);
    }

    const total = db.prepare(`
      SELECT COUNT(*) as count
      FROM reviews rv
      JOIN reports r ON rv.report_id = r.id
      ${whereClause}
    `).get(...params).count;

    const list = db.prepare(`
      SELECT rv.*, r.name as report_name, r.code as report_code, r.type as report_type, r.status as report_status,
             u.name as reviewer_name, u.role as reviewer_role,
             c.name as creator_name
      FROM reviews rv
      JOIN reports r ON rv.report_id = r.id
      LEFT JOIN users u ON rv.reviewer_id = u.id
      LEFT JOIN users c ON r.creator_id = c.id
      ${whereClause}
      ORDER BY rv.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ success: false, error: '获取审核列表失败' });
  }
});

// POST /api/reviews/:reportId — submit review
router.post('/:reportId', (req, res) => {
  try {
    const { reportId } = req.params;
    const { result, comment = '' } = req.body;
    const db = getDatabase();

    if (!result || !['approved', 'rejected', 'revise'].includes(result)) {
      return res.status(400).json({ success: false, error: '审核结果必须是 approved/rejected/revise' });
    }

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }

    if (!['pending', 'reviewing'].includes(report.status)) {
      return res.status(400).json({ success: false, error: '当前报告状态不允许审核' });
    }

    // Determine the review level
    const existingReviews = db.prepare('SELECT * FROM reviews WHERE report_id = ?').all(reportId);
    const level = existingReviews.length + 1;

    // Create review
    const reviewResult = db.prepare(`
      INSERT INTO reviews (report_id, reviewer_id, level, result, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(reportId, req.user.id, level, result, comment);

    // Update report status based on review result
    let newStatus;
    if (result === 'rejected') {
      newStatus = 'rejected';
    } else if (result === 'revise') {
      newStatus = 'revise';
    } else if (result === 'approved') {
      // Check if all review levels are complete
      const reviewLevels = db.prepare('SELECT * FROM review_levels WHERE report_id = ?').get(reportId);
      const levelCount = reviewLevels ? reviewLevels.level_count : 3;

      const approvedCount = db.prepare('SELECT COUNT(*) as count FROM reviews WHERE report_id = ? AND result = "approved"').get(reportId).count;

      if (approvedCount >= levelCount) {
        newStatus = 'approved';
      } else {
        newStatus = 'reviewing';
      }
    }

    if (newStatus) {
      db.prepare('UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, reportId);
    }

    const newReview = db.prepare(`
      SELECT rv.*, u.name as reviewer_name
      FROM reviews rv
      LEFT JOIN users u ON rv.reviewer_id = u.id
      WHERE rv.id = ?
    `).get(reviewResult.lastInsertRowid);

    res.json({ success: true, data: newReview, message: '审核提交成功' });
  } catch (err) {
    console.error('Submit review error:', err);
    res.status(500).json({ success: false, error: '提交审核失败' });
  }
});

// POST /api/reviews/:reportId/sign — sign review (chief/manager)
router.post('/:reportId/sign', (req, res) => {
  try {
    const { reportId } = req.params;
    const db = getDatabase();

    if (!['chief', 'manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: '只有总工程师或审核经理可以签名' });
    }

    const review = db.prepare('SELECT * FROM reviews WHERE report_id = ? ORDER BY created_at DESC LIMIT 1').get(reportId);
    if (!review) {
      return res.status(404).json({ success: false, error: '未找到审核记录' });
    }

    db.prepare('UPDATE reviews SET signed = 1 WHERE id = ?').run(review.id);

    res.json({ success: true, message: '签名成功' });
  } catch (err) {
    console.error('Sign review error:', err);
    res.status(500).json({ success: false, error: '签名失败' });
  }
});

// POST /api/reviews/:reportId/stamp — stamp review (chief only)
router.post('/:reportId/stamp', (req, res) => {
  try {
    const { reportId } = req.params;
    const db = getDatabase();

    if (req.user.role !== 'chief' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: '只有总工程师可以盖章' });
    }

    const review = db.prepare('SELECT * FROM reviews WHERE report_id = ? ORDER BY created_at DESC LIMIT 1').get(reportId);
    if (!review) {
      return res.status(404).json({ success: false, error: '未找到审核记录' });
    }

    db.prepare('UPDATE reviews SET stamped = 1 WHERE id = ?').run(review.id);

    res.json({ success: true, message: '盖章成功' });
  } catch (err) {
    console.error('Stamp review error:', err);
    res.status(500).json({ success: false, error: '盖章失败' });
  }
});

// GET /api/settings/review-levels/:reportId
router.get('/review-levels/:reportId', (req, res) => {
  try {
    const { reportId } = req.params;
    const db = getDatabase();

    const settings = db.prepare('SELECT * FROM review_levels WHERE report_id = ?').get(reportId);

    if (settings) {
      settings.reviewers = JSON.parse(settings.reviewers);
    } else {
      // Return default settings
      return res.json({
        success: true,
        data: {
          report_id: Number(reportId),
          level_count: 3,
          reviewers: []
        }
      });
    }

    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Get review levels error:', err);
    res.status(500).json({ success: false, error: '获取审核级别设置失败' });
  }
});

// PUT /api/settings/review-levels/:reportId
router.put('/review-levels/:reportId', (req, res) => {
  try {
    const { reportId } = req.params;
    const { level_count = 3, reviewers = [] } = req.body;
    const db = getDatabase();

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }

    const existing = db.prepare('SELECT * FROM review_levels WHERE report_id = ?').get(reportId);

    if (existing) {
      db.prepare(`
        UPDATE review_levels SET level_count = ?, reviewers = ?, updated_at = CURRENT_TIMESTAMP WHERE report_id = ?
      `).run(level_count, JSON.stringify(reviewers), reportId);
    } else {
      db.prepare(`
        INSERT INTO review_levels (report_id, level_count, reviewers) VALUES (?, ?, ?)
      `).run(reportId, level_count, JSON.stringify(reviewers));
    }

    // Also update report's review_level
    db.prepare('UPDATE reports SET review_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(String(level_count), reportId);

    const updated = db.prepare('SELECT * FROM review_levels WHERE report_id = ?').get(reportId);
    updated.reviewers = JSON.parse(updated.reviewers);

    res.json({ success: true, data: updated, message: '审核级别设置已保存' });
  } catch (err) {
    console.error('Update review levels error:', err);
    res.status(500).json({ success: false, error: '保存审核级别设置失败' });
  }
});

module.exports = router;
