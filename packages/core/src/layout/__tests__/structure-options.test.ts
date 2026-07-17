// covers: ST-003–009 option semantics
import { describe, it, expect } from 'vitest';
import { createDocument, createTopic } from '../../model/factory.js';
import { AddTopicCommand } from '../../commands/topic-commands.js';
import { defaultStructureOptions } from '../../model/types.js';
import { createMeasureFn } from '../measure.js';
import { createDefaultLayoutRegistry } from '../registry.js';
import { sortTopicsByDate } from '../timeline.js';

describe('structure option semantics', () => {
  const measure = createMeasureFn();
  const registry = createDefaultLayoutRegistry();

  it('defaults align with feature spec', () => {
    expect(defaultStructureOptions('fishbone')).toMatchObject({ headPosition: 'right' });
    expect(defaultStructureOptions('brace-map')).toMatchObject({
      braceSide: 'right',
      partPosition: 'opposite',
    });
    const tt = defaultStructureOptions('tree-table') as Extract<
      ReturnType<typeof defaultStructureOptions>,
      { type: 'tree-table' }
    >;
    expect(tt.columns.map((c) => c.field)).toEqual(['title', 'note']);
  });

  it('tree-chart bottom-up places root below children', () => {
    const doc = createDocument('x', 'tree-chart');
    const sheet = doc.sheets[0]!;
    sheet.structureOptions = { type: 'tree-chart', direction: 'bottom-up' };
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'c1').execute(doc);
    const rootId = d.sheets[0]!.rootTopic.id;
    const childId = d.sheets[0]!.rootTopic.children[0]!.id;
    const result = registry.layout(d.sheets[0]!, measure);
    expect(result.nodes.get(rootId)!.y).toBeGreaterThan(result.nodes.get(childId)!.y);
  });

  it('timeline vertical places events along Y and respects axis', () => {
    const doc = createDocument('x', 'timeline');
    const sheet = doc.sheets[0]!;
    sheet.structureOptions = {
      type: 'timeline',
      axis: 'vertical',
      alternate: true,
      showScale: true,
    };
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'a').execute(doc);
    d = new AddTopicCommand(sheet.id, d.sheets[0]!.rootTopic.id, 'b').execute(d);
    const result = registry.layout(d.sheets[0]!, measure);
    const root = result.nodes.get(d.sheets[0]!.rootTopic.id)!;
    const children = [...result.nodes.values()].filter((n) => n.depth === 1);
    expect(children.every((n) => n.y > root.y)).toBe(true);
    const axis = result.extraShapes.find((s) => s.type === 'timeline-axis');
    expect(axis).toBeDefined();
    expect(axis!.bounds.height).toBeGreaterThan(axis!.bounds.width);
  });

  it('timeline sorts children by date', () => {
    const topics = [
      createTopic('undated'),
      { ...createTopic('late'), date: '2026-07-20' },
      { ...createTopic('early'), date: '2026-07-01' },
    ];
    expect(sortTopicsByDate(topics).map((t) => t.title)).toEqual(['early', 'late', 'undated']);
  });

  it('timeline date order affects layout sequence', () => {
    const doc = createDocument('x', 'timeline');
    const sheet = doc.sheets[0]!;
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'late').execute(doc);
    d = new AddTopicCommand(sheet.id, d.sheets[0]!.rootTopic.id, 'early').execute(d);
    d = {
      ...d,
      sheets: d.sheets.map((s) => ({
        ...s,
        rootTopic: {
          ...s.rootTopic,
          children: s.rootTopic.children.map((c) =>
            c.title === 'early'
              ? { ...c, date: '2026-01-01' }
              : c.title === 'late'
                ? { ...c, date: '2026-12-01' }
                : c,
          ),
        },
      })),
    };
    const result = registry.layout(d.sheets[0]!, measure);
    const early = d.sheets[0]!.rootTopic.children.find((c) => c.title === 'early')!;
    const late = d.sheets[0]!.rootTopic.children.find((c) => c.title === 'late')!;
    expect(result.nodes.get(early.id)!.x).toBeLessThan(result.nodes.get(late.id)!.x);
  });

  it('brace-map partPosition same stacks parts beside root column', () => {
    const doc = createDocument('x', 'brace-map');
    const sheet = doc.sheets[0]!;
    sheet.structureOptions = {
      type: 'brace-map',
      braceSide: 'left',
      partPosition: 'same',
    };
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'p1').execute(doc);
    d = new AddTopicCommand(sheet.id, d.sheets[0]!.rootTopic.id, 'p2').execute(d);
    const result = registry.layout(d.sheets[0]!, measure);
    expect(result.extraShapes.some((s) => s.type === 'brace')).toBe(true);
    expect(result.nodes.size).toBeGreaterThanOrEqual(3);
  });

  it('brace-map lays out nested descendants with nested braces', () => {
    const doc = createDocument('x', 'brace-map');
    const sheet = doc.sheets[0]!;
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'part').execute(doc);
    const partId = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddTopicCommand(sheet.id, partId, 'sub').execute(d);
    const result = registry.layout(d.sheets[0]!, measure);
    const braces = result.extraShapes.filter((s) => s.type === 'brace');
    expect(braces.length).toBeGreaterThanOrEqual(2);
    expect(result.nodes.size).toBe(3);
  });

  it('fishbone lays out grandchildren along the bone', () => {
    const doc = createDocument('x', 'fishbone');
    const sheet = doc.sheets[0]!;
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'cause').execute(doc);
    const causeId = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddTopicCommand(sheet.id, causeId, 'detail').execute(d);
    const result = registry.layout(d.sheets[0]!, measure);
    const cause = result.nodes.get(causeId)!;
    const detailId = d.sheets[0]!.rootTopic.children[0]!.children[0]!.id;
    const detail = result.nodes.get(detailId)!;
    expect(detail).toBeDefined();
    // detail should be offset from cause along branch (not purely vertical stack under same x)
    const dx = Math.abs(detail.x + detail.width / 2 - (cause.x + cause.width / 2));
    const dy = Math.abs(detail.y + detail.height / 2 - (cause.y + cause.height / 2));
    expect(dx + dy).toBeGreaterThan(20);
  });

  it('tree-table emits column headers and note cells from columns', () => {
    const doc = createDocument('x', 'tree-table');
    const sheet = doc.sheets[0]!;
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'row').execute(doc);
    const rowId = d.sheets[0]!.rootTopic.children[0]!.id;
    d = {
      ...d,
      sheets: d.sheets.map((s) => ({
        ...s,
        rootTopic: {
          ...s.rootTopic,
          children: s.rootTopic.children.map((c) =>
            c.id === rowId ? { ...c, note: 'hello note' } : c,
          ),
        },
      })),
    };
    const result = registry.layout(d.sheets[0]!, measure);
    const headers = result.extraShapes.filter((s) => s.id.startsWith('table-header-'));
    expect(headers.length).toBe(2);
    expect(headers.map((h) => h.label)).toEqual(['主题', '备注']);
    const noteCell = result.extraShapes.find((s) => s.id.includes(rowId) && s.label === 'hello note');
    expect(noteCell).toBeDefined();
  });
});
