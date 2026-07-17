import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('desktop package', () => {
  it('tauri config exists', () => {
    const conf = resolve(process.cwd(), 'packages/desktop/src-tauri/tauri.conf.json');
    expect(existsSync(conf)).toBe(true);
  });
});
