import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDocumentStore } from '../document';
import { AddTopicCommand } from '@mymind/core';

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

  it('syncFromBus mirrors command changes', () => {
    const store = useDocumentStore();
    store.newDocument();
    const sheetId = store.activeSheetId;
    const rootId = store.document!.sheets[0]!.rootTopic.id;
    store.commandBus!.dispatch(new AddTopicCommand(sheetId, rootId, 'test'));
    store.syncFromBus();
    expect(store.document!.sheets[0]!.rootTopic.children).toHaveLength(1);
  });
});
