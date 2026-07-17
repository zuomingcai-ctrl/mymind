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

export class TextMeasurer {
  private maxTextWidth: number;
  private charWidthCache = new Map<string, number>();

  constructor(options: TextMeasurerOptions = {}) {
    this.maxTextWidth = options.maxTextWidth ?? MAX_TEXT_WIDTH;
  }

  measureText(text: string): { width: number; height: number; lines: string[] } {
    const lines = this.wrapText(text);
    const lineWidth = Math.max(...lines.map((l) => this.measureLine(l)), MIN_WIDTH - H_PADDING);
    const width = Math.min(lineWidth + H_PADDING, this.maxTextWidth + H_PADDING);
    const height = lines.length * LINE_HEIGHT + V_PADDING;
    return { width: Math.max(width, MIN_WIDTH), height, lines };
  }

  measureTopic(topic: Topic, _depth: number): Size {
    const text = topic.titleRich ? runsToPlain(topic.titleRich) : topic.title || ' ';
    const textWidth = topic.titleRich
      ? measureRunsWidth(topic.titleRich) + H_PADDING
      : this.measureText(text).width;
    const textHeight = this.measureText(text).height;
    let totalHeight = textHeight;
    let totalWidth = Math.max(textWidth, MIN_WIDTH);

    const markersW = estimateMarkersWidth(topic.markers.length);
    const accessoriesW = estimateAccessoriesWidth(listTopicAccessories(topic));
    const sideExtra =
      (markersW ? markersW + TITLE_ACCESSORY_GAP : 0) +
      (accessoriesW ? accessoriesW + TITLE_ACCESSORY_GAP : 0);
    totalWidth += sideExtra;

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

    return { width: totalWidth, height: totalHeight };
  }

  private wrapText(text: string): string[] {
    if (!text) return [''];
    const words = text.split('');
    const lines: string[] = [];
    let current = '';

    for (const ch of words) {
      const test = current + ch;
      if (this.measureLine(test) > this.maxTextWidth && current) {
        lines.push(current);
        current = ch;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  }

  private measureLine(text: string): number {
    if (this.charWidthCache.has(text)) {
      return this.charWidthCache.get(text)!;
    }
    // Approximate CJK width as 14px, Latin as 8px
    let width = 0;
    for (const ch of text) {
      width += ch.charCodeAt(0) > 127 ? 14 : 8;
    }
    this.charWidthCache.set(text, width);
    return width;
  }
}

export function createMeasureFn(measurer = new TextMeasurer()): (topic: Topic, depth: number) => Size {
  return (topic, depth) => measurer.measureTopic(topic, depth);
}
