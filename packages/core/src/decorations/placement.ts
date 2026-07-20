import type { CanvasDecoration, LayoutNode } from '../model/types.js';
import type { DecorationAsset } from './assets.js';

export interface DecorationWorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Resolve decoration to world-space bounds.
 * When attached to a topic, `x`/`y` are offsets from the topic node's top-left;
 * otherwise they are absolute world coordinates.
 */
export function resolveDecorationWorldRect(
  dec: CanvasDecoration,
  nodes:
    | Map<string, Pick<LayoutNode, 'x' | 'y' | 'width' | 'height' | 'hidden'>>
    | ReadonlyMap<string, Pick<LayoutNode, 'x' | 'y' | 'width' | 'height' | 'hidden'>>,
): DecorationWorldRect {
  if (dec.attachedTopicId) {
    const node = nodes.get(dec.attachedTopicId);
    if (node && !node.hidden) {
      return {
        x: node.x + dec.x,
        y: node.y + dec.y,
        width: dec.width,
        height: dec.height,
      };
    }
  }
  return { x: dec.x, y: dec.y, width: dec.width, height: dec.height };
}

/** Offset of a decoration relative to an attached topic (right of node, vertically centered). */
export function decorationOffsetBesideTopic(
  node: { width: number; height: number },
  asset: Pick<DecorationAsset, 'defaultWidth' | 'defaultHeight'>,
  index = 0,
): { x: number; y: number } {
  const gap = 12;
  const stack = index * 8;
  return {
    x: node.width + gap + stack,
    y: Math.max(0, (node.height - asset.defaultHeight) / 2) + stack,
  };
}

/** Absolute world placement at viewport center. */
export function decorationAtViewportCenter(
  viewport: { x: number; y: number; zoom: number },
  viewSize: { width: number; height: number },
  asset: Pick<DecorationAsset, 'defaultWidth' | 'defaultHeight'>,
  index = 0,
): { x: number; y: number } {
  const cx = viewport.x + viewSize.width / (2 * Math.max(viewport.zoom, 0.01));
  const cy = viewport.y + viewSize.height / (2 * Math.max(viewport.zoom, 0.01));
  const stack = index * 12;
  return {
    x: cx - asset.defaultWidth / 2 + stack,
    y: cy - asset.defaultHeight / 2 + stack,
  };
}
