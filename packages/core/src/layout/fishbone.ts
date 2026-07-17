// covers: ST-006
import type {
  ExtraShape,
  LayoutEdge,
  LayoutNode,
  LayoutResult,
  MeasureFn,
  StructureOptions,
  Topic,
} from '../model/types.js';
import { collectHidden, finalizeResult } from './utils.js';

const BONE_STEP = 56;

function layoutAlongBone(
  parent: Topic,
  parentNode: LayoutNode,
  depth: number,
  angle: number,
  spineDir: number,
  hiddenIds: Set<string>,
  measure: MeasureFn,
  nodes: Map<string, LayoutNode>,
  edges: LayoutEdge[],
): void {
  if (parent.collapsed) return;
  const children = parent.children.filter((c) => !hiddenIds.has(c.id));
  if (children.length === 0) return;

  const ux = spineDir * Math.cos(Math.abs(angle));
  const uy = Math.sin(angle);

  children.forEach((child, i) => {
    const size = measure(child, depth);
    const dist = BONE_STEP * (i + 1);
    const cx = parentNode.x + parentNode.width / 2 + ux * dist;
    const cy = parentNode.y + parentNode.height / 2 + uy * dist;
    nodes.set(child.id, {
      id: child.id,
      x: cx - size.width / 2,
      y: cy - size.height / 2,
      width: size.width,
      height: size.height,
      depth,
      angle,
    });
    edges.push({
      id: `${parent.id}-${child.id}`,
      from: parent.id,
      to: child.id,
      points: [
        {
          x: parentNode.x + parentNode.width / 2,
          y: parentNode.y + parentNode.height / 2,
        },
        { x: cx, y: cy },
      ],
      type: 'tree',
    });

    layoutAlongBone(
      child,
      nodes.get(child.id)!,
      depth + 1,
      angle,
      spineDir,
      hiddenIds,
      measure,
      nodes,
      edges,
    );
  });
}

export function layoutFishbone(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const branchAngle =
    options.type === 'fishbone' ? (options.branchAngle * Math.PI) / 180 : Math.PI / 4;
  const headPosition = options.type === 'fishbone' ? options.headPosition : 'right';
  const nodes = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
  const extraShapes: ExtraShape[] = [];
  const hiddenIds = collectHidden(root);

  const rootSize = measure(root, 0);
  const children = root.children.filter((c) => !hiddenIds.has(c.id));
  const spineLen = Math.max(500, (children.length + 1) * 80 + 120);
  const headX = headPosition === 'left' ? 0 : spineLen;
  const spineDir = headPosition === 'left' ? 1 : -1;
  const spineY = 100 + rootSize.height / 2;

  nodes.set(root.id, {
    id: root.id,
    x: headX,
    y: 100,
    width: rootSize.width,
    height: rootSize.height,
    depth: 0,
  });

  const spineEnd = headX + spineDir * spineLen;
  extraShapes.push({
    id: 'fishbone-spine',
    type: 'timeline-axis',
    bounds: {
      x: Math.min(headX + (headPosition === 'left' ? rootSize.width : 0), spineEnd),
      y: spineY,
      width: Math.abs(spineEnd - headX - (headPosition === 'left' ? rootSize.width : 0)),
      height: 2,
    },
    style: { stroke: '#888888' },
  });

  children.forEach((child, i) => {
    const size = measure(child, 1);
    const sign = i % 2 === 0 ? -1 : 1;
    const angle = sign * branchAngle;
    const along = (i + 1) * 80;
    const spineX = headX + spineDir * along;
    const offsetY = sign * Math.tan(branchAngle) * 80;
    const cx = spineX;
    const cy = spineY + offsetY;

    nodes.set(child.id, {
      id: child.id,
      x: cx - size.width / 2,
      y: cy - size.height / 2,
      width: size.width,
      height: size.height,
      depth: 1,
      angle,
    });
    edges.push({
      id: `${root.id}-${child.id}`,
      from: root.id,
      to: child.id,
      points: [
        { x: spineX, y: spineY },
        { x: cx, y: cy },
      ],
      type: 'tree',
    });

    layoutAlongBone(
      child,
      nodes.get(child.id)!,
      2,
      angle,
      spineDir,
      hiddenIds,
      measure,
      nodes,
      edges,
    );
  });

  return finalizeResult(nodes, edges, extraShapes);
}
