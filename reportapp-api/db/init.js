const { initDatabase } = require('./database');
const { getDatabase } = require('./database');
const bcrypt = require('bcryptjs');
const fs = require('fs');

async function initDB() {
  await initDatabase();
  const db = getDatabase();

  console.log('Creating tables...');

  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'engineer',
      status TEXT DEFAULT 'active',
      signature TEXT,
      seal TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Roles table
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      permissions TEXT DEFAULT '[]'
    );

    -- Frames table
    CREATE TABLE IF NOT EXISTS frames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      is_public INTEGER DEFAULT 1,
      creator_id INTEGER,
      description TEXT,
      content TEXT DEFAULT '{}',
      file_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );

    -- Reports table
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      creator_id INTEGER,
      frame_id INTEGER,
      status TEXT DEFAULT 'draft',
      progress INTEGER DEFAULT 0,
      review_level TEXT DEFAULT '3',
      content TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id),
      FOREIGN KEY (frame_id) REFERENCES frames(id)
    );

    -- Report team members
    CREATE TABLE IF NOT EXISTS report_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES reports(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Report images
    CREATE TABLE IF NOT EXISTS report_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES reports(id)
    );

    -- Reviews table
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      level INTEGER DEFAULT 1,
      result TEXT,
      comment TEXT,
      signed INTEGER DEFAULT 0,
      stamped INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES reports(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id)
    );

    -- Review level settings
    CREATE TABLE IF NOT EXISTS review_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER,
      level_count INTEGER DEFAULT 3,
      reviewers TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (report_id) REFERENCES reports(id)
    );

    -- Cases table
    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      business_type TEXT,
      uploader_id INTEGER,
      file_path TEXT,
      status TEXT DEFAULT '现行',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uploader_id) REFERENCES users(id)
    );

    -- Standards table
    CREATE TABLE IF NOT EXISTS standards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      standard_type TEXT,
      uploader_id INTEGER,
      file_path TEXT,
      status TEXT DEFAULT '现行',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uploader_id) REFERENCES users(id)
    );

    -- Guides table
    CREATE TABLE IF NOT EXISTS guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT,
      file_path TEXT,
      description TEXT,
      uploader_id INTEGER,
      version INTEGER DEFAULT 1,
      is_current INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uploader_id) REFERENCES users(id)
    );

    -- Backups table
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_type TEXT DEFAULT 'manual',
      file_path TEXT,
      size TEXT,
      status TEXT DEFAULT 'success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Backup settings
    CREATE TABLE IF NOT EXISTS backup_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      auto_backup INTEGER DEFAULT 0,
      frequency TEXT DEFAULT 'daily',
      backup_time TEXT DEFAULT '02:00',
      storage TEXT DEFAULT '["local"]'
    );

    -- Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- System settings table
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      system_name TEXT DEFAULT '福建港航船舶报告编制系统',
      logo_url TEXT,
      language TEXT DEFAULT 'zh-CN',
      timezone TEXT DEFAULT 'Asia/Shanghai',
      notification_report_submit INTEGER DEFAULT 1,
      notification_review_result INTEGER DEFAULT 1,
      notification_system_notice INTEGER DEFAULT 1,
      notification_methods TEXT DEFAULT '["push"]',
      report_default_review_level INTEGER DEFAULT 3,
      report_code_format TEXT DEFAULT 'FZ-{年份}-{序号}',
      report_max_file_size INTEGER DEFAULT 50,
      report_max_images INTEGER DEFAULT 9,
      report_auto_save INTEGER DEFAULT 1,
      security_password_expiry TEXT DEFAULT '180',
      security_session_timeout INTEGER DEFAULT 120,
      security_strong_password INTEGER DEFAULT 1,
      security_log_retention TEXT DEFAULT '90',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Operation logs table
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      target_id INTEGER,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  console.log('Tables created successfully.');

  // 迁移：为已有 guides 表添加 version 和 is_current 字段（如果不存在）
  try {
    const guideColumns = db.prepare("PRAGMA table_info(guides)").all();
    const hasVersion = guideColumns.some(c => c.name === 'version');
    const hasIsCurrent = guideColumns.some(c => c.name === 'is_current');
    if (!hasVersion) {
      db.exec('ALTER TABLE guides ADD COLUMN version INTEGER DEFAULT 1');
      console.log('Migrated: added version column to guides');
    }
    if (!hasIsCurrent) {
      db.exec('ALTER TABLE guides ADD COLUMN is_current INTEGER DEFAULT 1');
      console.log('Migrated: added is_current column to guides');
    }
  } catch (e) {
    console.warn('Guide table migration skipped:', e.message);
  }

  seedData(db);
}

function seedData(db) {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) {
    console.log('Database already seeded, skipping seed data.');
    return;
  }

  console.log('Seeding data...');

  const hashedPassword = bcrypt.hashSync('123456', 10);

  const insertRole = db.prepare(`
    INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)
  `);

  const roles = [
    { name: 'admin', description: '系统管理员', permissions: JSON.stringify(['user:manage', 'report:create', 'report:review', 'report:approve', 'report:publish', 'report:archive', 'frame:manage', 'case:manage', 'standard:manage', 'backup:manage', 'guide:manage', 'role:manage']) },
    { name: 'engineer', description: '工程师', permissions: JSON.stringify(['report:create', 'report:submit', 'guide:view', 'case:view', 'standard:view']) },
    { name: 'manager', description: '审核经理', permissions: JSON.stringify(['report:create', 'report:review', 'report:sign', 'guide:view', 'case:view', 'standard:view']) },
    { name: 'chief', description: '总工程师', permissions: JSON.stringify(['report:create', 'report:review', 'report:sign', 'report:stamp', 'report:approve', 'guide:view', 'case:view', 'standard:view', 'user:view']) }
  ];

  const insertManyRoles = db.transaction((items) => {
    for (const item of items) {
      insertRole.run(item.name, item.description, item.permissions);
    }
  });
  insertManyRoles(roles);

  const insertUser = db.prepare(`
    INSERT INTO users (name, phone, password, role, status) VALUES (?, ?, ?, ?, ?)
  `);

  const users = [
    { name: '管理员', phone: '13800138001', password: hashedPassword, role: 'admin', status: 'active' },
    { name: '张工程师', phone: '13800138002', password: hashedPassword, role: 'engineer', status: 'active' },
    { name: '李经理', phone: '13800138003', password: hashedPassword, role: 'manager', status: 'active' },
    { name: '王总工', phone: '13800138004', password: hashedPassword, role: 'chief', status: 'active' },
    { name: '赵工程师', phone: '13800138005', password: hashedPassword, role: 'engineer', status: 'active' }
  ];

  const insertManyUsers = db.transaction((items) => {
    for (const item of items) {
      insertUser.run(item.name, item.phone, item.password, item.role, item.status);
    }
  });
  insertManyUsers(users);

  const insertFrame = db.prepare(`
    INSERT INTO frames (name, type, is_public, creator_id, description, file_path) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const frames = [
    { name: '船舶检验报告模板', type: 'ship', is_public: 1, creator_id: 1, description: '标准船舶检验报告框架模板', file_path: null },
    { name: '港口工程报告模板', type: 'port', is_public: 1, creator_id: 1, description: '港口工程报告标准模板', file_path: null },
    { name: '航道测量报告模板', type: 'channel', is_public: 1, creator_id: 2, description: '航道测量报告框架模板', file_path: null }
  ];

  const insertManyFrames = db.transaction((items) => {
    for (const item of items) {
      insertFrame.run(item.name, item.type, item.is_public, item.creator_id, item.description, item.file_path);
    }
  });
  insertManyFrames(frames);

  const insertReport = db.prepare(`
    INSERT INTO reports (code, name, type, creator_id, frame_id, status, progress, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const reports = [
    { code: 'FZ-2026-001', name: '厦门港XX号船舶检验报告', type: 'ship', creator_id: 2, frame_id: 1, status: 'draft', progress: 30, content: JSON.stringify({ shipName: 'XX号', shipType: '货船', registryPort: '厦门' }) },
    { code: 'FZ-2026-002', name: '福州港泊位安全评估报告', type: 'port', creator_id: 2, frame_id: 2, status: 'pending', progress: 60, content: JSON.stringify({ portName: '福州港', berthNo: '#3泊位', assessmentType: '安全评估' }) },
    { code: 'FZ-2026-003', name: '闽江航道通航条件分析报告', type: 'channel', creator_id: 3, frame_id: 3, status: 'reviewing', progress: 80, content: JSON.stringify({ channelName: '闽江航道', section: '福州段', analysisType: '通航条件' }) },
    { code: 'FZ-2026-004', name: '泉州港XX号船舶适航报告', type: 'ship', creator_id: 5, frame_id: 1, status: 'approved', progress: 100, content: JSON.stringify({ shipName: 'XX号', shipType: '散货船', registryPort: '泉州' }) },
    { code: 'FZ-2026-005', name: '宁德港航道疏浚工程报告', type: 'channel', creator_id: 2, frame_id: 3, status: 'archived', progress: 100, content: JSON.stringify({ channelName: '宁德港航道', projectType: '疏浚工程' }) }
  ];

  const insertManyReports = db.transaction((items) => {
    for (const item of items) {
      insertReport.run(item.code, item.name, item.type, item.creator_id, item.frame_id, item.status, item.progress, item.content);
    }
  });
  insertManyReports(reports);

  const insertMember = db.prepare(`
    INSERT INTO report_members (report_id, user_id) VALUES (?, ?)
  `);

  const members = [
    { report_id: 1, user_id: 2 },
    { report_id: 1, user_id: 5 },
    { report_id: 2, user_id: 2 },
    { report_id: 2, user_id: 3 },
    { report_id: 3, user_id: 3 },
    { report_id: 3, user_id: 4 },
    { report_id: 4, user_id: 5 },
    { report_id: 4, user_id: 4 },
    { report_id: 5, user_id: 2 }
  ];

  const insertManyMembers = db.transaction((items) => {
    for (const item of items) {
      insertMember.run(item.report_id, item.user_id);
    }
  });
  insertManyMembers(members);

  const insertReview = db.prepare(`
    INSERT INTO reviews (report_id, reviewer_id, level, result, comment, signed, stamped) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const reviews = [
    { report_id: 3, reviewer_id: 3, level: 1, result: 'approved', comment: '一审通过，内容完整', signed: 1, stamped: 0 },
    { report_id: 4, reviewer_id: 3, level: 1, result: 'approved', comment: '同意', signed: 1, stamped: 0 },
    { report_id: 4, reviewer_id: 4, level: 2, result: 'approved', comment: '审核通过，予以批准', signed: 1, stamped: 1 }
  ];

  const insertManyReviews = db.transaction((items) => {
    for (const item of items) {
      insertReview.run(item.report_id, item.reviewer_id, item.level, item.result, item.comment, item.signed, item.stamped);
    }
  });
  insertManyReviews(reviews);

  // 创建示例文件目录
  const caseUploadDir = require('path').join(__dirname, '..', 'uploads', 'cases');
  const standardUploadDir = require('path').join(__dirname, '..', 'uploads', 'standards');
  if (!fs.existsSync(caseUploadDir)) fs.mkdirSync(caseUploadDir, { recursive: true });
  if (!fs.existsSync(standardUploadDir)) fs.mkdirSync(standardUploadDir, { recursive: true });

  // 创建示例案例文件（简单的文本文件，用于演示预览/下载功能）
  const sampleCases = [
    { name: '厦门港船舶年检案例_sample.txt', content: '厦门港船舶年度检验报告案例\n\n本案例为厦门港某货船年度检验报告的示例文件。\n检验内容包括船体结构、轮机设备、电气设备等。\n\n编制单位：福建港航检验中心\n编制日期：2026年1月' },
    { name: '福州港泊位检测案例_sample.txt', content: '福州港泊位结构检测报告案例\n\n本案例为福州港#3泊位结构检测报告的示例文件。\n检测内容包括泊位结构安全性、承载能力等。\n\n编制单位：福建港航检验中心\n编制日期：2026年2月' },
    { name: '闽江航道测量案例_sample.txt', content: '闽江航道通航条件测量案例\n\n本案例为闽江航道福州段通航条件测量的示例文件。\n测量内容包括航道水深、宽度、通航净高等。\n\n编制单位：福建港航测量队\n编制日期：2026年3月' }
  ];

  const sampleStandards = [
    { name: '船舶检验规范_sample.txt', content: '船舶检验规范 GB/T 35214\n\n本文件为船舶检验通用技术规范的摘要说明。\n\n适用范围：各类船舶年度检验、特别检验\n\n主要技术内容：\n1. 船体结构检验标准\n2. 轮机设备检验标准\n3. 电气设备检验标准\n4. 安全设备检验标准' },
    { name: '港口工程质量标准_sample.txt', content: '港口工程质量检验标准 JTS 257\n\n本文件为港口工程质量检验评定标准的摘要说明。\n\n适用范围：港口码头、泊位、防波堤等工程\n\n主要内容：\n1. 混凝土结构质量标准\n2. 钢结构质量标准\n3. 地基基础质量标准\n4. 附属设施质量标准' },
    { name: '福建省航道管理条例_sample.txt', content: '福建省航道管理条例\n\n本文件为福建省航道管理相关法规的摘要。\n\n主要内容：\n1. 航道规划与建设\n2. 航道养护与保护\n3. 航道通行管理\n4. 法律责任' }
  ];

  // 写入示例文件
  const caseFilePaths = sampleCases.map((f, i) => {
    const filePath = require('path').join(caseUploadDir, `seed_case_${i + 1}.txt`);
    fs.writeFileSync(filePath, f.content, 'utf-8');
    return filePath.replace(/\\/g, '/');
  });

  const standardFilePaths = sampleStandards.map((f, i) => {
    const filePath = require('path').join(standardUploadDir, `seed_standard_${i + 1}.txt`);
    fs.writeFileSync(filePath, f.content, 'utf-8');
    return filePath.replace(/\\/g, '/');
  });

  const insertCase = db.prepare(`
    INSERT INTO cases (name, business_type, uploader_id, file_path, status, description) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const cases = [
    { name: '厦门港船舶年检案例', business_type: '船舶报告', uploader_id: 1, file_path: caseFilePaths[0], status: '现行', description: '厦门港船舶年度检验报告案例' },
    { name: '福州港泊位检测案例', business_type: '港口报告', uploader_id: 1, file_path: caseFilePaths[1], status: '现行', description: '福州港泊位结构检测报告案例' },
    { name: '闽江航道测量案例', business_type: '航道报告', uploader_id: 2, file_path: caseFilePaths[2], status: '作废', description: '闽江航道通航条件测量案例' }
  ];

  const insertManyCases = db.transaction((items) => {
    for (const item of items) {
      insertCase.run(item.name, item.business_type, item.uploader_id, item.file_path, item.status, item.description);
    }
  });
  insertManyCases(cases);

  const insertStandard = db.prepare(`
    INSERT INTO standards (name, standard_type, uploader_id, file_path, status, description) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const standards = [
    { name: '船舶检验规范 GB/T 35214', standard_type: '国家标准', uploader_id: 1, file_path: standardFilePaths[0], status: '现行', description: '船舶检验通用技术规范' },
    { name: '港口工程质量检验标准 JTS 257', standard_type: '行业标准', uploader_id: 1, file_path: standardFilePaths[1], status: '现行', description: '港口工程质量检验评定标准' },
    { name: '福建省航道管理条例', standard_type: '地方标准', uploader_id: 3, file_path: standardFilePaths[2], status: '现行', description: '福建省航道管理相关法规' }
  ];

  const insertManyStandards = db.transaction((items) => {
    for (const item of items) {
      insertStandard.run(item.name, item.standard_type, item.uploader_id, item.file_path, item.status, item.description);
    }
  });
  insertManyStandards(standards);

  db.prepare(`
    INSERT OR IGNORE INTO backup_settings (id, auto_backup, frequency, backup_time, storage) VALUES (1, 0, 'daily', '02:00', '["local"]')
  `).run();

  console.log('Seed data inserted successfully.');
  console.log('  - 4 roles created');
  console.log('  - 5 users created (password: 123456)');
  console.log('  - 3 frames created');
  console.log('  - 5 reports created');
  console.log('  - 9 report members created');
  console.log('  - 3 reviews created');
  console.log('  - 3 cases created (with sample files)');
  console.log('  - 3 standards created (with sample files)');
}

if (require.main === module) {
  initDB().then(() => {
    console.log('Database initialization completed.');
    const { closeDatabase } = require('./database');
    closeDatabase();
    setTimeout(() => process.exit(0), 100);
  }).catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });
}

module.exports = { initDatabase: initDB };