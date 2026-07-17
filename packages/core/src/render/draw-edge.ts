import type { EdgeStyle, LayoutEdge, Point } from '../model/types.js';

export interface DrawEdgeOptions {
  color: string;
  width: number;
  lineType: EdgeStyle['lineType'];
  dash?: number[];
}

export function autoCubicControlPoints(from: Point, to: Point): [Point, Point] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const isMostlyHorizontal = Math.abs(dx) >= Math.abs(dy);
  const span = isMostlyHorizontal ? Math.abs(dx) : Math.abs(dy);
  // Cap below 0.5*span so cubic handles do not cross.
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
    Math.abs(p0.y - p1.y) < eps &&
    Math.abs(p3.y - p2.y) < eps &&
    Math.abs(p1.x - p2.x) > eps
  );
}

function resolveRenderMode(edge: LayoutEdge, lineType: EdgeStyle['lineType']): 'summary' | 'cubic' | 'quadratic' | 'polyline' {
  const pts = edge.points;
  if (edge.type === 'summary' && pts.length >= 3) return 'summary';

  if (edge.type === 'relationship') {
    if (pts.length === 3) return 'quadratic';
    if (pts.length >= 4) return 'polyline';
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

export function strokeEdge(
  ctx: CanvasRenderingContext2D,
  edge: LayoutEdge,
  options: DrawEdgeOptions,
): void {
  const isRelationship = edge.type === 'relationship';
  const isSummary = edge.type === 'summary';

  ctx.beginPath();
  traceEdgePath(ctx, edge, options.lineType);
  ctx.strokeStyle = isRelationship ? '#E67E22' : options.color;
  ctx.lineWidth = isRelationship ? 1.5 : options.width;
  ctx.setLineDash(isRelationship || isSummary ? [6, 4] : (options.dash ?? []));
  ctx.stroke();
  ctx.setLineDash([]);
}
