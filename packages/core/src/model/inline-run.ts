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

export function measureRunsWidth(runs: InlineRun[], baseFontSize = 14): number {
  return runs.reduce((sum, r) => sum + measureRunWidth(r, baseFontSize), 0);
}

export function mergeRuns(a: InlineRun[], b: InlineRun[]): InlineRun[] {
  return [...a, ...b];
}
