import type { InlineRun } from '../model/types.js';

export function runsToPlain(runs: InlineRun[]): string {
  return runs.map((r) => r.text).join('');
}

export function plainToRuns(text: string): InlineRun[] {
  if (!text) return [{ text: '' }];
  return [{ text }];
}

export function syncTitleFromRuns(runs: InlineRun[]): { title: string; titleRich: InlineRun[] } {
  return { title: runsToPlain(runs), titleRich: runs };
}

export function measureRunWidth(run: InlineRun, baseFontSize = 14): number {
  const size = run.fontSize ?? baseFontSize;
  const factor = run.bold ? 1.1 : 1;
  let width = 0;
  for (const ch of run.text) {
    width += (ch.charCodeAt(0) > 127 ? size : size * 0.55) * factor;
  }
  return width;
}

/**
 * Width of rich title for autosize. Hard line breaks (`\\n`) start a new line;
 * the result is the widest line — not the sum of all characters as one line.
 */
export function measureRunsWidth(runs: InlineRun[], baseFontSize = 14): number {
  let maxLine = 0;
  let current = 0;
  for (const run of runs) {
    const size = run.fontSize ?? baseFontSize;
    const factor = run.bold ? 1.1 : 1;
    for (const ch of run.text) {
      if (ch === '\n') {
        maxLine = Math.max(maxLine, current);
        current = 0;
        continue;
      }
      current += (ch.charCodeAt(0) > 127 ? size : size * 0.55) * factor;
    }
  }
  return Math.max(maxLine, current);
}

export function mergeRuns(a: InlineRun[], b: InlineRun[]): InlineRun[] {
  return [...a, ...b];
}
