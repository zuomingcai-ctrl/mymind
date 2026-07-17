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
    isDirty: false,
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
      this.loadDocument(doc);
    },

    /** Replace the current document (single-document mode). */
    loadDocument(doc: MindMapDocument) {
      const sheet = doc.sheets[0]!;
      this.document = doc;
      this.activeSheetId = sheet.id;
      this.selection = [sheet.rootTopic.id];
      this.commandBus = new CommandBus(doc);
      this.isDirty = false;
    },

    closeDocument() {
      this.document = null;
      this.activeSheetId = '';
      this.selection = [];
      this.commandBus = null;
      this.isDirty = false;
    },

    syncFromBus() {
      if (this.commandBus) {
        this.document = this.commandBus.getDocument();
        this.isDirty = true;
      }
    },

    markClean() {
      this.isDirty = false;
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
