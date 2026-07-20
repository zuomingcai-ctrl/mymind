// covers: ST-004
import type {
  LayoutEdge,
  LayoutNode,
  LayoutResult,
  MeasureFn,
  StructureOptions,
  Topic,
} from '../model/types.js';
import { buildVerticalTreeEdgePoints } from './edge-paths.js';
import {
  collectHidden,
  finalizeResult,
  H_GAP,
  LEVEL_GAP,
  type TreeLayoutContext,
} from './utils.js';

/**
 * Org chart: top-down hierarchy with larger layer gaps than tree-chart.
 * compact halves the level gap (design: 减小 levelGap).
 */
export function layoutOrgChart(
  root: Topic,
  options: StructureOptions,
  measure: MeasureFn,
): LayoutResult {
  const compact = options.type === 'org-chart' ? options.compact : false;
  const levelGap = compact ? LEVEL_GAP / 2 : LEVEL_GAP;
  const hGap = compact ? H_GAP * 0.75 : H_GAP;
  const nodes = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
  const hiddenIds = collectHidden(root);
  const ctx: TreeLayoutContext = {
    nodes,
    edges,
    measure,
    hiddenIds,
    vGap: levelGap,
  };

  layoutOrgVertical(root, 0, 0, 0, ctx, hGap);

  return finalizeResult(nodes, edges);
}

function layoutOrgVertical(
  topic: Topic,
  depth: number,
  leftX: number,
  y: number,
  ctx: TreeLayoutContext,
  hGap: number,
  parentId?: string,
): number {
  if (ctx.hiddenIds.has(topic.id)) return 0;

  const size = ctx.measure(topic, depth);
  const spanW = orgSubtreeWidth(topic, depth, ctx, hGap);
  const nodeX = leftX + (spanW - size.width) / 2;

  ctx.nodes.set(topic.id, {
    id: topic.id,
    x: nodeX,
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
    const toX = nodeX + size.width / 2;
    const toY = y;
    ctx.edges.push({
      id: `${parentId}-${topic.id}`,
      from: parentId,
      to: topic.id,
      points: buildVerticalTreeEdgePoints(fromX, fromY, toX, toY),
      type: 'tree',
    });
  }

  if (topic.collapsed) return spanW;

  const visible = topic.children.filter((c) => !ctx.hiddenIds.has(c.id));
  if (visible.length === 0) return spanW;

  let childrenW = 0;
  const childWidths = visible.map((c) => {
    const w = orgSubtreeWidth(c, depth + 1, ctx, hGap);
    childrenW += w;
    return w;
  });
  childrenW += hGap * (visible.length - 1);

  const childY = y + size.height + ctx.vGap;
  let childLeft = leftX + (spanW - childrenW) / 2;
  for (let i = 0; i < visible.length; i++) {
    const child = visible[i]!;
    const cw = childWidths[i]!;
    layoutOrgVertical(child, depth + 1, childLeft, childY, ctx, hGap, topic.id);
    childLeft += cw + hGap;
  }

  return spanW;
}

function orgSubtreeWidth(
  topic: Topic,
  depth: number,
  ctx: TreeLayoutContext,
  hGap: number,
): number {
  if (ctx.hiddenIds.has(topic.id)) return 0;
  const size = ctx.measure(topic, depth);
  if (topic.collapsed || topic.children.length === 0) return size.width;
  let total = 0;
  const visible = topic.children.filter((c) => !ctx.hiddenIds.has(c.id));
  for (let i = 0; i < visible.length; i++) {
    total += orgSubtreeWidth(visible[i]!, depth + 1, ctx, hGap);
    if (i < visible.length - 1) total += hGap;
  }
  return Math.max(size.width, total);
}
