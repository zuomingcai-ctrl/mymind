import type { MindMapDocument, LayoutResult, Sheet, Topic } from '../../model/types.js';
import { extraShapeSvgElement } from '../../render/draw-extra-shape.js';

export function exportMarkdown(doc: MindMapDocument, sheetId?: string): string {
  const sheets = sheetId ? doc.sheets.filter((s) => s.id === sheetId) : doc.sheets;
  const lines: string[] = [`# ${doc.title}`, ''];
  for (const sheet of sheets) {
    lines.push(`## ${sheet.title}`, '');
    walkMarkdown(sheet.rootTopic, 0, lines);
    lines.push('');
  }
  return lines.join('\n');
}

function walkMarkdown(topic: Topic, depth: number, lines: string[]) {
  lines.push(`${'#'.repeat(Math.min(depth + 3, 6))} ${topic.title}`);
  if (topic.note) lines.push('', topic.note, '');
  for (const child of topic.children) walkMarkdown(child, depth + 1, lines);
}

export function exportOpml(doc: MindMapDocument, sheetId?: string): string {
  const sheets = sheetId ? doc.sheets.filter((s) => s.id === sheetId) : doc.sheets;
  const body = sheets
    .map(
      (sheet) =>
        `<outline text="${escapeXml(sheet.title)}">${topicToOpml(sheet.rootTopic)}</outline>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>${escapeXml(doc.title)}</title></head><body>${body}</body></opml>`;
}

function topicToOpml(topic: Topic): string {
  const children = topic.children.map((c) => topicToOpml(c)).join('');
  return `<outline text="${escapeXml(topic.title)}">${children}</outline>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

export function exportSvg(
  layout: LayoutResult,
  background = '#ffffff',
  transparent = false,
  topics?: Map<string, Topic>,
): string {
  const { bounds } = layout;
  const w = Math.max(bounds.width + 40, 100);
  const h = Math.max(bounds.height + 40, 100);
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${bounds.x - 20} ${bounds.y - 20} ${w} ${h}">`,
  ];
  if (!transparent) {
    parts.push(
      `<rect x="${bounds.x - 20}" y="${bounds.y - 20}" width="${w}" height="${h}" fill="${background}"/>`,
    );
  }
  for (const edge of layout.edges) {
    const pts = edge.points.map((p) => `${p.x},${p.y}`).join(' ');
    parts.push(`<polyline points="${pts}" fill="none" stroke="#999" stroke-width="2"/>`);
  }
  for (const node of layout.nodes.values()) {
    if (node.hidden) continue;
    const title = topics?.get(node.id)?.title ?? '';
    parts.push(
      `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="6" fill="#E8F4FD" stroke="#4A90D9"/>`,
    );
    if (title) {
      parts.push(
        `<text x="${node.x + node.width / 2}" y="${node.y + node.height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#333">${escapeXml(title)}</text>`,
      );
    }
  }
  for (const shape of layout.extraShapes) {
    parts.push(extraShapeSvgElement(shape));
  }
  parts.push('</svg>');
  return parts.join('\n');
}

/** Minimal valid PDF with text content (PDF P1) */
export function exportPdf(doc: MindMapDocument, sheetId?: string): Uint8Array {
  const md = exportMarkdown(doc, sheetId);
  const lines = md.split('\n').slice(0, 60);
  const contentLines = lines.map((l, i) => `BT /F1 11 Tf 50 ${780 - i * 14} Td (${escapePdf(l)}) Tj ET`);
  const stream = contentLines.join('\n');
  const objects: string[] = [];
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj');
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj');
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj',
  );
  objects.push(`4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`);
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

/** @deprecated use exportPdf */
export function exportPdfPlaceholder(markdown: string): Uint8Array {
  const lines = markdown.split('\n').slice(0, 40);
  const contentLines = lines.map((l, i) => `BT /F1 11 Tf 50 ${780 - i * 14} Td (${escapePdf(l)}) Tj ET`);
  const stream = contentLines.join('\n');
  let pdf = '%PDF-1.4\n';
  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj',
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj',
  ];
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function escapePdf(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** OOXML Word document (simplified single-part) */
export function exportWordOutline(doc: MindMapDocument): string {
  const paras: string[] = [
    `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>${escapeXml(doc.title)}</w:t></w:r></w:p>`,
  ];
  function walk(t: Topic, depth: number) {
    const style = depth === 0 ? 'Heading1' : depth === 1 ? 'Heading2' : 'Normal';
    paras.push(
      `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t>${escapeXml(t.title)}</w:t></w:r></w:p>`,
    );
    if (t.note) {
      paras.push(`<w:p><w:r><w:t>${escapeXml(t.note)}</w:t></w:r></w:p>`);
    }
    for (const c of t.children) walk(c, depth + 1);
  }
  for (const sheet of doc.sheets) walk(sheet.rootTopic, 0);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paras.join('')}<w:sectPr/></w:body>
</w:document>`;
}

/** SpreadsheetML (Excel-compatible XML) */
export function exportExcelXml(doc: MindMapDocument, sheetId?: string): string {
  const sheet = sheetId ? doc.sheets.find((s) => s.id === sheetId) : doc.sheets[0];
  if (!sheet) return '';
  const rows: string[] = [
    `<Row><Cell><Data ss:Type="String">Title</Data></Cell><Cell><Data ss:Type="String">Depth</Data></Cell><Cell><Data ss:Type="String">Note</Data></Cell></Row>`,
  ];
  function walk(t: Topic, depth: number) {
    rows.push(
      `<Row><Cell><Data ss:Type="String">${escapeXml(t.title)}</Data></Cell><Cell><Data ss:Type="Number">${depth}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(t.note ?? '')}</Data></Cell></Row>`,
    );
    for (const c of t.children) walk(c, depth + 1);
  }
  walk(sheet.rootTopic, 0);
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${escapeXml(sheet.title)}"><Table>${rows.join('')}</Table></Worksheet>
</Workbook>`;
}

export function exportExcelCsv(doc: MindMapDocument, sheetId?: string): string {
  const sheet = sheetId ? doc.sheets.find((s) => s.id === sheetId) : doc.sheets[0];
  if (!sheet) return '';
  const rows: string[] = ['Title,Depth,Note'];
  function walk(t: Topic, depth: number) {
    rows.push(`"${t.title.replace(/"/g, '""')}",${depth},"${(t.note ?? '').replace(/"/g, '""')}"`);
    for (const c of t.children) walk(c, depth + 1);
  }
  walk(sheet.rootTopic, 0);
  return rows.join('\n');
}

/** Simple PPT-like outline as HTML slides (openable) + text fallback */
export function exportPptxOutline(doc: MindMapDocument, sheet?: Sheet): string {
  const target = sheet ?? doc.sheets[0];
  if (!target) return '';
  const slides =
    target.pitchSettings.slides.length > 0
      ? target.pitchSettings.slides
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((s) => findTitle(target.rootTopic, s.topicId) ?? s.topicId)
      : collectTitles(target.rootTopic);
  const sections = slides
    .map(
      (title, i) =>
        `<section class="slide"><h1>Slide ${i + 1}</h1><h2>${escapeXml(title)}</h2></section>`,
    )
    .join('\n');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeXml(doc.title)}</title>
<style>body{font-family:sans-serif;margin:0}.slide{min-height:100vh;padding:48px;border-bottom:1px solid #ddd;page-break-after:always}</style>
</head><body>${sections}</body></html>`;
}

/** @deprecated */
export function exportPptxPlaceholder(doc: MindMapDocument): string {
  return exportPptxOutline(doc);
}

export function exportTextBundle(doc: MindMapDocument): { infoJson: string; textMd: string } {
  return {
    infoJson: JSON.stringify(
      {
        version: 2,
        type: 'net.daringfireball.markdown',
        creatorIdentifier: 'com.mymind.app',
        transient: false,
      },
      null,
      2,
    ),
    textMd: exportMarkdown(doc),
  };
}

function findTitle(root: Topic, id: string): string | null {
  if (root.id === id) return root.title;
  for (const c of root.children) {
    const f = findTitle(c, id);
    if (f) return f;
  }
  return null;
}

function collectTitles(root: Topic): string[] {
  const out = [root.title];
  for (const c of root.children) out.push(...collectTitles(c));
  return out;
}
