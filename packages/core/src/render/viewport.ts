import type { Point, Rect } from '../model/types.js';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function worldToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.x) * viewport.zoom,
    y: (point.y - viewport.y) * viewport.zoom,
  };
}

export function screenToWorld(point: Point, viewport: Viewport): Point {
  return {
    x: point.x / viewport.zoom + viewport.x,
    y: point.y / viewport.zoom + viewport.y,
  };
}

export function ensureRectVisible(
  bounds: Rect,
  viewport: Viewport,
  viewWidth: number,
  viewHeight: number,
  padding = 40,
): Viewport {
  if (viewWidth <= 0 || viewHeight <= 0) return viewport;

  const { zoom } = viewport;
  const worldPadding = padding / zoom;
  const worldViewW = viewWidth / zoom;
  const worldViewH = viewHeight / zoom;

  let x = viewport.x;
  let y = viewport.y;

  if (bounds.width + worldPadding * 2 >= worldViewW) {
    x = bounds.x + bounds.width / 2 - worldViewW / 2;
  } else if (bounds.x < x + worldPadding) {
    x = bounds.x - worldPadding;
  } else if (bounds.x + bounds.width > x + worldViewW - worldPadding) {
    x = bounds.x + bounds.width + worldPadding - worldViewW;
  }

  if (bounds.height + worldPadding * 2 >= worldViewH) {
    y = bounds.y + bounds.height / 2 - worldViewH / 2;
  } else if (bounds.y < y + worldPadding) {
    y = bounds.y - worldPadding;
  } else if (bounds.y + bounds.height > y + worldViewH - worldPadding) {
    y = bounds.y + bounds.height + worldPadding - worldViewH;
  }

  if (x === viewport.x && y === viewport.y) return viewport;
  return { x, y, zoom };
}

export function fitToContent(
  bounds: Rect,
  viewWidth: number,
  viewHeight: number,
  padding = 40,
): Viewport {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { x: 0, y: 0, zoom: 1 };
  }
  const zoomX = (viewWidth - padding * 2) / bounds.width;
  const zoomY = (viewHeight - padding * 2) / bounds.height;
  const zoom = clampZoom(Math.min(zoomX, zoomY, 1));
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  return {
    x: cx - viewWidth / (2 * zoom),
    y: cy - viewHeight / (2 * zoom),
    zoom,
  };
}

export function hitTestTopic(
  worldPoint: Point,
  nodes: { id: string; x: number; y: number; width: number; height: number }[],
): string | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]!;
    if (
      worldPoint.x >= n.x &&
      worldPoint.x <= n.x + n.width &&
      worldPoint.y >= n.y &&
      worldPoint.y <= n.y + n.height
    ) {
      return n.id;
    }
  }
  return null;
}
