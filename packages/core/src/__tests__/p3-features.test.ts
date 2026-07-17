import { describe, it, expect } from 'vitest';
import {
  createDocument,
  CommandBus,
  AddTopicCommand,
  AddTodoCommand,
  ToggleTodoCommand,
  AddCommentCommand,
  DeleteCommentCommand,
  UpdateCommentCommand,
  UpdateZoneStyleCommand,
  AddZoneCommand,
  AddRelationshipCommand,
  SearchService,
  nextTextTransform,
  applyTextTransform,
  todoProgressMarkerId,
  syncProgressMarkers,
  countTopics,
  topicWordStats,
  exportTextBundle,
  exportTextBundleZip,
  exportPptx,
  encryptDocumentJson,
  decryptDocumentJson,
  encryptDocumentJsonV2,
  decryptDocumentJsonV2,
  isEncryptedV2,
} from '../index.js';

describe('P3 utilities', () => {
  it('cycles text transform modes', () => {
    expect(nextTextTransform('none')).toBe('capitalize');
    expect(nextTextTransform('capitalize')).toBe('uppercase');
    expect(nextTextTransform('uppercase')).toBe('lowercase');
    expect(nextTextTransform('lowercase')).toBe('none');
    expect(applyTextTransform('hello', 'capitalize')).toBe('Hello');
  });

  it('maps todo progress to markers', () => {
    expect(todoProgressMarkerId([])).toBe('progress-0');
    expect(todoProgressMarkerId([{ id: '1', text: 'a', checked: true, order: 0 }])).toBe('progress-100');
    expect(syncProgressMarkers(['priority-1'], [{ id: '1', text: 'a', checked: false, order: 0 }])).toEqual([
      'priority-1',
      'progress-0',
    ]);
  });

  it('counts topics and chars', () => {
    const doc = createDocument();
    const bus = new CommandBus(doc);
    const sheet = doc.sheets[0]!;
    bus.dispatch(new AddTopicCommand(sheet.id, sheet.rootTopic.id, '子'));
    const after = bus.getDocument().sheets[0]!;
    expect(countTopics(after.rootTopic)).toBe(2);
    expect(topicWordStats(after.rootTopic.children[0]!).titleChars).toBe(1);
  });
});

describe('P3 commands', () => {
  it('ToggleTodoCommand syncs progress marker (TD-005)', () => {
    const doc = createDocument();
    const bus = new CommandBus(doc);
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    bus.dispatch(new AddTodoCommand(sheetId, rootId, '任务'));
    const todoId = bus.getDocument().sheets[0]!.rootTopic.todos![0]!.id;
    bus.dispatch(new ToggleTodoCommand(sheetId, rootId, todoId));
    const markers = bus.getDocument().sheets[0]!.rootTopic.markers;
    expect(markers).toContain('progress-100');
  });

  it('comment delete/update', () => {
    const doc = createDocument();
    const bus = new CommandBus(doc);
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    bus.dispatch(new AddCommentCommand(sheetId, rootId, 'hello'));
    const cid = bus.getDocument().sheets[0]!.rootTopic.comments![0]!.id;
    bus.dispatch(new UpdateCommentCommand(sheetId, rootId, cid, 'world'));
    expect(bus.getDocument().sheets[0]!.rootTopic.comments![0]!.text).toBe('world');
    bus.dispatch(new DeleteCommentCommand(sheetId, rootId, cid));
    expect(bus.getDocument().sheets[0]!.rootTopic.comments ?? []).toHaveLength(0);
  });

  it('UpdateZoneStyleCommand', () => {
    const doc = createDocument();
    const bus = new CommandBus(doc);
    const sheetId = doc.sheets[0]!.id;
    bus.dispatch(
      new AddZoneCommand(sheetId, {
        topicIds: [],
        x: 0,
        y: 0,
        width: 100,
        height: 80,
        collapsed: false,
        showTitle: true,
        title: 'Z',
      }),
    );
    const zoneId = bus.getDocument().sheets[0]!.zones[0]!.id;
    bus.dispatch(new UpdateZoneStyleCommand(sheetId, zoneId, { style: { borderColor: '#f00' }, aspectPreset: 'a4' }));
    const z = bus.getDocument().sheets[0]!.zones[0]!;
    expect(z.style?.borderColor).toBe('#f00');
    expect(z.aspectPreset).toBe('a4');
  });

  it('relationship to zone endpoint (ZN-008)', () => {
    const doc = createDocument();
    const bus = new CommandBus(doc);
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    bus.dispatch(
      new AddZoneCommand(sheetId, {
        topicIds: [],
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        collapsed: false,
        showTitle: false,
      }),
    );
    const zoneId = bus.getDocument().sheets[0]!.zones[0]!.id;
    bus.dispatch(new AddRelationshipCommand(sheetId, rootId, zoneId, '到专区', 'topic', 'zone'));
    const rel = bus.getDocument().sheets[0]!.relationships[0]!;
    expect(rel.fromKind).toBe('topic');
    expect(rel.toKind).toBe('zone');
  });
});

describe('P3 search SE-006', () => {
  it('optionally includes relationship titles', () => {
    const doc = createDocument();
    doc.sheets[0]!.relationships.push({
      id: 'r1',
      fromTopicId: doc.sheets[0]!.rootTopic.id,
      toTopicId: doc.sheets[0]!.rootTopic.id + 'x',
      title: '依赖链路',
    });
    const svc = new SearchService();
    expect(svc.searchDocument(doc, '依赖').length).toBe(0);
    expect(svc.searchDocument(doc, '依赖', { includeRelationships: true }).length).toBe(1);
  });
});

describe('P3 IO', () => {
  it('exports textbundle zip', async () => {
    const doc = createDocument('TB');
    const { infoJson, textMd } = exportTextBundle(doc);
    expect(infoJson).toContain('mymind');
    expect(textMd).toContain('# TB');
    const zip = await exportTextBundleZip(doc);
    expect(zip.byteLength).toBeGreaterThan(40);
  });

  it('exports real pptx bytes', async () => {
    const doc = createDocument('Deck');
    const bytes = await exportPptx(doc);
    // PK zip header
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('legacy XOR encrypt still works', () => {
    const enc = encryptDocumentJson('{"a":1}', 'pwd');
    expect(decryptDocumentJson(enc, 'pwd')).toContain('"a"');
  });

  it('v2 AES encrypt round-trip', async () => {
    const enc = await encryptDocumentJsonV2('{"hello":true}', 'secret');
    expect(isEncryptedV2(enc)).toBe(true);
    const plain = await decryptDocumentJsonV2(enc, 'secret');
    expect(plain).toContain('hello');
  });
});
