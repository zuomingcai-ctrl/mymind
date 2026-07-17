import { ref } from 'vue';
import type { ClipboardPayload, Topic } from '@mymind/core';
import { PasteTopicsCommand } from '@mymind/core';

const clipboard = ref<ClipboardPayload | null>(null);

function extractTopicTree(root: Topic, id: string): Topic | null {
  if (root.id === id) return JSON.parse(JSON.stringify(root)) as Topic;
  for (const child of root.children) {
    const found = extractTopicTree(child, id);
    if (found) return found;
  }
  return null;
}

export function useClipboard() {
  function copyTopic(sheetId: string, root: Topic, topicId: string): boolean {
    if (root.id === topicId) return false;
    const topic = extractTopicTree(root, topicId);
    if (!topic) return false;
    clipboard.value = {
      format: 'mymind/topics/v1',
      sourceSheetId: sheetId,
      topics: [topic],
    };
    return true;
  }

  function canPaste(): boolean {
    return clipboard.value !== null && clipboard.value.topics.length > 0;
  }

  function buildPasteCommand(
    sheetId: string,
    parentId: string,
  ): PasteTopicsCommand | null {
    if (!clipboard.value) return null;
    return new PasteTopicsCommand(sheetId, parentId, clipboard.value);
  }

  function clear() {
    clipboard.value = null;
  }

  return { copyTopic, canPaste, buildPasteCommand, clear };
}

export function isEditableTarget(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.classList.contains('keyboard-capture')) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}
