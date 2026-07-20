import { describe, it, expect } from 'vitest';
import { createDocument } from '../../model/factory.js';
import { AddTopicCommand } from '../../commands/topic-commands.js';
import { createMeasureFn } from '../measure.js';
import { createDefaultLayoutRegistry } from '../registry.js';
import { layoutLogicChart } from '../logic-chart.js';

describe('logic-chart layout', () => {
  const measure = createMeasureFn();
  const registry = createDefaultLayoutRegistry();

  it('places children to the right of root', () => {
    const doc = createDocument('x', 'logic-chart');
    const sheet = doc.sheets[0]!;
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'c1').execute(doc);
    d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'c2').execute(d);
    const result = registry.layout(d.sheets[0]!, measure);
    const root = result.nodes.get(sheet.rootTopic.id)!;
    const child = result.nodes.get(d.sheets[0]!.rootTopic.children[0]!.id)!;
    expect(child.x).toBeGreaterThan(root.x);
  });

  it('vertically centers parent among its children', () => {
    const doc = createDocument('x', 'logic-chart');
    const sheet = doc.sheets[0]!;
    let d = doc;
    for (let i = 0; i < 4; i++) {
      d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, `c${i}`).execute(d);
    }
    const result = registry.layout(d.sheets[0]!, measure);
    const root = result.nodes.get(sheet.rootTopic.id)!;
    const children = [...result.nodes.values()].filter((n) => n.depth === 1);
    const top = Math.min(...children.map((n) => n.y));
    const bottom = Math.max(...children.map((n) => n.y + n.height));
    const childrenMid = (top + bottom) / 2;
    const rootMid = root.y + root.height / 2;
    expect(Math.abs(rootMid - childrenMid)).toBeLessThan(1);
  });

  it('uses curved edges by default', () => {
    const doc = createDocument('x', 'logic-chart');
    const sheet = doc.sheets[0]!;
    const d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'c1').execute(doc);
    const result = registry.layout(d.sheets[0]!, measure);
    expect(result.edges[0]!.points.length).toBe(4);
  });

  it('renders leaf siblings as underline with brace', () => {
    const doc = createDocument('x', 'logic-chart');
    const sheet = doc.sheets[0]!;
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'a').execute(doc);
    d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'b').execute(d);
    const result = layoutLogicChart(d.sheets[0]!.rootTopic, d.sheets[0]!.structureOptions, measure);
    const leaves = [...result.nodes.values()].filter((n) => n.depth === 1);
    expect(leaves.every((n) => n.display === 'underline')).toBe(true);
    expect(result.extraShapes.some((s) => s.type === 'brace')).toBe(true);
  });

  it('underline nodes autosize CJK titles without wrapping width', () => {
    const doc = createDocument('x', 'logic-chart');
    const sheet = doc.sheets[0]!;
    const d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, '分支主题').execute(doc);
    const childId = d.sheets[0]!.rootTopic.children[0]!.id;
    const result = layoutLogicChart(d.sheets[0]!.rootTopic, d.sheets[0]!.structureOptions, measure);
    const leaf = result.nodes.get(childId)!;
    expect(leaf.display).toBe('underline');
    // "分支主题" is 4 CJK chars; legacy length*8 capped ~52 and forced 2-line wrap in canvas.
    expect(leaf.width).toBeGreaterThanOrEqual(80);
  });

  it('underline nodes keep enough height so the line sits under text', () => {
    const doc = createDocument('x', 'logic-chart');
    const sheet = doc.sheets[0]!;
    const d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, '分支主题').execute(doc);
    const childId = d.sheets[0]!.rootTopic.children[0]!.id;
    const full = measure(d.sheets[0]!.rootTopic.children[0]!, 1);
    const result = layoutLogicChart(d.sheets[0]!.rootTopic, d.sheets[0]!.structureOptions, measure);
    const leaf = result.nodes.get(childId)!;
    expect(leaf.display).toBe('underline');
    // Must stay near one line-height (not ~0.45× box which cut through glyphs).
    expect(leaf.height).toBeGreaterThanOrEqual(20);
    expect(leaf.height).toBeLessThanOrEqual(full.height);
  });

  it('connects underline topics on the baseline', () => {
    const doc = createDocument('x', 'logic-chart');
    const sheet = doc.sheets[0]!;
    const d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, '分支主题').execute(doc);
    const childId = d.sheets[0]!.rootTopic.children[0]!.id;
    const result = layoutLogicChart(d.sheets[0]!.rootTopic, d.sheets[0]!.structureOptions, measure);
    const leaf = result.nodes.get(childId)!;
    const edge = result.edges.find((e) => e.to === childId)!;
    const end = edge.points[edge.points.length - 1]!;
    expect(end.y).toBe(leaf.y + leaf.height);
  });

  it('uses polyline edges when configured', () => {
    const doc = createDocument('x', 'logic-chart');
    const sheet = doc.sheets[0]!;
    sheet.structureOptions = {
      type: 'logic-chart',
      direction: 'right',
      lineStyle: 'polyline',
      nodeDisplay: 'box',
      groupLeaves: 'none',
      rootDisplay: 'box',
    };
    const d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'c1').execute(doc);
    const result = registry.layout(d.sheets[0]!, measure);
    const pts = result.edges[0]!.points;
    expect(pts.length).toBe(4);
    expect(pts[1]!.y).toBe(pts[0]!.y);
  });
});
