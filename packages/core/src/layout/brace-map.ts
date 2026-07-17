// covers: ST-008
import type { LayoutResult, MeasureFn, StructureOptions, Topic } from '../model/types.js';
import { collectHidden, finalizeResult, LEVEL_GAP, V_GAP } from './utils.js';

export function layoutBraceMap(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const braceSide = options.type === 'brace-map' ? options.braceSide : 'left';
  const nodes = new Map<string, import('../model/types.js').LayoutNode>();
  const edges: import('../model/types.js').LayoutEdge[] = [];
  const extraShapes: import('../model/types.js').ExtraShape[] = [];
  const hiddenIds = collectHidden(root);

  const rootSize = measure(root, 0);
  const rootX = braceSide === 'left' ? 0 : 300;
  nodes.set(root.id, {
    id: root.id,
    x: rootX,
    y: 50,
    width: rootSize.width,
    height: rootSize.height,
    depth: 0,
  });

  const children = root.children.filter((c) => !hiddenIds.has(c.id));
  let cy = 0;
  const childX = braceSide === 'left' ? rootX + rootSize.width + LEVEL_GAP : rootX - 150;

  children.forEach((child) => {
    const size = measure(child, 1);
    nodes.set(child.id, {
      id: child.id,
      x: childX,
      y: cy,
      width: size.width,
      height: size.height,
      depth: 1,
    });
    edges.push({
      id: `${root.id}-${child.id}`,
      from: root.id,
      to: child.id,
      points: [
        { x: braceSide === 'left' ? rootX + rootSize.width : rootX, y: 50 + rootSize.height / 2 },
        { x: braceSide === 'left' ? childX : childX + size.width, y: cy + size.height / 2 },
      ],
      type: 'tree',
    });
    cy += size.height + V_GAP;
  });

  if (children.length > 0) {
    const first = nodes.get(children[0]!.id)!;
    const last = nodes.get(children[children.length - 1]!.id)!;
    const braceTop = first.y;
    const braceHeight = last.y + last.height - braceTop;
    const braceW = 14;
    const braceX =
      braceSide === 'left'
        ? rootX + rootSize.width + 24
        : childX + (children[0] ? measure(children[0], 1).width : 0) + 24;

    extraShapes.push({
      id: 'brace-main',
      type: 'brace',
      bounds: { x: braceX, y: braceTop, width: braceW, height: braceHeight },
      style: {
        stroke: '#888888',
        openSide: braceSide === 'left' ? 'right' : 'left',
      },
    });
  }

  return finalizeResult(nodes, edges, extraShapes);
}
