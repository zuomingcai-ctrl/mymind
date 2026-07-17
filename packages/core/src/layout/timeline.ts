// covers: ST-005
import type { LayoutResult, MeasureFn, StructureOptions, Topic } from '../model/types.js';
import { collectHidden, finalizeResult, H_GAP, LEVEL_GAP } from './utils.js';

export function layoutTimeline(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const alternate = options.type === 'timeline' ? options.alternate : true;
  const showScale = options.type === 'timeline' ? options.showScale : true;
  const nodes = new Map<string, import('../model/types.js').LayoutNode>();
  const edges: import('../model/types.js').LayoutEdge[] = [];
  const extraShapes: import('../model/types.js').ExtraShape[] = [];
  const hiddenIds = collectHidden(root);

  const rootSize = measure(root, 0);
  nodes.set(root.id, {
    id: root.id,
    x: 0,
    y: 0,
    width: rootSize.width,
    height: rootSize.height,
    depth: 0,
  });

  const children = root.children.filter((c) => !hiddenIds.has(c.id));
  let x = rootSize.width + LEVEL_GAP;

  if (showScale) {
    extraShapes.push({
      id: 'timeline-axis',
      type: 'timeline-axis',
      bounds: { x: rootSize.width, y: rootSize.height / 2, width: x + children.length * LEVEL_GAP, height: 2 },
      style: {},
    });
  }

  children.forEach((child, i) => {
    if (hiddenIds.has(child.id)) return;
    const size = measure(child, 1);
    const y =
      alternate && i % 2 === 1
        ? rootSize.height + 40
        : -size.height - 20;
    nodes.set(child.id, {
      id: child.id,
      x,
      y: Math.max(y, -size.height),
      width: size.width,
      height: size.height,
      depth: 1,
    });
    edges.push({
      id: `${root.id}-${child.id}`,
      from: root.id,
      to: child.id,
      points: [
        { x: rootSize.width, y: rootSize.height / 2 },
        { x, y: nodes.get(child.id)!.y + size.height / 2 },
      ],
      type: 'tree',
    });
    x += size.width + H_GAP;
  });

  return finalizeResult(nodes, edges, extraShapes);
}
