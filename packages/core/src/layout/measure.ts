import type { Topic, Size, Theme } from '../model/types.js';
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
/** Baseline font size used by legacy approximate widths (CJK=14, Latin=8). */
const BASE_FONT_SIZE = 14;
const LINE_HEIGHT_AT_BASE = 20;
/** Default: no wrap cap — topic width follows text (autosize / 「适合」). */
const DEFAULT_MAX_TEXT_WIDTH = Number.POSITIVE_INFINITY;

export type FontSizeResolver = (topic: Topic, depth: number) => number;

export interface TextMeasurerOptions {
  font?: string;
  /** When finite, plain text wraps to this content width. Default: unlimited (autosize). */
  maxTextWidth?: number;
  /** Effective font size for layout (topic override / theme by depth). Default: 14. */
  resolveFontSize?: FontSizeResolver;
}

/** Approximate CJK/Latin character widths (matches TextMeasurer / canvas wrap). */
export function approximateLineWidth(text: string, fontSize = BASE_FONT_SIZE): number {
  const cjk = fontSize;
  const latin = fontSize * (8 / BASE_FONT_SIZE);
  let width = 0;
  for (const ch of text) {
    width += ch.charCodeAt(0) > 127 ? cjk : latin;
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

/** Theme level font size by depth; topic.style.fontSize wins when set. */
export function themeFontSizeResolver(theme: Theme): FontSizeResolver {
  return (topic, depth) => {
    if (topic.style?.fontSize && topic.style.fontSize > 0) return topic.style.fontSize;
    const level =
      depth <= 0
        ? theme.colors.centralTopic
        : depth === 1
          ? theme.colors.mainTopic
          : theme.colors.subTopic;
    return level.fontSize ?? BASE_FONT_SIZE;
  };
}

export class TextMeasurer {
  private maxTextWidth: number;
  private resolveFontSize: FontSizeResolver;
  private charWidthCache = new Map<string, number>();

  constructor(options: TextMeasurerOptions = {}) {
    this.maxTextWidth = options.maxTextWidth ?? DEFAULT_MAX_TEXT_WIDTH;
    this.resolveFontSize =
      options.resolveFontSize ??
      ((topic) =>
        topic.style?.fontSize && topic.style.fontSize > 0
          ? topic.style.fontSize
          : BASE_FONT_SIZE);
  }

  measureText(
    text: string,
    maxTextWidth = this.maxTextWidth,
    fontSize = BASE_FONT_SIZE,
  ): { width: number; height: number; lines: string[] } {
    const lines = wrapPlainText(text, maxTextWidth, (s) => this.measureLine(s, fontSize));
    const lineWidth = Math.max(...lines.map((l) => this.measureLine(l, fontSize)), 0);
    const padded = lineWidth + H_PADDING;
    const width = Number.isFinite(maxTextWidth)
      ? Math.min(padded, maxTextWidth + H_PADDING)
      : padded;
    const lineHeight = Math.max(16, (LINE_HEIGHT_AT_BASE / BASE_FONT_SIZE) * fontSize);
    const height = lines.length * lineHeight + V_PADDING;
    return { width: Math.max(width, MIN_WIDTH), height, lines };
  }

  measureTopic(topic: Topic, depth: number): Size {
    const text = topic.titleRich ? runsToPlain(topic.titleRich) : topic.title || ' ';
    const fontSize = this.resolveFontSize(topic, depth);
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
      // Rich width respects hard breaks; scale with effective font size.
      const richW = measureRunsWidth(topic.titleRich, fontSize) + H_PADDING;
      const plain = this.measureText(text, contentMax, fontSize);
      textBlock = { width: Math.max(richW, MIN_WIDTH), height: plain.height, lines: plain.lines };
    } else {
      textBlock = this.measureText(text, contentMax, fontSize);
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

  private measureLine(text: string, fontSize: number): number {
    const key = `${fontSize}\0${text}`;
    if (this.charWidthCache.has(key)) {
      return this.charWidthCache.get(key)!;
    }
    const width = approximateLineWidth(text, fontSize);
    this.charWidthCache.set(key, width);
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

export function createMeasureFn(
  measurerOrOptions: TextMeasurer | TextMeasurerOptions = new TextMeasurer(),
): (topic: Topic, depth: number) => Size {
  const measurer =
    measurerOrOptions instanceof TextMeasurer
      ? measurerOrOptions
      : new TextMeasurer(measurerOrOptions);
  return (topic, depth) => measurer.measureTopic(topic, depth);
}
