import type {
  LayoutEdge,
  LayoutNode,
  LayoutResult,
  MeasureFn,
  StructureOptions,
  Topic,
} from '../model/types.js';
import { buildMindmapCurvePoints } from './edge-paths.js';
import {
  collectHidden,
  finalizeResult,
  layoutSubtreeWidth,
  layoutTreeVertical,
  LEVEL_GAP,
  TreeLayoutContext,
  V_GAP,
} from './utils.js';

export { layoutLogicChart } from './logic-chart.js';

/** Height of a mindmap subtree: parent is centered among children, not stacked above them. */
function mindmapSubtreeHeight(topic: Topic, depth: number, ctx: TreeLayoutContext): number {
  if (ctx.hiddenIds.has(topic.id)) return 0;
  const size = ctx.measure(topic, depth);
  if (topic.collapsed) return size.height;

  const visible = topic.children.filter((c) => !ctx.hiddenIds.has(c.id));
  if (visible.length === 0) return size.height;

  let childrenH = 0;
  for (let i = 0; i < visible.length; i++) {
    childrenH += mindmapSubtreeHeight(visible[i]!, depth + 1, ctx);
    if (i < visible.length - 1) childrenH += ctx.vGap;
  }
  return Math.max(size.height, childrenH);
}

function sideStackHeight(children: Topic[], depth: number, ctx: TreeLayoutContext): number {
  if (children.length === 0) return 0;
  let h = 0;
  for (let i = 0; i < children.length; i++) {
    h += mindmapSubtreeHeight(children[i]!, depth, ctx);
    if (i < children.length - 1) h += ctx.vGap;
  }
  return h;
}

function connectMindmapEdge(
  edges: LayoutEdge[],
  nodes: Map<string, LayoutNode>,
  parentId: string,
  childId: string,
  side: 'left' | 'right',
): void {
  const parent = nodes.get(parentId)!;
  const child = nodes.get(childId)!;
  const fromX = side === 'left' ? parent.x : parent.x + parent.width;
  const fromY = parent.y + parent.height / 2;
  const toX = side === 'left' ? child.x + child.width : child.x;
  const toY = child.y + child.height / 2;
  edges.push({
    id: `${parentId}-${childId}`,
    from: parentId,
    to: childId,
    points: buildMindmapCurvePoints(fromX, fromY, toX, toY),
    type: 'tree',
  });
}

export function layoutMindmap(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const balanced = options.type === 'mindmap' ? options.balanced : true;
  const direction =
    options.type === 'mindmap' ? (options.direction ?? 'auto') : 'auto';
  const nodes = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
  const hiddenIds = collectHidden(root);
  const ctx: TreeLayoutContext = { nodes, edges, measure, hiddenIds, vGap: V_GAP };

  const rootSize = measure(root, 0);
  const children = root.children.filter((c) => !hiddenIds.has(c.id));

  let leftChildren: Topic[];
  let rightChildren: Topic[];
  if (balanced) {
    leftChildren = children.filter((_, i) => i % 2 === 0);
    rightChildren = children.filter((_, i) => i % 2 === 1);
  } else if (direction === 'left') {
    leftChildren = children;
    rightChildren = [];
  } else {
    leftChildren = [];
    rightChildren = children;
  }

  const leftH = sideStackHeight(leftChildren, 1, ctx);
  const rightH = sideStackHeight(rightChildren, 1, ctx);
  const contentH = Math.max(leftH, rightH, rootSize.height);

  nodes.set(root.id, {
    id: root.id,
    x: 0,
    y: (contentH - rootSize.height) / 2,
    width: rootSize.width,
    height: rootSize.height,
    depth: 0,
  });

  if (children.length === 0) return finalizeResult(nodes, edges);

  let leftY = (contentH - leftH) / 2;
  for (const child of leftChildren) {
    const h = mindmapSubtreeHeight(child, 1, ctx);
    placeMindmapBranch(child, 1, -LEVEL_GAP, leftY, h, ctx, 'left');
    connectMindmapEdge(edges, nodes, root.id, child.id, 'left');
    leftY += h + V_GAP;
  }

  let rightY = (contentH - rightH) / 2;
  for (const child of rightChildren) {
    const h = mindmapSubtreeHeight(child, 1, ctx);
    placeMindmapBranch(child, 1, rootSize.width + LEVEL_GAP, rightY, h, ctx, 'right');
    connectMindmapEdge(edges, nodes, root.id, child.id, 'right');
    rightY += h + V_GAP;
  }

  return finalizeResult(nodes, edges);
}

/**
 * Place a branch node and its descendants. Does not create edges to the parent;
 * creates edges from this node to its children after this node is positioned.
 *
 * @param topY - top of the vertical band allocated to this subtree
 * @param bandH - height of that band (from mindmapSubtreeHeight)
 */
function placeMindmapBranch(
  topic: Topic,
  depth: number,
  x: number,
  topY: number,
  bandH: number,
  ctx: TreeLayoutContext,
  side: 'left' | 'right',
): void {
  if (ctx.hiddenIds.has(topic.id)) return;
  const size = ctx.measure(topic, depth);
  const nodeX = side === 'left' ? x - size.width : x;
  const visible = topic.collapsed
    ? []
    : topic.children.filter((c) => !ctx.hiddenIds.has(c.id));

  if (visible.length === 0) {
    ctx.nodes.set(topic.id, {
      id: topic.id,
      x: nodeX,
      y: topY + (bandH - size.height) / 2,
      width: size.width,
      height: size.height,
      depth,
    });
    return;
  }

  const childrenH = sideStackHeight(visible, depth + 1, ctx);
  let childY = topY + (bandH - childrenH) / 2;
  for (const child of visible) {
    const h = mindmapSubtreeHeight(child, depth + 1, ctx);
    const childX = side === 'left' ? nodeX - LEVEL_GAP : nodeX + size.width + LEVEL_GAP;
    placeMindmapBranch(child, depth + 1, childX, childY, h, ctx, side);
    childY += h + V_GAP;
  }

  const first = ctx.nodes.get(visible[0]!.id)!;
  const last = ctx.nodes.get(visible[visible.length - 1]!.id)!;
  const childrenMid = (first.y + last.y + last.height) / 2;

  ctx.nodes.set(topic.id, {
    id: topic.id,
    x: nodeX,
    y: childrenMid - size.height / 2,
    width: size.width,
    height: size.height,
    depth,
  });

  for (const child of visible) {
    connectMindmapEdge(ctx.edges, ctx.nodes, topic.id, child.id, side);
  }
}

export function layoutTreeChart(
  root: Topic,
  _options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const nodes = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
  const hiddenIds = collectHidden(root);
  const ctx: TreeLayoutContext = { nodes, edges, measure, hiddenIds, vGap: V_GAP };

  const rootSize = measure(root, 0);
  const totalWidth = layoutSubtreeWidth(root, 0, ctx);
  layoutTreeVertical(root, 0, totalWidth / 2 - rootSize.width / 2, 0, ctx);

  return finalizeResult(nodes, edges);
}
