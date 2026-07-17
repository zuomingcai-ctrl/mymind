// covers: TE-002, EL-005, §13.4, SR-001, TH-001
import { describe, it, expect } from 'vitest';
import { runsToPlain, plainToRuns, syncTitleFromRuns, measureRunsWidth } from '../inline-run.js';
import { createDocument } from '../factory.js';
import {
  UpdateTopicRichTitleCommand,
  UpdateImageCommand,
  UpdateHyperlinkCommand,
  AddAttachmentCommand,
} from '../../commands/media-commands.js';
import { AddZoneCommand, AddTodoCommand, ToggleTodoCommand, todoCompletionRate } from '../../commands/zone-todo-commands.js';
import { SearchService, getBranchTopicIds } from '../../search/service.js';
import { sanitizeHtml } from '../../utils/sanitize.js';
import { TextMeasurer } from '../../layout/measure.js';
import { listThemes } from '../../theme/presets.js';
import { generatePalette } from '../../theme/color-gen.js';
import { exportMarkdown, exportOpml, exportSvg } from '../../io/exporters/index.js';
import { importMarkdown, importOpml } from '../../io/importers/index.js';
import { createDefaultLayoutRegistry } from '../../layout/registry.js';
import { createMeasureFn } from '../../layout/measure.js';
import { AddTopicCommand } from '../../commands/topic-commands.js';

describe('Phase 3 core', () => {
  it('runsToPlain and syncTitleFromRuns', () => {
    const runs = [{ text: 'Hello ', bold: true }, { text: 'World' }];
    expect(runsToPlain(runs)).toBe('Hello World');
    const synced = syncTitleFromRuns(runs);
    expect(synced.title).toBe('Hello World');
    expect(synced.titleRich).toEqual(runs);
  });

  it('measureRunsWidth accounts for bold', () => {
    const plain = measureRunsWidth([{ text: 'abc' }]);
    const bold = measureRunsWidth([{ text: 'abc', bold: true }]);
    expect(bold).toBeGreaterThan(plain);
  });

  it('UpdateTopicRichTitleCommand syncs title', () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    const d = new UpdateTopicRichTitleCommand(sheetId, rootId, [
      { text: 'Rich ', bold: true },
      { text: 'Title' },
    ]).execute(doc);
    expect(d.sheets[0]!.rootTopic.title).toBe('Rich Title');
    expect(d.sheets[0]!.rootTopic.titleRich?.length).toBe(2);
  });

  it('UpdateImageCommand sets image and affects measure', () => {
    const doc = createDocument();
    const rootId = doc.sheets[0]!.rootTopic.id;
    const d = new UpdateImageCommand(doc.sheets[0]!.id, rootId, {
      src: 'data:image/png;base64,abc',
      width: 100,
      height: 50,
    }).execute(doc);
    const m = new TextMeasurer().measureTopic(d.sheets[0]!.rootTopic, 0);
    expect(m.height).toBeGreaterThan(50);
  });

  it('UpdateHyperlinkCommand stores file path', () => {
    const doc = createDocument();
    const rootId = doc.sheets[0]!.rootTopic.id;
    const d = new UpdateHyperlinkCommand(doc.sheets[0]!.id, rootId, {
      type: 'file',
      target: '/path/to/file.pdf',
    }).execute(doc);
    expect(d.sheets[0]!.rootTopic.hyperlink?.type).toBe('file');
  });

  it('AddAttachmentCommand adds blobRef attachment', () => {
    const doc = createDocument();
    const rootId = doc.sheets[0]!.rootTopic.id;
    const d = new AddAttachmentCommand(doc.sheets[0]!.id, rootId, {
      name: 'doc.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      blobRef: 'blob-key-1',
    }).execute(doc);
    expect(d.sheets[0]!.rootTopic.attachments[0]!.blobRef).toBe('blob-key-1');
  });

  it('sanitizeHtml removes script tags', () => {
    const clean = sanitizeHtml('<p>Hi</p><script>alert(1)</script>');
    expect(clean).not.toContain('script');
    expect(clean).toContain('Hi');
  });

  it('listThemes has at least 10 themes', () => {
    expect(listThemes().length).toBeGreaterThanOrEqual(10);
  });

  it('generatePalette produces 5 colors', () => {
    expect(generatePalette('seed').length).toBe(5);
  });

  it('SearchService finds by title and note', () => {
    let doc = createDocument();
    doc.sheets[0]!.rootTopic.note = 'secret keyword';
    const svc = new SearchService();
    expect(svc.searchDocument(doc, 'keyword').length).toBeGreaterThan(0);
    expect(svc.searchDocument(doc, '中心').length).toBeGreaterThan(0);
  });

  it('getBranchTopicIds returns focus branch only', () => {
    let d = createDocument();
    const sheetId = d.sheets[0]!.id;
    d = new AddTopicCommand(sheetId, d.sheets[0]!.rootTopic.id, 'a').execute(d);
    const childId = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddTopicCommand(sheetId, childId, 'b').execute(d);
    const ids = getBranchTopicIds(d.sheets[0]!.rootTopic, childId);
    expect(ids.has(childId)).toBe(true);
    expect(ids.has(d.sheets[0]!.rootTopic.id)).toBe(true);
  });

  it('AddZoneCommand rejects central topic', () => {
    const doc = createDocument();
    const rootId = doc.sheets[0]!.rootTopic.id;
    expect(() =>
      new AddZoneCommand(doc.sheets[0]!.id, {
        topicIds: [rootId],
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        collapsed: false,
        showTitle: true,
      }).execute(doc),
    ).toThrow();
  });

  it('todo completion rate shows 2/5', () => {
    const todos = [
      { id: '1', text: 'a', checked: true, order: 0 },
      { id: '2', text: 'b', checked: true, order: 1 },
      { id: '3', text: 'c', checked: false, order: 2 },
      { id: '4', text: 'd', checked: false, order: 3 },
      { id: '5', text: 'e', checked: false, order: 4 },
    ];
    expect(todoCompletionRate(todos).label).toBe('2/5');
  });

  it('markdown export/import roundtrip', () => {
    const doc = createDocument('Test');
    const md = exportMarkdown(doc);
    expect(md).toContain('# Test');
    const root = importMarkdown('# Root\n## Child\n### Grand');
    expect(root.children[0]!.title).toBe('Root');
    expect(root.children[0]!.children[0]!.title).toBe('Child');
  });

  it('opml export contains outline', () => {
    const doc = createDocument();
    const opml = exportOpml(doc);
    expect(opml).toContain('<opml');
    expect(opml).toContain('中心主题');
  });

  it('svg export includes structure elements', () => {
    let d = createDocument();
    const sheet = d.sheets[0]!;
    d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'a').execute(d);
    const layout = createDefaultLayoutRegistry().layout(d.sheets[0]!, createMeasureFn());
    const svg = exportSvg(layout);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
  });
});
