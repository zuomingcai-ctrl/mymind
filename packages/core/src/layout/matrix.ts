// covers: ST-007
import type { LayoutResult, MeasureFn, StructureOptions, Topic } from '../model/types.js';
import { collectHidden, finalizeResult } from './utils.js';

export function layoutMatrix(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const rows = options.type === 'matrix' ? options.rows : 2;
  const cols = options.type === 'matrix' ? options.cols : 2;
  const assignMode = options.type === 'matrix' ? options.assignMode : 'auto';
  const titles = options.type === 'matrix' ? options.titles : [];
  const nodes = new Map<string, import('../model/types.js').LayoutNode>();
  const edges: import('../model/types.js').LayoutEdge[] = [];
  const extraShapes: import('../model/types.js').ExtraShape[] = [];
  const hiddenIds = collectHidden(root);

  const cellW = 180;
  const cellH = 120;
  const rootSize = measure(root, 0);
  const gridW = cols * cellW;
  nodes.set(root.id, {
    id: root.id,
    x: gridW / 2 - rootSize.width / 2,
    y: 0,
    width: rootSize.width,
    height: rootSize.height,
    depth: 0,
  });

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      extraShapes.push({
        id: `matrix-cell-${r}-${c}`,
        type: 'matrix-cell',
        bounds: { x: c * cellW, y: rootSize.height + 40 + r * cellH, width: cellW - 10, height: cellH - 10 },
        label: titles[idx] ?? `Q${idx + 1}`,
        style: {},
      });
    }
  }

  const children = root.children.filter((c) => !hiddenIds.has(c.id));
  children.forEach((child, i) => {
    const quadrant =
      assignMode === 'manual' && child.quadrantIndex !== undefined
        ? child.quadrantIndex
        : i % (rows * cols);
    const r = Math.floor(quadrant / cols);
    const c = quadrant % cols;
    const size = measure(child, 1);
    const cx = c * cellW + 10;
    const cy = rootSize.height + 50 + r * cellH;
    nodes.set(child.id, {
      id: child.id,
      x: cx,
      y: cy,
      width: size.width,
      height: size.height,
      depth: 1,
      rowIndex: r,
      colIndex: c,
    });
    edges.push({
      id: `${root.id}-${child.id}`,
      from: root.id,
      to: child.id,
      points: [
        { x: nodes.get(root.id)!.x + rootSize.width / 2, y: rootSize.height },
        { x: cx + size.width / 2, y: cy },
      ],
      type: 'tree',
    });

    let sy = cy + size.height + 10;
    for (const gc of child.children) {
      if (hiddenIds.has(gc.id) || child.collapsed) continue;
      const gs = measure(gc, 2);
      nodes.set(gc.id, { id: gc.id, x: cx + 10, y: sy, width: gs.width, height: gs.height, depth: 2 });
      edges.push({
        id: `${child.id}-${gc.id}`,
        from: child.id,
        to: gc.id,
        points: [
          { x: cx + size.width / 2, y: cy + size.height },
          { x: cx + 10 + gs.width / 2, y: sy },
        ],
        type: 'tree',
      });
      sy += gs.height + 8;
    }
  });

  return finalizeResult(nodes, edges, extraShapes);
}
