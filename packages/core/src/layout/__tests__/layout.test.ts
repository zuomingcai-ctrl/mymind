// covers: TE-003, ST-001, ST-002, ST-003, ED-009, PS-006
import { describe, it, expect } from 'vitest';
import { createDocument } from '../../model/factory.js';
import { AddTopicCommand, ToggleCollapseCommand } from '../../commands/topic-commands.js';
import { UpdateTopicStyleCommand } from '../../commands/phase4-commands.js';
import { TextMeasurer, createMeasureFn, wrapPlainText } from '../measure.js';
import { createDefaultLayoutRegistry } from '../registry.js';
import { buildTree } from '@mymind/test-utils';

describe('layout', () => {
  const measure = createMeasureFn(new TextMeasurer());
  const registry = createDefaultLayoutRegistry();

  it('TextMeasurer includes padding in size', () => {
    const m = new TextMeasurer();
    const size = m.measureText('Hello');
    expect(size.width).toBeGreaterThanOrEqual(80);
    expect(size.height).toBeGreaterThan(0);
  });

  it('wrapPlainText breaks long text when width is tight', () => {
    const lines = wrapPlainText('一二三四五六七八九十', 40);
    expect(lines.length).toBeGreaterThan(1);
  });

  it('default autosize does not wrap long titles', () => {
    const m = new TextMeasurer();
    const long = '这是一段很长很长很长很长很长很长的主题文字内容不应该默认折行';
    const size = m.measureText(long);
    expect(size.lines).toHaveLength(1);
    expect(size.width).toBeGreaterThan(200);
  });

  it('fixed topic width wraps text and grows height', () => {
    const doc = createDocument();
    const rootId = doc.sheets[0]!.rootTopic.id;
    const d = new UpdateTopicStyleCommand(doc.sheets[0]!.id, rootId, {
      width: 60,
      widthMode: 'fixed',
    }).execute(doc);
    d.sheets[0]!.rootTopic.title = '这是一段需要自动绕行的较长主题文字内容';
    const m = new TextMeasurer();
    const auto = m.measureTopic(
      { ...d.sheets[0]!.rootTopic, style: { shape: 'rounded', widthMode: 'auto' } },
      0,
    );
    const fixed = m.measureTopic(d.sheets[0]!.rootTopic, 0);
    expect(fixed.width).toBe(60);
    expect(fixed.height).toBeGreaterThan(auto.height);
    expect(auto.width).toBeGreaterThan(fixed.width);
  });

  it('mindmap layout produces nodes for 5-node tree', () => {
    const doc = createDocument();
    const sheet = doc.sheets[0]!;
    sheet.rootTopic = buildTree(2, 2);
    const result = registry.layout(sheet, measure);
    expect(result.nodes.size).toBeGreaterThanOrEqual(5);
    expect(result.bounds.width).toBeGreaterThan(0);
  });

  it('mindmap right layout vertically centers root among children', () => {
    const doc = createDocument();
    const sheet = doc.sheets[0]!;
    sheet.structureOptions = { type: 'mindmap', balanced: false, direction: 'right' };
    let d = doc;
    const rootId = sheet.rootTopic.id;
    for (let i = 0; i < 5; i++) {
      d = new AddTopicCommand(sheet.id, rootId, `c${i}`).execute(d);
    }
    const result = registry.layout(d.sheets[0]!, measure);
    const root = result.nodes.get(rootId)!;
    const children = [...result.nodes.values()].filter((n) => n.depth === 1);
    const top = Math.min(...children.map((n) => n.y));
    const bottom = Math.max(...children.map((n) => n.y + n.height));
    const childrenMid = (top + bottom) / 2;
    const rootMid = root.y + root.height / 2;
    expect(Math.abs(rootMid - childrenMid)).toBeLessThan(1);
    expect(children.every((n) => n.x > root.x + root.width)).toBe(true);
  });

  it('logic-chart layout places nodes horizontally by depth', () => {
    const doc = createDocument('x', 'logic-chart');
    const sheet = doc.sheets[0]!;
    let d = doc;
    const rootId = sheet.rootTopic.id;
    d = new AddTopicCommand(sheet.id, rootId, 'c1').execute(d);
    const childId = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddTopicCommand(sheet.id, childId, 'c2').execute(d);
    const result = registry.layout(d.sheets[0]!, measure);
    const root = result.nodes.get(rootId)!;
    const child = result.nodes.get(childId)!;
    expect(child.x).toBeGreaterThan(root.x);
  });

  it('tree-chart layout places nodes vertically by depth', () => {
    const doc = createDocument('x', 'tree-chart');
    const sheet = doc.sheets[0]!;
    let d = doc;
    const rootId = sheet.rootTopic.id;
    d = new AddTopicCommand(sheet.id, rootId, 'c1').execute(d);
    const childId = d.sheets[0]!.rootTopic.children[0]!.id;
    const result = registry.layout(d.sheets[0]!, measure);
    const root = result.nodes.get(rootId)!;
    const child = result.nodes.get(childId)!;
    expect(child.y).toBeGreaterThan(root.y);
  });

  it('tree-chart places siblings on the same horizontal row', () => {
    const doc = createDocument('x', 'tree-chart');
    const sheet = doc.sheets[0]!;
    let d = doc;
    const rootId = sheet.rootTopic.id;
    d = new AddTopicCommand(sheet.id, rootId, 'a').execute(d);
    d = new AddTopicCommand(sheet.id, rootId, 'b').execute(d);
    d = new AddTopicCommand(sheet.id, rootId, 'c').execute(d);
    const result = registry.layout(d.sheets[0]!, measure);
    const siblings = [...result.nodes.values()].filter((n) => n.depth === 1);
    expect(siblings).toHaveLength(3);
    const ys = siblings.map((n) => n.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(1);
    const xs = siblings.map((n) => n.x).sort((a, b) => a - b);
    expect(xs[1]! - xs[0]!).toBeGreaterThan(20);
    expect(xs[2]! - xs[1]!).toBeGreaterThan(20);
  });

  it('tree-chart bottom-up places root below children', () => {
    const doc = createDocument('x', 'tree-chart');
    doc.sheets[0]!.structureOptions = { type: 'tree-chart', direction: 'bottom-up' };
    let d = new AddTopicCommand(doc.sheets[0]!.id, doc.sheets[0]!.rootTopic.id, 'c1').execute(doc);
    const rootId = d.sheets[0]!.rootTopic.id;
    const childId = d.sheets[0]!.rootTopic.children[0]!.id;
    const result = registry.layout(d.sheets[0]!, measure);
    expect(result.nodes.get(rootId)!.y).toBeGreaterThan(result.nodes.get(childId)!.y);
  });

  it('collapsed nodes hide descendants from layout', () => {
    const doc = createDocument();
    const sheet = doc.sheets[0]!;
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'c1').execute(doc);
    const childId = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddTopicCommand(sheet.id, childId, 'c2').execute(d);
    d = new ToggleCollapseCommand(sheet.id, childId).execute(d);
    const result = registry.layout(d.sheets[0]!, measure);
    const grandchild = d.sheets[0]!.rootTopic.children[0]!.children[0]!;
    expect(result.nodes.get(grandchild.id)).toBeUndefined();
  });

  it('unknown structure throws', () => {
    const reg = createDefaultLayoutRegistry();
    expect(() => reg.get('mindmap')).not.toThrow();
  });
});
