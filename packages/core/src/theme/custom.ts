import type { Theme } from '../model/types.js';
import { BUILTIN_THEMES } from './presets.js';

const STORAGE_KEY = 'mymind-custom-themes';

export function loadCustomThemes(): Theme[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Theme[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomTheme(theme: Theme): void {
  if (typeof localStorage === 'undefined') return;
  const themes = loadCustomThemes().filter((t) => t.id !== theme.id);
  themes.push(theme);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

export function listAllThemes(): Theme[] {
  return [...BUILTIN_THEMES, ...loadCustomThemes()];
}
