import type {
  LayoutNode,
  LayoutResult,
  Point,
  Sheet,
  StructureOptions,
  StructureType,
  Topic,
} from '../model/types.js';
import { findTopicInSheet } from '../model/factory.js';

/** World-space radius of the collapse / expand control. */
export const COLLAPSE_BTN_RADIUS = 7;

export type CollapseSide = 'left' | 'right' | 'top' | 'bottom';

export interface CollapseButtonLayout {
  topicId: string;
  side: CollapseSide;
  center: Point;
  radius: number;
  collapsed: boolean;
  childCount: number;
}

/** Default fold-control side when no outgoing tree edges exist (e.g. collapsed). */
export function defaultCollapseSide(
  structure: StructureType,
  options?: StructureOptions,
): CollapseSide {
  switch (structure) {
    case 'mindmap': {
      const dir = options?.type === 'mindmap' ? options.direction : 'auto';
      if (dir === 'left') return 'left';
      return 'right';
    }
    case 'logic-chart': {
      const dir = options?.type === 'logic-chart' ? options.direction : 'right';
      return dir === 'left' ? 'left' : 'right';
    }
    case 'brace-map': {
      if (options?.type === 'brace-map') {
        return options.braceSide === 'left' ? 'left' : 'right';
      }
      return 'right';
    }
    case 'fishbone':
      return 'right';
    case 'tree-chart':
    case 'org-chart':
    case 'timeline':
    case 'tree-table':
    case 'matrix':
    default:
      return 'bottom';
  }
}

/**
 * Infer which edge of the topic faces its children from tree edges,
 * falling back to structure defaults when collapsed / leaf-hidden.
 */
export function inferCollapseSide(
  topicId: string,
  node: LayoutNode,
  layout: LayoutResult,
  structure: StructureType,
  options?: StructureOptions,
): CollapseSide {
  const childEdges = layout.edges.filter((e) => e.type === 'tree' && e.from === topicId);
  if (childEdges.length === 0) {
    return defaultCollapseSide(structure, options);
  }

  let left = 0;
  let right = 0;
  let top = 0;
  let bottom = 0;
  const midX = node.x + node.width / 2;
  const midY = node.y + node.height / 2;

  for (const edge of childEdges) {
    const child = layout.nodes.get(edge.to);
    if (!child) continue;
    const cx = child.x + child.width / 2;
    const cy = child.y + child.height / 2;
    const dx = cx - midX;
    const dy = cy - midY;
    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx >= 0) right += 1;
      else left += 1;
    } else if (dy >= 0) {
      bottom += 1;
    } else {
      top += 1;
    }
  }

  const scores: Array<[CollapseSide, number]> = [
    ['right', right],
    ['left', left],
    ['bottom', bottom],
    ['top', top],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  if (scores[0]![1] > 0) return scores[0]![0];
  return defaultCollapseSide(structure, options);
}

export function collapseButtonCenter(
  node: LayoutNode,
  side: CollapseSide,
  radius = COLLAPSE_BTN_RADIUS,
): Point {
  const midX = node.x + node.width / 2;
  const midY = node.y + node.height / 2;
  switch (side) {
    case 'left':
      return { x: node.x - radius, y: midY };
    case 'right':
      return { x: node.x + node.width + radius, y: midY };
    case 'top':
      return { x: midX, y: node.y - radius };
    case 'bottom':
      return { x: midX, y: node.y + node.height + radius };
  }
}

export function pointInCollapseButton(
  world: Point,
  center: Point,
  radius = COLLAPSE_BTN_RADIUS,
): boolean {
  const pad = 2;
  return Math.hypot(world.x - center.x, world.y - center.y) <= radius + pad;
}

export function layoutCollapseButton(
  topic: Topic,
  node: LayoutNode,
  layout: LayoutResult,
  structure: StructureType,
  options?: StructureOptions,
  radius = COLLAPSE_BTN_RADIUS,
): CollapseButtonLayout | null {
  if (topic.children.length === 0) return null;
  const side = inferCollapseSide(topic.id, node, layout, structure, options);
  return {
    topicId: topic.id,
    side,
    center: collapseButtonCenter(node, side, radius),
    radius,
    collapsed: topic.collapsed,
    childCount: topic.children.length,
  };
}

/** Hit-test fold controls (front-most topic wins). */
export function hitTestCollapseButton(
  world: Point,
  sheet: Sheet,
  layout: LayoutResult,
  radius = COLLAPSE_BTN_RADIUS,
): CollapseButtonLayout | null {
  const nodes = [...layout.nodes.values()].filter((n) => !n.hidden).reverse();
  for (const node of nodes) {
    const topic = findTopicInSheet(sheet, node.id);
    if (!topic) continue;
    const btn = layoutCollapseButton(
      topic,
      node,
      layout,
      sheet.structure,
      sheet.structureOptions,
      radius,
    );
    if (!btn) continue;
    if (pointInCollapseButton(world, btn.center, btn.radius)) return btn;
  }
  return null;
}
