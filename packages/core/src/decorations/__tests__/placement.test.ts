import { describe, it, expect } from 'vitest';
import {
  resolveDecorationWorldRect,
  decorationOffsetBesideTopic,
  decorationAtViewportCenter,
} from '../placement.js';
import type { CanvasDecoration, LayoutNode } from '../../model/types.js';

describe('decoration placement', () => {
  it('uses absolute coords when not attached', () => {
    const dec: CanvasDecoration = {
      id: 'd1',
      type: 'sticker',
      assetId: 'star',
      x: 100,
      y: 200,
      width: 48,
      height: 48,
      rotation: 0,
      zIndex: 1,
    };
    expect(resolveDecorationWorldRect(dec, new Map())).toEqual({
      x: 100,
      y: 200,
      width: 48,
      height: 48,
    });
  });

  it('offsets from attached topic node', () => {
    const nodes = new Map<string, LayoutNode>([
      [
        't1',
        {
          id: 't1',
          x: 50,
          y: 80,
          width: 120,
          height: 32,
          depth: 1,
          hidden: false,
        },
      ],
    ]);
    const dec: CanvasDecoration = {
      id: 'd1',
      type: 'sticker',
      assetId: 'heart',
      x: 12,
      y: 4,
      width: 48,
      height: 48,
      rotation: 0,
      zIndex: 1,
      attachedTopicId: 't1',
    };
    expect(resolveDecorationWorldRect(dec, nodes)).toEqual({
      x: 62,
      y: 84,
      width: 48,
      height: 48,
    });
  });

  it('places beside topic and at viewport center', () => {
    const beside = decorationOffsetBesideTopic({ width: 100, height: 40 }, {
      defaultWidth: 48,
      defaultHeight: 48,
    });
    expect(beside.x).toBe(112);
    expect(beside.y).toBe(0);

    const center = decorationAtViewportCenter(
      { x: 0, y: 0, zoom: 1 },
      { width: 800, height: 600 },
      { defaultWidth: 48, defaultHeight: 48 },
    );
    expect(center.x).toBe(400 - 24);
    expect(center.y).toBe(300 - 24);
  });
});
