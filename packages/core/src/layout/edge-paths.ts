import type { Point } from '../model/types.js';

/** XMind-style cubic bezier between two side anchors (horizontal mindmap branches). */
export function buildMindmapCurvePoints(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Point[] {
  const dx = toX - fromX;
  // Keep each handle under half the span so control points never cross
  // (0.55 caused looping / sagging curves on tall vertical gaps).
  const offset = Math.min(Math.max(Math.abs(dx) * 0.4, 20), Math.abs(dx) * 0.45);
  const sign = dx >= 0 ? 1 : -1;
  return [
    { x: fromX, y: fromY },
    { x: fromX + sign * offset, y: fromY },
    { x: toX - sign * offset, y: toY },
    { x: toX, y: toY },
  ];
}

/** Horizontal logic-chart / mindmap branch cubic. */
export function buildHorizontalCurvePoints(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Point[] {
  return buildMindmapCurvePoints(fromX, fromY, toX, toY);
}

/** Orthogonal connector for logic-chart polyline style. */
export function buildLogicPolylinePoints(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Point[] {
  const midX = (fromX + toX) / 2;
  return [
    { x: fromX, y: fromY },
    { x: midX, y: fromY },
    { x: midX, y: toY },
    { x: toX, y: toY },
  ];
}

export function buildVerticalTreeEdgePoints(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Point[] {
  const midY = (fromY + toY) / 2;
  return [
    { x: fromX, y: fromY },
    { x: fromX, y: midY },
    { x: toX, y: midY },
    { x: toX, y: toY },
  ];
}
