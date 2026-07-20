// covers: ST-007
import type {
  LayoutEdge,
  LayoutNode,
  LayoutResult,
  MeasureFn,
  StructureOptions,
  Topic,
} from '../model/types.js';
import { collectHidden, finalizeResult } from './utils.js';

const CELL_W = 180;
const CELL_PAD = 10;
const CELL_GAP_Y = 8;
const GRID_TOP_GAP = 40;
const DEPTH_INDENT = 10;

/** Stacked height of a topic and all visible descendants inside a matrix cell. */
function stackHeight(
  topic: Topic,
  depth: number,
  hiddenIds: Set<string>,
  measure: MeasureFn,
): number {
  if (hiddenIds.has(topic.id)) return 0;
  const size = measure(topic, depth);
  if (topic.collapsed) return size.height;
  const visible = topic.children.filter((c) => !hiddenIds.has(c.id));
  if (visible.length === 0) return size.height;
  let h = size.height;
  for (const child of visible) {
    h += CELL_GAP_Y + stackHeight(child, depth + 1, hiddenIds, measure);
  }
  return h;
}

function placeSubtree(
  topic: Topic,
  depth: number,
  x: number,
  y: number,
  parentId: string | undefined,
  parentNode: LayoutNode | undefined,
  hiddenIds: Set<string>,
  measure: MeasureFn,
  nodes: Map<string, LayoutNode>,
  edges: LayoutEdge[],
  rowIndex?: number,
  colIndex?: number,
): number {
  if (hiddenIds.has(topic.id)) return 0;
  const size = measure(topic, depth);
  const node: LayoutNode = {
    id: topic.id,
    x,
    y,
    width: size.width,
    height: size.height,
    depth,
    ...(rowIndex !== undefined ? { rowIndex, colIndex } : {}),
  };
  nodes.set(topic.id, node);

  if (parentId && parentNode) {
    edges.push({
      id: `${parentId}-${topic.id}`,
      from: parentId,
      to: topic.id,
      points: [
        { x: parentNode.x + parentNode.width / 2, y: parentNode.y + parentNode.height },
        { x: x + size.width / 2, y: y },
      ],
      type: 'tree',
    });
  }

  if (topic.collapsed) return size.height;

  const visible = topic.children.filter((c) => !hiddenIds.has(c.id));
  let cursor = y + size.height;
  for (const child of visible) {
    cursor += CELL_GAP_Y;
    const childH = placeSubtree(
      child,
      depth + 1,
      x + DEPTH_INDENT,
      cursor,
      topic.id,
      node,
      hiddenIds,
      measure,
      nodes,
      edges,
    );
    cursor += childH;
  }
  return cursor - y;
}

export function layoutMatrix(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const rows = options.type === 'matrix' ? options.rows : 2;
  const cols = options.type === 'matrix' ? options.cols : 2;
  const assignMode = options.type === 'matrix' ? options.assignMode : 'auto';
  const titles = options.type === 'matrix' ? options.titles : [];
  const nodes = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
  const extraShapes: import('../model/types.js').ExtraShape[] = [];
  const hiddenIds = collectHidden(root);

  const rootSize = measure(root, 0);
  const gridW = cols * CELL_W;
  nodes.set(root.id, {
    id: root.id,
    x: gridW / 2 - rootSize.width / 2,
    y: 0,
    width: rootSize.width,
    height: rootSize.height,
    depth: 0,
  });

  const cellCount = Math.max(rows * cols, 1);
  const children = root.children.filter((c) => !hiddenIds.has(c.id));
  const byQuadrant = new Map<number, Topic[]>();
  children.forEach((child, i) => {
    const quadrant =
      assignMode === 'manual' && child.quadrantIndex !== undefined
        ? Math.max(0, Math.min(child.quadrantIndex, cellCount - 1))
        : i % cellCount;
    const list = byQuadrant.get(quadrant) ?? [];
    list.push(child);
    byQuadrant.set(quadrant, list);
  });

  const cellContentH = new Array(cellCount).fill(0) as number[];
  for (const [quadrant, topics] of byQuadrant) {
    let h = 0;
    for (let ti = 0; ti < topics.length; ti++) {
      h += stackHeight(topics[ti]!, 1, hiddenIds, measure);
      if (ti < topics.length - 1) h += CELL_GAP_Y + 4;
    }
    cellContentH[quadrant] = h;
  }

  const minCellH = 110;
  const rowHeights: number[] = [];
  for (let r = 0; r < rows; r++) {
    let rowH = minCellH;
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      rowH = Math.max(rowH, cellContentH[idx]! + CELL_PAD * 2);
    }
    rowHeights.push(rowH);
  }

  const rowTops: number[] = [];
  let gridY = rootSize.height + GRID_TOP_GAP;
  for (let r = 0; r < rows; r++) {
    rowTops.push(gridY);
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      extraShapes.push({
        id: `matrix-cell-${r}-${c}`,
        type: 'matrix-cell',
        bounds: {
          x: c * CELL_W,
          y: gridY,
          width: CELL_W - 10,
          height: rowHeights[r]! - 10,
        },
        label: titles[idx] ?? `Q${idx + 1}`,
        style: {},
      });
    }
    gridY += rowHeights[r]!;
  }

  const rootNode = nodes.get(root.id)!;
  for (const [quadrant, topics] of byQuadrant) {
    const r = Math.floor(quadrant / cols);
    const c = quadrant % cols;
    const cx = c * CELL_W + CELL_PAD;
    let cy = rowTops[r]! + CELL_PAD;

    for (let ti = 0; ti < topics.length; ti++) {
      const child = topics[ti]!;
      const h = placeSubtree(
        child,
        1,
        cx,
        cy,
        root.id,
        rootNode,
        hiddenIds,
        measure,
        nodes,
        edges,
        r,
        c,
      );
      cy += h + (ti < topics.length - 1 ? CELL_GAP_Y + 4 : 0);
    }
  }

  return finalizeResult(nodes, edges, extraShapes);
}
