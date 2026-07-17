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

/** Distance from point to segment AB. */
function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function hitTestPolyline(
  worldPoint: Point,
  edges: { id: string; points: Point[]; type?: string }[],
  type: string,
  threshold: number,
): string | null {
  let bestId: string | null = null;
  let bestDist = threshold;
  for (const edge of edges) {
    if (edge.type !== type || edge.points.length < 2) continue;
    const pts = edge.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = distToSegment(worldPoint, pts[i]!, pts[i + 1]!);
      if (d < bestDist) {
        bestDist = d;
        bestId = edge.id;
      }
    }
    if (pts.length === 3) {
      const cp = pts[1]!;
      const d = Math.hypot(worldPoint.x - cp.x, worldPoint.y - cp.y);
      if (d < bestDist) {
        bestDist = d;
        bestId = edge.id;
      }
    }
  }
  return bestId;
}

/** Hit-test relationship edges; samples cubic/quadratic paths. */
export function hitTestRelationship(
  worldPoint: Point,
  edges: { id: string; points: Point[]; type?: string }[],
  threshold = 8,
): string | null {
  let bestId: string | null = null;
  let bestDist = threshold;
  for (const edge of edges) {
    if (edge.type !== 'relationship' || edge.points.length < 2) continue;
    const pts = edge.points;
    if (pts.length === 4) {
      const d = distToCubic(worldPoint, pts[0]!, pts[1]!, pts[2]!, pts[3]!);
      if (d < bestDist) {
        bestDist = d;
        bestId = edge.id;
      }
    } else {
      for (let i = 0; i < pts.length - 1; i++) {
        const d = distToSegment(worldPoint, pts[i]!, pts[i + 1]!);
        if (d < bestDist) {
          bestDist = d;
          bestId = edge.id;
        }
      }
    }
  }
  return bestId;
}

function distToCubic(p: Point, p0: Point, p1: Point, p2: Point, p3: Point): number {
  let best = Infinity;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const x = uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x;
    const y = uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y;
    best = Math.min(best, Math.hypot(p.x - x, p.y - y));
  }
  return best;
}

/** Hit-test summary arcs; returns summary id (edge.id). */
export function hitTestSummary(
  worldPoint: Point,
  edges: { id: string; points: Point[]; type?: string }[],
  threshold = 10,
): string | null {
  return hitTestPolyline(worldPoint, edges, 'summary', threshold);
}

/** Hit-test boundary rectangles; returns boundary id or null. */
export function hitTestBoundary(
  worldPoint: Point,
  shapes: { id: string; type?: string; bounds: { x: number; y: number; width: number; height: number } }[],
  borderSlop = 8,
): string | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i]!;
    if (s.type !== 'boundary') continue;
    const { x, y, width, height } = s.bounds;
    const inside =
      worldPoint.x >= x - borderSlop &&
      worldPoint.x <= x + width + borderSlop &&
      worldPoint.y >= y - borderSlop &&
      worldPoint.y <= y + height + borderSlop;
    if (!inside) continue;
    const inInner =
      worldPoint.x >= x + borderSlop &&
      worldPoint.x <= x + width - borderSlop &&
      worldPoint.y >= y + borderSlop &&
      worldPoint.y <= y + height - borderSlop;
    if (!inInner) return s.id;
  }
  return null;
}

/** Hit-test callout bubbles; returns callout id or null. */
export function hitTestCallout(
  worldPoint: Point,
  shapes: { id: string; type?: string; bounds: { x: number; y: number; width: number; height: number } }[],
): string | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i]!;
    if (s.type !== 'callout') continue;
    const { x, y, width, height } = s.bounds;
    if (
      worldPoint.x >= x &&
      worldPoint.x <= x + width &&
      worldPoint.y >= y &&
      worldPoint.y <= y + height
    ) {
      return s.id;
    }
  }
  return null;
}

/**
 * Hit-test XMind-style cubic control handles.
 * @returns 0 = near-from handle, 1 = near-to handle, null = miss
 */
export function hitTestRelationshipControlHandle(
  worldPoint: Point,
  edge: { points: Point[] } | undefined,
  radius = 10,
): 0 | 1 | null {
  if (!edge) return null;
  if (edge.points.length >= 4) {
    const cp1 = edge.points[1]!;
    const cp2 = edge.points[2]!;
    if (Math.hypot(worldPoint.x - cp1.x, worldPoint.y - cp1.y) <= radius) return 0;
    if (Math.hypot(worldPoint.x - cp2.x, worldPoint.y - cp2.y) <= radius) return 1;
    return null;
  }
  if (edge.points.length === 3) {
    const cp = edge.points[1]!;
    if (Math.hypot(worldPoint.x - cp.x, worldPoint.y - cp.y) <= radius) return 0;
  }
  return null;
}

/** @deprecated Use hitTestRelationshipControlHandle */
export function hitTestRelationshipControlPoint(
  worldPoint: Point,
  edge: { points: Point[] } | undefined,
  radius = 10,
): boolean {
  return hitTestRelationshipControlHandle(worldPoint, edge, radius) !== null;
}
