import type { EdgeStyle, LayoutEdge, Point } from '../model/types.js';

export interface DrawEdgeOptions {
  color: string;
  width: number;
  lineType: EdgeStyle['lineType'];
  dash?: number[];
  selected?: boolean;
  /** Relationship label drawn at curve midpoint */
  label?: string;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  /** When true, skip arrowheads (redraw them later above topics). */
  skipArrows?: boolean;
}

/** XMind-style cubic handles: two control points bowing to one side. */
export function defaultRelationshipCubicControlPoints(from: Point, to: Point): [Point, Point] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular unit (prefer "outward" bow for vertical pairs → to the right)
  let nx = -uy;
  let ny = ux;
  if (Math.abs(dy) >= Math.abs(dx) && nx < 0) {
    nx = -nx;
    ny = -ny;
  }
  const along = Math.min(Math.max(len * 0.33, 28), len * 0.42);
  const side = Math.min(Math.max(len * 0.28, 36), 120);
  return [
    { x: from.x + ux * along + nx * side, y: from.y + uy * along + ny * side },
    { x: to.x - ux * along + nx * side, y: to.y - uy * along + ny * side },
  ];
}

/** @deprecated Prefer defaultRelationshipCubicControlPoints */
export function defaultRelationshipControlPoint(from: Point, to: Point): Point {
  const [cp1] = defaultRelationshipCubicControlPoints(from, to);
  return cp1;
}

export function autoCubicControlPoints(from: Point, to: Point): [Point, Point] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const isMostlyHorizontal = Math.abs(dx) >= Math.abs(dy);
  const span = isMostlyHorizontal ? Math.abs(dx) : Math.abs(dy);
  const offset = Math.min(Math.max(span * 0.4, 20), span * 0.45 || 20);

  if (isMostlyHorizontal) {
    const sign = dx >= 0 ? 1 : -1;
    return [
      { x: from.x + sign * offset, y: from.y },
      { x: to.x - sign * offset, y: to.y },
    ];
  }

  const sign = dy >= 0 ? 1 : -1;
  return [
    { x: from.x, y: from.y + sign * offset },
    { x: to.x, y: to.y - sign * offset },
  ];
}

function isMindmapCubic(pts: Point[]): boolean {
  if (pts.length !== 4) return false;
  const [p0, p1, p2, p3] = pts;
  const eps = 0.01;
  return (
    Math.abs(p0!.y - p1!.y) < eps &&
    Math.abs(p3!.y - p2!.y) < eps &&
    Math.abs(p1!.x - p2!.x) > eps
  );
}

function resolveRenderMode(
  edge: LayoutEdge,
  lineType: EdgeStyle['lineType'],
): 'summary' | 'cubic' | 'quadratic' | 'polyline' {
  const pts = edge.points;
  if (edge.type === 'summary' && pts.length >= 3) return 'summary';

  if (edge.type === 'relationship') {
    if (pts.length === 4) return 'cubic';
    if (pts.length === 3) return 'quadratic';
    return 'polyline';
  }

  if (lineType === 'straight' || pts.length === 2) {
    return lineType === 'curve' && pts.length === 2 ? 'cubic' : 'polyline';
  }

  if (lineType === 'polyline' || (pts.length >= 3 && !isMindmapCubic(pts))) {
    return 'polyline';
  }

  if (pts.length === 4 && isMindmapCubic(pts)) return 'cubic';
  if (pts.length === 3) return 'quadratic';
  if (pts.length === 2) return 'cubic';
  return 'polyline';
}

export function traceEdgePath(
  ctx: CanvasRenderingContext2D,
  edge: LayoutEdge,
  lineType: EdgeStyle['lineType'],
): void {
  const pts = edge.points;
  if (pts.length < 2) return;

  const mode = resolveRenderMode(edge, lineType);
  ctx.moveTo(pts[0]!.x, pts[0]!.y);

  switch (mode) {
    case 'summary':
      ctx.quadraticCurveTo(pts[1]!.x, pts[1]!.y, pts[2]!.x, pts[2]!.y);
      break;
    case 'cubic':
      if (pts.length === 4) {
        ctx.bezierCurveTo(
          pts[1]!.x,
          pts[1]!.y,
          pts[2]!.x,
          pts[2]!.y,
          pts[3]!.x,
          pts[3]!.y,
        );
      } else {
        const [cp1, cp2] = autoCubicControlPoints(pts[0]!, pts[1]!);
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, pts[1]!.x, pts[1]!.y);
      }
      break;
    case 'quadratic':
      ctx.quadraticCurveTo(pts[1]!.x, pts[1]!.y, pts[2]!.x, pts[2]!.y);
      break;
    case 'polyline':
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i]!.x, pts[i]!.y);
      }
      break;
  }
}

function pointOnCubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

/** Midpoint of a relationship path (for labels). */
export function relationshipLabelPoint(points: Point[]): Point | null {
  if (points.length === 4) {
    return pointOnCubic(points[0]!, points[1]!, points[2]!, points[3]!, 0.5);
  }
  if (points.length === 3) {
    const t = 0.5;
    const u = 1 - t;
    const p0 = points[0]!;
    const p1 = points[1]!;
    const p2 = points[2]!;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    };
  }
  if (points.length >= 2) {
    const a = points[0]!;
    const b = points[points.length - 1]!;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  return null;
}

function tangentAtStart(points: Point[]): Point {
  if (points.length >= 4) {
    return { x: points[1]!.x - points[0]!.x, y: points[1]!.y - points[0]!.y };
  }
  if (points.length >= 2) {
    return { x: points[1]!.x - points[0]!.x, y: points[1]!.y - points[0]!.y };
  }
  return { x: 1, y: 0 };
}

function tangentAtEnd(points: Point[]): Point {
  if (points.length >= 4) {
    const n = points.length;
    return {
      x: points[n - 1]!.x - points[n - 2]!.x,
      y: points[n - 1]!.y - points[n - 2]!.y,
    };
  }
  if (points.length >= 2) {
    const n = points.length;
    return {
      x: points[n - 1]!.x - points[n - 2]!.x,
      y: points[n - 1]!.y - points[n - 2]!.y,
    };
  }
  return { x: 1, y: 0 };
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  tip: Point,
  direction: Point,
  color: string,
  size = 12,
): void {
  const len = Math.hypot(direction.x, direction.y) || 1;
  const ux = direction.x / len;
  const uy = direction.y / len;
  // Nudge tip slightly outward so the head isn't covered by the topic fill/border
  const tipX = tip.x - ux * 0.5;
  const tipY = tip.y - uy * 0.5;
  const px = -uy;
  const py = ux;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - ux * size + px * size * 0.45, tipY - uy * size + py * size * 0.45);
  ctx.lineTo(tipX - ux * size - px * size * 0.45, tipY - uy * size - py * size * 0.45);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function strokeEdge(
  ctx: CanvasRenderingContext2D,
  edge: LayoutEdge,
  options: DrawEdgeOptions,
): void {
  const isRelationship = edge.type === 'relationship';
  const isSummary = edge.type === 'summary';
  const selected = !!options.selected;
  const strokeColor = selected
    ? '#4A90D9'
    : isRelationship
      ? (options.color || '#E67E22')
      : options.color;

  ctx.beginPath();
  traceEdgePath(ctx, edge, options.lineType);
  if (selected && isRelationship) {
    ctx.strokeStyle = 'rgba(74, 144, 217, 0.35)';
    ctx.lineWidth = 10;
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.beginPath();
    traceEdgePath(ctx, edge, options.lineType);
    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
  } else if (selected) {
    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = options.width + 2;
    ctx.setLineDash(isSummary ? [6, 4] : (options.dash ?? []));
    ctx.stroke();
  } else {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = isRelationship ? 1.5 : options.width;
    ctx.setLineDash(isRelationship || isSummary ? [6, 4] : (options.dash ?? []));
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (isRelationship && edge.points.length >= 2 && !options.skipArrows) {
    drawRelationshipArrows(ctx, edge, {
      color: selected ? '#4A90D9' : strokeColor,
      arrowStart: options.arrowStart,
      arrowEnd: options.arrowEnd,
    });
  }

  if (isRelationship && options.label) {
    const mid = relationshipLabelPoint(edge.points);
    if (mid) {
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(options.label).width;
      const pad = 4;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillRect(mid.x - tw / 2 - pad, mid.y - 8, tw + pad * 2, 16);
      ctx.fillStyle = selected ? '#4A90D9' : '#666666';
      ctx.fillText(options.label, mid.x, mid.y);
    }
  }
}

/** Draw relationship arrowheads (call after topics so they are not covered). */
export function drawRelationshipArrows(
  ctx: CanvasRenderingContext2D,
  edge: LayoutEdge,
  options: { color: string; arrowStart?: boolean; arrowEnd?: boolean },
): void {
  if (edge.type !== 'relationship' || edge.points.length < 2) return;
  const arrowEnd = options.arrowEnd !== false;
  const arrowStart = !!options.arrowStart;
  if (arrowEnd) {
    drawArrowHead(
      ctx,
      edge.points[edge.points.length - 1]!,
      tangentAtEnd(edge.points),
      options.color,
    );
  }
  if (arrowStart) {
    const startDir = tangentAtStart(edge.points);
    drawArrowHead(ctx, edge.points[0]!, { x: -startDir.x, y: -startDir.y }, options.color);
  }
}

/** Draw XMind-style cubic handles when a relationship is selected. */
export function drawRelationshipHandles(
  ctx: CanvasRenderingContext2D,
  points: Point[],
): void {
  if (points.length < 4) return;
  const [p0, cp1, cp2, p3] = points as [Point, Point, Point, Point];

  ctx.save();
  ctx.setLineDash([]);
  ctx.strokeStyle = '#4A90D9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(cp1.x, cp1.y);
  ctx.moveTo(p3.x, p3.y);
  ctx.lineTo(cp2.x, cp2.y);
  ctx.stroke();

  // Endpoint anchors (circles)
  for (const p of [p0, p3]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Control handles (squares)
  const hs = 5;
  for (const p of [cp1, cp2]) {
    ctx.fillStyle = '#4A90D9';
    ctx.fillRect(p.x - hs, p.y - hs, hs * 2, hs * 2);
  }
  ctx.restore();
}
