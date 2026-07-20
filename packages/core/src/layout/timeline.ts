// covers: ST-005
import type { LayoutEdge, LayoutNode, LayoutResult, MeasureFn, StructureOptions, Topic } from '../model/types.js';
import { buildHorizontalCurvePoints, buildVerticalTreeEdgePoints } from './edge-paths.js';
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

/**
 * Multi-level timeline grows along the axis as a tree (like a logic chart),
 * not as a single column stacked away from the axis.
 *
 * Horizontal: children to the right, siblings stacked vertically.
 * Vertical: children below, siblings stacked horizontally.
 */

function treeBlockHeight(
  topic: Topic,
  depth: number,
  axis: 'horizontal' | 'vertical',
  hiddenIds: Set<string>,
  measure: MeasureFn,
): number {
  if (hiddenIds.has(topic.id)) return 0;
  const size = measure(topic, depth);
  if (topic.collapsed) return size.height;
  const children = topic.children.filter((c) => !hiddenIds.has(c.id));
  if (children.length === 0) return size.height;

  if (axis === 'horizontal') {
    let kids = 0;
    for (let i = 0; i < children.length; i++) {
      kids += treeBlockHeight(children[i]!, depth + 1, axis, hiddenIds, measure);
      if (i < children.length - 1) kids += V_GAP;
    }
    return Math.max(size.height, kids);
  }

  // vertical axis: children below → height = self + gap + tallest child chain
  let maxChild = 0;
  for (const child of children) {
    maxChild = Math.max(maxChild, treeBlockHeight(child, depth + 1, axis, hiddenIds, measure));
  }
  return size.height + LEVEL_GAP + maxChild;
}

function treeBlockWidth(
  topic: Topic,
  depth: number,
  axis: 'horizontal' | 'vertical',
  hiddenIds: Set<string>,
  measure: MeasureFn,
): number {
  if (hiddenIds.has(topic.id)) return 0;
  const size = measure(topic, depth);
  if (topic.collapsed) return size.width;
  const children = topic.children.filter((c) => !hiddenIds.has(c.id));
  if (children.length === 0) return size.width;

  if (axis === 'horizontal') {
    let maxChild = 0;
    for (const child of children) {
      maxChild = Math.max(maxChild, treeBlockWidth(child, depth + 1, axis, hiddenIds, measure));
    }
    return size.width + LEVEL_GAP + maxChild;
  }

  // vertical axis: siblings side by side
  let kids = 0;
  for (let i = 0; i < children.length; i++) {
    kids += treeBlockWidth(children[i]!, depth + 1, axis, hiddenIds, measure);
    if (i < children.length - 1) kids += H_GAP;
  }
  return Math.max(size.width, kids);
}

/** Place topic + descendants as a rightward tree inside a vertical band. */
function layoutTreeRight(
  topic: Topic,
  depth: number,
  x: number,
  bandTop: number,
  hiddenIds: Set<string>,
  measure: MeasureFn,
  nodes: Map<string, LayoutNode>,
  edges: LayoutEdge[],
  parentId?: string,
): number {
  if (hiddenIds.has(topic.id)) return 0;
  const size = measure(topic, depth);
  const children =
    topic.collapsed ? [] : topic.children.filter((c) => !hiddenIds.has(c.id));

  let childrenH = 0;
  for (const child of children) {
    childrenH += treeBlockHeight(child, depth + 1, 'horizontal', hiddenIds, measure);
  }
  if (children.length > 1) childrenH += V_GAP * (children.length - 1);

  const blockH = Math.max(size.height, childrenH || size.height);
  const nodeY = bandTop + (blockH - size.height) / 2;

  nodes.set(topic.id, {
    id: topic.id,
    x,
    y: nodeY,
    width: size.width,
    height: size.height,
    depth,
  });

  if (parentId) {
    const parent = nodes.get(parentId)!;
    edges.push({
      id: `${parentId}-${topic.id}`,
      from: parentId,
      to: topic.id,
      points: buildHorizontalCurvePoints(
        parent.x + parent.width,
        parent.y + parent.height / 2,
        x,
        nodeY + size.height / 2,
      ),
      type: 'tree',
    });
  }

  if (children.length > 0) {
    const childX = x + size.width + LEVEL_GAP;
    let currentY = bandTop + (blockH - childrenH) / 2;
    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      const h = layoutTreeRight(
        child,
        depth + 1,
        childX,
        currentY,
        hiddenIds,
        measure,
        nodes,
        edges,
        topic.id,
      );
      currentY += h;
      if (i < children.length - 1) currentY += V_GAP;
    }
  }

  return blockH;
}

/** Place topic + descendants as a downward tree inside a horizontal band. */
function layoutTreeDown(
  topic: Topic,
  depth: number,
  bandLeft: number,
  y: number,
  hiddenIds: Set<string>,
  measure: MeasureFn,
  nodes: Map<string, LayoutNode>,
  edges: LayoutEdge[],
  parentId?: string,
): number {
  if (hiddenIds.has(topic.id)) return 0;
  const size = measure(topic, depth);
  const children =
    topic.collapsed ? [] : topic.children.filter((c) => !hiddenIds.has(c.id));

  let childrenW = 0;
  for (const child of children) {
    childrenW += treeBlockWidth(child, depth + 1, 'vertical', hiddenIds, measure);
  }
  if (children.length > 1) childrenW += H_GAP * (children.length - 1);

  const blockW = Math.max(size.width, childrenW || size.width);
  const nodeX = bandLeft + (blockW - size.width) / 2;

  nodes.set(topic.id, {
    id: topic.id,
    x: nodeX,
    y,
    width: size.width,
    height: size.height,
    depth,
  });

  if (parentId) {
    const parent = nodes.get(parentId)!;
    edges.push({
      id: `${parentId}-${topic.id}`,
      from: parentId,
      to: topic.id,
      points: buildVerticalTreeEdgePoints(
        parent.x + parent.width / 2,
        parent.y + parent.height,
        nodeX + size.width / 2,
        y,
      ),
      type: 'tree',
    });
  }

  if (children.length > 0) {
    const childY = y + size.height + LEVEL_GAP;
    let currentX = bandLeft + (blockW - childrenW) / 2;
    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      const w = layoutTreeDown(
        child,
        depth + 1,
        currentX,
        childY,
        hiddenIds,
        measure,
        nodes,
        edges,
        topic.id,
      );
      currentX += w;
      if (i < children.length - 1) currentX += H_GAP;
    }
  }

  return blockW;
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
    const sideGap = 24;

    children.forEach((child, i) => {
      const below = alternate ? i % 2 === 1 : false;
      const blockH = treeBlockHeight(child, 1, 'horizontal', hiddenIds, measure);
      const blockW = treeBlockWidth(child, 1, 'horizontal', hiddenIds, measure);
      const bandTop = below ? axisY + sideGap : axisY - sideGap - blockH;

      layoutTreeRight(child, 1, x, bandTop, hiddenIds, measure, nodes, edges);

      const childNode = nodes.get(child.id)!;
      edges.push({
        id: `${root.id}-${child.id}`,
        from: root.id,
        to: child.id,
        points: [
          { x: x + childNode.width / 2, y: axisY },
          {
            x: x + childNode.width / 2,
            y: below ? childNode.y : childNode.y + childNode.height,
          },
        ],
        type: 'tree',
      });

      x += blockW + H_GAP;
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
    const sideGap = 24;

    children.forEach((child, i) => {
      const right = alternate ? i % 2 === 1 : false;
      const blockH = treeBlockHeight(child, 1, 'vertical', hiddenIds, measure);
      const blockW = treeBlockWidth(child, 1, 'vertical', hiddenIds, measure);
      const bandLeft = right ? axisX + sideGap : axisX - sideGap - blockW;

      layoutTreeDown(child, 1, bandLeft, y, hiddenIds, measure, nodes, edges);

      const childNode = nodes.get(child.id)!;
      edges.push({
        id: `${root.id}-${child.id}`,
        from: root.id,
        to: child.id,
        points: [
          { x: axisX, y: y + childNode.height / 2 },
          {
            x: right ? childNode.x : childNode.x + childNode.width,
            y: y + childNode.height / 2,
          },
        ],
        type: 'tree',
      });

      y += blockH + V_GAP;
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
