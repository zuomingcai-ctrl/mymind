// covers: SC-001, SH-001, SM-001, BD-001, RS-001, EL-001, ED-006, ED-011
import { describe, it, expect } from 'vitest';
import { createDocument } from '../../model/factory.js';
import { AddTopicCommand } from '../topic-commands.js';
import {
  UpdateSheetStructureCommand,
  UpdateStructureOptionsCommand,
  AddSheetCommand,
  DeleteSheetCommand,
  RenameSheetCommand,
  ClearThemeUsagesCommand,
} from '../sheet-commands.js';
import {
  AddSummaryCommand,
  AddBoundaryCommand,
  AddRelationshipCommand,
  DeleteRelationshipCommand,
} from '../structure-commands.js';
import {
  UpdateNoteCommand,
  AddLabelCommand,
  AddFloatingTopicCommand,
  PasteTopicsCommand,
  remapTopics,
} from '../element-commands.js';
import { createDefaultLayoutRegistry } from '../../layout/registry.js';
import { createMeasureFn } from '../../layout/measure.js';
import { buildFrame } from '../../render/pipeline.js';

describe('Phase 2 commands', () => {
  it('UpdateSheetStructureCommand switches structure', () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const cmd = new UpdateSheetStructureCommand(sheetId, 'tree-chart');
    const d = cmd.execute(doc);
    expect(d.sheets[0]!.structure).toBe('tree-chart');
    expect(cmd.undo(d).sheets[0]!.structure).toBe('mindmap');
  });

  it('UpdateStructureOptionsCommand patches options', () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const cmd = new UpdateStructureOptionsCommand(sheetId, {
      type: 'mindmap',
      balanced: false,
      direction: 'right',
    });
    const d = cmd.execute(doc);
    expect(d.sheets[0]!.structureOptions).toEqual({
      type: 'mindmap',
      balanced: false,
      direction: 'right',
    });
    expect(cmd.undo(d).sheets[0]!.structureOptions).toEqual({
      type: 'mindmap',
      balanced: true,
    });
  });

  it('AddSheetCommand adds sheet', () => {
    const doc = createDocument();
    const d = new AddSheetCommand('Sheet 2', 'matrix').execute(doc);
    expect(d.sheets).toHaveLength(2);
    expect(d.sheets[1]!.structure).toBe('matrix');
  });

  it('DeleteSheetCommand removes sheet', () => {
    let d = new AddSheetCommand().execute(createDocument());
    const id = d.sheets[1]!.id;
    const cmd = new DeleteSheetCommand(id);
    d = cmd.execute(d);
    expect(d.sheets).toHaveLength(1);
    expect(cmd.undo(d).sheets).toHaveLength(2);
  });

  it('RenameSheetCommand renames sheet', () => {
    const doc = createDocument();
    const cmd = new RenameSheetCommand(doc.sheets[0]!.id, 'Renamed');
    const d = cmd.execute(doc);
    expect(d.sheets[0]!.title).toBe('Renamed');
  });

  it('AddSummaryCommand creates summary', () => {
    let d = createDocument();
    const sheetId = d.sheets[0]!.id;
    const rootId = d.sheets[0]!.rootTopic.id;
    d = new AddTopicCommand(sheetId, rootId, 'a').execute(d);
    d = new AddTopicCommand(sheetId, rootId, 'b').execute(d);
    const ids = d.sheets[0]!.rootTopic.children.map((c) => c.id);
    d = new AddSummaryCommand(sheetId, rootId, [ids[0]!, ids[1]!]).execute(d);
    expect(d.sheets[0]!.summaries).toHaveLength(1);
    const layout = createDefaultLayoutRegistry().layout(d.sheets[0]!, createMeasureFn());
    const summaryTopicId = d.sheets[0]!.summaries[0]!.summaryTopicId;
    expect(layout.nodes.has(summaryTopicId)).toBe(true);
    expect(layout.edges.some((e) => e.type === 'summary')).toBe(true);

    const frame = buildFrame(d.sheets[0]!, layout);
    const edgeLayer = frame.layers.find((l) => l.type === 'edges');
    const topicLayer = frame.layers.find((l) => l.type === 'topics');
    expect(edgeLayer && edgeLayer.type === 'edges' ? edgeLayer.edges.some((e) => e.type === 'summary') : false).toBe(true);
    expect(topicLayer && topicLayer.type === 'topics' ? topicLayer.topics.has(summaryTopicId) : false).toBe(true);
  });

  it('AddBoundaryCommand creates boundary shape', () => {
    let d = createDocument();
    const sheetId = d.sheets[0]!.id;
    const rootId = d.sheets[0]!.rootTopic.id;
    d = new AddTopicCommand(sheetId, rootId, 'a').execute(d);
    const childId = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddBoundaryCommand(sheetId, [rootId, childId], 'Group').execute(d);
    const layout = createDefaultLayoutRegistry().layout(d.sheets[0]!, createMeasureFn());
    expect(layout.extraShapes.some((s) => s.type === 'boundary')).toBe(true);
  });

  it('AddRelationshipCommand adds edge', () => {
    let d = createDocument();
    const sheetId = d.sheets[0]!.id;
    const rootId = d.sheets[0]!.rootTopic.id;
    d = new AddTopicCommand(sheetId, rootId, 'a').execute(d);
    const childId = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddRelationshipCommand(sheetId, rootId, childId).execute(d);
    const layout = createDefaultLayoutRegistry().layout(d.sheets[0]!, createMeasureFn());
    expect(layout.edges.some((e) => e.type === 'relationship')).toBe(true);
  });

  it('relationship rejects self-loop', () => {
    const doc = createDocument();
    const rootId = doc.sheets[0]!.rootTopic.id;
    expect(() =>
      new AddRelationshipCommand(doc.sheets[0]!.id, rootId, rootId).execute(doc),
    ).toThrow();
  });

  it('UpdateNoteCommand sets note', () => {
    const doc = createDocument();
    const rootId = doc.sheets[0]!.rootTopic.id;
    const d = new UpdateNoteCommand(doc.sheets[0]!.id, rootId, 'note text').execute(doc);
    expect(d.sheets[0]!.rootTopic.note).toBe('note text');
  });

  it('AddLabelCommand adds label', () => {
    const doc = createDocument();
    const rootId = doc.sheets[0]!.rootTopic.id;
    const d = new AddLabelCommand(doc.sheets[0]!.id, rootId, 'urgent').execute(doc);
    expect(d.sheets[0]!.rootTopic.labels[0]!.text).toBe('urgent');
  });

  it('AddFloatingTopicCommand adds floating topic', () => {
    const doc = createDocument();
    const d = new AddFloatingTopicCommand(doc.sheets[0]!.id).execute(doc);
    expect(d.sheets[0]!.floatingTopics).toHaveLength(1);
  });

  it('PasteTopicsCommand remaps ids', () => {
    let d = createDocument();
    const sheetId = d.sheets[0]!.id;
    const rootId = d.sheets[0]!.rootTopic.id;
    d = new AddTopicCommand(sheetId, rootId, 'copy').execute(d);
    const topic = d.sheets[0]!.rootTopic.children[0]!;
    const remapped = remapTopics([topic]);
    expect(remapped[0]!.id).not.toBe(topic.id);
    d = new PasteTopicsCommand(sheetId, rootId, {
      format: 'mymind/topics/v1',
      sourceSheetId: sheetId,
      topics: [topic],
    }).execute(d);
    expect(d.sheets[0]!.rootTopic.children.length).toBeGreaterThan(1);
  });

  it('ClearThemeUsagesCommand resets every sheet using the theme', () => {
    let d = createDocument();
    const a = d.sheets[0]!.id;
    d = new AddSheetCommand('Sheet 2').execute(d);
    const b = d.sheets[1]!.id;
    d = {
      ...d,
      sheets: d.sheets.map((s) => ({
        ...s,
        canvasSettings: { ...s.canvasSettings, themeId: 'custom-gone' },
      })),
    };
    const cmd = new ClearThemeUsagesCommand('custom-gone', 'default');
    const next = cmd.execute(d);
    expect(next.sheets.every((s) => s.canvasSettings.themeId === 'default')).toBe(true);
    const undone = cmd.undo(next);
    expect(undone.sheets.find((s) => s.id === a)!.canvasSettings.themeId).toBe('custom-gone');
    expect(undone.sheets.find((s) => s.id === b)!.canvasSettings.themeId).toBe('custom-gone');
  });
});
