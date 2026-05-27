const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// OnlyOffice Document Server 地址（可通过环境变量配置）
const DOCUMENT_SERVER_URL = process.env.ONLYOFFICE_URL || 'http://localhost:8080';
// 当前系统对外可访问的地址（OnlyOffice 回调用）
const CALLBACK_BASE_URL = process.env.CALLBACK_BASE_URL || 'http://localhost:4000';

// 所有路由需要认证
router.use(authMiddleware);

/**
 * GET /api/onlyoffice/config/:reportId
 * 获取 OnlyOffice 编辑器配置
 */
router.get('/config/:reportId', (req, res) => {
  try {
    const { reportId } = req.params;
    const db = getDatabase();

    const report = db.prepare(`
      SELECT r.*, u.name as creator_name
      FROM reports r
      LEFT JOIN users u ON r.creator_id = u.id
      WHERE r.id = ?
    `).get(reportId);

    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }

    const docUrl = `${CALLBACK_BASE_URL}/api/onlyoffice/document/${reportId}?token=${encodeURIComponent(req.headers.authorization?.replace('Bearer ', '') || '')}`;
    const docKey = `report_${reportId}_${report.updated_at ? new Date(report.updated_at).getTime() : Date.now()}`;

    const canEdit = report.status === 'draft' || report.status === 'revise';

    const editorConfig = {
      document: {
        fileType: 'docx',
        key: docKey,
        title: `${report.name || report.code}.docx`,
        url: docUrl,
        permissions: {
          comment: true,
          download: true,
          edit: canEdit,
          fillForms: true,
          print: true,
          review: true
        }
      },
      documentType: 'word',
      editorConfig: {
        callbackUrl: `${CALLBACK_BASE_URL}/api/onlyoffice/callback`,
        user: {
          id: String(req.user.id),
          name: req.user.name || '用户'
        },
        customization: {
          autosave: true,
          chat: false,
          commentAuthorOnly: false,
          compactHeader: true,
          compactToolbar: false,
          forcesave: true,
          help: true,
          toolbarNoTabs: false
        },
        lang: 'zh-CN',
        mode: canEdit ? 'edit' : 'view'
      },
      height: '100%',
      width: '100%'
    };

    res.json({
      success: true,
      data: {
        config: editorConfig,
        documentServerUrl: DOCUMENT_SERVER_URL,
        report: {
          id: report.id,
          name: report.name,
          code: report.code,
          status: report.status,
          type: report.type
        }
      }
    });
  } catch (err) {
    console.error('Get OnlyOffice config error:', err);
    res.status(500).json({ success: false, error: '获取编辑器配置失败' });
  }
});

/**
 * GET /api/onlyoffice/document/:reportId
 * 提供文档文件给 OnlyOffice Document Server 下载
 */
router.get('/document/:reportId', (req, res) => {
  try {
    const { reportId } = req.params;
    const db = getDatabase();

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }

    const docPath = getDocPath(report);

    if (fs.existsSync(docPath)) {
      return res.sendFile(path.resolve(docPath));
    }

    // 文档不存在时生成初始 .docx
    generateInitialDocx(report, docPath).then(() => {
      res.sendFile(path.resolve(docPath));
    }).catch(err => {
      console.error('Generate initial docx error:', err);
      res.status(500).json({ success: false, error: '生成文档失败' });
    });
  } catch (err) {
    console.error('Serve document error:', err);
    res.status(500).json({ success: false, error: '获取文档失败' });
  }
});

/**
 * POST /api/onlyoffice/callback
 * OnlyOffice 编辑器回调接口
 */
router.post('/callback', (req, res) => {
  try {
    const { status, url, key } = req.body;

    console.log('OnlyOffice callback:', { status, key });

    // status: 2=已保存准备关闭, 6=强制保存完成
    if ((status === 2 || status === 6) && url) {
      const match = key.match(/^report_(\d+)_/);
      if (match) {
        const reportId = match[1];
        downloadAndUpdateDoc(reportId, url);
      }
    }

    res.json({ error: 0 });
  } catch (err) {
    console.error('OnlyOffice callback error:', err);
    res.json({ error: 0 });
  }
});

/**
 * GET /api/onlyoffice/status
 * 检查 OnlyOffice Document Server 状态
 */
router.get('/status', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${DOCUMENT_SERVER_URL}/healthcheck`, { signal: controller.signal });
    clearTimeout(timeout);
    res.json({
      success: true,
      data: {
        available: response.ok,
        url: DOCUMENT_SERVER_URL,
        status: response.ok ? 'online' : 'offline'
      }
    });
  } catch (err) {
    res.json({
      success: true,
      data: {
        available: false,
        url: DOCUMENT_SERVER_URL,
        status: 'offline',
        error: '无法连接到 OnlyOffice Document Server'
      }
    });
  }
});

// ========== 辅助函数 ==========

function getDocPath(report) {
  const uploadDir = path.join(__dirname, '..', 'uploads', 'onlyoffice');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return path.join(uploadDir, `report_${report.id}.docx`);
}

async function generateInitialDocx(report, docPath) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

  const content = JSON.parse(report.content || '{}');
  const TYPE_NAMES = {
    ship: '船舶勘验报告',
    water: '水土保持监测报告',
    port: '港口工程报告',
    ocean: '海洋环境影响评价报告',
    channel: '航道通航条件影响评价报告'
  };
  const typeName = TYPE_NAMES[report.type] || report.type;

  const children = [
    new Paragraph({
      text: report.name || '报告',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `报告编号：${report.code || ''}`, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `报告类型：${typeName}`, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    })
  ];

  const sections = getReportSections(report.type);
  for (const section of sections) {
    children.push(new Paragraph({
      text: section.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 }
    }));

    if (section.keys) {
      // 多个字段合并
      const texts = section.keys.map(k => content[k]).filter(Boolean);
      const text = texts.length > 0 ? texts.join('\n') : section.placeholder;
      children.push(new Paragraph({
        children: [new TextRun({ text, size: 24 })],
        spacing: { after: 200 }
      }));
    } else if (section.key && content[section.key]) {
      children.push(new Paragraph({
        children: [new TextRun({ text: content[section.key], size: 24 })],
        spacing: { after: 200 }
      }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: section.placeholder || '（请在此编辑内容）', size: 24, color: '999999' })],
        spacing: { after: 200 }
      }));
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }]
  });

  const buffer = await Packer.toBuffer(doc);
  const dir = path.dirname(docPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(docPath, buffer);
}

function getReportSections(type) {
  const sections = {
    ship: [
      { title: '一、报告前言', key: 'intro', placeholder: '请填写报告编制目的、背景等' },
      { title: '二、项目概况', keys: ['projectName', 'projectLocation', 'clientName'], placeholder: '请填写项目基本信息' },
      { title: '三、编制依据', key: 'basis', placeholder: '请填写相关法规、标准、规范等' },
      { title: '四、船舶基本信息', keys: ['shipName', 'shipType', 'buildDate', 'tonnage'], placeholder: '请填写船舶名称、类型、吨位等' },
      { title: '五、船体结构检查', key: 'hull', placeholder: '请详细描述船体结构检查情况' },
      { title: '六、轮机设备检查', key: 'engine', placeholder: '请详细描述轮机设备检查情况' },
      { title: '七、电气设备检查', key: 'electrical', placeholder: '请详细描述电气设备检查情况' },
      { title: '八、安全设备检查', key: 'safety', placeholder: '请详细描述安全设备检查情况' },
      { title: '九、分析结论', key: 'conclusion', placeholder: '请填写勘验结论' },
      { title: '十、建议措施', key: 'recommendations', placeholder: '请填写建议措施' },
      { title: '十一、附录', key: 'appendix', placeholder: '请填写附录内容' }
    ],
    water: [
      { title: '一、报告前言', key: 'intro', placeholder: '请填写报告编制目的、背景等' },
      { title: '二、项目概况', keys: ['projectName', 'projectLocation', 'clientName'], placeholder: '请填写项目基本信息' },
      { title: '三、编制依据', key: 'basis', placeholder: '请填写相关法规、标准、规范等' },
      { title: '四、监测范围', key: 'monitoringScope', placeholder: '请填写监测范围、监测点位等' },
      { title: '五、监测方法', key: 'monitoringMethod', placeholder: '请填写监测方法、监测频次等' },
      { title: '六、监测结果', key: 'monitoringResult', placeholder: '请填写监测结果及数据分析' },
      { title: '七、分析结论', key: 'conclusion', placeholder: '请填写分析结论' },
      { title: '八、建议措施', key: 'recommendations', placeholder: '请填写建议措施' },
      { title: '九、附录', key: 'appendix', placeholder: '请填写附录内容' }
    ],
    port: [
      { title: '一、报告前言', key: 'intro', placeholder: '请填写报告编制目的、背景等' },
      { title: '二、项目概况', keys: ['projectName', 'projectLocation', 'clientName'], placeholder: '请填写项目基本信息' },
      { title: '三、编制依据', key: 'basis', placeholder: '请填写相关法规、标准、规范等' },
      { title: '四、工程范围', key: 'engineeringScope', placeholder: '请填写工程范围、工程内容等' },
      { title: '五、工程质量', key: 'engineeringQuality', placeholder: '请填写工程质量评估' },
      { title: '六、安全评估', key: 'engineeringSafety', placeholder: '请填写安全评估情况' },
      { title: '七、分析结论', key: 'conclusion', placeholder: '请填写分析结论' },
      { title: '八、建议措施', key: 'recommendations', placeholder: '请填写建议措施' },
      { title: '九、附录', key: 'appendix', placeholder: '请填写附录内容' }
    ],
    ocean: [
      { title: '一、报告前言', key: 'intro', placeholder: '请填写报告编制目的、背景等' },
      { title: '二、项目概况', keys: ['projectName', 'projectLocation', 'clientName'], placeholder: '请填写项目基本信息' },
      { title: '三、编制依据', key: 'basis', placeholder: '请填写相关法规、标准、规范等' },
      { title: '四、水环境影响', key: 'envWater', placeholder: '请填写水环境影响分析' },
      { title: '五、生态影响', key: 'envEco', placeholder: '请填写生态环境影响分析' },
      { title: '六、缓解措施', key: 'envMitigation', placeholder: '请填写环境影响缓解措施' },
      { title: '七、分析结论', key: 'conclusion', placeholder: '请填写分析结论' },
      { title: '八、建议措施', key: 'recommendations', placeholder: '请填写建议措施' },
      { title: '九、附录', key: 'appendix', placeholder: '请填写附录内容' }
    ],
    channel: [
      { title: '一、报告前言', key: 'intro', placeholder: '请填写报告编制目的、背景等' },
      { title: '二、项目概况', keys: ['projectName', 'projectLocation', 'clientName'], placeholder: '请填写项目基本信息' },
      { title: '三、编制依据', key: 'basis', placeholder: '请填写相关法规、标准、规范等' },
      { title: '四、航道深度', key: 'navDepth', placeholder: '请填写航道深度测量结果' },
      { title: '五、航道宽度', key: 'navWidth', placeholder: '请填写航道宽度测量结果' },
      { title: '六、通航安全', key: 'navSafety', placeholder: '请填写通航安全评估' },
      { title: '七、分析结论', key: 'conclusion', placeholder: '请填写分析结论' },
      { title: '八、建议措施', key: 'recommendations', placeholder: '请填写建议措施' },
      { title: '九、附录', key: 'appendix', placeholder: '请填写附录内容' }
    ]
  };
  return sections[type] || sections.ship;
}

async function downloadAndUpdateDoc(reportId, docUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(docUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error('Failed to download document:', response.status);
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const uploadDir = path.join(__dirname, '..', 'uploads', 'onlyoffice');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const docPath = path.join(uploadDir, `report_${reportId}.docx`);
    fs.writeFileSync(docPath, buffer);

    const db = getDatabase();
    db.prepare('UPDATE reports SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(reportId);

    console.log(`Document saved for report ${reportId}`);
  } catch (err) {
    console.error('Download and save document error:', err);
  }
}

module.exports = router;
