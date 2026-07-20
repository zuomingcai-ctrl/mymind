import type { CanvasSettings, Theme } from '../model/types.js';
import { generateId } from '../model/factory.js';
import { getTheme } from '../theme/custom.js';

const STORAGE_KEY = 'mymind-canvas-style-templates';

/** Appearance-only template: canvas settings + theme, no topic content. */
export interface CanvasStyleTemplate {
  id: string;
  name: string;
  createdAt: string;
  canvasSettings: CanvasSettings;
  theme: Theme;
}

/** JSON clone — works with Vue reactive proxies (structuredClone does not). */
function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function listCanvasStyleTemplates(): CanvasStyleTemplate[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as CanvasStyleTemplate[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persist(list: CanvasStyleTemplate[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function saveCanvasStyleTemplate(template: CanvasStyleTemplate): void {
  const list = listCanvasStyleTemplates().filter((t) => t.id !== template.id);
  list.unshift(template);
  persist(list);
}

export function deleteCanvasStyleTemplate(id: string): void {
  persist(listCanvasStyleTemplates().filter((t) => t.id !== id));
}

/** Snapshot current sheet appearance into a named template. */
export function captureCanvasStyleTemplate(
  canvasSettings: CanvasSettings,
  name: string,
): CanvasStyleTemplate {
  return {
    id: generateId(),
    name,
    createdAt: new Date().toISOString(),
    canvasSettings: cloneJson(canvasSettings),
    theme: cloneJson(getTheme(canvasSettings.themeId)),
  };
}
