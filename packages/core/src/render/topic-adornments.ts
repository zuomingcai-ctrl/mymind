import type { Label, Topic } from '../model/types.js';
import { markerGlyph } from '../markers/presets.js';

/** Horizontal padding inside topic box */
export const TOPIC_PAD_X = 8;
/** Vertical padding around title row */
export const TOPIC_PAD_Y = 6;
export const MARKER_SIZE = 16;
export const MARKER_GAP = 3;
export const ACCESSORY_SIZE = 14;
export const ACCESSORY_GAP = 3;
export const LABEL_ROW_H = 20;
export const LABEL_CHIP_H = 16;
export const LABEL_CHIP_PAD_X = 6;
export const LABEL_CHIP_GAP = 4;
export const TITLE_ACCESSORY_GAP = 6;

export type TopicAccessoryKind = 'note' | 'link' | 'attachment' | 'comment' | 'audio';

export interface TopicContentLayout {
  titleBandHeight: number;
  labelRowHeight: number;
  markersOrigin: { x: number; y: number };
  titleX: number;
  accessoriesOrigin: { x: number; y: number };
  labelsOrigin: { x: number; y: number };
  markersWidth: number;
  accessoriesWidth: number;
}

/** Icons shown to the right of the title (XMind-style). */
export function listTopicAccessories(topic: {
  note?: string;
  hyperlink?: unknown;
  attachments?: unknown[];
  comments?: unknown[];
  audio?: unknown;
}): TopicAccessoryKind[] {
  const kinds: TopicAccessoryKind[] = [];
  if (topic.note?.trim()) kinds.push('note');
  if (topic.hyperlink) kinds.push('link');
  if ((topic.attachments?.length ?? 0) > 0) kinds.push('attachment');
  if ((topic.comments?.length ?? 0) > 0) kinds.push('comment');
  if (topic.audio) kinds.push('audio');
  return kinds;
}

export function estimateMarkersWidth(markerCount: number): number {
  if (markerCount <= 0) return 0;
  return markerCount * MARKER_SIZE + (markerCount - 1) * MARKER_GAP;
}

export function estimateAccessoriesWidth(kinds: TopicAccessoryKind[]): number {
  if (!kinds.length) return 0;
  return kinds.length * ACCESSORY_SIZE + (kinds.length - 1) * ACCESSORY_GAP;
}

export function estimateLabelChipWidth(text: string): number {
  let w = 0;
  for (const ch of text) {
    w += ch.charCodeAt(0) > 127 ? 12 : 7;
  }
  return Math.max(20, w + LABEL_CHIP_PAD_X * 2);
}

export function estimateLabelsRowWidth(labels: Label[]): number {
  if (!labels.length) return 0;
  return (
    labels.reduce((sum, l) => sum + estimateLabelChipWidth(l.text), 0) +
    (labels.length - 1) * LABEL_CHIP_GAP
  );
}

/** Extra size beyond plain title for markers / accessories / labels. */
export function topicAdornmentExtras(topic: Topic): { width: number; height: number } {
  const accessories = listTopicAccessories(topic);
  const markersW = estimateMarkersWidth(topic.markers.length);
  const accessoriesW = estimateAccessoriesWidth(accessories);
  const sideExtra =
    (markersW ? markersW + TITLE_ACCESSORY_GAP : 0) +
    (accessoriesW ? accessoriesW + TITLE_ACCESSORY_GAP : 0);
  const labelsW = estimateLabelsRowWidth(topic.labels);
  const labelsH = topic.labels.length > 0 ? LABEL_ROW_H : 0;
  return {
    width: Math.max(sideExtra, labelsW > 0 ? labelsW - 40 : 0),
    height: labelsH,
  };
}

/**
 * Content layout inside a laid-out topic node (world coords).
 * Title band is the upper region; labels sit in a row below when present.
 */
export function layoutTopicContent(
  node: { x: number; y: number; width: number; height: number },
  topic: {
    markers?: string[];
    labels?: Label[];
    note?: string;
    hyperlink?: unknown;
    attachments?: unknown[];
    comments?: unknown[];
    audio?: unknown;
    todos?: unknown[];
  },
): TopicContentLayout {
  const markers = topic.markers ?? [];
  const labels = topic.labels ?? [];
  const accessories = listTopicAccessories(topic);
  const labelRowHeight = labels.length > 0 ? LABEL_ROW_H : 0;
  const todoExtra = (topic.todos?.length ?? 0) > 0 ? 14 : 0;
  const titleBandHeight = Math.max(20, node.height - labelRowHeight - todoExtra);

  const markersWidth = estimateMarkersWidth(markers.length);
  const accessoriesWidth = estimateAccessoriesWidth(accessories);

  const markersOrigin = {
    x: node.x + TOPIC_PAD_X,
    y: node.y + (titleBandHeight - MARKER_SIZE) / 2,
  };
  const titleX =
    node.x +
    TOPIC_PAD_X +
    (markersWidth ? markersWidth + TITLE_ACCESSORY_GAP : 0);
  const accessoriesOrigin = {
    x: node.x + node.width - TOPIC_PAD_X - accessoriesWidth,
    y: node.y + (titleBandHeight - ACCESSORY_SIZE) / 2,
  };
  const labelsOrigin = {
    x: node.x + TOPIC_PAD_X,
    y: node.y + titleBandHeight + (LABEL_ROW_H - LABEL_CHIP_H) / 2,
  };

  return {
    titleBandHeight,
    labelRowHeight,
    markersOrigin,
    titleX,
    accessoriesOrigin,
    labelsOrigin,
    markersWidth,
    accessoriesWidth,
  };
}

/** Priority marker palette (XMind-like). */
export const PRIORITY_COLORS: Record<string, string> = {
  'priority-1': '#E74C3C',
  'priority-2': '#E67E22',
  'priority-3': '#F1C40F',
  'priority-4': '#2ECC71',
  'priority-5': '#3498DB',
  'priority-6': '#9B59B6',
  'priority-7': '#95A5A6',
};

export function accessoryGlyph(kind: TopicAccessoryKind): string {
  switch (kind) {
    case 'note':
      return '⋯';
    case 'link':
      return '🔗';
    case 'attachment':
      return '📎';
    case 'comment':
      return '💬';
    case 'audio':
      return '🔊';
  }
}

export function defaultGlyphWidth(glyph: string): number {
  return Math.max(MARKER_SIZE, [...glyph].length * 10);
}

/** World-space hit boxes for markers laid out inside the title band (left of title). */
export function layoutInnerMarkerHits(
  markers: string[],
  originX: number,
  originY: number,
  measureGlyph: (glyph: string) => number = defaultGlyphWidth,
): Array<{ markerId: string; x: number; y: number; width: number; height: number }> {
  let ox = originX;
  return markers.map((markerId) => {
    const isPriority = markerId.startsWith('priority-');
    const glyph = markerGlyph(markerId);
    const width = isPriority ? MARKER_SIZE : Math.max(MARKER_SIZE, measureGlyph(glyph));
    const hit = { markerId, x: ox, y: originY, width, height: MARKER_SIZE };
    ox += width + MARKER_GAP;
    return hit;
  });
}
