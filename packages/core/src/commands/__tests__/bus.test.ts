// covers: ED-012
import { describe, it, expect } from 'vitest';
import { createDocument } from '../../model/factory.js';
import { CommandBus } from '../bus.js';
import { AddTopicCommand, UpdateTopicTitleCommand } from '../topic-commands.js';

describe('CommandBus', () => {
  it('execute changes state', () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    const bus = new CommandBus(doc);

    const result = bus.dispatch(new AddTopicCommand(sheetId, rootId, 'child'));
    expect(result.sheets[0]!.rootTopic.children).toHaveLength(1);
    expect(result.sheets[0]!.rootTopic.children[0]!.title).toBe('child');
  });

  it('undo restores state', () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    const bus = new CommandBus(doc);

    bus.dispatch(new AddTopicCommand(sheetId, rootId, 'child'));
    bus.undo();
    expect(bus.getDocument().sheets[0]!.rootTopic.children).toHaveLength(0);
  });

  it('redo works after undo', () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    const bus = new CommandBus(doc);

    bus.dispatch(new AddTopicCommand(sheetId, rootId, 'child'));
    bus.undo();
    bus.redo();
    expect(bus.getDocument().sheets[0]!.rootTopic.children).toHaveLength(1);
  });

  it('respects stack limit of 100', () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    const bus = new CommandBus(doc);

    for (let i = 0; i < 105; i++) {
      bus.dispatch(new AddTopicCommand(sheetId, rootId, `child-${i}`));
    }
    expect(bus.getUndoStackSize()).toBeLessThanOrEqual(100);
  });

  it('merges consecutive title updates', () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    const bus = new CommandBus(doc);

    bus.dispatch(new UpdateTopicTitleCommand(sheetId, rootId, 'A'));
    bus.dispatch(new UpdateTopicTitleCommand(sheetId, rootId, 'AB'));
    expect(bus.getUndoStackSize()).toBe(1);
    bus.undo();
    expect(bus.getDocument().sheets[0]!.rootTopic.title).toBe('中心主题');
  });
});
