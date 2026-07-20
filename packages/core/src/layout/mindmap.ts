import type {
  LayoutEdge,
  LayoutExtras,
  LayoutNode,
  LayoutResult,
  MeasureFn,
  StructureOptions,
  Topic,
} from '../model/types.js';
import { buildMindmapCurvePoints } from './edge-paths.js';
import {
  buildSummaryReserves,
  collectHidden,
  finalizeResult,
  flipLayoutVertical,
  layoutTreeVertical,
  LEVEL_GAP,
  type SummaryReserve,
  TreeLayoutContext,
  V_GAP,
} from './utils.js';

export { layoutLogicChart } from './logic-chart.js';

/** Height of a mindmap subtree: parent is centered among children, not stacked above them. */
function mindmapSubtreeHeight(
  topic: Topic,
  depth: number,
  ctx: TreeLayoutContext,
  reserves: SummaryReserve[],
): number {
  if (ctx.hiddenIds.has(topic.id)) return 0;
  const size = ctx.measure(topic, depth);
  if (topic.collapsed) return size.height;

  const visible = topic.children.filter((c) => !ctx.hiddenIds.has(c.id));
  if (visible.length === 0) return size.height;

  return siblingStackPlan(topic.id, visible, depth + 1, ctx, reserves).totalHeight;
}

/**
 * Natural sibling heights plus gaps, with summary reserves applied by widening
 * gaps (so the placed node envelope actually grows — not empty band padding).
 */
interface SiblingStackPlan {
  heights: number[];
  /** Gap after sibling i (length n-1). */
  gaps: number[];
  leadingPad: number;
  trailingPad: number;
  totalHeight: number;
}

function siblingStackPlan(
  parentId: string,
  siblings: Topic[],
  depth: number,
  ctx: TreeLayoutContext,
  reserves: SummaryReserve[],
): SiblingStackPlan {
  const heights = siblings.map((s) => mindmapSubtreeHeight(s, depth, ctx, reserves));
  const gaps =
    siblings.length > 1 ? heights.slice(0, -1).map(() => ctx.vGap) : [];
  let leadingPad = 0;
  let trailingPad = 0;

  for (const reserve of reserves) {
    if (reserve.parentTopicId !== parentId) continue;
    const i = siblings.findIndex((c) => c.id === reserve.startId);
    const j = siblings.findIndex((c) => c.id === reserve.endId);
    if (i < 0 || j < 0) continue;
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);

    let span = 0;
    for (let k = lo; k <= hi; k++) span += heights[k]!;
    for (let k = lo; k < hi; k++) span += gaps[k]!;

    if (reserve.minRangeHeight <= span) continue;
    const extra = reserve.minRangeHeight - span;

    if (hi > lo) {
      const nGaps = hi - lo;
      for (let k = lo; k < hi; k++) gaps[k]! += extra / nGaps;
    } else {
      // Single-topic range: push neighbors apart so overflowing summary children fit.
      const half = extra / 2;
      if (lo > 0) gaps[lo - 1]! += half;
      else leadingPad += half;
      if (hi < siblings.length - 1) gaps[hi]! += half;
      else trailingPad += half;
    }
  }

  let totalHeight = leadingPad + trailingPad;
  for (let i = 0; i < heights.length; i++) {
    totalHeight += heights[i]!;
    if (i < gaps.length) totalHeight += gaps[i]!;
  }

  return { heights, gaps, leadingPad, trailingPad, totalHeight };
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
  extras?: LayoutExtras,
): LayoutResult {
  const balanced = options.type === 'mindmap' ? options.balanced : true;
  const direction =
    options.type === 'mindmap' ? (options.direction ?? 'auto') : 'auto';
  const nodes = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
  const hiddenIds = collectHidden(root);
  const ctx: TreeLayoutContext = { nodes, edges, measure, hiddenIds, vGap: V_GAP };
  const reserves = buildSummaryReserves(
    root,
    extras?.summaries ?? [],
    extras?.floatingTopics ?? [],
    measure,
  );

  const rootSize = measure(root, 0);
  const children = root.children.filter((c) => !hiddenIds.has(c.id));

  let leftChildren: Topic[];
  let rightChildren: Topic[];
  if (balanced) {
    // Half/half keeps same-side siblings consecutive in the children array,
    // so summary ranges (SM-001) can cover visually adjacent branches.
    const mid = Math.ceil(children.length / 2);
    rightChildren = children.slice(0, mid);
    leftChildren = children.slice(mid);
  } else if (direction === 'left') {
    leftChildren = children;
    rightChildren = [];
  } else {
    leftChildren = [];
    rightChildren = children;
  }

  const leftPlan = siblingStackPlan(root.id, leftChildren, 1, ctx, reserves);
  const rightPlan = siblingStackPlan(root.id, rightChildren, 1, ctx, reserves);
  const contentH = Math.max(leftPlan.totalHeight, rightPlan.totalHeight, rootSize.height);

  nodes.set(root.id, {
    id: root.id,
    x: 0,
    y: (contentH - rootSize.height) / 2,
    width: rootSize.width,
    height: rootSize.height,
    depth: 0,
  });

  if (children.length === 0) return finalizeResult(nodes, edges);

  placeSiblingSide(
    leftChildren,
    leftPlan,
    (contentH - leftPlan.totalHeight) / 2,
    -LEVEL_GAP,
    1,
    ctx,
    'left',
    reserves,
    root.id,
    edges,
    nodes,
  );
  placeSiblingSide(
    rightChildren,
    rightPlan,
    (contentH - rightPlan.totalHeight) / 2,
    rootSize.width + LEVEL_GAP,
    1,
    ctx,
    'right',
    reserves,
    root.id,
    edges,
    nodes,
  );

  return finalizeResult(nodes, edges);
}

function placeSiblingSide(
  children: Topic[],
  plan: SiblingStackPlan,
  topY: number,
  x: number,
  depth: number,
  ctx: TreeLayoutContext,
  side: 'left' | 'right',
  reserves: SummaryReserve[],
  parentId: string,
  edges: LayoutEdge[],
  nodes: Map<string, LayoutNode>,
): void {
  let y = topY + plan.leadingPad;
  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    const h = plan.heights[i]!;
    placeMindmapBranch(child, depth, x, y, h, ctx, side, reserves);
    connectMindmapEdge(edges, nodes, parentId, child.id, side);
    y += h;
    if (i < plan.gaps.length) y += plan.gaps[i]!;
  }
}

/**
 * Place a branch node and its descendants. Does not create edges to the parent;
 * creates edges from this node to its children after this node is positioned.
 *
 * @param topY - top of the vertical band allocated to this subtree
 * @param bandH - height of that band
 */
function placeMindmapBranch(
  topic: Topic,
  depth: number,
  x: number,
  topY: number,
  bandH: number,
  ctx: TreeLayoutContext,
  side: 'left' | 'right',
  reserves: SummaryReserve[],
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

  const plan = siblingStackPlan(topic.id, visible, depth + 1, ctx, reserves);
  let childY = topY + (bandH - plan.totalHeight) / 2 + plan.leadingPad;
  for (let i = 0; i < visible.length; i++) {
    const child = visible[i]!;
    const h = plan.heights[i]!;
    const childX = side === 'left' ? nodeX - LEVEL_GAP : nodeX + size.width + LEVEL_GAP;
    placeMindmapBranch(child, depth + 1, childX, childY, h, ctx, side, reserves);
    childY += h;
    if (i < plan.gaps.length) childY += plan.gaps[i]!;
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
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const nodes = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
  const hiddenIds = collectHidden(root);
  const ctx: TreeLayoutContext = { nodes, edges, measure, hiddenIds, vGap: V_GAP };

  layoutTreeVertical(root, 0, 0, 0, ctx);

  const direction = options.type === 'tree-chart' ? options.direction : 'top-down';
  if (direction === 'bottom-up') {
    flipLayoutVertical(nodes, edges);
  }

  return finalizeResult(nodes, edges);
}
