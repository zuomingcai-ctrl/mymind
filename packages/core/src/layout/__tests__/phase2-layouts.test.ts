// covers: ST-004–009, SC-001
import { describe, it, expect } from 'vitest';
import { createDocument } from '../../model/factory.js';
import { AddTopicCommand } from '../../commands/topic-commands.js';
import { UpdateSheetStructureCommand } from '../../commands/sheet-commands.js';
import { createMeasureFn } from '../measure.js';
import { createDefaultLayoutRegistry } from '../registry.js';

const structures = [
  'org-chart',
  'timeline',
  'fishbone',
  'matrix',
  'brace-map',
  'tree-table',
] as const;

describe('Phase 2 layouts', () => {
  const measure = createMeasureFn();
  const registry = createDefaultLayoutRegistry();

  for (const structure of structures) {
    it(`${structure} produces valid layout`, () => {
      const doc = createDocument('x', structure);
      const sheet = doc.sheets[0]!;
      let d = doc;
      const rootId = sheet.rootTopic.id;
      d = new AddTopicCommand(sheet.id, rootId, 'c1').execute(d);
      d = new AddTopicCommand(sheet.id, rootId, 'c2').execute(d);
      const result = registry.layout(d.sheets[0]!, measure);
      expect(result.nodes.size).toBeGreaterThanOrEqual(3);
      expect(result.bounds.width).toBeGreaterThan(0);
    });
  }

  it('matrix assigns quadrants in auto mode', () => {
    const doc = createDocument('x', 'matrix');
    const sheet = doc.sheets[0]!;
    let d = doc;
    d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'S').execute(d);
    d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'W').execute(d);
    const result = registry.layout(d.sheets[0]!, measure);
    const children = [...result.nodes.values()].filter((n) => n.depth === 1);
    expect(children.length).toBe(2);
    expect(children[0]!.colIndex).toBeDefined();
  });

  it('structure switch preserves node count', () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    let d = new AddTopicCommand(sheetId, doc.sheets[0]!.rootTopic.id, 'a').execute(doc);
    d = new AddTopicCommand(sheetId, d.sheets[0]!.rootTopic.children[0]!.id, 'b').execute(d);
    const before = countTopics(d.sheets[0]!.rootTopic);
    d = new UpdateSheetStructureCommand(sheetId, 'logic-chart').execute(d);
    expect(d.sheets[0]!.structure).toBe('logic-chart');
    expect(countTopics(d.sheets[0]!.rootTopic)).toBe(before);
    const layout = registry.layout(d.sheets[0]!, measure);
    expect(layout.nodes.size).toBe(before);
  });
});

function countTopics(root: import('../../model/types.js').Topic): number {
  return 1 + root.children.reduce((s, c) => s + countTopics(c), 0);
}
