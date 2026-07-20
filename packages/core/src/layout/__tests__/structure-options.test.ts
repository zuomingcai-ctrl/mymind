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

  it('timeline alternate=false keeps all events on the above/left side', () => {
    const doc = createDocument('x', 'timeline');
    const sheet = doc.sheets[0]!;
    sheet.structureOptions = {
      type: 'timeline',
      axis: 'horizontal',
      alternate: false,
      showScale: true,
    };
    let d = doc;
    for (let i = 0; i < 3; i++) {
      d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, `e${i}`).execute(d);
    }
    const result = registry.layout(d.sheets[0]!, measure);
    const root = result.nodes.get(sheet.rootTopic.id)!;
    const events = [...result.nodes.values()].filter((n) => n.depth === 1);
    expect(events.every((n) => n.y + n.height <= root.y + root.height)).toBe(true);
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

  it('brace-map braceSide=right places brace to the right of root', () => {
    const doc = createDocument('x', 'brace-map');
    const sheet = doc.sheets[0]!;
    sheet.structureOptions = {
      type: 'brace-map',
      braceSide: 'right',
      partPosition: 'opposite',
    };
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'p1').execute(doc);
    d = new AddTopicCommand(sheet.id, d.sheets[0]!.rootTopic.id, 'p2').execute(d);
    const result = registry.layout(d.sheets[0]!, measure);
    const root = result.nodes.get(d.sheets[0]!.rootTopic.id)!;
    const brace = result.extraShapes.find((s) => s.type === 'brace')!;
    expect(brace.bounds.x).toBeGreaterThan(root.x + root.width);
    expect(brace.style?.openSide).toBe('right');
    const parts = [...result.nodes.values()].filter((n) => n.depth === 1);
    expect(parts.every((p) => p.x > brace.bounds.x)).toBe(true);
  });

  it('brace-map braceSide=left places brace to the left of root', () => {
    const doc = createDocument('x', 'brace-map');
    const sheet = doc.sheets[0]!;
    sheet.structureOptions = {
      type: 'brace-map',
      braceSide: 'left',
      partPosition: 'opposite',
    };
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'p1').execute(doc);
    d = new AddTopicCommand(sheet.id, d.sheets[0]!.rootTopic.id, 'p2').execute(d);
    const result = registry.layout(d.sheets[0]!, measure);
    const root = result.nodes.get(d.sheets[0]!.rootTopic.id)!;
    const brace = result.extraShapes.find((s) => s.type === 'brace')!;
    expect(brace.bounds.x + brace.bounds.width).toBeLessThan(root.x);
    expect(brace.style?.openSide).toBe('left');
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

  it('fishbone places category at bone tip and ribs horizontally', () => {
    const doc = createDocument('x', 'fishbone');
    const sheet = doc.sheets[0]!;
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'cause').execute(doc);
    const causeId = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddTopicCommand(sheet.id, causeId, 'detail').execute(d);
    const result = registry.layout(d.sheets[0]!, measure);
    const root = result.nodes.get(d.sheets[0]!.rootTopic.id)!;
    const cause = result.nodes.get(causeId)!;
    const detailId = d.sheets[0]!.rootTopic.children[0]!.children[0]!.id;
    const detail = result.nodes.get(detailId)!;
    expect(detail).toBeDefined();

    // Category sits off the spine (diagonal tip).
    const spineY = root.y + root.height / 2;
    expect(Math.abs(cause.y + cause.height / 2 - spineY)).toBeGreaterThan(20);

    // Rib sits between spine and category tip, offset horizontally toward the head.
    const causeCy = cause.y + cause.height / 2;
    expect(Math.abs(detail.y + detail.height - causeCy)).toBeGreaterThan(5);

    // Bone edge is diagonal; rib edge is horizontal underline (Δy ≈ 0, has length).
    const bone = result.edges.find((e) => e.from === root.id && e.to === causeId)!;
    const rib = result.edges.find((e) => e.from === causeId && e.to === detailId)!;
    expect(Math.abs(bone.points[0]!.y - bone.points[1]!.y)).toBeGreaterThan(10);
    expect(Math.abs(rib.points[0]!.y - rib.points[1]!.y)).toBeLessThan(1);
    expect(Math.abs(rib.points[0]!.x - rib.points[1]!.x)).toBeGreaterThan(20);
  });

  it('fishbone nested siblings do not overlap along the bone', () => {
    const doc = createDocument('x', 'fishbone');
    const sheet = doc.sheets[0]!;
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'A').execute(doc);
    const a = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddTopicCommand(sheet.id, a, 'A1').execute(d);
    d = new AddTopicCommand(sheet.id, a, 'A2').execute(d);
    const a1 = d.sheets[0]!.rootTopic.children[0]!.children[0]!.id;
    d = new AddTopicCommand(sheet.id, a1, 'A1a').execute(d);
    const result = registry.layout(d.sheets[0]!, measure);
    const nodes = [...result.nodes.values()];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const aN = nodes[i]!;
        const bN = nodes[j]!;
        const overlap =
          aN.x < bN.x + bN.width &&
          aN.x + aN.width > bN.x &&
          aN.y < bN.y + bN.height &&
          aN.y + aN.height > bN.y;
        expect(overlap).toBe(false);
      }
    }
  });

  it('timeline nested siblings do not overlap on a branch', () => {
    const doc = createDocument('x', 'timeline');
    const sheet = doc.sheets[0]!;
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'A').execute(doc);
    const a = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddTopicCommand(sheet.id, a, 'A1').execute(d);
    d = new AddTopicCommand(sheet.id, a, 'A2').execute(d);
    const a1 = d.sheets[0]!.rootTopic.children[0]!.children[0]!.id;
    d = new AddTopicCommand(sheet.id, a1, 'A1a').execute(d);
    const result = registry.layout(d.sheets[0]!, measure);
    const nodes = [...result.nodes.values()];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const aN = nodes[i]!;
        const bN = nodes[j]!;
        const overlap =
          aN.x < bN.x + bN.width &&
          aN.x + aN.width > bN.x &&
          aN.y < bN.y + bN.height &&
          aN.y + aN.height > bN.y;
        expect(overlap).toBe(false);
      }
    }
  });

  it('timeline multi-level grows along the axis as a tree', () => {
    const doc = createDocument('x', 'timeline');
    const sheet = doc.sheets[0]!;
    sheet.structureOptions = {
      type: 'timeline',
      axis: 'horizontal',
      alternate: true,
      showScale: true,
    };
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'event').execute(doc);
    const eventId = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddTopicCommand(sheet.id, eventId, 'A1').execute(d);
    d = new AddTopicCommand(sheet.id, eventId, 'A2').execute(d);
    const a1 = d.sheets[0]!.rootTopic.children[0]!.children[0]!.id;
    const a2 = d.sheets[0]!.rootTopic.children[0]!.children[1]!.id;
    d = new AddTopicCommand(sheet.id, a1, 'A1a').execute(d);
    const a1a = d.sheets[0]!.rootTopic.children[0]!.children[0]!.children[0]!.id;
    const result = registry.layout(d.sheets[0]!, measure);
    const event = result.nodes.get(eventId)!;
    const n1 = result.nodes.get(a1)!;
    const n2 = result.nodes.get(a2)!;
    const n1a = result.nodes.get(a1a)!;
    // Children sit to the right of the event (along the axis), not in a column under it.
    expect(n1.x).toBeGreaterThan(event.x + event.width);
    expect(n2.x).toBeGreaterThan(event.x + event.width);
    expect(n1a.x).toBeGreaterThan(n1.x + n1.width);
    // Siblings stack vertically at the same depth column.
    expect(Math.abs(n1.x - n2.x)).toBeLessThan(1);
    expect(n1.y).toBeLessThan(n2.y);
  });

  it('matrix lays out nested descendants beyond depth 2', () => {
    const doc = createDocument('x', 'matrix');
    const sheet = doc.sheets[0]!;
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'q0').execute(doc);
    const q0 = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddTopicCommand(sheet.id, q0, 'l2').execute(d);
    const l2 = d.sheets[0]!.rootTopic.children[0]!.children[0]!.id;
    d = new AddTopicCommand(sheet.id, l2, 'l3').execute(d);
    const l3 = d.sheets[0]!.rootTopic.children[0]!.children[0]!.children[0]!.id;
    const result = registry.layout(d.sheets[0]!, measure);
    expect(result.nodes.get(l3)).toBeDefined();
    expect(result.nodes.get(l3)!.depth).toBe(3);
    expect(result.nodes.get(l3)!.y).toBeGreaterThan(result.nodes.get(l2)!.y);
  });

  it('org-chart uses larger layer gap than tree-chart', () => {
    function buildDoc(structure: 'org-chart' | 'tree-chart') {
      const doc = createDocument('x', structure);
      const sheet = doc.sheets[0]!;
      let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'c1').execute(doc);
      return d;
    }
    const org = registry.layout(buildDoc('org-chart').sheets[0]!, measure);
    const tree = registry.layout(buildDoc('tree-chart').sheets[0]!, measure);
    const orgRoot = [...org.nodes.values()].find((n) => n.depth === 0)!;
    const orgChild = [...org.nodes.values()].find((n) => n.depth === 1)!;
    const treeRoot = [...tree.nodes.values()].find((n) => n.depth === 0)!;
    const treeChild = [...tree.nodes.values()].find((n) => n.depth === 1)!;
    const orgGap = orgChild.y - (orgRoot.y + orgRoot.height);
    const treeGap = treeChild.y - (treeRoot.y + treeRoot.height);
    expect(orgGap).toBeGreaterThan(treeGap);
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
