import { describe, it, expect } from 'vitest';
import {
  createDocument,
  CommandBus,
  AddTopicCommand,
  InsertParentTopicCommand,
  CopySheetCommand,
  ReplaceTextCommand,
  AddPitchSlideCommand,
  listMarkers,
  listTemplates,
  exportPdf,
  mergeDocuments,
  encryptDocumentJson,
  decryptDocumentJson,
  documentToUserTemplate,
  createFromUserTemplate,
} from '../index.js';

describe('extra v1 features', () => {
  it('InsertParentTopicCommand wraps topic', () => {
    const doc = createDocument();
    const bus = new CommandBus(doc);
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    bus.dispatch(new AddTopicCommand(sheetId, rootId, 'A'));
    const childId = bus.getDocument().sheets[0]!.rootTopic.children[0]!.id;
    bus.dispatch(new InsertParentTopicCommand(sheetId, childId, 'Parent'));
    const parent = bus.getDocument().sheets[0]!.rootTopic.children[0]!;
    expect(parent.title).toBe('Parent');
    expect(parent.children[0]!.title).toBe('A');
  });

  it('CopySheetCommand duplicates sheet', () => {
    const doc = createDocument();
    const bus = new CommandBus(doc);
    bus.dispatch(new CopySheetCommand(doc.sheets[0]!.id));
    expect(bus.getDocument().sheets.length).toBe(2);
  });

  it('ReplaceTextCommand replaces titles', () => {
    const doc = createDocument();
    doc.sheets[0]!.rootTopic.title = 'Hello World';
    const bus = new CommandBus(doc);
    bus.dispatch(new ReplaceTextCommand(doc.sheets[0]!.id, 'World', 'MyMind'));
    expect(bus.getDocument().sheets[0]!.rootTopic.title).toBe('Hello MyMind');
  });

  it('AddPitchSlideCommand appends slide', () => {
    const doc = createDocument();
    const bus = new CommandBus(doc);
    const sheet = doc.sheets[0]!;
    bus.dispatch(new AddPitchSlideCommand(sheet.id, sheet.rootTopic.id));
    expect(bus.getDocument().sheets[0]!.pitchSettings.slides.length).toBe(1);
  });

  it('marker catalog has categories', () => {
    expect(listMarkers().length).toBeGreaterThan(20);
    expect(listMarkers('priority').length).toBe(7);
  });

  it('templates >= 20', () => {
    expect(listTemplates().length).toBeGreaterThanOrEqual(20);
  });

  it('exportPdf produces pdf header', () => {
    const doc = createDocument('PDF');
    const bytes = exportPdf(doc);
    const text = new TextDecoder().decode(bytes.slice(0, 8));
    expect(text.startsWith('%PDF')).toBe(true);
  });

  it('merge / encrypt / user template', () => {
    const a = createDocument('A');
    const b = createDocument('B');
    const merged = mergeDocuments(a, [b]);
    expect(merged.sheets.length).toBe(2);
    const enc = encryptDocumentJson(JSON.stringify({ ok: 1 }), 'pwd');
    expect(decryptDocumentJson(enc, 'pwd')).toContain('ok');
    const tpl = documentToUserTemplate(a, 'MyTpl');
    const again = createFromUserTemplate(tpl);
    expect(again.title).toBe('MyTpl');
  });
});
