import type {
  LayoutResult,
  LayoutNode,
  LayoutEdge,
  ExtraShape,
  MeasureFn,
  Rect,
  Topic,
  Sheet,
  Summary,
  Boundary,
  Relationship,
  Point,
} from '../model/types.js';
import { buildMindmapCurvePoints, buildVerticalTreeEdgePoints } from './edge-paths.js';
import { defaultRelationshipCubicControlPoints } from '../render/draw-edge.js';
import { calloutBoundsFromOffset, topicCalloutAnchor } from '../render/callout-geometry.js';

export const H_GAP = 60;
export const V_GAP = 30;
export const LEVEL_GAP = 120;

export function emptyBounds(): Rect {
  return { x: 0, y: 0, width: 0, height: 0 };
}

export function mergeBounds(a: Rect, b: Rect): Rect {
  if (a.width === 0 && a.height === 0) return { ...b };
  if (b.width === 0 && b.height === 0) return { ...a };
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: right - x, height: bottom - y };
}

export function nodeBounds(node: LayoutNode): Rect {
  return { x: node.x, y: node.y, width: node.width, height: node.height };
}

export interface TreeLayoutContext {
  nodes: Map<string, LayoutNode>;
  edges: LayoutEdge[];
  measure: MeasureFn;
  hiddenIds: Set<string>;
  vGap: number;
}

export function collectHidden(root: Topic): Set<string> {
  const hidden = new Set<string>();
  function walk(topic: Topic, parentCollapsed: boolean) {
    if (parentCollapsed) hidden.add(topic.id);
    const collapsed = parentCollapsed || topic.collapsed;
    for (const child of topic.children) {
      walk(child, collapsed);
    }
  }
  for (const child of root.children) {
    walk(child, root.collapsed);
  }
  return hidden;
}

export function finalizeResult(
  nodes: Map<string, LayoutNode>,
  edges: LayoutEdge[],
  extraShapes: ExtraShape[] = [],
): LayoutResult {
  let bounds = emptyBounds();
  for (const node of nodes.values()) {
    if (!node.hidden) bounds = mergeBounds(bounds, nodeBounds(node));
  }
  for (const shape of extraShapes) {
    bounds = mergeBounds(bounds, shape.bounds);
  }
  return { nodes, edges, extraShapes, bounds };
}

export function layoutStructureElements(
  sheet: Sheet,
  base: LayoutResult,
  measure?: MeasureFn,
): LayoutResult {
  const extraShapes = [...base.extraShapes];
  const edges = [...base.edges];
  const nodes = base.nodes;

  for (const boundary of sheet.boundaries) {
    extraShapes.push(layoutBoundary(boundary, nodes));
  }

  for (const summary of sheet.summaries) {
    const result = layoutSummary(summary, nodes, sheet, measure);
    if (result) {
      edges.push(...result.edges);
    }
  }

  for (const rel of sheet.relationships) {
    edges.push(layoutRelationship(rel, nodes, sheet));
  }

  for (const zone of sheet.zones) {
    if (!zone.collapsed) {
      extraShapes.push({
        id: zone.id,
        type: 'zone',
        bounds: { x: zone.x, y: zone.y, width: zone.width, height: zone.height },
        label: zone.showTitle ? zone.title : undefined,
        style: { ...(zone.style ?? {}) },
      });
    }
  }

  layoutCallouts(sheet.rootTopic, nodes, extraShapes);

  return finalizeResult(nodes, edges, extraShapes);
}

function layoutCallouts(
  root: Topic,
  nodes: Map<string, LayoutNode>,
  extraShapes: ExtraShape[],
): void {
  const walk = (topic: Topic) => {
    if (topic.callout) {
      const node = nodes.get(topic.id);
      if (node && !node.hidden) {
        const bounds = calloutBoundsFromOffset(node, topic.callout.offset, topic.callout.text);
        const anchor = topicCalloutAnchor(node);
        extraShapes.push({
          id: topic.callout.id,
          type: 'callout',
          bounds,
          label: topic.callout.text,
          style: {
            ...(topic.callout.style ?? {}),
            topicId: topic.id,
            showLeader: topic.callout.showLeader,
            anchorX: anchor.x,
            anchorY: anchor.y,
            topicX: node.x,
            topicY: node.y,
            topicW: node.width,
            topicH: node.height,
          },
        });
      }
    }
    for (const child of topic.children) walk(child);
  };
  walk(root);
}

function layoutBoundary(
  boundary: Boundary,
  nodes: Map<string, LayoutNode>,
): ExtraShape {
  const padding = boundary.padding ?? { top: 16, right: 16, bottom: 16, left: 16 };
  let bounds = emptyBounds();
  for (const id of boundary.topicIds) {
    const node = nodes.get(id);
    if (node && !node.hidden) bounds = mergeBounds(bounds, nodeBounds(node));
  }
  bounds = {
    x: bounds.x - padding.left,
    y: bounds.y - padding.top,
    width: bounds.width + padding.left + padding.right,
    height: bounds.height + padding.top + padding.bottom,
  };
  return {
    id: boundary.id,
    type: 'boundary',
    bounds,
    label: boundary.title,
    style: { ...(boundary.style ?? {}) },
  };
}

/** Merge layout bounds of a topic and its visible descendants (for summary envelope). */
function mergeTopicSubtreeBounds(
  topic: Topic,
  nodes: Map<string, LayoutNode>,
  bounds: Rect,
): Rect {
  const node = nodes.get(topic.id);
  if (node && !node.hidden) {
    bounds = mergeBounds(bounds, nodeBounds(node));
  }
  if (topic.collapsed) return bounds;
  for (const child of topic.children) {
    bounds = mergeTopicSubtreeBounds(child, nodes, bounds);
  }
  return bounds;
}

function layoutSummary(
  summary: Summary,
  nodes: Map<string, LayoutNode>,
  sheet: Sheet,
  measure?: MeasureFn,
): { edges: LayoutEdge[] } | null {
  const parent = nodes.get(summary.parentTopicId);
  if (!parent) return null;

  const [startId, endId] = summary.topicRange;
  const siblings = findChildren(sheet.rootTopic, summary.parentTopicId);
  const startIdx = siblings.findIndex((c) => c.id === startId);
  const endIdx = siblings.findIndex((c) => c.id === endId);
  if (startIdx < 0 || endIdx < 0) return null;

  const rangeTopics = siblings.slice(
    Math.min(startIdx, endIdx),
    Math.max(startIdx, endIdx) + 1,
  );

  // Envelope must include descendants so the arc sits outside the whole branch
  // (XMind-style), instead of cutting through child topics.
  let bounds = emptyBounds();
  for (const t of rangeTopics) {
    bounds = mergeTopicSubtreeBounds(t, nodes, bounds);
  }
  if (bounds.width === 0 && bounds.height === 0) return null;

  const summaryTopic = sheet.floatingTopics.find((t) => t.id === summary.summaryTopicId);
  const depth = (parent.depth ?? 0) + 1;
  const size = summaryTopic && measure
    ? measure(summaryTopic, depth)
    : { width: 80, height: 30 };

  const parentCx = parent.x + parent.width / 2;
  const parentCy = parent.y + parent.height / 2;
  const rangeCx = bounds.x + bounds.width / 2;
  const rangeCy = bounds.y + bounds.height / 2;
  const dx = rangeCx - parentCx;
  const dy = rangeCy - parentCy;

  let points: Point[];
  let topicX: number;
  let topicY: number;
  let branchSide: 'left' | 'right' = 'right';

  // Place the arc on the side facing away from the parent (SM-003).
  if (Math.abs(dx) >= Math.abs(dy)) {
    const outward = dx >= 0 ? 1 : -1;
    branchSide = outward > 0 ? 'right' : 'left';
    const arcX = outward > 0 ? bounds.x + bounds.width + 20 : bounds.x - 20;
    const midY = bounds.y + bounds.height / 2;
    points = [
      { x: arcX, y: bounds.y },
      { x: arcX + outward * 30, y: midY },
      { x: arcX, y: bounds.y + bounds.height },
    ];
    topicX = outward > 0 ? arcX + 36 : arcX - 36 - size.width;
    topicY = midY - size.height / 2;
  } else {
    const outward = dy >= 0 ? 1 : -1;
    branchSide = 'right';
    const arcY = outward > 0 ? bounds.y + bounds.height + 20 : bounds.y - 20;
    const midX = bounds.x + bounds.width / 2;
    points = [
      { x: bounds.x, y: arcY },
      { x: midX, y: arcY + outward * 30 },
      { x: bounds.x + bounds.width, y: arcY },
    ];
    topicX = midX - size.width / 2;
    topicY = outward > 0 ? arcY + 28 : arcY - 28 - size.height;
  }

  const outEdges: LayoutEdge[] = [
    {
      id: summary.id,
      from: summary.parentTopicId,
      to: summary.summaryTopicId,
      points,
      type: 'summary',
    },
  ];

  if (summaryTopic) {
    nodes.set(summary.summaryTopicId, {
      id: summary.summaryTopicId,
      x: topicX,
      y: topicY,
      width: size.width,
      height: size.height,
      depth,
    });

    if (measure && !summaryTopic.collapsed && summaryTopic.children.length > 0) {
      layoutSummaryTopicChildren(
        summaryTopic,
        nodes.get(summary.summaryTopicId)!,
        branchSide,
        nodes,
        outEdges,
        measure,
      );
    }
  }

  return { edges: outEdges };
}

function summarySubtreeHeight(topic: Topic, depth: number, measure: MeasureFn): number {
  const size = measure(topic, depth);
  if (topic.collapsed || topic.children.length === 0) return size.height;
  let h = 0;
  for (let i = 0; i < topic.children.length; i++) {
    h += summarySubtreeHeight(topic.children[i]!, depth + 1, measure);
    if (i < topic.children.length - 1) h += V_GAP;
  }
  return Math.max(size.height, h);
}

/** Place children of a summary topic outward (same side as the summary arc). */
function layoutSummaryTopicChildren(
  summaryTopic: Topic,
  summaryNode: LayoutNode,
  side: 'left' | 'right',
  nodes: Map<string, LayoutNode>,
  edges: LayoutEdge[],
  measure: MeasureFn,
): void {
  const depth = (summaryNode.depth ?? 0) + 1;
  const children = summaryTopic.children;
  let childrenH = 0;
  for (let i = 0; i < children.length; i++) {
    childrenH += summarySubtreeHeight(children[i]!, depth, measure);
    if (i < children.length - 1) childrenH += V_GAP;
  }
  const midY = summaryNode.y + summaryNode.height / 2;
  let childY = midY - childrenH / 2;
  for (const child of children) {
    const h = summarySubtreeHeight(child, depth, measure);
    const anchorX =
      side === 'right'
        ? summaryNode.x + summaryNode.width + LEVEL_GAP
        : summaryNode.x - LEVEL_GAP;
    placeSummarySideBranch(child, depth, anchorX, childY, h, side, nodes, edges, measure);
    connectSummarySideEdge(edges, nodes, summaryNode.id, child.id, side);
    childY += h + V_GAP;
  }
}

function placeSummarySideBranch(
  topic: Topic,
  depth: number,
  x: number,
  topY: number,
  bandH: number,
  side: 'left' | 'right',
  nodes: Map<string, LayoutNode>,
  edges: LayoutEdge[],
  measure: MeasureFn,
): void {
  const size = measure(topic, depth);
  const nodeX = side === 'left' ? x - size.width : x;
  const visible = topic.collapsed ? [] : topic.children;

  if (visible.length === 0) {
    nodes.set(topic.id, {
      id: topic.id,
      x: nodeX,
      y: topY + (bandH - size.height) / 2,
      width: size.width,
      height: size.height,
      depth,
    });
    return;
  }

  let childrenH = 0;
  for (let i = 0; i < visible.length; i++) {
    childrenH += summarySubtreeHeight(visible[i]!, depth + 1, measure);
    if (i < visible.length - 1) childrenH += V_GAP;
  }
  let childY = topY + (bandH - childrenH) / 2;
  for (const child of visible) {
    const h = summarySubtreeHeight(child, depth + 1, measure);
    const childX = side === 'left' ? nodeX - LEVEL_GAP : nodeX + size.width + LEVEL_GAP;
    placeSummarySideBranch(child, depth + 1, childX, childY, h, side, nodes, edges, measure);
    childY += h + V_GAP;
  }

  const first = nodes.get(visible[0]!.id)!;
  const last = nodes.get(visible[visible.length - 1]!.id)!;
  const childrenMid = (first.y + last.y + last.height) / 2;
  nodes.set(topic.id, {
    id: topic.id,
    x: nodeX,
    y: childrenMid - size.height / 2,
    width: size.width,
    height: size.height,
    depth,
  });

  for (const child of visible) {
    connectSummarySideEdge(edges, nodes, topic.id, child.id, side);
  }
}

function connectSummarySideEdge(
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

function findChildren(root: Topic, parentId: string): Topic[] {
  if (root.id === parentId) return root.children;
  for (const child of root.children) {
    const found = findChildren(child, parentId);
    if (found.length || child.id === parentId) {
      if (child.id === parentId) return child.children;
      if (found.length) return found;
    }
  }
  return [];
}

function layoutRelationship(
  rel: Relationship,
  nodes: Map<string, LayoutNode>,
  sheet: Sheet,
): LayoutEdge {
  const fromRect = resolveEndpointRect(rel.fromTopicId, rel.fromKind ?? 'topic', nodes, sheet);
  const toRect = resolveEndpointRect(rel.toTopicId, rel.toKind ?? 'topic', nodes, sheet);
  const points: Point[] = [];
  if (fromRect && toRect) {
    const fromCenter = rectCenter(fromRect);
    const toCenter = rectCenter(toRect);
    const cps = rel.controlPoints;

    let path: Point[] = [];
    if (rel.style?.lineType === 'straight') {
      path = [fromCenter, toCenter];
    } else if (rel.style?.lineType === 'polyline') {
      const mid = { x: (fromCenter.x + toCenter.x) / 2, y: fromCenter.y };
      const mid2 = { x: mid.x, y: toCenter.y };
      path = [fromCenter, mid, mid2, toCenter];
    } else if (cps && cps.length >= 2) {
      path = [fromCenter, cps[0]!, cps[1]!, toCenter];
    } else if (cps && cps.length === 1) {
      const legacy = cps[0]!;
      const [auto1, auto2] = defaultRelationshipCubicControlPoints(fromCenter, toCenter);
      path = [
        fromCenter,
        legacy,
        auto2.x === legacy.x && auto2.y === legacy.y ? auto1 : auto2,
        toCenter,
      ];
    } else {
      const [cp1, cp2] = defaultRelationshipCubicControlPoints(fromCenter, toCenter);
      path = [fromCenter, cp1, cp2, toCenter];
    }

    // RS-007: snap endpoints to topic/zone/boundary edges so arrowheads stay visible
    if (path.length >= 2) {
      const towardFrom = path.length >= 4 ? path[1]! : path[path.length - 1]!;
      const towardTo = path.length >= 4 ? path[path.length - 2]! : path[0]!;
      path[0] = nearestEdgePoint(fromRect, towardFrom);
      path[path.length - 1] = nearestEdgePoint(toRect, towardTo);
    }
    points.push(...path);
  }
  return {
    id: rel.id,
    from: rel.fromTopicId,
    to: rel.toTopicId,
    points,
    type: 'relationship',
  };
}

function rectCenter(r: { x: number; y: number; width: number; height: number }): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** Ray from rect center toward `toward`, clamped to the rectangle border. */
function nearestEdgePoint(
  rect: { x: number; y: number; width: number; height: number },
  toward: Point,
): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
    return { x: rect.x + rect.width, y: cy };
  }
  const hw = rect.width / 2;
  const hh = rect.height / 2;
  const tx = Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : Infinity;
  const ty = Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t };
}

function resolveEndpointRect(
  id: string,
  kind: import('../model/types.js').RelEndpointKind,
  nodes: Map<string, LayoutNode>,
  sheet: Sheet,
): { x: number; y: number; width: number; height: number } | null {
  if (kind === 'topic') {
    const n = nodes.get(id);
    return n ? { x: n.x, y: n.y, width: n.width, height: n.height } : null;
  }
  if (kind === 'zone') {
    const z = sheet.zones.find((x) => x.id === id);
    return z ? { x: z.x, y: z.y, width: z.width, height: z.height } : null;
  }
  const b = sheet.boundaries.find((x) => x.id === id);
  if (!b) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const tid of b.topicIds) {
    const n = nodes.get(tid);
    if (!n) continue;
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  if (!Number.isFinite(minX)) return null;
  const pad = b.padding ?? { top: 16, right: 16, bottom: 16, left: 16 };
  return {
    x: minX - pad.left,
    y: minY - pad.top,
    width: maxX - minX + pad.left + pad.right,
    height: maxY - minY + pad.top + pad.bottom,
  };
}

export function subtreeHeight(
  topic: Topic,
  depth: number,
  ctx: TreeLayoutContext,
): number {
  if (ctx.hiddenIds.has(topic.id)) return 0;
  const size = ctx.measure(topic, depth);
  let h = size.height;
  if (topic.collapsed) return h;
  for (const child of topic.children) {
    if (ctx.hiddenIds.has(child.id)) continue;
    h += ctx.vGap + subtreeHeight(child, depth + 1, ctx);
  }
  return h;
}

export function layoutSubtreeWidth(
  topic: Topic,
  depth: number,
  ctx: TreeLayoutContext,
): number {
  if (ctx.hiddenIds.has(topic.id)) return 0;
  const size = ctx.measure(topic, depth);
  if (topic.collapsed || topic.children.length === 0) return size.width;
  let total = 0;
  const visible = topic.children.filter((c) => !ctx.hiddenIds.has(c.id));
  for (let i = 0; i < visible.length; i++) {
    total += layoutSubtreeWidth(visible[i]!, depth + 1, ctx);
    if (i < visible.length - 1) total += H_GAP;
  }
  return Math.max(size.width, total);
}

export function layoutTreeVertical(
  topic: Topic,
  depth: number,
  x: number,
  y: number,
  ctx: TreeLayoutContext,
  parentId?: string,
): number {
  if (ctx.hiddenIds.has(topic.id)) return 0;

  const size = ctx.measure(topic, depth);
  ctx.nodes.set(topic.id, {
    id: topic.id,
    x,
    y,
    width: size.width,
    height: size.height,
    depth,
    hidden: false,
  });

  if (parentId) {
    const parent = ctx.nodes.get(parentId)!;
    const fromX = parent.x + parent.width / 2;
    const fromY = parent.y + parent.height;
    const toX = x + size.width / 2;
    const toY = y;
    ctx.edges.push({
      id: `${parentId}-${topic.id}`,
      from: parentId,
      to: topic.id,
      points: buildVerticalTreeEdgePoints(fromX, fromY, toX, toY),
      type: 'tree',
    });
  }

  let currentY = y + size.height + ctx.vGap;
  for (const child of topic.children) {
    if (ctx.hiddenIds.has(child.id)) continue;
    const childWidth = layoutSubtreeWidth(child, depth + 1, ctx);
    layoutTreeVertical(
      child,
      depth + 1,
      x + (size.width - childWidth) / 2,
      currentY,
      ctx,
      topic.id,
    );
    currentY += subtreeHeight(child, depth + 1, ctx) + ctx.vGap;
  }

  return size.width;
}
