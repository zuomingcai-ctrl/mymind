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
