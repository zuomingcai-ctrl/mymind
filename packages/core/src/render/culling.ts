import type { LayoutNode, Rect } from '../model/types.js';
import type { Viewport } from './viewport.js';
import { worldToScreen } from './viewport.js';

export function cullNodes(
  nodes: LayoutNode[],
  viewport: Viewport,
  viewWidth: number,
  viewHeight: number,
  padding = 100,
): LayoutNode[] {
  const worldBounds = screenBoundsToWorld(viewport, viewWidth, viewHeight, padding);
  return nodes.filter((n) => intersects(nodeRect(n), worldBounds));
}

function nodeRect(n: LayoutNode): Rect {
  return { x: n.x, y: n.y, width: n.width, height: n.height };
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function screenBoundsToWorld(
  viewport: Viewport,
  viewWidth: number,
  viewHeight: number,
  padding: number,
): Rect {
  const topLeft = {
    x: viewport.x - padding / viewport.zoom,
    y: viewport.y - padding / viewport.zoom,
  };
  const bottomRight = {
    x: viewport.x + (viewWidth + padding) / viewport.zoom,
    y: viewport.y + (viewHeight + padding) / viewport.zoom,
  };
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

export function cullRatio(total: number, visible: number): number {
  if (total === 0) return 0;
  return visible / total;
}

export { worldToScreen };
