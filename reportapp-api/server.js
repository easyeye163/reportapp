const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, closeDatabase } = require('./db/database');

const app = express();
const PORT = 4000;

async function start() {
  await initDatabase();
  console.log('Database initialized.');

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  const authRoutes = require('./routes/auth');
  const userRoutes = require('./routes/users');
  const frameRoutes = require('./routes/frames');
  const reportRoutes = require('./routes/reports');
  const reviewRoutes = require('./routes/reviews');
  const caseRoutes = require('./routes/cases');
  const archiveRoutes = require('./routes/archives');
  const guideRoutes = require('./routes/guides');
  const backupRoutes = require('./routes/backups');
  const notificationRoutes = require('./routes/notifications');
  const settingsRoutes = require('./routes/settings');
  const onlyofficeRoutes = require('./routes/onlyoffice');
  const logsRoutes = require('./routes/logs');

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/frames', frameRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/cases', caseRoutes);
  app.use('/api/archives', archiveRoutes);
  app.use('/api/guides', guideRoutes);
  app.use('/api/backups', backupRoutes);
  app.use('/api/notifications', notificationRoutes.router);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/onlyoffice', onlyofficeRoutes);
  app.use('/api/logs', logsRoutes.router);

  app.get('/api/health', (req, res) => {
    const { getDatabase } = require('./db/database');
    try {
      const db = getDatabase();
      const result = db.prepare('SELECT 1 as ok').get();
      res.json({ success: true, data: { status: 'healthy', database: result.ok === 1 } });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Health check failed' });
    }
  });

  app.get('/', (req, res) => {
    res.json({
      name: '福建港航船舶报告编制系统 API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        frames: '/api/frames',
        reports: '/api/reports',
        reviews: '/api/reviews',
        cases: '/api/cases',
        standards: '/api/standards',
        archives: '/api/archives',
        guides: '/api/guides',
        backups: '/api/backups'
      }
    });
  });

  app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err);
    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: '文件大小超出限制' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ success: false, error: '文件数量超出限制' });
      }
      return res.status(400).json({ success: false, error: `上传错误: ${err.message}` });
    }
    res.status(500).json({ success: false, error: '服务器内部错误' });
  });

  app.use((req, res) => {
    res.status(404).json({ success: false, error: '接口不存在' });
  });

  const server = app.listen(PORT, () => {
    console.log('========================================');
    console.log('  福建港航船舶报告编制系统 API Server');
    console.log(`  Running on: http://localhost:${PORT}`);
    console.log('  API Base:   http://localhost:4000/api');
    console.log('========================================');
  });

  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    closeDatabase();
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    closeDatabase();
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;