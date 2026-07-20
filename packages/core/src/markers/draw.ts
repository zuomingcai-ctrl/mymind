import { getMarker, type MarkerIconKind, type MarkerPreset } from './presets.js';

/** Draw a single XMind-style marker badge into a canvas context. */
export function drawMarker(
  ctx: CanvasRenderingContext2D,
  markerId: string,
  x: number,
  y: number,
  size = 16,
): void {
  const preset = getMarker(markerId);
  if (!preset) {
    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 0.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  drawMarkerPreset(ctx, preset, x, y, size);
}

export function drawMarkerPreset(
  ctx: CanvasRenderingContext2D,
  preset: MarkerPreset,
  x: number,
  y: number,
  size = 16,
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2 - 0.5;

  if (preset.icon === 'progress') {
    drawProgressBadge(ctx, cx, cy, r, preset.color, preset.value ?? 0);
    return;
  }

  ctx.beginPath();
  ctx.fillStyle = preset.color;
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  if (preset.icon === 'none') return;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (preset.icon === 'number') {
    ctx.font = `bold ${Math.max(8, size * 0.62)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(preset.value ?? preset.glyph), cx, cy + size * 0.03);
    return;
  }

  drawWhiteIcon(ctx, preset.icon, cx, cy, size);
}

function drawProgressBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  fraction: number,
): void {
  const f = Math.max(0, Math.min(1, fraction));

  if (f >= 1) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // checkmark
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1.4, r * 0.28);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.42, cy + r * 0.02);
    ctx.lineTo(cx - r * 0.1, cy + r * 0.35);
    ctx.lineTo(cx + r * 0.45, cy - r * 0.32);
    ctx.stroke();
    return;
  }

  // ring
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, r * 0.22);
  ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  if (f <= 0) {
    // play triangle
    ctx.fillStyle = color;
    const s = r * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.35, cy - s * 0.55);
    ctx.lineTo(cx - s * 0.35, cy + s * 0.55);
    ctx.lineTo(cx + s * 0.65, cy);
    ctx.closePath();
    ctx.fill();
    return;
  }

  // pie wedge from 12 o'clock, clockwise
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r - 0.5, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2, false);
  ctx.closePath();
  ctx.fill();
}

function drawWhiteIcon(
  ctx: CanvasRenderingContext2D,
  kind: MarkerIconKind,
  cx: number,
  cy: number,
  size: number,
): void {
  const s = size * 0.5;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (kind) {
    case 'flag': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, -s * 0.55);
      ctx.lineTo(-s * 0.35, s * 0.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.5);
      ctx.lineTo(s * 0.45, -s * 0.28);
      ctx.lineTo(-s * 0.3, -s * 0.05);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'star': {
      drawStar(ctx, 0, 0, 5, s * 0.55, s * 0.24);
      break;
    }
    case 'person': {
      ctx.beginPath();
      ctx.arc(0, -s * 0.28, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.48, s * 0.55);
      ctx.quadraticCurveTo(-s * 0.48, s * 0.05, 0, s * 0.05);
      ctx.quadraticCurveTo(s * 0.48, s * 0.05, s * 0.48, s * 0.55);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'heart': {
      ctx.beginPath();
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(-s * 0.55, s * 0.05, -s * 0.5, -s * 0.4, 0, -s * 0.15);
      ctx.bezierCurveTo(s * 0.5, -s * 0.4, s * 0.55, s * 0.05, 0, s * 0.35);
      ctx.fill();
      break;
    }
    case 'thumbs-up': {
      ctx.fillRect(-s * 0.35, -s * 0.05, s * 0.55, s * 0.45);
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.05);
      ctx.quadraticCurveTo(-s * 0.05, -s * 0.55, s * 0.25, -s * 0.55);
      ctx.quadraticCurveTo(s * 0.4, -s * 0.55, s * 0.35, -s * 0.05);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'thumbs-down': {
      ctx.fillRect(-s * 0.35, -s * 0.4, s * 0.55, s * 0.45);
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, s * 0.05);
      ctx.quadraticCurveTo(-s * 0.05, s * 0.55, s * 0.25, s * 0.55);
      ctx.quadraticCurveTo(s * 0.4, s * 0.55, s * 0.35, s * 0.05);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'pin': {
      ctx.beginPath();
      ctx.arc(0, -s * 0.15, s * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, s * 0.1);
      ctx.lineTo(0, s * 0.55);
      ctx.stroke();
      break;
    }
    case 'bulb': {
      ctx.beginPath();
      ctx.arc(0, -s * 0.12, s * 0.38, Math.PI * 0.15, Math.PI * 0.85, true);
      ctx.lineTo(s * 0.18, s * 0.25);
      ctx.lineTo(-s * 0.18, s * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-s * 0.16, s * 0.28, s * 0.32, s * 0.18);
      break;
    }
    case 'bolt': {
      ctx.beginPath();
      ctx.moveTo(s * 0.1, -s * 0.55);
      ctx.lineTo(-s * 0.25, s * 0.05);
      ctx.lineTo(s * 0.05, s * 0.05);
      ctx.lineTo(-s * 0.1, s * 0.55);
      ctx.lineTo(s * 0.25, -s * 0.05);
      ctx.lineTo(-s * 0.05, -s * 0.05);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'hourglass': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, -s * 0.45);
      ctx.lineTo(s * 0.35, -s * 0.45);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s * 0.35, s * 0.45);
      ctx.lineTo(-s * 0.35, s * 0.45);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'phone': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, -s * 0.15);
      ctx.quadraticCurveTo(-s * 0.45, s * 0.35, -s * 0.05, s * 0.45);
      ctx.quadraticCurveTo(s * 0.15, s * 0.2, s * 0.05, -s * 0.05);
      ctx.lineTo(-s * 0.05, -s * 0.25);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'pencil': {
      ctx.save();
      ctx.rotate(-Math.PI / 4);
      ctx.fillRect(-s * 0.12, -s * 0.4, s * 0.24, s * 0.7);
      ctx.beginPath();
      ctx.moveTo(-s * 0.12, s * 0.3);
      ctx.lineTo(0, s * 0.55);
      ctx.lineTo(s * 0.12, s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'music': {
      ctx.beginPath();
      ctx.arc(-s * 0.15, s * 0.3, s * 0.22, 0, Math.PI * 2);
      ctx.arc(s * 0.25, s * 0.18, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-s * 0.05, -s * 0.45, s * 0.12, s * 0.7);
      ctx.fillRect(s * 0.35, -s * 0.55, s * 0.12, s * 0.7);
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.45);
      ctx.lineTo(s * 0.47, -s * 0.55);
      ctx.lineTo(s * 0.47, -s * 0.35);
      ctx.lineTo(-s * 0.05, -s * 0.25);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'gamepad': {
      roundRect(ctx, -s * 0.5, -s * 0.28, s, s * 0.56, s * 0.18);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-s * 0.22, 0, s * 0.1, 0, Math.PI * 2);
      ctx.arc(s * 0.22, -s * 0.08, s * 0.08, 0, Math.PI * 2);
      ctx.arc(s * 0.35, s * 0.06, s * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fill();
      break;
    }
    case 'hundred': {
      ctx.font = `bold ${Math.max(7, size * 0.42)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('100', 0, -s * 0.05);
      ctx.lineWidth = Math.max(1, size * 0.06);
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, s * 0.35);
      ctx.lineTo(s * 0.35, s * 0.35);
      ctx.stroke();
      break;
    }
    case 'plane': {
      ctx.beginPath();
      ctx.moveTo(s * 0.5, 0);
      ctx.lineTo(-s * 0.35, -s * 0.35);
      ctx.lineTo(-s * 0.15, 0);
      ctx.lineTo(-s * 0.35, s * 0.35);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'run': {
      ctx.beginPath();
      ctx.arc(-s * 0.05, -s * 0.35, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, size * 0.1);
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.1);
      ctx.lineTo(s * 0.15, s * 0.05);
      ctx.lineTo(-s * 0.05, s * 0.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.15, s * 0.05);
      ctx.lineTo(s * 0.4, -s * 0.15);
      ctx.stroke();
      break;
    }
    case 'exclaim': {
      ctx.font = `bold ${Math.max(10, size * 0.72)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', 0, size * 0.04);
      break;
    }
    case 'question': {
      ctx.font = `bold ${Math.max(10, size * 0.68)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, size * 0.04);
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outer: number,
  inner: number,
): void {
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  ctx.beginPath();
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
