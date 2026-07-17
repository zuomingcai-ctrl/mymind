/** Sticker / illustration asset catalog (SK-001/002) */

export interface DecorationAsset {
  id: string;
  type: 'sticker' | 'illustration';
  label: string;
  glyph: string;
  defaultWidth: number;
  defaultHeight: number;
}

export const DECORATION_ASSETS: DecorationAsset[] = [
  { id: 'star', type: 'sticker', label: '星星', glyph: '⭐', defaultWidth: 48, defaultHeight: 48 },
  { id: 'heart', type: 'sticker', label: '爱心', glyph: '❤️', defaultWidth: 48, defaultHeight: 48 },
  { id: 'fire', type: 'sticker', label: '火焰', glyph: '🔥', defaultWidth: 48, defaultHeight: 48 },
  { id: 'idea', type: 'sticker', label: '想法', glyph: '💡', defaultWidth: 48, defaultHeight: 48 },
  { id: 'check', type: 'sticker', label: '完成', glyph: '✅', defaultWidth: 48, defaultHeight: 48 },
  { id: 'pin', type: 'sticker', label: '图钉', glyph: '📌', defaultWidth: 40, defaultHeight: 40 },
  { id: 'rocket', type: 'sticker', label: '火箭', glyph: '🚀', defaultWidth: 48, defaultHeight: 48 },
  { id: 'trophy', type: 'sticker', label: '奖杯', glyph: '🏆', defaultWidth: 48, defaultHeight: 48 },
  { id: 'sketch-1', type: 'illustration', label: '手绘框', glyph: '🖼️', defaultWidth: 120, defaultHeight: 90 },
  { id: 'sketch-2', type: 'illustration', label: '云朵', glyph: '☁️', defaultWidth: 140, defaultHeight: 80 },
  { id: 'sketch-3', type: 'illustration', label: '箭头', glyph: '➡️', defaultWidth: 100, defaultHeight: 40 },
  { id: 'sketch-4', type: 'illustration', label: '气泡', glyph: '💬', defaultWidth: 110, defaultHeight: 70 },
  { id: 'sketch-5', type: 'illustration', label: '便签', glyph: '📝', defaultWidth: 100, defaultHeight: 100 },
];

export function listDecorationAssets(type?: 'sticker' | 'illustration'): DecorationAsset[] {
  if (!type) return [...DECORATION_ASSETS];
  return DECORATION_ASSETS.filter((a) => a.type === type);
}

export function getDecorationAsset(id: string): DecorationAsset | undefined {
  return DECORATION_ASSETS.find((a) => a.id === id);
}
