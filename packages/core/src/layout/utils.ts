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
import { buildVerticalTreeEdgePoints } from './edge-paths.js';

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
      edges.push(result.edge);
    }
  }

  for (const rel of sheet.relationships) {
    edges.push(layoutRelationship(rel, nodes));
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
        const w = Math.max(80, topic.callout.text.length * 8);
        const h = 28;
        const x = node.x + node.width / 2 + topic.callout.offset.x - w / 2;
        const y = node.y + topic.callout.offset.y - h;
        extraShapes.push({
          id: topic.callout.id,
          type: 'callout',
          bounds: { x, y, width: w, height: h },
          label: topic.callout.text,
          style: { ...(topic.callout.style ?? {}) },
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

function layoutSummary(
  summary: Summary,
  nodes: Map<string, LayoutNode>,
  sheet: Sheet,
  measure?: MeasureFn,
): { edge: LayoutEdge } | null {
  const parent = nodes.get(summary.parentTopicId);
  if (!parent) return null;

  const [startId, endId] = summary.topicRange;
  const siblings = findChildren(sheet.rootTopic, summary.parentTopicId);
  const startIdx = siblings.findIndex((c) => c.id === startId);
  const endIdx = siblings.findIndex((c) => c.id === endId);
  if (startIdx < 0 || endIdx < 0) return null;

  const rangeNodes = siblings
    .slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1)
    .map((c) => nodes.get(c.id))
    .filter((n): n is LayoutNode => !!n && !n.hidden);

  if (rangeNodes.length === 0) return null;

  let bounds = emptyBounds();
  for (const n of rangeNodes) bounds = mergeBounds(bounds, nodeBounds(n));

  const arcY = bounds.y + bounds.height + 20;
  const midX = bounds.x + bounds.width / 2;

  const summaryTopic = sheet.floatingTopics.find((t) => t.id === summary.summaryTopicId);
  const size = summaryTopic && measure
    ? measure(summaryTopic, (parent.depth ?? 0) + 1)
    : { width: 80, height: 30 };
  const topicX = midX - size.width / 2;
  const topicY = arcY + 28;

  if (summaryTopic) {
    nodes.set(summary.summaryTopicId, {
      id: summary.summaryTopicId,
      x: topicX,
      y: topicY,
      width: size.width,
      height: size.height,
      depth: (parent.depth ?? 0) + 1,
    });
  }

  return {
    edge: {
      id: `summary-${summary.id}`,
      from: summary.parentTopicId,
      to: summary.summaryTopicId,
      points: [
        { x: bounds.x, y: arcY },
        { x: midX, y: arcY + 30 },
        { x: bounds.x + bounds.width, y: arcY },
      ],
      type: 'summary',
    },
  };
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
): LayoutEdge {
  const from = nodes.get(rel.fromTopicId);
  const to = nodes.get(rel.toTopicId);
  const points: Point[] = [];
  if (from && to) {
    const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
    const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    if (rel.controlPoints?.length) {
      points.push(fromCenter, ...rel.controlPoints, toCenter);
    } else if (rel.style?.lineType === 'straight') {
      points.push(fromCenter, toCenter);
    } else {
      const mid = { x: (fromCenter.x + toCenter.x) / 2, y: (fromCenter.y + toCenter.y) / 2 };
      points.push(fromCenter, mid, toCenter);
    }
  }
  return {
    id: rel.id,
    from: rel.fromTopicId,
    to: rel.toTopicId,
    points,
    type: 'relationship',
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
