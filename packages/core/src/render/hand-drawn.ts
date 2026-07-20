import type { EdgeStyle, LayoutEdge, Point } from '../model/types.js';

/** Handwriting stack used when canvas handDrawn is on (PP-C06 / TH-006). */
export const HAND_DRAWN_FONT_FAMILY =
  '"Segoe Print", "Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive';

function autoCubicControlPoints(from: Point, to: Point): [Point, Point] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const isMostlyHorizontal = Math.abs(dx) >= Math.abs(dy);
  const span = isMostlyHorizontal ? Math.abs(dx) : Math.abs(dy);
  const offset = Math.min(Math.max(span * 0.4, 20), span * 0.45 || 20);

  if (isMostlyHorizontal) {
    const sign = dx >= 0 ? 1 : -1;
    return [
      { x: from.x + sign * offset, y: from.y },
      { x: to.x - sign * offset, y: to.y },
    ];
  }

  const sign = dy >= 0 ? 1 : -1;
  return [
    { x: from.x, y: from.y + sign * offset },
    { x: to.x, y: to.y - sign * offset },
  ];
}

export interface HandDrawnStrokeOptions {
  /** Pixel amplitude of perpendicular jitter. Default 1.6. */
  roughness?: number;
  /** Stable seed so redraws do not flicker. */
  seed?: number;
}

function hashSeed(parts: Array<string | number>): number {
  let h = 2166136261;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 0x9e3779b9;
  }
  return h >>> 0;
}

/** Mulberry32 — deterministic PRNG in [0, 1). */
function createRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pointOnCubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  return {
    x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
    y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y,
  };
}

function pointOnQuadratic(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function sampleLine(a: Point, b: Point, step: number): Point[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.ceil(len / step));
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

function sampleCubic(p0: Point, p1: Point, p2: Point, p3: Point, step: number): Point[] {
  const roughLen =
    Math.hypot(p1.x - p0.x, p1.y - p0.y) +
    Math.hypot(p2.x - p1.x, p2.y - p1.y) +
    Math.hypot(p3.x - p2.x, p3.y - p2.y);
  const n = Math.max(2, Math.ceil(roughLen / step));
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) out.push(pointOnCubic(p0, p1, p2, p3, i / n));
  return out;
}

function sampleQuadratic(p0: Point, p1: Point, p2: Point, step: number): Point[] {
  const roughLen =
    Math.hypot(p1.x - p0.x, p1.y - p0.y) + Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const n = Math.max(2, Math.ceil(roughLen / step));
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) out.push(pointOnQuadratic(p0, p1, p2, i / n));
  return out;
}

function isMindmapCubic(pts: Point[]): boolean {
  if (pts.length !== 4) return false;
  const [p0, p1, p2, p3] = pts;
  const eps = 0.01;
  return (
    Math.abs(p0!.y - p1!.y) < eps &&
    Math.abs(p3!.y - p2!.y) < eps &&
    Math.abs(p1!.x - p2!.x) > eps
  );
}

function resolveRenderMode(
  edge: LayoutEdge,
  lineType: EdgeStyle['lineType'],
): 'summary' | 'cubic' | 'quadratic' | 'polyline' {
  const pts = edge.points;
  if (edge.type === 'summary' && pts.length >= 3) return 'summary';
  if (edge.type === 'relationship') {
    if (pts.length === 4) return 'cubic';
    if (pts.length === 3) return 'quadratic';
    return 'polyline';
  }
  if (lineType === 'straight' || pts.length === 2) {
    return lineType === 'curve' && pts.length === 2 ? 'cubic' : 'polyline';
  }
  if (lineType === 'polyline' || (pts.length >= 3 && !isMindmapCubic(pts))) {
    return 'polyline';
  }
  if (pts.length === 4 && isMindmapCubic(pts)) return 'cubic';
  if (pts.length === 3) return 'quadratic';
  if (pts.length === 2) return 'cubic';
  return 'polyline';
}

/** Densify an edge into polyline samples (same geometry as strokeEdge). */
export function sampleEdgePoints(
  edge: LayoutEdge,
  lineType: EdgeStyle['lineType'],
  step = 8,
): Point[] {
  const pts = edge.points;
  if (pts.length < 2) return [];

  const mode = resolveRenderMode(edge, lineType);
  switch (mode) {
    case 'summary':
      return sampleQuadratic(pts[0]!, pts[1]!, pts[2]!, step);
    case 'cubic':
      if (pts.length === 4) {
        return sampleCubic(pts[0]!, pts[1]!, pts[2]!, pts[3]!, step);
      }
      {
        const [cp1, cp2] = autoCubicControlPoints(pts[0]!, pts[1]!);
        return sampleCubic(pts[0]!, cp1, cp2, pts[1]!, step);
      }
    case 'quadratic':
      return sampleQuadratic(pts[0]!, pts[1]!, pts[2]!, step);
    case 'polyline': {
      const out: Point[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const seg = sampleLine(pts[i]!, pts[i + 1]!, step);
        if (i > 0) seg.shift();
        out.push(...seg);
      }
      return out;
    }
  }
}

/**
 * Apply perpendicular jitter. Endpoints stay fixed when `pinEnds` is true
 * (tree/relationship connectors must still meet topic anchors).
 */
export function jitterPolyline(
  points: Point[],
  options: HandDrawnStrokeOptions & { pinEnds?: boolean } = {},
): Point[] {
  if (points.length < 2) return points.map((p) => ({ ...p }));

  const roughness = options.roughness ?? 1.6;
  const pinEnds = options.pinEnds !== false;
  const seed = options.seed ?? hashSeed(points.map((p) => `${p.x},${p.y}`));
  const rng = createRng(seed);

  return points.map((p, i) => {
    if (pinEnds && (i === 0 || i === points.length - 1)) {
      return { x: p.x, y: p.y };
    }
    const prev = points[Math.max(0, i - 1)]!;
    const next = points[Math.min(points.length - 1, i + 1)]!;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const offset = (rng() * 2 - 1) * roughness;
    return { x: p.x + nx * offset, y: p.y + ny * offset };
  });
}

export function tracePolyline(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  closed = false,
): void {
  if (points.length < 2) return;
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }
  if (closed) ctx.closePath();
}

export function seedForId(id: string, salt = 0): number {
  return hashSeed([id, salt]);
}

function sampleRoundedRect(x: number, y: number, w: number, h: number, r: number, step: number): Point[] {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const pts: Point[] = [];
  const pushSeg = (seg: Point[]) => {
    if (pts.length && seg.length) seg = seg.slice(1);
    pts.push(...seg);
  };

  pushSeg(sampleLine({ x: x + rr, y }, { x: x + w - rr, y }, step));
  if (rr > 0) {
    pushSeg(
      sampleQuadratic(
        { x: x + w - rr, y },
        { x: x + w, y },
        { x: x + w, y: y + rr },
        Math.max(2, step * 0.6),
      ),
    );
  }
  pushSeg(sampleLine({ x: x + w, y: y + rr }, { x: x + w, y: y + h - rr }, step));
  if (rr > 0) {
    pushSeg(
      sampleQuadratic(
        { x: x + w, y: y + h - rr },
        { x: x + w, y: y + h },
        { x: x + w - rr, y: y + h },
        Math.max(2, step * 0.6),
      ),
    );
  }
  pushSeg(sampleLine({ x: x + w - rr, y: y + h }, { x: x + rr, y: y + h }, step));
  if (rr > 0) {
    pushSeg(
      sampleQuadratic(
        { x: x + rr, y: y + h },
        { x, y: y + h },
        { x, y: y + h - rr },
        Math.max(2, step * 0.6),
      ),
    );
  }
  pushSeg(sampleLine({ x, y: y + h - rr }, { x, y: y + rr }, step));
  if (rr > 0) {
    pushSeg(
      sampleQuadratic(
        { x, y: y + rr },
        { x, y },
        { x: x + rr, y },
        Math.max(2, step * 0.6),
      ),
    );
  }
  return pts;
}

function sampleEllipse(cx: number, cy: number, rx: number, ry: number, step: number): Point[] {
  const perimeter = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const n = Math.max(12, Math.ceil(perimeter / step));
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    out.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
  }
  return out;
}

/** Begin a closed hand-drawn rounded rect path (fill + stroke). */
export function beginHandDrawnRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  options: HandDrawnStrokeOptions = {},
): void {
  const sampled = sampleRoundedRect(x, y, w, h, r, 6);
  const jittered = closeJitteredLoop(
    jitterPolyline(sampled, {
      ...options,
      pinEnds: false,
      seed: options.seed ?? hashSeed([x, y, w, h, r]),
    }),
  );
  ctx.beginPath();
  tracePolyline(ctx, jittered, true);
}

export function beginHandDrawnEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  options: HandDrawnStrokeOptions = {},
): void {
  const sampled = sampleEllipse(cx, cy, rx, ry, 6);
  const jittered = closeJitteredLoop(
    jitterPolyline(sampled, {
      ...options,
      pinEnds: false,
      seed: options.seed ?? hashSeed([cx, cy, rx, ry]),
    }),
  );
  ctx.beginPath();
  tracePolyline(ctx, jittered, true);
}

export function beginHandDrawnDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  options: HandDrawnStrokeOptions = {},
): void {
  const corners: Point[] = [
    { x: x + w / 2, y },
    { x: x + w, y: y + h / 2 },
    { x: x + w / 2, y: y + h },
    { x, y: y + h / 2 },
  ];
  const sampled: Point[] = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i]!;
    const b = corners[(i + 1) % corners.length]!;
    const seg = sampleLine(a, b, 6);
    if (i > 0) seg.shift();
    sampled.push(...seg);
  }
  const jittered = closeJitteredLoop(
    jitterPolyline(sampled, {
      ...options,
      pinEnds: false,
      seed: options.seed ?? hashSeed([x, y, w, h, 'diamond']),
    }),
  );
  ctx.beginPath();
  tracePolyline(ctx, jittered, true);
}

function closeJitteredLoop(points: Point[]): Point[] {
  if (points.length < 2) return points;
  const first = points[0]!;
  points[points.length - 1] = { x: first.x, y: first.y };
  return points;
}

export function beginHandDrawnLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: HandDrawnStrokeOptions = {},
): void {
  const sampled = sampleLine({ x: x1, y: y1 }, { x: x2, y: y2 }, 6);
  const jittered = jitterPolyline(sampled, {
    ...options,
    pinEnds: true,
    seed: options.seed ?? hashSeed([x1, y1, x2, y2]),
  });
  ctx.beginPath();
  tracePolyline(ctx, jittered, false);
}

/** Trace a hand-drawn version of an edge (endpoints pinned). */
export function traceHandDrawnEdge(
  ctx: CanvasRenderingContext2D,
  edge: LayoutEdge,
  lineType: EdgeStyle['lineType'],
  options: HandDrawnStrokeOptions = {},
): void {
  const sampled = sampleEdgePoints(edge, lineType);
  if (sampled.length < 2) return;
  const jittered = jitterPolyline(sampled, {
    ...options,
    pinEnds: true,
    seed: options.seed ?? seedForId(edge.id ?? `${sampled[0]!.x},${sampled[0]!.y}`, sampled.length),
  });
  tracePolyline(ctx, jittered, false);
}

/**
 * Font for canvas text: explicit global override wins; otherwise handDrawn
 * forces the handwriting stack (even if the active theme is not hand-drawn).
 */
export function resolveCanvasFontFamily(
  canvasSettings: { handDrawn: boolean; globalFontFamily?: string },
  themeFontFamily: string,
): string {
  if (canvasSettings.globalFontFamily) return canvasSettings.globalFontFamily;
  if (canvasSettings.handDrawn) return HAND_DRAWN_FONT_FAMILY;
  return themeFontFamily;
}
