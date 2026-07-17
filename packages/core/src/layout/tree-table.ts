// covers: ST-009
import type { LayoutResult, MeasureFn, StructureOptions, Topic } from '../model/types.js';
import { collectHidden, finalizeResult } from './utils.js';

const ROW_HEIGHT = 36;
const INDENT = 24;

export function layoutTreeTable(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const showTreeLine = options.type === 'tree-table' ? options.showTreeLine : true;
  const nodes = new Map<string, import('../model/types.js').LayoutNode>();
  const edges: import('../model/types.js').LayoutEdge[] = [];
  const extraShapes: import('../model/types.js').ExtraShape[] = [];
  const hiddenIds = collectHidden(root);

  const rows: { topic: Topic; depth: number; rowIndex: number }[] = [];
  function dfs(topic: Topic, depth: number) {
    if (hiddenIds.has(topic.id)) return;
    rows.push({ topic, depth, rowIndex: rows.length });
    if (!topic.collapsed) {
      for (const child of topic.children) {
        dfs(child, depth + 1);
      }
    }
  }
  dfs(root, 0);

  for (const row of rows) {
    const size = measure(row.topic, row.depth);
    const x = row.depth * INDENT;
    const y = row.rowIndex * ROW_HEIGHT;
    nodes.set(row.topic.id, {
      id: row.topic.id,
      x,
      y,
      width: Math.max(size.width, 100),
      height: ROW_HEIGHT - 4,
      depth: row.depth,
      rowIndex: row.rowIndex,
    });
  }

  if (showTreeLine) {
    for (const row of rows) {
      if (row.depth === 0) continue;
      const parent = findParent(root, row.topic.id);
      if (!parent) continue;
      const pNode = nodes.get(parent.id);
      const cNode = nodes.get(row.topic.id);
      if (pNode && cNode) {
        edges.push({
          id: `${parent.id}-${row.topic.id}`,
          from: parent.id,
          to: row.topic.id,
          points: [
            { x: pNode.x + 8, y: pNode.y + pNode.height / 2 },
            { x: cNode.x, y: cNode.y + cNode.height / 2 },
          ],
          type: 'tree',
        });
      }
    }
  }

  return finalizeResult(nodes, edges, extraShapes);
}

function findParent(root: Topic, id: string): Topic | null {
  for (const child of root.children) {
    if (child.id === id) return root;
    const found = findParent(child, id);
    if (found) return found;
  }
  return null;
}
