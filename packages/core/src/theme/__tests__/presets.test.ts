// covers: TH-001
import { describe, it, expect } from 'vitest';
import { listThemes } from '../presets.js';
import { getTheme } from '../custom.js';

describe('themes', () => {
  it('lists at least 10 themes', () => {
    expect(listThemes().length).toBeGreaterThanOrEqual(10);
  });

  it('getTheme returns default for unknown id', () => {
    expect(getTheme('unknown').id).toBe('default');
  });
});
