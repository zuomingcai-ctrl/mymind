import { ref } from 'vue';
import type { InsertActionId } from '../insert/insert-items';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  topicId: string | null;
}

export function useContextMenu() {
  const menu = ref<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    topicId: null,
  });

  function openAt(x: number, y: number, topicId: string | null) {
    menu.value = { visible: true, x, y, topicId };
  }

  function close() {
    menu.value = { ...menu.value, visible: false, topicId: null };
  }

  return { menu, openAt, close };
}

export type ContextMenuInsertHandler = (id: InsertActionId) => void;
