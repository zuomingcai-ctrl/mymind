// covers: ED-010
import { findParentOfTopic, type Topic } from '@mymind/core';

export type SelectionModifiers = {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
};

/** Inclusive sibling ids between two topics that share the same parent. */
export function getSiblingRange(root: Topic, fromId: string, toId: string): string[] | null {
  if (fromId === toId) return [fromId];

  const fromParent = findParentOfTopic(root, fromId);
  const toParent = findParentOfTopic(root, toId);
  if (!fromParent || !toParent || fromParent.id !== toParent.id) return null;

  const siblings = fromParent.children;
  const fromIdx = siblings.findIndex((c) => c.id === fromId);
  const toIdx = siblings.findIndex((c) => c.id === toId);
  if (fromIdx < 0 || toIdx < 0) return null;

  const start = Math.min(fromIdx, toIdx);
  const end = Math.max(fromIdx, toIdx);
  return siblings.slice(start, end + 1).map((c) => c.id);
}

/**
 * Resolve next selection after a topic click.
 * - plain: replace
 * - Ctrl/Meta: toggle
 * - Shift: contiguous siblings from anchor (falls back to replace)
 */
export function computeNextSelection(
  current: string[],
  clickedId: string | null,
  root: Topic,
  mods: SelectionModifiers,
  anchorId: string | null = current[0] ?? null,
): string[] {
  if (clickedId === null) return [];

  const additive = !!(mods.ctrlKey || mods.metaKey);
  if (additive) {
    if (current.includes(clickedId)) {
      return current.filter((id) => id !== clickedId);
    }
    return [...current, clickedId];
  }

  if (mods.shiftKey && anchorId) {
    const range = getSiblingRange(root, anchorId, clickedId);
    if (range) return range;
  }

  return [clickedId];
}

/** Whether Shift/Ctrl should update the selection anchor. */
export function shouldUpdateSelectionAnchor(mods: SelectionModifiers): boolean {
  return !mods.shiftKey && !(mods.ctrlKey || mods.metaKey);
}
