import type { Topic, Size } from '../model/types.js';
import { runsToPlain, measureRunsWidth } from '../model/inline-run.js';
import { equationExtraHeight } from '../render/equation.js';
import {
  estimateAccessoriesWidth,
  estimateLabelsRowWidth,
  estimateMarkersWidth,
  listTopicAccessories,
  LABEL_ROW_H,
  TITLE_ACCESSORY_GAP,
  TOPIC_PAD_X,
} from '../render/topic-adornments.js';

const H_PADDING = 24;
const V_PADDING = 12;
const MIN_WIDTH = 80;
const LINE_HEIGHT = 20;
const MAX_TEXT_WIDTH = 200;

export interface TextMeasurerOptions {
  font?: string;
  maxTextWidth?: number;
}

/** Approximate CJK/Latin character widths (matches TextMeasurer). */
export function approximateLineWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    width += ch.charCodeAt(0) > 127 ? 14 : 8;
  }
  return width;
}

/** Wrap plain text to fit `maxWidth` (character-based approximation). */
export function wrapPlainText(
  text: string,
  maxWidth: number,
  measureLine: (s: string) => number = approximateLineWidth,
): string[] {
  if (!text) return [''];
  const limit = Math.max(8, maxWidth);
  const lines: string[] = [];
  let current = '';

  for (const ch of text) {
    if (ch === '\n') {
      lines.push(current);
      current = '';
      continue;
    }
    const test = current + ch;
    if (measureLine(test) > limit && current) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

export class TextMeasurer {
  private maxTextWidth: number;
  private charWidthCache = new Map<string, number>();

  constructor(options: TextMeasurerOptions = {}) {
    this.maxTextWidth = options.maxTextWidth ?? MAX_TEXT_WIDTH;
  }

  measureText(
    text: string,
    maxTextWidth = this.maxTextWidth,
  ): { width: number; height: number; lines: string[] } {
    const lines = wrapPlainText(text, maxTextWidth, (s) => this.measureLine(s));
    const lineWidth = Math.max(...lines.map((l) => this.measureLine(l)), 0);
    const width = Math.min(lineWidth + H_PADDING, maxTextWidth + H_PADDING);
    const height = lines.length * LINE_HEIGHT + V_PADDING;
    return { width: Math.max(width, MIN_WIDTH), height, lines };
  }

  measureTopic(topic: Topic, _depth: number): Size {
    const text = topic.titleRich ? runsToPlain(topic.titleRich) : topic.title || ' ';
    const fixedWidth = resolveFixedTopicWidth(topic);

    const markersW = estimateMarkersWidth(topic.markers.length);
    const accessoriesW = estimateAccessoriesWidth(listTopicAccessories(topic));
    const sideExtra =
      (markersW ? markersW + TITLE_ACCESSORY_GAP : 0) +
      (accessoriesW ? accessoriesW + TITLE_ACCESSORY_GAP : 0);

    const contentMax = fixedWidth
      ? Math.max(8, fixedWidth - H_PADDING - sideExtra)
      : this.maxTextWidth;

    let textBlock: { width: number; height: number; lines: string[] };
    if (topic.titleRich && !fixedWidth) {
      // Single-line rich text until wrap is implemented per-run
      const richW = measureRunsWidth(topic.titleRich) + H_PADDING;
      const plain = this.measureText(text, contentMax);
      textBlock = { width: Math.max(richW, MIN_WIDTH), height: plain.height, lines: plain.lines };
    } else {
      textBlock = this.measureText(text, contentMax);
    }

    let totalHeight = textBlock.height;
    let totalWidth = fixedWidth ?? Math.max(textBlock.width + sideExtra, MIN_WIDTH);

    if (topic.image) {
      totalWidth = Math.max(totalWidth, topic.image.width + H_PADDING);
      totalHeight += topic.image.height;
    }

    if (topic.labels.length > 0) {
      totalHeight += LABEL_ROW_H;
      totalWidth = Math.max(
        totalWidth,
        estimateLabelsRowWidth(topic.labels) + TOPIC_PAD_X * 2,
      );
    }

    if (topic.todos && topic.todos.length > 0) {
      totalHeight += 16;
    }

    if (topic.equation) {
      totalHeight += equationExtraHeight(topic.equation);
    }

    if (fixedWidth) {
      totalWidth = fixedWidth;
    }

    return { width: totalWidth, height: totalHeight };
  }

  private measureLine(text: string): number {
    if (this.charWidthCache.has(text)) {
      return this.charWidthCache.get(text)!;
    }
    const width = approximateLineWidth(text);
    this.charWidthCache.set(text, width);
    return width;
  }
}

/** Fixed topic box width when widthMode is fixed (or legacy width-only). */
export function resolveFixedTopicWidth(topic: Topic): number | undefined {
  const style = topic.style;
  if (!style?.width || style.width <= 0) return undefined;
  if (style.widthMode === 'auto') return undefined;
  // widthMode undefined + width set → treat as fixed (panel / drag)
  if (style.widthMode === 'fixed' || style.widthMode === undefined) {
    return Math.max(40, style.width);
  }
  return undefined;
}

export function createMeasureFn(measurer = new TextMeasurer()): (topic: Topic, depth: number) => Size {
  return (topic, depth) => measurer.measureTopic(topic, depth);
}
