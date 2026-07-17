// covers: ST-005
import type { LayoutEdge, LayoutNode, LayoutResult, MeasureFn, StructureOptions, Topic } from '../model/types.js';
import { collectHidden, finalizeResult, H_GAP, LEVEL_GAP, V_GAP } from './utils.js';

/** Sort by ISO date ascending; undated topics keep relative order at the end. */
export function sortTopicsByDate(topics: Topic[]): Topic[] {
  return topics
    .map((topic, index) => ({ topic, index }))
    .sort((a, b) => {
      const da = a.topic.date;
      const db = b.topic.date;
      if (da && db) {
        const cmp = da.localeCompare(db);
        return cmp !== 0 ? cmp : a.index - b.index;
      }
      if (da && !db) return -1;
      if (!da && db) return 1;
      return a.index - b.index;
    })
    .map(({ topic }) => topic);
}

function layoutDescendantsAlongBranch(
  parent: Topic,
  parentNode: LayoutNode,
  depth: number,
  axis: 'horizontal' | 'vertical',
  sideSign: number,
  hiddenIds: Set<string>,
  measure: MeasureFn,
  nodes: Map<string, LayoutNode>,
  edges: LayoutEdge[],
): void {
  if (parent.collapsed) return;
  const children = parent.children.filter((c) => !hiddenIds.has(c.id));
  if (children.length === 0) return;

  let cursor =
    axis === 'horizontal'
      ? parentNode.y + (sideSign > 0 ? parentNode.height + V_GAP : -V_GAP)
      : parentNode.x + (sideSign > 0 ? parentNode.width + H_GAP : -H_GAP);

  for (const child of children) {
    const size = measure(child, depth);
    let x: number;
    let y: number;
    if (axis === 'horizontal') {
      x = parentNode.x + (parentNode.width - size.width) / 2;
      y = sideSign > 0 ? cursor : cursor - size.height;
      cursor = sideSign > 0 ? y + size.height + V_GAP : y - V_GAP;
    } else {
      y = parentNode.y + (parentNode.height - size.height) / 2;
      x = sideSign > 0 ? cursor : cursor - size.width;
      cursor = sideSign > 0 ? x + size.width + H_GAP : x - H_GAP;
    }

    nodes.set(child.id, {
      id: child.id,
      x,
      y,
      width: size.width,
      height: size.height,
      depth,
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
        { x: x + size.width / 2, y: y + size.height / 2 },
      ],
      type: 'tree',
    });

    layoutDescendantsAlongBranch(
      child,
      nodes.get(child.id)!,
      depth + 1,
      axis,
      sideSign,
      hiddenIds,
      measure,
      nodes,
      edges,
    );
  }
}

export function layoutTimeline(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const alternate = options.type === 'timeline' ? options.alternate : true;
  const showScale = options.type === 'timeline' ? options.showScale : true;
  const axis = options.type === 'timeline' ? options.axis : 'horizontal';
  const nodes = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
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

  const children = sortTopicsByDate(root.children.filter((c) => !hiddenIds.has(c.id)));

  if (axis === 'horizontal') {
    let x = rootSize.width + LEVEL_GAP;
    const axisY = rootSize.height / 2;

    children.forEach((child, i) => {
      const size = measure(child, 1);
      const below = alternate && i % 2 === 1;
      const sideSign = below ? 1 : -1;
      const y = below ? rootSize.height + 40 : -size.height - 20;
      nodes.set(child.id, {
        id: child.id,
        x,
        y,
        width: size.width,
        height: size.height,
        depth: 1,
      });
      edges.push({
        id: `${root.id}-${child.id}`,
        from: root.id,
        to: child.id,
        points: [
          { x: rootSize.width, y: axisY },
          { x: x + size.width / 2, y: y + size.height / 2 },
        ],
        type: 'tree',
      });

      layoutDescendantsAlongBranch(
        child,
        nodes.get(child.id)!,
        2,
        'horizontal',
        sideSign,
        hiddenIds,
        measure,
        nodes,
        edges,
      );

      x += size.width + H_GAP;
    });

    if (showScale) {
      extraShapes.push({
        id: 'timeline-axis',
        type: 'timeline-axis',
        bounds: {
          x: rootSize.width,
          y: axisY,
          width: Math.max(x - rootSize.width, LEVEL_GAP),
          height: 2,
        },
        style: {},
      });
    }
  } else {
    let y = rootSize.height + LEVEL_GAP;
    const axisX = rootSize.width / 2;

    children.forEach((child, i) => {
      const size = measure(child, 1);
      const right = alternate && i % 2 === 1;
      const sideSign = right ? 1 : -1;
      const x = right ? rootSize.width + 40 : -size.width - 20;
      nodes.set(child.id, {
        id: child.id,
        x,
        y,
        width: size.width,
        height: size.height,
        depth: 1,
      });
      edges.push({
        id: `${root.id}-${child.id}`,
        from: root.id,
        to: child.id,
        points: [
          { x: axisX, y: rootSize.height },
          { x: x + size.width / 2, y: y + size.height / 2 },
        ],
        type: 'tree',
      });

      layoutDescendantsAlongBranch(
        child,
        nodes.get(child.id)!,
        2,
        'vertical',
        sideSign,
        hiddenIds,
        measure,
        nodes,
        edges,
      );

      y += size.height + V_GAP;
    });

    if (showScale) {
      extraShapes.push({
        id: 'timeline-axis',
        type: 'timeline-axis',
        bounds: {
          x: axisX,
          y: rootSize.height,
          width: 2,
          height: Math.max(y - rootSize.height, LEVEL_GAP),
        },
        style: {},
      });
    }
  }

  return finalizeResult(nodes, edges, extraShapes);
}
