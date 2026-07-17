import { describe, it, expect } from 'vitest';
import { computeSnap } from '../align-snap';

describe('align-snap CV-006', () => {
  it('snaps left edges within threshold', () => {
    const result = computeSnap(
      { x: 102, y: 50, width: 40, height: 20 },
      [{ x: 100, y: 200, width: 40, height: 20 }],
      6,
    );
    expect(result.x).toBe(100);
    expect(result.guides.some((g) => g.orientation === 'v' && g.pos === 100)).toBe(true);
  });

  it('does not snap beyond threshold', () => {
    const result = computeSnap(
      { x: 120, y: 50, width: 40, height: 20 },
      [{ x: 100, y: 200, width: 40, height: 20 }],
      6,
    );
    expect(result.x).toBe(120);
    expect(result.guides).toHaveLength(0);
  });
});
