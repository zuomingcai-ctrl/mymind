import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDocumentStore } from '../document';
import { AddTopicCommand, createDocumentWithVariant } from '@mymind/core';

describe('document store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('newDocument initializes command bus', () => {
    const store = useDocumentStore();
    store.newDocument();
    expect(store.document).not.toBeNull();
    expect(store.commandBus).not.toBeNull();
    expect(store.activeSheetId).toBeTruthy();
  });

  it('newDocument replaces the previous document', () => {
    const store = useDocumentStore();
    store.newDocument();
    const firstId = store.document!.id;
    store.newDocument();
    expect(store.document!.id).not.toBe(firstId);
  });

  it('closeDocument clears the workspace', () => {
    const store = useDocumentStore();
    store.newDocument();
    store.closeDocument();
    expect(store.document).toBeNull();
    expect(store.commandBus).toBeNull();
    expect(store.activeSheetId).toBe('');
    expect(store.selection).toEqual([]);
  });

  it('loadDocument opens a document in place', () => {
    const store = useDocumentStore();
    const doc = createDocumentWithVariant('mindmap-balanced-classic');
    store.loadDocument(doc);
    expect(store.document!.id).toBe(doc.id);
    expect(store.commandBus).not.toBeNull();
  });

  it('syncFromBus mirrors command changes', () => {
    const store = useDocumentStore();
    store.newDocument();
    const sheetId = store.activeSheetId;
    const rootId = store.document!.sheets[0]!.rootTopic.id;
    store.commandBus!.dispatch(new AddTopicCommand(sheetId, rootId, 'test'));
    store.syncFromBus();
    expect(store.document!.sheets[0]!.rootTopic.children).toHaveLength(1);
  });

  it('tracks dirty state across edits and save', () => {
    const store = useDocumentStore();
    store.newDocument();
    expect(store.isDirty).toBe(false);
    const sheetId = store.activeSheetId;
    const rootId = store.document!.sheets[0]!.rootTopic.id;
    store.commandBus!.dispatch(new AddTopicCommand(sheetId, rootId, 'test'));
    store.syncFromBus();
    expect(store.isDirty).toBe(true);
    store.markClean();
    expect(store.isDirty).toBe(false);
  });
});
