// covers: CA-003, CA-004
import { describe, it, expect } from 'vitest';
import {
  calloutBoundsFromOffset,
  calloutTipSide,
  calloutBodyRect,
  calloutTipPoints,
  nearestPointOnRect,
  topicCalloutAnchor,
} from '../callout-geometry.js';

describe('callout-geometry', () => {
  const node = { x: 100, y: 100, width: 80, height: 40 };

  it('calloutBoundsFromOffset places bubble relative to topic top-center', () => {
    const bounds = calloutBoundsFromOffset(node, { x: 0, y: -36 }, 'hi');
    expect(bounds.x + bounds.width / 2).toBeCloseTo(node.x + node.width / 2);
    expect(bounds.y + bounds.height).toBeCloseTo(node.y - 36);
  });

  it('calloutTipSide points toward topic from each quadrant', () => {
    const anchor = topicCalloutAnchor(node);
    expect(calloutTipSide({ x: 120, y: 40, width: 60, height: 32 }, anchor)).toBe('bottom');
    expect(calloutTipSide({ x: 120, y: 180, width: 60, height: 32 }, anchor)).toBe('top');
    expect(calloutTipSide({ x: 20, y: 100, width: 60, height: 32 }, anchor)).toBe('right');
    expect(calloutTipSide({ x: 220, y: 100, width: 60, height: 32 }, anchor)).toBe('left');
  });

  it('calloutTipPoints apex lies on the topic-facing side', () => {
    const bounds = { x: 100, y: 40, width: 80, height: 32 };
    const body = calloutBodyRect(bounds, 'bottom');
    const tip = calloutTipPoints(body, 'bottom');
    expect(tip.apex.y).toBeGreaterThan(body.y + body.height);
    expect(tip.apex.x).toBeCloseTo(body.x + body.width / 2);
  });

  it('nearestPointOnRect clamps to topic edge', () => {
    const rect = { x: 0, y: 0, width: 100, height: 50 };
    expect(nearestPointOnRect({ x: 50, y: -10 }, rect)).toEqual({ x: 50, y: 0 });
    expect(nearestPointOnRect({ x: 200, y: 25 }, rect)).toEqual({ x: 100, y: 25 });
  });
});
