import { computed } from 'vue';
import { useDocumentStore } from '../stores/document';
import type { Command } from '@mymind/core';

export function useDocument() {
  const store = useDocumentStore();

  const document = computed(() => store.document);
  const mindDocument = document;
  const activeSheet = computed(() => store.activeSheet);
  const selectedId = computed(() => store.selectedId);
  const selection = computed(() => store.selection);

  function dispatch(command: Command) {
    store.commandBus?.dispatch(command);
    store.syncFromBus();
  }

  function undo() {
    store.commandBus?.undo();
    store.syncFromBus();
  }

  function redo() {
    store.commandBus?.redo();
    store.syncFromBus();
  }

  return {
    document,
    mindDocument,
    activeSheet,
    selectedId,
    selection,
    dispatch,
    undo,
    redo,
    canUndo: computed(() => store.commandBus?.canUndo() ?? false),
    canRedo: computed(() => store.commandBus?.canRedo() ?? false),
    newDocument: store.newDocument.bind(store),
    setSelection: store.setSelection.bind(store),
  };
}
