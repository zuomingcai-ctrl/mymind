/** Marker icon catalog — XMind-aligned palette (EL-003 / §5.5) */

export type MarkerCategory =
  | 'tag'
  | 'priority'
  | 'progress'
  | 'flag'
  | 'star'
  | 'people'
  | 'symbol';

/** Visual glyph drawn in white on a colored circle (except progress). */
export type MarkerIconKind =
  | 'none'
  | 'number'
  | 'progress'
  | 'flag'
  | 'star'
  | 'person'
  | 'heart'
  | 'thumbs-up'
  | 'thumbs-down'
  | 'pin'
  | 'bulb'
  | 'bolt'
  | 'hourglass'
  | 'phone'
  | 'pencil'
  | 'music'
  | 'gamepad'
  | 'hundred'
  | 'plane'
  | 'run'
  | 'exclaim'
  | 'question';

export interface MarkerPreset {
  id: string;
  category: MarkerCategory;
  label: string;
  /** Badge fill / accent color */
  color: string;
  icon: MarkerIconKind;
  /**
   * priority → display number 1–7
   * progress → fill ratio 0–1 (0 = start/play, 1 = done/check)
   */
  value?: number;
  /** Text fallback / a11y glyph */
  glyph: string;
}

/** Shared 7-color palette matching XMind marker library. */
export const MARKER_PALETTE = {
  red: '#F44336',
  orange: '#FF9800',
  yellow: '#FBC02D',
  green: '#4CAF50',
  blue: '#2196F3',
  purple: '#9C27B0',
  grey: '#9E9E9E',
} as const;

const P = MARKER_PALETTE;
const PROGRESS_COLOR = P.green;

const COLOR_KEYS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'grey'] as const;
const COLOR_LABELS: Record<(typeof COLOR_KEYS)[number], string> = {
  red: '红',
  orange: '橙',
  yellow: '黄',
  green: '绿',
  blue: '蓝',
  purple: '紫',
  grey: '灰',
};

function coloredRow(
  category: MarkerCategory,
  idPrefix: string,
  labelSuffix: string,
  icon: MarkerIconKind,
  glyph: string,
): MarkerPreset[] {
  return COLOR_KEYS.map((key) => ({
    id: `${idPrefix}-${key}`,
    category,
    label: `${COLOR_LABELS[key]}${labelSuffix}`,
    color: P[key],
    icon,
    glyph,
  }));
}

export const MARKER_PRESETS: MarkerPreset[] = [
  // 标签 — solid color dots
  ...COLOR_KEYS.map((key) => ({
    id: `tag-${key}`,
    category: 'tag' as const,
    label: `${COLOR_LABELS[key]}标签`,
    color: P[key],
    icon: 'none' as const,
    glyph: '●',
  })),

  // 优先级 — numbered 1–7
  ...([1, 2, 3, 4, 5, 6, 7] as const).map((n) => ({
    id: `priority-${n}`,
    category: 'priority' as const,
    label: `优先级 ${n}`,
    color: P[COLOR_KEYS[n - 1]!],
    icon: 'number' as const,
    value: n,
    glyph: String(n),
  })),

  // 任务 — 7 progress states (XMind)
  { id: 'progress-0', category: 'progress', label: '未开始', color: PROGRESS_COLOR, icon: 'progress', value: 0, glyph: '▷' },
  { id: 'progress-12', category: 'progress', label: '1/8', color: PROGRESS_COLOR, icon: 'progress', value: 0.125, glyph: '◔' },
  { id: 'progress-25', category: 'progress', label: '1/4', color: PROGRESS_COLOR, icon: 'progress', value: 0.25, glyph: '◔' },
  { id: 'progress-50', category: 'progress', label: '1/2', color: PROGRESS_COLOR, icon: 'progress', value: 0.5, glyph: '◑' },
  { id: 'progress-75', category: 'progress', label: '3/4', color: PROGRESS_COLOR, icon: 'progress', value: 0.75, glyph: '◕' },
  { id: 'progress-88', category: 'progress', label: '7/8', color: PROGRESS_COLOR, icon: 'progress', value: 0.875, glyph: '◕' },
  { id: 'progress-100', category: 'progress', label: '完成', color: PROGRESS_COLOR, icon: 'progress', value: 1, glyph: '✓' },

  // 旗帜 / 星星 / 人像
  ...coloredRow('flag', 'flag', '旗', 'flag', '⚑'),
  ...coloredRow('star', 'star', '星', 'star', '★'),
  ...coloredRow('people', 'people', '人像', 'person', '👤'),

  // 符号 — XMind symbol row
  { id: 'symbol-heart', category: 'symbol', label: '喜欢', color: P.red, icon: 'heart', glyph: '♥' },
  { id: 'symbol-up', category: 'symbol', label: '赞同', color: P.red, icon: 'thumbs-up', glyph: '👍' },
  { id: 'symbol-down', category: 'symbol', label: '反对', color: P.blue, icon: 'thumbs-down', glyph: '👎' },
  { id: 'symbol-pin', category: 'symbol', label: '图钉', color: P.red, icon: 'pin', glyph: '📌' },
  { id: 'symbol-bulb', category: 'symbol', label: '灵感', color: P.yellow, icon: 'bulb', glyph: '💡' },
  { id: 'symbol-bolt', category: 'symbol', label: '闪电', color: P.blue, icon: 'bolt', glyph: '⚡' },
  { id: 'symbol-hourglass', category: 'symbol', label: '沙漏', color: P.orange, icon: 'hourglass', glyph: '⌛' },
  { id: 'symbol-phone', category: 'symbol', label: '电话', color: P.green, icon: 'phone', glyph: '☎' },
  { id: 'symbol-pencil', category: 'symbol', label: '编辑', color: P.orange, icon: 'pencil', glyph: '✎' },
  { id: 'symbol-music', category: 'symbol', label: '音乐', color: P.purple, icon: 'music', glyph: '♪' },
  { id: 'symbol-gamepad', category: 'symbol', label: '游戏', color: P.yellow, icon: 'gamepad', glyph: '🎮' },
  { id: 'symbol-hundred', category: 'symbol', label: '满分', color: P.red, icon: 'hundred', glyph: '100' },
  { id: 'symbol-plane', category: 'symbol', label: '出行', color: P.blue, icon: 'plane', glyph: '✈' },
  { id: 'symbol-run', category: 'symbol', label: '运动', color: P.green, icon: 'run', glyph: '🏃' },
  { id: 'symbol-exclaim', category: 'symbol', label: '感叹', color: P.red, icon: 'exclaim', glyph: '!' },
  { id: 'symbol-question', category: 'symbol', label: '疑问', color: P.blue, icon: 'question', glyph: '?' },
];

export function listMarkers(category?: MarkerPreset['category']): MarkerPreset[] {
  if (!category) return [...MARKER_PRESETS];
  return MARKER_PRESETS.filter((m) => m.category === category);
}

/** Map legacy marker ids from older catalogs onto the XMind-aligned set. */
const LEGACY_ALIASES: Record<string, string> = {
  'star-full': 'star-yellow',
  'star-empty': 'star-grey',
  'people-1': 'people-blue',
  'people-2': 'people-green',
  'people-team': 'people-purple',
  'emoji-smile': 'symbol-up',
  'emoji-question': 'symbol-question',
  'emoji-warning': 'symbol-exclaim',
  'arrow-up': 'symbol-up',
  'arrow-down': 'symbol-down',
  'arrow-left': 'symbol-plane',
  'arrow-right': 'symbol-plane',
  'symbol-check': 'progress-100',
  'symbol-cross': 'symbol-down',
};

export function getMarker(id: string): MarkerPreset | undefined {
  const resolved = LEGACY_ALIASES[id] ?? id;
  return MARKER_PRESETS.find((m) => m.id === resolved);
}

export function markerGlyph(id: string): string {
  return getMarker(id)?.glyph ?? id;
}

export function markerColor(id: string): string {
  return getMarker(id)?.color ?? MARKER_PALETTE.grey;
}

/** @deprecated Prefer markerColor / getMarker — kept for callers expecting priority map. */
export const PRIORITY_COLORS: Record<string, string> = Object.fromEntries(
  MARKER_PRESETS.filter((m) => m.category === 'priority').map((m) => [m.id, m.color]),
);

export interface MarkerHitRect {
  markerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const MARKER_GAP = 3;
const MARKER_HEIGHT = 16;
const TOPIC_PAD_X = 8;

/** World-space hit boxes for markers (left of title inside the topic). */
export function layoutMarkerHits(
  markers: string[],
  originX: number,
  originY: number,
): MarkerHitRect[] {
  let ox = originX;
  return markers.map((markerId) => {
    const hit: MarkerHitRect = {
      markerId,
      x: ox,
      y: originY,
      width: MARKER_HEIGHT,
      height: MARKER_HEIGHT,
    };
    ox += MARKER_HEIGHT + MARKER_GAP;
    return hit;
  });
}

/** Origin of the first marker inside the topic (title-band left). */
export function markerOriginForNode(node: {
  x: number;
  y: number;
  width: number;
  height?: number;
}): {
  x: number;
  y: number;
} {
  const bandH = node.height ?? 28;
  return {
    x: node.x + TOPIC_PAD_X,
    y: node.y + Math.max(0, (bandH - MARKER_HEIGHT) / 2),
  };
}
