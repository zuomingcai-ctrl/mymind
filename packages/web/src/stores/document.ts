import { defineStore } from 'pinia';
import {
  CommandBus,
  createDocumentWithVariant,
  type MindMapDocument,
} from '@mymind/core';

export const useDocumentStore = defineStore('document', {
  state: () => ({
    document: null as MindMapDocument | null,
    activeSheetId: '' as string,
    selection: [] as string[],
    commandBus: null as CommandBus | null,
  }),

  getters: {
    activeSheet(state) {
      return state.document?.sheets.find((s) => s.id === state.activeSheetId) ?? null;
    },
    selectedId(state): string | null {
      return state.selection[0] ?? null;
    },
  },

  actions: {
    newDocument(variantId = 'mindmap-balanced-classic') {
      const doc = createDocumentWithVariant(variantId);
      this.document = doc;
      this.activeSheetId = doc.sheets[0]!.id;
      this.selection = [doc.sheets[0]!.rootTopic.id];
      this.commandBus = new CommandBus(doc);
    },

    syncFromBus() {
      if (this.commandBus) {
        this.document = this.commandBus.getDocument();
      }
    },

    setSelection(ids: string[]) {
      this.selection = ids;
    },

    setActiveSheet(sheetId: string) {
      this.activeSheetId = sheetId;
      const sheet = this.document?.sheets.find((s) => s.id === sheetId);
      if (sheet) this.selection = [sheet.rootTopic.id];
    },
  },
});
