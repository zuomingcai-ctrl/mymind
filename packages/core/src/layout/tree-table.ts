// covers: ST-009
import type {
  ExtraShape,
  LayoutResult,
  MeasureFn,
  StructureOptions,
  Topic,
  TreeTableColumn,
} from '../model/types.js';
import { defaultStructureOptions } from '../model/types.js';
import { collectHidden, finalizeResult } from './utils.js';

const ROW_HEIGHT = 36;
const INDENT = 24;
const HEADER_HEIGHT = 28;

function defaultColumns(): TreeTableColumn[] {
  return (
    defaultStructureOptions('tree-table') as Extract<StructureOptions, { type: 'tree-table' }>
  ).columns;
}

function cellText(topic: Topic, field: TreeTableColumn['field']): string {
  switch (field) {
    case 'title':
      return topic.title;
    case 'note':
      return (topic.note ?? '').replace(/<[^>]+>/g, '').trim();
    case 'labels':
      return topic.labels.map((l) => l.text).join(', ');
    case 'markers':
      return topic.markers.join(', ');
    case 'task': {
      if (!topic.task) return '';
      const parts: string[] = [];
      if (topic.task.assignee) parts.push(topic.task.assignee);
      if (topic.task.progress > 0) parts.push(`${topic.task.progress}%`);
      if (topic.task.priority !== 'none') parts.push(topic.task.priority);
      return parts.join(' · ');
    }
    default:
      return '';
  }
}

export function layoutTreeTable(
  root: Topic,
  options: StructureOptions,
  _measure: MeasureFn,
): LayoutResult {
  const showTreeLine = options.type === 'tree-table' ? options.showTreeLine : true;
  const columns: TreeTableColumn[] =
    options.type === 'tree-table' && options.columns.length > 0
      ? options.columns
      : defaultColumns();

  const nodes = new Map<string, import('../model/types.js').LayoutNode>();
  const edges: import('../model/types.js').LayoutEdge[] = [];
  const extraShapes: ExtraShape[] = [];
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

  let headerX = 0;
  for (const col of columns) {
    extraShapes.push({
      id: `table-header-${col.id}`,
      type: 'table-cell',
      bounds: { x: headerX, y: 0, width: col.width, height: HEADER_HEIGHT },
      label: col.label,
      style: { fill: 'rgba(0,0,0,0.04)', stroke: '#cccccc' },
    });
    headerX += col.width;
  }

  const titleColIndex = Math.max(
    0,
    columns.findIndex((c) => c.field === 'title'),
  );

  for (const row of rows) {
    const y = HEADER_HEIGHT + 4 + row.rowIndex * ROW_HEIGHT;
    let colX = 0;

    for (let ci = 0; ci < columns.length; ci++) {
      const col = columns[ci]!;
      const text = cellText(row.topic, col.field);

      if (ci === titleColIndex) {
        const indent = col.field === 'title' ? row.depth * INDENT : 0;
        nodes.set(row.topic.id, {
          id: row.topic.id,
          x: colX + indent,
          y,
          width: Math.max(col.width - indent, 80),
          height: ROW_HEIGHT - 4,
          depth: row.depth,
          rowIndex: row.rowIndex,
          colIndex: ci,
        });
      } else {
        extraShapes.push({
          id: `table-cell-${row.topic.id}-${col.id}`,
          type: 'table-cell',
          bounds: { x: colX, y, width: col.width, height: ROW_HEIGHT - 4 },
          label: text,
          style: { stroke: '#e5e5e5' },
        });
      }

      colX += col.width;
    }
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
