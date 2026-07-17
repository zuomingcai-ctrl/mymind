import type { ExtraShape, Rect } from '../model/types.js';

/** Curly brace path opening toward `openSide`. */
export function buildBracePath(bounds: Rect, openSide: 'left' | 'right'): string {
  const { x, y, width, height } = bounds;
  const mid = y + height / 2;
  const w = Math.max(width, 8);
  const tip = Math.min(12, height * 0.1);

  if (openSide === 'right') {
    return [
      `M ${x} ${y}`,
      `C ${x + w} ${y} ${x + w} ${y + height * 0.22} ${x + w * 1.55} ${mid - tip}`,
      `C ${x + w * 0.45} ${mid} ${x + w * 1.55} ${mid + tip} ${x + w} ${y + height * 0.78}`,
      `C ${x + w} ${y + height} ${x} ${y + height}`,
    ].join(' ');
  }

  const rx = x + w;
  return [
    `M ${rx} ${y}`,
    `C ${x} ${y} ${x} ${y + height * 0.22} ${x - w * 0.55} ${mid - tip}`,
    `C ${rx + w * 0.45} ${mid} ${x - w * 0.55} ${mid + tip} ${x} ${y + height * 0.78}`,
    `C ${x} ${y + height} ${rx} ${y + height}`,
  ].join(' ');
}

export function extraShapeStroke(shape: ExtraShape): string {
  return (shape.style.stroke as string | undefined) ?? '#888888';
}

export function extraShapeOpenSide(shape: ExtraShape): 'left' | 'right' {
  const side = shape.style.openSide as 'left' | 'right' | undefined;
  return side ?? 'right';
}

export function extraShapeSvgElement(shape: ExtraShape): string {
  const stroke = extraShapeStroke(shape);

  if (shape.type === 'brace') {
    if (shape.bounds.height <= 4) {
      const { x, y, width } = shape.bounds;
      return `<line x1="${x}" y1="${y}" x2="${x + width}" y2="${y}" stroke="${stroke}" stroke-width="2"/>`;
    }
    const d = buildBracePath(shape.bounds, extraShapeOpenSide(shape));
    return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  if (shape.type === 'matrix-cell' || shape.type === 'timeline-axis') {
    const { x, y, width, height } = shape.bounds;
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="${stroke}" stroke-width="1"/>`;
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

    const d = buildBracePath(shape.bounds, extraShapeOpenSide(shape));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const path = new Path2D(d);
    ctx.stroke(path);
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
    ctx.fillStyle = fill ?? '#FFF9E6';
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    helpers.roundRect(ctx, x, y, width, height, 6);
    ctx.fill();
    ctx.stroke();
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
