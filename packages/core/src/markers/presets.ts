/** Marker icon catalog (EL-003 / §5.5) */

export interface MarkerPreset {
  id: string;
  category: 'priority' | 'progress' | 'emoji' | 'arrow' | 'flag' | 'star' | 'people' | 'symbol';
  label: string;
  glyph: string;
}

export const MARKER_PRESETS: MarkerPreset[] = [
  { id: 'priority-1', category: 'priority', label: '优先级 1', glyph: '①' },
  { id: 'priority-2', category: 'priority', label: '优先级 2', glyph: '②' },
  { id: 'priority-3', category: 'priority', label: '优先级 3', glyph: '③' },
  { id: 'priority-4', category: 'priority', label: '优先级 4', glyph: '④' },
  { id: 'priority-5', category: 'priority', label: '优先级 5', glyph: '⑤' },
  { id: 'priority-6', category: 'priority', label: '优先级 6', glyph: '⑥' },
  { id: 'priority-7', category: 'priority', label: '优先级 7', glyph: '⑦' },
  { id: 'progress-0', category: 'progress', label: '0%', glyph: '○' },
  { id: 'progress-25', category: 'progress', label: '25%', glyph: '◔' },
  { id: 'progress-50', category: 'progress', label: '50%', glyph: '◑' },
  { id: 'progress-75', category: 'progress', label: '75%', glyph: '◕' },
  { id: 'progress-100', category: 'progress', label: '100%', glyph: '●' },
  { id: 'emoji-smile', category: 'emoji', label: '笑脸', glyph: '☺' },
  { id: 'emoji-question', category: 'emoji', label: '疑问', glyph: '?' },
  { id: 'emoji-warning', category: 'emoji', label: '警告', glyph: '⚠' },
  { id: 'arrow-up', category: 'arrow', label: '上', glyph: '↑' },
  { id: 'arrow-down', category: 'arrow', label: '下', glyph: '↓' },
  { id: 'arrow-left', category: 'arrow', label: '左', glyph: '←' },
  { id: 'arrow-right', category: 'arrow', label: '右', glyph: '→' },
  { id: 'flag-red', category: 'flag', label: '红旗', glyph: '🚩' },
  { id: 'flag-orange', category: 'flag', label: '橙旗', glyph: '🟧' },
  { id: 'flag-green', category: 'flag', label: '绿旗', glyph: '🟩' },
  { id: 'flag-blue', category: 'flag', label: '蓝旗', glyph: '🟦' },
  { id: 'flag-purple', category: 'flag', label: '紫旗', glyph: '🟪' },
  { id: 'star-full', category: 'star', label: '满星', glyph: '★' },
  { id: 'star-empty', category: 'star', label: '空星', glyph: '☆' },
  { id: 'people-1', category: 'people', label: '单人', glyph: '👤' },
  { id: 'people-2', category: 'people', label: '双人', glyph: '👥' },
  { id: 'people-team', category: 'people', label: '团队', glyph: '👪' },
  { id: 'symbol-check', category: 'symbol', label: '对勾', glyph: '✓' },
  { id: 'symbol-cross', category: 'symbol', label: '叉号', glyph: '✗' },
  { id: 'symbol-exclaim', category: 'symbol', label: '感叹', glyph: '!' },
];

export function listMarkers(category?: MarkerPreset['category']): MarkerPreset[] {
  if (!category) return [...MARKER_PRESETS];
  return MARKER_PRESETS.filter((m) => m.category === category);
}

export function getMarker(id: string): MarkerPreset | undefined {
  return MARKER_PRESETS.find((m) => m.id === id);
}

export function markerGlyph(id: string): string {
  return getMarker(id)?.glyph ?? id;
}

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
  measureGlyph: (glyph: string) => number = defaultGlyphWidth,
): MarkerHitRect[] {
  let ox = originX;
  return markers.map((markerId) => {
    const isPriority = markerId.startsWith('priority-');
    const glyph = markerGlyph(markerId);
    const width = isPriority ? MARKER_HEIGHT : Math.max(MARKER_HEIGHT, measureGlyph(glyph));
    const hit: MarkerHitRect = { markerId, x: ox, y: originY, width, height: MARKER_HEIGHT };
    ox += width + MARKER_GAP;
    return hit;
  });
}

function defaultGlyphWidth(glyph: string): number {
  return Math.max(14, [...glyph].length * 12);
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
