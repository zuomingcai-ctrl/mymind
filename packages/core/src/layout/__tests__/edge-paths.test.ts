import { describe, it, expect } from 'vitest';
import { buildMindmapCurvePoints, buildVerticalTreeEdgePoints } from '../edge-paths.js';

describe('edge-paths', () => {
  it('buildMindmapCurvePoints produces 4-point cubic control path', () => {
    const pts = buildMindmapCurvePoints(100, 50, 300, 80);
    expect(pts).toHaveLength(4);
    expect(pts[0]).toEqual({ x: 100, y: 50 });
    expect(pts[3]).toEqual({ x: 300, y: 80 });
    expect(pts[1]!.y).toBe(50);
    expect(pts[2]!.y).toBe(80);
    expect(pts[1]!.x).toBeGreaterThan(pts[0]!.x);
    expect(pts[2]!.x).toBeLessThan(pts[3]!.x);
  });

  it('buildMindmapCurvePoints keeps control points from crossing', () => {
    const pts = buildMindmapCurvePoints(100, 20, 220, 400);
    expect(pts[1]!.x).toBeLessThanOrEqual(pts[2]!.x);
  });

  it('buildMindmapCurvePoints mirrors for left-side branches', () => {
    const pts = buildMindmapCurvePoints(300, 50, 100, 80);
    expect(pts[1]!.x).toBeLessThan(pts[0]!.x);
    expect(pts[2]!.x).toBeGreaterThan(pts[3]!.x);
    expect(pts[1]!.x).toBeGreaterThanOrEqual(pts[2]!.x);
  });

  it('buildVerticalTreeEdgePoints produces orthogonal polyline', () => {
    const pts = buildVerticalTreeEdgePoints(50, 100, 150, 200);
    expect(pts).toHaveLength(4);
    expect(pts[0]).toEqual({ x: 50, y: 100 });
    expect(pts[1]).toEqual({ x: 50, y: 150 });
    expect(pts[2]).toEqual({ x: 150, y: 150 });
    expect(pts[3]).toEqual({ x: 150, y: 200 });
  });
});
