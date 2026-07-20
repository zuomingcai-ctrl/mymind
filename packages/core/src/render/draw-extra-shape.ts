import type { ExtraShape, Rect } from '../model/types.js';
import {
  calloutBodyRect,
  calloutTipPoints,
  calloutTipSide,
  nearestPointOnRect,
} from './callout-geometry.js';

/**
 * Curly brace path opening toward `openSide`.
 * - `right` → `{` (arms open right, center cusp points left)
 * - `left`  → `}` (arms open left, center cusp points right)
 * Continuous cubics only; stays inside `bounds`.
 */
export function buildBracePath(bounds: Rect, openSide: 'left' | 'right'): string {
  const { x, y, width, height } = bounds;
  // Stay inside layout bounds (no inflation) so hit-testing matches the stroke.
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  const top = y;
  const bot = y + h;
  const mid = y + h / 2;
  const cusp = Math.min(Math.max(h * 0.055, 2), h * 0.25, w * 0.85);

  if (openSide === 'right') {
    const xOpen = x + w;
    const xCusp = x;
    const xSpine = x + w * 0.45;
    return [
      `M ${xOpen} ${top}`,
      `C ${xSpine} ${top}, ${xSpine} ${top + h * 0.08}, ${xSpine} ${mid - cusp}`,
      `C ${xSpine} ${mid - cusp * 0.2}, ${xCusp} ${mid}, ${xCusp} ${mid}`,
      `C ${xCusp} ${mid}, ${xSpine} ${mid + cusp * 0.2}, ${xSpine} ${mid + cusp}`,
      `C ${xSpine} ${bot - h * 0.08}, ${xSpine} ${bot}, ${xOpen} ${bot}`,
    ].join(' ');
  }

  const xOpen = x;
  const xCusp = x + w;
  const xSpine = x + w * 0.55;
  return [
    `M ${xOpen} ${top}`,
    `C ${xSpine} ${top}, ${xSpine} ${top + h * 0.08}, ${xSpine} ${mid - cusp}`,
    `C ${xSpine} ${mid - cusp * 0.2}, ${xCusp} ${mid}, ${xCusp} ${mid}`,
    `C ${xCusp} ${mid}, ${xSpine} ${mid + cusp * 0.2}, ${xSpine} ${mid + cusp}`,
    `C ${xSpine} ${bot - h * 0.08}, ${xSpine} ${bot}, ${xOpen} ${bot}`,
  ].join(' ');
}

/** Horizontal stem from a point into the brace cusp (parent → brace). */
export function buildBraceStem(
  bounds: Rect,
  openSide: 'left' | 'right',
  fromX: number,
  fromY: number,
): string {
  const midY = bounds.y + bounds.height / 2;
  const cuspX = openSide === 'right' ? bounds.x : bounds.x + bounds.width;
  return `M ${fromX} ${fromY} L ${cuspX} ${midY}`;
}

export function extraShapeStroke(shape: ExtraShape): string {
  return (shape.style.stroke as string | undefined) ?? '#6B7280';
}

export function extraShapeOpenSide(shape: ExtraShape): 'left' | 'right' {
  const side = shape.style.openSide as 'left' | 'right' | undefined;
  return side ?? 'right';
}

function braceStrokeWidth(shape: ExtraShape): number {
  const w = shape.style.strokeWidth;
  return typeof w === 'number' ? w : 2;
}

function braceStemPath(shape: ExtraShape): string | null {
  const openSide = extraShapeOpenSide(shape);
  const fromX = shape.style.stemFromX;
  const fromY = shape.style.stemFromY;
  if (typeof fromX !== 'number' || typeof fromY !== 'number') return null;
  return buildBraceStem(shape.bounds, openSide, fromX, fromY);
}

export function extraShapeSvgElement(shape: ExtraShape): string {
  const stroke = extraShapeStroke(shape);

  if (shape.type === 'brace') {
    if (shape.bounds.height <= 4) {
      const { x, y, width } = shape.bounds;
      return `<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y}" stroke="${stroke}" stroke-width="2"/>`;
    }
    const openSide = extraShapeOpenSide(shape);
    const sw = braceStrokeWidth(shape);
    const d = buildBracePath(shape.bounds, openSide);
    const stem = braceStemPath(shape);
    let el = '';
    if (stem) {
      el += `<path d="${stem}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
    }
    el += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
    return el;
  }

  if (shape.type === 'matrix-cell' || shape.type === 'timeline-axis') {
    const { x, y, width, height } = shape.bounds;
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${stroke}" stroke-width="1"/>`;
  }

  if (shape.type === 'callout') {
    const bg =
      (shape.style.fill as string | undefined) ??
      (shape.style.backgroundColor as string | undefined) ??
      '#2D2D2D';
    const border =
      (shape.style.borderColor as string | undefined) ??
      (stroke === '#888888' ? bg : stroke);
    const anchor = {
      x: (shape.style.anchorX as number | undefined) ?? shape.bounds.x + shape.bounds.width / 2,
      y: (shape.style.anchorY as number | undefined) ?? shape.bounds.y + shape.bounds.height + 20,
    };
    const side = calloutTipSide(shape.bounds, anchor);
    const body = calloutBodyRect(shape.bounds, side);
    const tip = calloutTipPoints(body, side);
    const showLeader = shape.style.showLeader !== false;
    let el = '';
    if (
      showLeader &&
      typeof shape.style.topicX === 'number' &&
      typeof shape.style.topicY === 'number' &&
      typeof shape.style.topicW === 'number' &&
      typeof shape.style.topicH === 'number'
    ) {
      const target = nearestPointOnRect(tip.apex, {
        x: shape.style.topicX as number,
        y: shape.style.topicY as number,
        width: shape.style.topicW as number,
        height: shape.style.topicH as number,
      });
      el += `<line x1="${tip.apex.x}" y1="${tip.apex.y}" x2="${target.x}" y2="${target.y}" stroke="${border}" stroke-width="1.25"/>`;
    }
    el += `<rect x="${body.x}" y="${body.y}" width="${body.width}" height="${body.height}" fill="${bg}" stroke="${border}" stroke-width="1" rx="6"/>`;
    el += `<path d="M ${tip.baseA.x} ${tip.baseA.y} L ${tip.baseB.x} ${tip.baseB.y} L ${tip.apex.x} ${tip.apex.y} Z" fill="${bg}" stroke="none"/>`;
    if (shape.label) {
      const isDark =
        bg === '#2D2D2D' || bg.startsWith('#2') || bg.startsWith('#1') || bg.startsWith('#0');
      const fillText = isDark ? '#FFFFFF' : '#333333';
      const fontSize = (shape.style.fontSize as number | undefined) ?? 12;
      el += `<text x="${body.x + body.width / 2}" y="${body.y + body.height / 2}" fill="${fillText}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${shape.label}</text>`;
    }
    return el;
  }

  const { x, y, width, height } = shape.bounds;
  const dash = shape.type === 'boundary' || shape.type === 'summary' ? ' stroke-dasharray="6 4"' : '';
  const fill = (shape.style.fill as string | undefined) ?? 'none';
  const sw = shape.type === 'boundary' ? 2 : 1;
  let el = `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" rx="4"${dash}/>`;
  if (shape.label) {
    el += `<text x="${x + 4}" y="${y + 16}" fill="#666" font-size="12">${shape.label}</text>`;
  }
  return el;
}

export interface DrawExtraShapeOptions {
  roundRect: (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) => void;
}

export function drawExtraShape(
  ctx: CanvasRenderingContext2D,
  shape: ExtraShape,
  helpers: DrawExtraShapeOptions,
): void {
  const { x, y, width, height } = shape.bounds;
  const stroke = extraShapeStroke(shape);
  const fill = shape.style.fill as string | undefined;

  ctx.save();

  if (shape.type === 'brace') {
    if (height <= 4) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const openSide = extraShapeOpenSide(shape);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = braceStrokeWidth(shape);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const stem = braceStemPath(shape);
    if (stem) ctx.stroke(new Path2D(stem));
    ctx.stroke(new Path2D(buildBracePath(shape.bounds, openSide)));
    ctx.restore();
    return;
  }

  if (shape.type === 'zone') {
    ctx.fillStyle = fill ?? 'rgba(74, 144, 217, 0.08)';
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    helpers.roundRect(ctx, x, y, width, height, 4);
    ctx.fill();
    ctx.stroke();
  } else if (shape.type === 'callout') {
    const bg =
      fill ??
      (shape.style.backgroundColor as string | undefined) ??
      '#2D2D2D';
    const border =
      (shape.style.borderColor as string | undefined) ??
      (stroke === '#888888' ? bg : stroke);
    const anchor = {
      x: (shape.style.anchorX as number | undefined) ?? x + width / 2,
      y: (shape.style.anchorY as number | undefined) ?? y + height + 20,
    };
    const side = calloutTipSide(shape.bounds, anchor);
    const body = calloutBodyRect(shape.bounds, side);
    const tip = calloutTipPoints(body, side);
    const showLeader = shape.style.showLeader !== false;
    const topicRect =
      typeof shape.style.topicX === 'number' &&
      typeof shape.style.topicY === 'number' &&
      typeof shape.style.topicW === 'number' &&
      typeof shape.style.topicH === 'number'
        ? {
            x: shape.style.topicX as number,
            y: shape.style.topicY as number,
            width: shape.style.topicW as number,
            height: shape.style.topicH as number,
          }
        : null;

    if (showLeader && topicRect) {
      const target = nearestPointOnRect(tip.apex, topicRect);
      const dist = Math.hypot(target.x - tip.apex.x, target.y - tip.apex.y);
      if (dist > 4) {
        ctx.strokeStyle = border;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(tip.apex.x, tip.apex.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    }

    const r = 6;
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    helpers.roundRect(ctx, body.x, body.y, body.width, body.height, r);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tip.baseA.x, tip.baseA.y);
    ctx.lineTo(tip.baseB.x, tip.baseB.y);
    ctx.lineTo(tip.apex.x, tip.apex.y);
    ctx.closePath();
    ctx.fill();
    if (shape.label) {
      const isDark =
        bg === '#2D2D2D' || bg.startsWith('#2') || bg.startsWith('#1') || bg.startsWith('#0');
      ctx.fillStyle = isDark ? '#FFFFFF' : '#333333';
      ctx.font = `${(shape.style.fontSize as number | undefined) ?? 12}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(shape.label, body.x + body.width / 2, body.y + body.height / 2);
    }
    ctx.restore();
    return;
  } else {
    ctx.fillStyle = fill ?? 'transparent';
    ctx.strokeStyle = stroke;
    ctx.lineWidth = shape.type === 'boundary' ? 2 : 1;
    if (shape.type === 'boundary' || shape.type === 'summary') {
      ctx.setLineDash([6, 4]);
    }
    helpers.roundRect(ctx, x, y, width, height, 4);
    if (fill && fill !== 'transparent' && fill !== 'none') ctx.fill();
    ctx.stroke();
  }

  if (shape.label) {
    ctx.setLineDash([]);
    ctx.fillStyle = '#666666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(shape.label, x + 4, y + 4);
  }

  ctx.restore();
}
