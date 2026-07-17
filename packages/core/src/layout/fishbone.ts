// covers: ST-006
import type { LayoutResult, MeasureFn, StructureOptions, Topic } from '../model/types.js';
import { collectHidden, finalizeResult, V_GAP } from './utils.js';

export function layoutFishbone(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const branchAngle =
    options.type === 'fishbone' ? (options.branchAngle * Math.PI) / 180 : Math.PI / 4;
  const headPosition = options.type === 'fishbone' ? options.headPosition : 'left';
  const nodes = new Map<string, import('../model/types.js').LayoutNode>();
  const edges: import('../model/types.js').LayoutEdge[] = [];
  const extraShapes: import('../model/types.js').ExtraShape[] = [];
  const hiddenIds = collectHidden(root);

  const rootSize = measure(root, 0);
  const headX = headPosition === 'left' ? 0 : 400;
  nodes.set(root.id, {
    id: root.id,
    x: headX,
    y: 100,
    width: rootSize.width,
    height: rootSize.height,
    depth: 0,
  });

  const spineEnd = headPosition === 'left' ? headX + 500 : headX - 500;
  extraShapes.push({
    id: 'fishbone-spine',
    type: 'brace',
    bounds: { x: Math.min(headX, spineEnd), y: 100 + rootSize.height / 2, width: Math.abs(spineEnd - headX), height: 2 },
    style: {},
  });

  const children = root.children.filter((c) => !hiddenIds.has(c.id));
  children.forEach((child, i) => {
    const size = measure(child, 1);
    const sign = i % 2 === 0 ? -1 : 1;
    const spineX = headX + (headPosition === 'left' ? 1 : -1) * (i + 1) * 80;
    const offsetY = sign * Math.tan(branchAngle) * 80;
    nodes.set(child.id, {
      id: child.id,
      x: spineX - size.width / 2,
      y: 100 + rootSize.height / 2 + offsetY - size.height / 2,
      width: size.width,
      height: size.height,
      depth: 1,
      angle: sign * branchAngle,
    });
    edges.push({
      id: `${root.id}-${child.id}`,
      from: root.id,
      to: child.id,
      points: [
        { x: spineX, y: 100 + rootSize.height / 2 },
        { x: nodes.get(child.id)!.x + size.width / 2, y: nodes.get(child.id)!.y + size.height / 2 },
      ],
      type: 'tree',
    });

    if (!child.collapsed) {
      let cy = nodes.get(child.id)!.y + size.height + V_GAP;
      for (const gc of child.children) {
        if (hiddenIds.has(gc.id)) continue;
        const gs = measure(gc, 2);
        nodes.set(gc.id, {
          id: gc.id,
          x: nodes.get(child.id)!.x,
          y: cy,
          width: gs.width,
          height: gs.height,
          depth: 2,
        });
        edges.push({
          id: `${child.id}-${gc.id}`,
          from: child.id,
          to: gc.id,
          points: [
            { x: nodes.get(child.id)!.x + size.width / 2, y: nodes.get(child.id)!.y + size.height },
            { x: nodes.get(gc.id)!.x + gs.width / 2, y: cy },
          ],
          type: 'tree',
        });
        cy += gs.height + V_GAP;
      }
    }
  });

  return finalizeResult(nodes, edges, extraShapes);
}
