import { describe, it, expect } from 'vitest';
import { createDocument } from '../../model/factory.js';
import { AddTopicCommand } from '../../commands/topic-commands.js';
import {
  AddSummaryCommand,
  AddRelationshipCommand,
} from '../../commands/structure-commands.js';
import { UpdateTopicTitleCommand } from '../../commands/topic-commands.js';
import { createDefaultLayoutRegistry } from '../registry.js';
import { createMeasureFn } from '../measure.js';
import { buildFrame } from '../../render/pipeline.js';
import { defaultRelationshipCubicControlPoints } from '../../render/draw-edge.js';

describe('summary & relationship layout fixes', () => {
  it('balanced mindmap keeps same-side siblings consecutive for summary', () => {
    let d = createDocument();
    const sheetId = d.sheets[0]!.id;
    const rootId = d.sheets[0]!.rootTopic.id;
    d = new AddTopicCommand(sheetId, rootId, 'a').execute(d);
    d = new AddTopicCommand(sheetId, rootId, 'b').execute(d);
    d = new AddTopicCommand(sheetId, rootId, 'c').execute(d);
    d = new AddTopicCommand(sheetId, rootId, 'd').execute(d);
    const ids = d.sheets[0]!.rootTopic.children.map((c) => c.id);
    // First half is right side → ids[0], ids[1] are consecutive same-side
    d = new AddSummaryCommand(sheetId, rootId, [ids[0]!, ids[1]!]).execute(d);

    const layout = createDefaultLayoutRegistry().layout(d.sheets[0]!, createMeasureFn());
    const summaryTopicId = d.sheets[0]!.summaries[0]!.summaryTopicId;
    expect(layout.nodes.has(summaryTopicId)).toBe(true);
    expect(layout.edges.some((e) => e.type === 'summary')).toBe(true);

    const frame = buildFrame(d.sheets[0]!, layout);
    const topics = frame.layers.find((l) => l.type === 'topics');
    expect(topics && topics.type === 'topics' ? topics.topics.has(summaryTopicId) : false).toBe(true);
  });

  it('summary arc sits outside the parent (not through center)', () => {
    let d = createDocument();
    const sheetId = d.sheets[0]!.id;
    const rootId = d.sheets[0]!.rootTopic.id;
    d = new AddTopicCommand(sheetId, rootId, 'a').execute(d);
    d = new AddTopicCommand(sheetId, rootId, 'b').execute(d);
    d = new AddTopicCommand(sheetId, rootId, 'c').execute(d);
    d = new AddTopicCommand(sheetId, rootId, 'd').execute(d);
    const ids = d.sheets[0]!.rootTopic.children.map((c) => c.id);
    // Right-side pair (first half)
    d = new AddSummaryCommand(sheetId, rootId, [ids[0]!, ids[1]!]).execute(d);

    const layout = createDefaultLayoutRegistry().layout(d.sheets[0]!, createMeasureFn());
    const edge = layout.edges.find((e) => e.type === 'summary')!;
    const parent = layout.nodes.get(rootId)!;
    const mid = edge.points[1]!;
    const parentCx = parent.x + parent.width / 2;
    // Arc bows outward to the right of the right-side branches
    expect(mid.x).toBeGreaterThan(parentCx + parent.width);
  });

  it('summary arc sits outside descendants when a ranged topic has children', () => {
    let d = createDocument();
    const sheetId = d.sheets[0]!.id;
    const rootId = d.sheets[0]!.rootTopic.id;
    for (const title of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      d = new AddTopicCommand(sheetId, rootId, title).execute(d);
    }
    const ids = d.sheets[0]!.rootTopic.children.map((c) => c.id);
    // Right-side topics ids[0]..ids[3]; give ids[3] children that extend further right
    d = new AddTopicCommand(sheetId, ids[3]!, 'c1').execute(d);
    d = new AddTopicCommand(sheetId, ids[3]!, 'c2').execute(d);
    d = new AddTopicCommand(sheetId, ids[3]!, 'c3').execute(d);
    d = new AddSummaryCommand(sheetId, rootId, [ids[0]!, ids[3]!]).execute(d);

    const sheet = d.sheets[0]!;
    const layout = createDefaultLayoutRegistry().layout(sheet, createMeasureFn());
    const edge = layout.edges.find((e) => e.type === 'summary')!;
    const childIds = sheet.rootTopic.children[3]!.children.map((c) => c.id);
    const childRights = childIds.map((id) => {
      const n = layout.nodes.get(id)!;
      return n.x + n.width;
    });
    const maxChildRight = Math.max(...childRights);
    const arcX = edge.points[0]!.x;
    expect(arcX).toBeGreaterThan(maxChildRight);
    const summaryNode = layout.nodes.get(sheet.summaries[0]!.summaryTopicId)!;
    expect(summaryNode.x).toBeGreaterThan(arcX);
  });

  it('relationship curve control point is not collinear', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const [cp1, cp2] = defaultRelationshipCubicControlPoints(from, to);
    expect(Math.abs(cp1.y)).toBeGreaterThan(10);
    expect(Math.abs(cp2.y)).toBeGreaterThan(10);
  });

  it('relationship layout uses bent cubic controls by default', () => {
    let d = createDocument();
    const sheetId = d.sheets[0]!.id;
    const rootId = d.sheets[0]!.rootTopic.id;
    d = new AddTopicCommand(sheetId, rootId, 'a').execute(d);
    const childId = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddRelationshipCommand(sheetId, rootId, childId, '依赖').execute(d);

    const layout = createDefaultLayoutRegistry().layout(d.sheets[0]!, createMeasureFn());
    const edge = layout.edges.find((e) => e.type === 'relationship')!;
    expect(edge.points).toHaveLength(4);
    const [a, b, c, dpt] = edge.points;
    // Mid control points should not be collinear with endpoints
    const cross1 = (b!.x - a!.x) * (dpt!.y - a!.y) - (b!.y - a!.y) * (dpt!.x - a!.x);
    const cross2 = (c!.x - a!.x) * (dpt!.y - a!.y) - (c!.y - a!.y) * (dpt!.x - a!.x);
    expect(Math.abs(cross1) + Math.abs(cross2)).toBeGreaterThan(1);
  });

  it('summary topic children are laid out outside the summary node', () => {
    let d = createDocument();
    const sheetId = d.sheets[0]!.id;
    const rootId = d.sheets[0]!.rootTopic.id;
    d = new AddTopicCommand(sheetId, rootId, 'a').execute(d);
    d = new AddTopicCommand(sheetId, rootId, 'b').execute(d);
    d = new AddTopicCommand(sheetId, rootId, 'c').execute(d);
    d = new AddTopicCommand(sheetId, rootId, 'd').execute(d);
    const ids = d.sheets[0]!.rootTopic.children.map((c) => c.id);
    d = new AddSummaryCommand(sheetId, rootId, [ids[0]!, ids[1]!]).execute(d);
    const summaryTopicId = d.sheets[0]!.summaries[0]!.summaryTopicId;
    d = new AddTopicCommand(sheetId, summaryTopicId, '子1').execute(d);
    d = new AddTopicCommand(sheetId, summaryTopicId, '子2').execute(d);
    const childIds = d.sheets[0]!.floatingTopics
      .find((t) => t.id === summaryTopicId)!
      .children.map((c) => c.id);

    const layout = createDefaultLayoutRegistry().layout(d.sheets[0]!, createMeasureFn());
    const summaryNode = layout.nodes.get(summaryTopicId)!;
    for (const childId of childIds) {
      const child = layout.nodes.get(childId)!;
      expect(child.x).toBeGreaterThan(summaryNode.x + summaryNode.width);
    }
    expect(layout.edges.some((e) => e.type === 'tree' && e.from === summaryTopicId)).toBe(true);
  });

  it('adjacent summary subtrees do not vertically overlap', () => {
    let d = createDocument();
    const sheetId = d.sheets[0]!.id;
    const rootId = d.sheets[0]!.rootTopic.id;
    // Same-side siblings so both summaries share the outward column.
    d = {
      ...d,
      sheets: d.sheets.map((s) =>
        s.id === sheetId
          ? {
              ...s,
              structureOptions: { type: 'mindmap' as const, balanced: false, direction: 'right' as const },
            }
          : s,
      ),
    };
    for (const title of ['a', 'b', 'c', 'd']) {
      d = new AddTopicCommand(sheetId, rootId, title).execute(d);
    }
    const ids = d.sheets[0]!.rootTopic.children.map((c) => c.id);
    d = new AddSummaryCommand(sheetId, rootId, [ids[0]!, ids[1]!]).execute(d);
    d = new AddSummaryCommand(sheetId, rootId, [ids[2]!, ids[3]!]).execute(d);

    const s1 = d.sheets[0]!.summaries[0]!.summaryTopicId;
    const s2 = d.sheets[0]!.summaries[1]!.summaryTopicId;
    for (let i = 0; i < 5; i++) {
      d = new AddTopicCommand(sheetId, s1, `s1-${i}`).execute(d);
    }
    for (let i = 0; i < 3; i++) {
      d = new AddTopicCommand(sheetId, s2, `s2-${i}`).execute(d);
    }

    const sheet = d.sheets[0]!;
    const layout = createDefaultLayoutRegistry().layout(sheet, createMeasureFn());
    const kids1 = sheet.floatingTopics.find((t) => t.id === s1)!.children.map((c) => c.id);
    const kids2 = sheet.floatingTopics.find((t) => t.id === s2)!.children.map((c) => c.id);

    // Covered main-tree ranges must be tall enough for each summary's children.
    const rangeSpan = (startId: string, endId: string) => {
      const a = layout.nodes.get(startId)!;
      const b = layout.nodes.get(endId)!;
      const top = Math.min(a.y, b.y);
      const bottom = Math.max(a.y + a.height, b.y + b.height);
      return bottom - top;
    };
    const kidsSpan = (ids: string[]) => {
      const nodes = ids.map((id) => layout.nodes.get(id)!);
      const top = Math.min(...nodes.map((n) => n.y));
      const bottom = Math.max(...nodes.map((n) => n.y + n.height));
      return bottom - top;
    };
    expect(rangeSpan(ids[0]!, ids[1]!)).toBeGreaterThanOrEqual(kidsSpan(kids1));
    expect(rangeSpan(ids[2]!, ids[3]!)).toBeGreaterThanOrEqual(kidsSpan(kids2));

    const box = (id: string) => {
      const n = layout.nodes.get(id)!;
      return { x: n.x, y: n.y, right: n.x + n.width, bottom: n.y + n.height };
    };
    for (const a of kids1) {
      const ba = box(a);
      for (const b of kids2) {
        const bb = box(b);
        const overlapX = ba.x < bb.right && bb.x < ba.right;
        if (!overlapX) continue;
        const gap = ba.y < bb.y ? bb.y - ba.bottom : ba.y - bb.bottom;
        expect(gap).toBeGreaterThanOrEqual(30);
      }
    }
  });

  it('UpdateTopicTitleCommand updates floating summary topic', () => {
    let d = createDocument();
    const sheetId = d.sheets[0]!.id;
    const rootId = d.sheets[0]!.rootTopic.id;
    d = new AddTopicCommand(sheetId, rootId, 'a').execute(d);
    d = new AddTopicCommand(sheetId, rootId, 'b').execute(d);
    const ids = d.sheets[0]!.rootTopic.children.map((c) => c.id);
    d = new AddSummaryCommand(sheetId, rootId, [ids[0]!, ids[1]!]).execute(d);
    const summaryTopicId = d.sheets[0]!.summaries[0]!.summaryTopicId;

    d = new UpdateTopicTitleCommand(sheetId, summaryTopicId, '小结').execute(d);
    expect(d.sheets[0]!.floatingTopics.find((t) => t.id === summaryTopicId)?.title).toBe('小结');
  });
});
