import type { TodoItem } from '../model/types.js';

const PROGRESS_MARKERS = [
  'progress-0',
  'progress-12',
  'progress-25',
  'progress-50',
  'progress-75',
  'progress-88',
  'progress-100',
] as const;

/** TD-005: map todo completion ratio to a progress marker id. */
export function todoProgressMarkerId(todos: TodoItem[]): (typeof PROGRESS_MARKERS)[number] {
  if (todos.length === 0) return 'progress-0';
  const done = todos.filter((t) => t.checked).length;
  const ratio = done / todos.length;
  if (ratio <= 0) return 'progress-0';
  if (ratio < 0.1875) return 'progress-12';
  if (ratio < 0.375) return 'progress-25';
  if (ratio < 0.625) return 'progress-50';
  if (ratio < 0.8125) return 'progress-75';
  if (ratio < 1) return 'progress-88';
  return 'progress-100';
}

export function syncProgressMarkers(markers: string[], todos: TodoItem[]): string[] {
  const without = markers.filter((m) => !PROGRESS_MARKERS.includes(m as (typeof PROGRESS_MARKERS)[number]));
  if (todos.length === 0) return without;
  return [...without, todoProgressMarkerId(todos)];
}

export { PROGRESS_MARKERS };
