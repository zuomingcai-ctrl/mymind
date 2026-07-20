import { describe, it, expect } from 'vitest';
import {
  HAND_DRAWN_FONT_FAMILY,
  jitterPolyline,
  resolveCanvasFontFamily,
  sampleEdgePoints,
  seedForId,
} from '../hand-drawn.js';
import type { LayoutEdge, Point } from '../../model/types.js';

describe('hand-drawn', () => {
  it('jitterPolyline keeps endpoints fixed when pinEnds', () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
    ];
    const out = jitterPolyline(pts, { seed: 42, roughness: 2, pinEnds: true });
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[2]).toEqual({ x: 100, y: 0 });
    expect(out[1]!.y).not.toBe(0);
  });

  it('jitterPolyline is deterministic for the same seed', () => {
    const pts: Point[] = [
      { x: 0, y: 10 },
      { x: 40, y: 10 },
      { x: 80, y: 10 },
      { x: 120, y: 10 },
    ];
    const a = jitterPolyline(pts, { seed: 7, roughness: 2 });
    const b = jitterPolyline(pts, { seed: 7, roughness: 2 });
    expect(a).toEqual(b);
  });

  it('sampleEdgePoints densifies a cubic edge', () => {
    const edge: LayoutEdge = {
      id: 'e1',
      from: 'a',
      to: 'b',
      type: 'tree',
      points: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 60, y: 40 },
        { x: 100, y: 40 },
      ],
    };
    const samples = sampleEdgePoints(edge, 'curve', 8);
    expect(samples.length).toBeGreaterThan(4);
    expect(samples[0]).toEqual({ x: 0, y: 0 });
    expect(samples[samples.length - 1]).toEqual({ x: 100, y: 40 });
  });

  it('resolveCanvasFontFamily prefers global, then handDrawn stack', () => {
    expect(
      resolveCanvasFontFamily({ handDrawn: false }, 'sans-serif'),
    ).toBe('sans-serif');
    expect(
      resolveCanvasFontFamily({ handDrawn: true }, 'sans-serif'),
    ).toBe(HAND_DRAWN_FONT_FAMILY);
    expect(
      resolveCanvasFontFamily(
        { handDrawn: true, globalFontFamily: 'Georgia' },
        'sans-serif',
      ),
    ).toBe('Georgia');
  });

  it('seedForId is stable', () => {
    expect(seedForId('topic-1')).toBe(seedForId('topic-1'));
    expect(seedForId('topic-1')).not.toBe(seedForId('topic-2'));
  });
});
