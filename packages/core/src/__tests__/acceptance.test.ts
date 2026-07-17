/**
 * covers: 功能规格 §16 场景 1–6（核心逻辑验收）
 */
import { describe, it, expect } from 'vitest';
import {
  AddTopicCommand,
  UpdateSheetStructureCommand,
  AddSummaryCommand,
  AddBoundaryCommand,
  AddRelationshipCommand,
  DeleteTopicCommand,
  CommandBus,
  createDocument,
  createFromTemplate,
  createDefaultLayoutRegistry,
  createMeasureFn,
  serializeDocument,
  deserializeDocument,
  exportMarkdown,
  getTemplate,
} from '../index.js';

describe('Acceptance §16', () => {
  it('场景 1: Tab 连续创建 5 级子主题', () => {
    const doc = createDocument('brainstorm', 'mindmap');
    const bus = new CommandBus(doc);
    const sheetId = doc.sheets[0]!.id;
    let parentId = doc.sheets[0]!.rootTopic.id;

    for (let depth = 0; depth < 5; depth++) {
      bus.dispatch(new AddTopicCommand(sheetId, parentId, `L${depth + 1}`));
      const sheet = bus.getDocument().sheets[0]!;
      const parent = findTopic(sheet.rootTopic, parentId)!;
      parentId = parent.children[parent.children.length - 1]!.id;
    }

    expect(countTopics(bus.getDocument().sheets[0]!.rootTopic)).toBe(6);
  });

  it('场景 2: 20 节点切换鱼骨图保留文字', () => {
    const doc = createDocument('switch', 'mindmap');
    const bus = new CommandBus(doc);
    const sheetId = doc.sheets[0]!.id;
    let parentId = doc.sheets[0]!.rootTopic.id;

    for (let i = 0; i < 19; i++) {
      bus.dispatch(new AddTopicCommand(sheetId, parentId, `节点${i + 1}`));
      const sheet = bus.getDocument().sheets[0]!;
      if (i % 3 === 0) {
        parentId = sheet.rootTopic.children[sheet.rootTopic.children.length - 1]!.id;
      }
    }

    const sheet = bus.getDocument().sheets[0]!;
    const titlesBefore = collectTitles(sheet.rootTopic);
    const start = performance.now();
    bus.dispatch(new UpdateSheetStructureCommand(sheetId, 'fishbone'));
    expect(performance.now() - start).toBeLessThan(1000);

    const titlesAfter = collectTitles(bus.getDocument().sheets[0]!.rootTopic);
    expect(titlesAfter).toEqual(titlesBefore);
  });

  it('场景 3: SWOT 矩阵模板录入并导出', () => {
    const tpl = getTemplate('tpl-swot');
    expect(tpl).toBeDefined();
    const doc = createFromTemplate('tpl-swot');
    const sheet = doc.sheets[0]!;
    const quadrants = sheet.rootTopic.children;
    expect(quadrants.length).toBeGreaterThanOrEqual(4);

    quadrants[0]!.title = '优势 S';
    quadrants[1]!.title = '劣势 W';
    quadrants[2]!.title = '机会 O';
    quadrants[3]!.title = '威胁 T';

    const md = exportMarkdown(doc);
    expect(md).toContain('优势 S');
    expect(md).toContain('威胁 T');
  });

  it('场景 4: 删除节点后树结构同步', () => {
    const doc = createDocument('sync', 'mindmap');
    const bus = new CommandBus(doc);
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;

    bus.dispatch(new AddTopicCommand(sheetId, rootId, '大纲项'));
    const branchId = bus.getDocument().sheets[0]!.rootTopic.children[0]!.id;
    bus.dispatch(new AddTopicCommand(sheetId, branchId, '子项'));

    expect(countTopics(bus.getDocument().sheets[0]!.rootTopic)).toBe(3);
    const leafId = bus.getDocument().sheets[0]!.rootTopic.children[0]!.children[0]!.id;
    bus.dispatch(new DeleteTopicCommand(sheetId, leafId));
    expect(countTopics(bus.getDocument().sheets[0]!.rootTopic)).toBe(2);
  });

  it('场景 5: JSON 序列化往返一致', () => {
    const doc = createDocument('跨平台', 'logic-chart');
    const bus = new CommandBus(doc);
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    bus.dispatch(new AddTopicCommand(sheetId, rootId, 'A'));
    bus.dispatch(new AddTopicCommand(sheetId, rootId, 'B'));
    const aId = bus.getDocument().sheets[0]!.rootTopic.children[0]!.id;
    bus.dispatch(new AddTopicCommand(sheetId, aId, 'A-1'));

    const finalDoc = bus.getDocument();
    const json = serializeDocument(finalDoc);
    const restored = deserializeDocument(json);

    expect(restored.title).toBe(finalDoc.title);
    expect(restored.sheets[0]!.structure).toBe('logic-chart');
    expect(collectTitles(restored.sheets[0]!.rootTopic)).toEqual(
      collectTitles(finalDoc.sheets[0]!.rootTopic),
    );
  });

  it('场景 6: 概要/外框/关系切换结构后保留', () => {
    const doc = createDocument('structure-elements', 'mindmap');
    const bus = new CommandBus(doc);
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;

    for (let i = 0; i < 3; i++) {
      bus.dispatch(new AddTopicCommand(sheetId, rootId, `子${i + 1}`));
    }
    const sheet = bus.getDocument().sheets[0]!;
    const ids = sheet.rootTopic.children.map((c) => c.id);

    bus.dispatch(new AddSummaryCommand(sheetId, rootId, [ids[0]!, ids[1]!]));
    bus.dispatch(new AddBoundaryCommand(sheetId, ids, '外框'));
    bus.dispatch(new AddRelationshipCommand(sheetId, ids[0]!, ids[2]!, '依赖'));

    const afterElements = bus.getDocument().sheets[0]!;
    expect(afterElements.summaries.length).toBe(1);
    expect(afterElements.boundaries.length).toBe(1);
    expect(afterElements.relationships.length).toBe(1);

    bus.dispatch(new UpdateSheetStructureCommand(sheetId, 'logic-chart'));

    const afterSwitch = bus.getDocument().sheets[0]!;
    expect(afterSwitch.summaries.length).toBe(1);
    expect(afterSwitch.boundaries.length).toBe(1);
    expect(afterSwitch.relationships.length).toBe(1);

    const registry = createDefaultLayoutRegistry();
    const layout = registry.layout(afterSwitch, createMeasureFn());
    expect(layout.nodes.size).toBeGreaterThan(0);
  });
});

function findTopic(root: import('../model/types.js').Topic, id: string) {
  if (root.id === id) return root;
  for (const c of root.children) {
    const found = findTopic(c, id);
    if (found) return found;
  }
  return null;
}

function countTopics(root: import('../model/types.js').Topic): number {
  return 1 + root.children.reduce((n, c) => n + countTopics(c), 0);
}

function collectTitles(root: import('../model/types.js').Topic): string[] {
  const out: string[] = [root.title];
  for (const c of root.children) out.push(...collectTitles(c));
  return out;
}
