const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const fs = require('fs');
const path = require('path');

const REPORT_TYPE_NAMES = {
  ship: '船舶勘验报告',
  water: '水土保持监测报告',
  port: '港口工程报告',
  ocean: '海洋环境影响评价报告',
  channel: '航道通航条件影响评价报告'
};

function getChineseFontPath() {
  const windowsFonts = 'C:/Windows/Fonts';
  const fontCandidates = ['simhei.ttf', 'NotoSansSC-VF.ttf', 'NotoSerifSC-VF.ttf', 'simkai.ttf', 'simsunb.ttf'];
  
  for (const font of fontCandidates) {
    const fontPath = path.join(windowsFonts, font);
    if (fs.existsSync(fontPath)) {
      return fontPath;
    }
  }
  
  return null;
}

function generatePDF(reportData, options = {}) {
  const { watermark = false } = options;
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));

  const chineseFont = getChineseFontPath();
  if (chineseFont) {
    doc.registerFont('Chinese', chineseFont);
    doc.font('Chinese');
  }

  const content = reportData.content || {};
  const typeName = REPORT_TYPE_NAMES[reportData.type] || reportData.type;

  doc.fontSize(24).text(reportData.name || '报告', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`报告编号: ${reportData.code || ''}`, { align: 'center' });
  doc.fontSize(12).text(`报告类型: ${typeName}`, { align: 'center' });
  doc.fontSize(12).text(`编制者: ${reportData.creator_name || ''}`, { align: 'center' });
  doc.moveDown(1);

  if (watermark) {
    doc.fontSize(10).fillColor('#999').text(`水印: ${options.watermarkText || '福建港航船舶报告'}`, { align: 'center' });
    doc.fillColor('#000');
  }

  doc.moveDown(1);
  doc.fontSize(14).text('报告正文', { align: 'left' });
  doc.moveDown(0.5);

  doc.fontSize(11);

  if (content.shipName) {
    doc.fontSize(12).text('船舶基本信息');
    doc.fontSize(10);
    doc.text(`船舶名称: ${content.shipName || ''}`);
    doc.text(`船舶类型: ${content.shipType || ''}`);
    doc.text(`建造日期: ${content.buildDate || ''}`);
    doc.text(`总吨位: ${content.tonnage || ''}`);
    doc.moveDown(0.5);
  }

  if (content.projectBackground) {
    doc.fontSize(12).text('项目背景');
    doc.fontSize(10).text(content.projectBackground);
    doc.moveDown(0.5);
  }

  if (content.inspectionPurpose) {
    doc.fontSize(12).text('勘验目的');
    doc.fontSize(10).text(content.inspectionPurpose);
    doc.moveDown(0.5);
  }

  if (content.hullStructure) {
    doc.fontSize(12).text('船体结构检查');
    doc.fontSize(10).text(content.hullStructure);
    doc.moveDown(0.5);
  }

  if (content.engineEquipment) {
    doc.fontSize(12).text('轮机设备检查');
    doc.fontSize(10).text(content.engineEquipment);
    doc.moveDown(0.5);
  }

  if (content.electricalEquipment) {
    doc.fontSize(12).text('电气设备检查');
    doc.fontSize(10).text(content.electricalEquipment);
    doc.moveDown(0.5);
  }

  if (content.inspectionConclusion) {
    doc.fontSize(12).text('勘验结论');
    doc.fontSize(10).text(content.inspectionConclusion);
    doc.moveDown(0.5);
  }

  if (content.recommendations) {
    doc.fontSize(12).text('建议措施');
    doc.fontSize(10).text(content.recommendations);
    doc.moveDown(0.5);
  }

  if (reportData.members && reportData.members.length > 0) {
    doc.fontSize(12).text('团队成员');
    doc.fontSize(10);
    reportData.members.forEach(m => doc.text(`${m.name} (${m.role})`));
    doc.moveDown(0.5);
  }

  if (reportData.reviews && reportData.reviews.length > 0) {
    doc.fontSize(12).text('审核记录');
    doc.fontSize(10);
    reportData.reviews.forEach(r => {
      const resultText = r.result === 'approved' ? '通过' : r.result === 'rejected' ? '退回' : '待审核';
      doc.text(`${r.reviewer_name} - ${resultText}`);
      if (r.comment) doc.text(`  意见: ${r.comment}`);
    });
  }

  doc.fontSize(10).text(`导出时间: ${new Date().toLocaleString('zh-CN')}`, { align: 'right' });

  doc.end();

  return new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function generateDOCX(reportData, options = {}) {
  const { watermark = false } = options;
  const content = reportData.content || {};
  const typeName = REPORT_TYPE_NAMES[reportData.type] || reportData.type;

  const children = [
    new Paragraph({
      text: reportData.name || '报告',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `报告编号: ${reportData.code || ''}`, size: 24 }),
      ],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `报告类型: ${typeName}`, size: 24 }),
      ],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `编制者: ${reportData.creator_name || ''}`, size: 24 }),
      ],
      alignment: AlignmentType.CENTER
    }),
    new Paragraph({ text: '' }),
  ];

  if (watermark) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `水印: ${options.watermarkText || '福建港航船舶报告'}`, size: 20, color: '999999' })],
      alignment: AlignmentType.CENTER
    }));
    children.push(new Paragraph({ text: '' }));
  }

  children.push(new Paragraph({ text: '报告正文', heading: HeadingLevel.HEADING_1 }));
  children.push(new Paragraph({ text: '' }));

  if (content.shipName) {
    children.push(new Paragraph({ text: '船舶基本信息', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ children: [new TextRun({ text: `船舶名称: ${content.shipName || ''}` })] }));
    children.push(new Paragraph({ children: [new TextRun({ text: `船舶类型: ${content.shipType || ''}` })] }));
    children.push(new Paragraph({ children: [new TextRun({ text: `建造日期: ${content.buildDate || ''}` })] }));
    children.push(new Paragraph({ children: [new TextRun({ text: `总吨位: ${content.tonnage || ''}` })] }));
    children.push(new Paragraph({ text: '' }));
  }

  if (content.projectBackground) {
    children.push(new Paragraph({ text: '项目背景', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ children: [new TextRun({ text: content.projectBackground })] }));
    children.push(new Paragraph({ text: '' }));
  }

  if (content.inspectionPurpose) {
    children.push(new Paragraph({ text: '勘验目的', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ children: [new TextRun({ text: content.inspectionPurpose })] }));
    children.push(new Paragraph({ text: '' }));
  }

  if (content.hullStructure) {
    children.push(new Paragraph({ text: '船体结构检查', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ children: [new TextRun({ text: content.hullStructure })] }));
    children.push(new Paragraph({ text: '' }));
  }

  if (content.engineEquipment) {
    children.push(new Paragraph({ text: '轮机设备检查', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ children: [new TextRun({ text: content.engineEquipment })] }));
    children.push(new Paragraph({ text: '' }));
  }

  if (content.electricalEquipment) {
    children.push(new Paragraph({ text: '电气设备检查', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ children: [new TextRun({ text: content.electricalEquipment })] }));
    children.push(new Paragraph({ text: '' }));
  }

  if (content.inspectionConclusion) {
    children.push(new Paragraph({ text: '勘验结论', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ children: [new TextRun({ text: content.inspectionConclusion })] }));
    children.push(new Paragraph({ text: '' }));
  }

  if (content.recommendations) {
    children.push(new Paragraph({ text: '建议措施', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ children: [new TextRun({ text: content.recommendations })] }));
    children.push(new Paragraph({ text: '' }));
  }

  if (reportData.members && reportData.members.length > 0) {
    children.push(new Paragraph({ text: '团队成员', heading: HeadingLevel.HEADING_2 }));
    reportData.members.forEach(m => {
      children.push(new Paragraph({ children: [new TextRun({ text: `${m.name} (${m.role})` })] }));
    });
    children.push(new Paragraph({ text: '' }));
  }

  if (reportData.reviews && reportData.reviews.length > 0) {
    children.push(new Paragraph({ text: '审核记录', heading: HeadingLevel.HEADING_2 }));
    reportData.reviews.forEach(r => {
      const resultText = r.result === 'approved' ? '通过' : r.result === 'rejected' ? '退回' : '待审核';
      children.push(new Paragraph({ children: [new TextRun({ text: `${r.reviewer_name} - ${resultText}` })] }));
      if (r.comment) {
        children.push(new Paragraph({ children: [new TextRun({ text: `  意见: ${r.comment}`, italics: true })] }));
      }
    });
    children.push(new Paragraph({ text: '' }));
  }

  children.push(new Paragraph({
    children: [new TextRun({ text: `导出时间: ${new Date().toLocaleString('zh-CN')}`, size: 20 })],
    alignment: AlignmentType.RIGHT
  }));

  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  });

  return await Packer.toBuffer(doc);
}

module.exports = { generatePDF, generateDOCX };