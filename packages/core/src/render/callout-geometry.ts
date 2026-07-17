import type { Rect } from '../model/types.js';

export const CALLOUT_TIP_H = 7;
export const CALLOUT_HEIGHT = 32;

export type CalloutTipSide = 'top' | 'bottom' | 'left' | 'right';

export function measureCalloutSize(text: string): { width: number; height: number } {
  return {
    width: Math.max(48, text.length * 12 + 20),
    height: CALLOUT_HEIGHT,
  };
}

/** Bubble AABB from topic node + callout offset (offset is relative to topic top-center). */
export function calloutBoundsFromOffset(
  node: { x: number; y: number; width: number; height: number },
  offset: { x: number; y: number },
  text: string,
): Rect {
  const { width, height } = measureCalloutSize(text);
  return {
    x: node.x + node.width / 2 + offset.x - width / 2,
    y: node.y + offset.y - height,
    width,
    height,
  };
}

export function topicCalloutAnchor(node: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { x: number; y: number } {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

/** Which edge of the bubble faces the topic (tip points that way). */
export function calloutTipSide(
  bounds: Rect,
  anchor: { x: number; y: number },
): CalloutTipSide {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const dx = anchor.x - cx;
  const dy = anchor.y - cy;
  const ax = Math.abs(dx) / Math.max(bounds.width, 1);
  const ay = Math.abs(dy) / Math.max(bounds.height, 1);
  if (ax > ay) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
}

export function calloutBodyRect(bounds: Rect, side: CalloutTipSide): Rect {
  const tip = CALLOUT_TIP_H;
  switch (side) {
    case 'bottom':
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height - tip };
    case 'top':
      return {
        x: bounds.x,
        y: bounds.y + tip,
        width: bounds.width,
        height: bounds.height - tip,
      };
    case 'left':
      return {
        x: bounds.x + tip,
        y: bounds.y,
        width: bounds.width - tip,
        height: bounds.height,
      };
    case 'right':
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width - tip,
        height: bounds.height,
      };
  }
}

/** Tip triangle apex (points toward topic) and base endpoints on the body edge. */
export function calloutTipPoints(
  body: Rect,
  side: CalloutTipSide,
): { apex: { x: number; y: number }; baseA: { x: number; y: number }; baseB: { x: number; y: number } } {
  const tip = CALLOUT_TIP_H;
  const half = 7;
  switch (side) {
    case 'bottom': {
      const mid = body.x + body.width / 2;
      const y = body.y + body.height;
      return {
        apex: { x: mid, y: y + tip },
        baseA: { x: mid - half, y: y - 1 },
        baseB: { x: mid + half, y: y - 1 },
      };
    }
    case 'top': {
      const mid = body.x + body.width / 2;
      const y = body.y;
      return {
        apex: { x: mid, y: y - tip },
        baseA: { x: mid - half, y: y + 1 },
        baseB: { x: mid + half, y: y + 1 },
      };
    }
    case 'left': {
      const mid = body.y + body.height / 2;
      const x = body.x;
      return {
        apex: { x: x - tip, y: mid },
        baseA: { x: x + 1, y: mid - half },
        baseB: { x: x + 1, y: mid + half },
      };
    }
    case 'right': {
      const mid = body.y + body.height / 2;
      const x = body.x + body.width;
      return {
        apex: { x: x + tip, y: mid },
        baseA: { x: x - 1, y: mid - half },
        baseB: { x: x - 1, y: mid + half },
      };
    }
  }
}

/** Closest point on topic rect to `from` (for leader line endpoint). */
export function nearestPointOnRect(
  from: { x: number; y: number },
  rect: Rect,
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(from.x, rect.x), rect.x + rect.width),
    y: Math.min(Math.max(from.y, rect.y), rect.y + rect.height),
  };
}
