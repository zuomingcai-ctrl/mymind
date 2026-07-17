// covers: ED-010
import { describe, it, expect } from 'vitest';
import { createTopic } from '@mymind/core';
import {
  computeNextSelection,
  getSiblingRange,
  type SelectionModifiers,
} from '../useSelection';

function tree() {
  const a = createTopic('a');
  const b = createTopic('b');
  const c = createTopic('c');
  const d = createTopic('d');
  const root = createTopic('root');
  root.children = [a, b, c, d];
  return { root, a, b, c, d };
}

describe('useSelection / ED-010', () => {
  it('plain click replaces selection', () => {
    const { root, a, b } = tree();
    const next = computeNextSelection([a.id], b.id, root, {});
    expect(next).toEqual([b.id]);
  });

  it('blank click clears selection', () => {
    const { root, a } = tree();
    expect(computeNextSelection([a.id], null, root, {})).toEqual([]);
  });

  it('Ctrl/Meta click toggles topic in selection', () => {
    const { root, a, b } = tree();
    const mods: SelectionModifiers = { ctrlKey: true };
    expect(computeNextSelection([a.id], b.id, root, mods)).toEqual([a.id, b.id]);
    expect(computeNextSelection([a.id, b.id], a.id, root, mods)).toEqual([b.id]);
    expect(computeNextSelection([a.id], a.id, root, { metaKey: true })).toEqual([]);
  });

  it('getSiblingRange returns inclusive contiguous siblings', () => {
    const { root, a, b, c, d } = tree();
    expect(getSiblingRange(root, a.id, c.id)).toEqual([a.id, b.id, c.id]);
    expect(getSiblingRange(root, d.id, b.id)).toEqual([b.id, c.id, d.id]);
  });

  it('Shift click selects sibling range from anchor', () => {
    const { root, a, c } = tree();
    const next = computeNextSelection([a.id], c.id, root, { shiftKey: true }, a.id);
    expect(next).toEqual([a.id, root.children[1]!.id, c.id]);
  });

  it('Shift click falls back to replace when not siblings', () => {
    const { root, a } = tree();
    const nested = createTopic('nested');
    a.children = [nested];
    const next = computeNextSelection([root.id], nested.id, root, { shiftKey: true }, root.id);
    expect(next).toEqual([nested.id]);
  });
});
