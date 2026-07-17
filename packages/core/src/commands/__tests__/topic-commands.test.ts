// covers: ED-002, ED-003, ED-005, ED-009, TE-001
import { describe, it, expect } from 'vitest';
import { createDocument } from '../../model/factory.js';
import {
  AddTopicCommand,
  DeleteTopicCommand,
  UpdateTopicTitleCommand,
  ToggleCollapseCommand,
} from '../topic-commands.js';

describe('Topic commands', () => {
  const setup = () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    return { doc, sheetId, rootId };
  };

  it('AddTopicCommand adds child to parent', () => {
    const { doc, sheetId, rootId } = setup();
    const result = new AddTopicCommand(sheetId, rootId, 'child').execute(doc);
    expect(result.sheets[0]!.rootTopic.children[0]!.title).toBe('child');
  });

  it('AddTopicCommand adds sibling at index', () => {
    const { doc, sheetId, rootId } = setup();
    let d = new AddTopicCommand(sheetId, rootId, 'first').execute(doc);
    const childId = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddTopicCommand(sheetId, childId, 'sibling', 0, true).execute(d);
    expect(d.sheets[0]!.rootTopic.children).toHaveLength(2);
    expect(d.sheets[0]!.rootTopic.children[0]!.title).toBe('sibling');
  });

  it('DeleteTopicCommand removes subtree', () => {
    const { doc, sheetId, rootId } = setup();
    let d = new AddTopicCommand(sheetId, rootId, 'child').execute(doc);
    const childId = d.sheets[0]!.rootTopic.children[0]!.id;
    d = new AddTopicCommand(sheetId, childId, 'grandchild').execute(d);
    const cmd = new DeleteTopicCommand(sheetId, childId);
    d = cmd.execute(d);
    expect(d.sheets[0]!.rootTopic.children).toHaveLength(0);
    d = cmd.undo(d);
    expect(d.sheets[0]!.rootTopic.children[0]!.children[0]!.title).toBe('grandchild');
  });

  it('DeleteTopicCommand cannot delete root', () => {
    const { doc, sheetId, rootId } = setup();
    expect(() => new DeleteTopicCommand(sheetId, rootId).execute(doc)).toThrow();
  });

  it('UpdateTopicTitleCommand updates title', () => {
    const { doc, sheetId, rootId } = setup();
    const cmd = new UpdateTopicTitleCommand(sheetId, rootId, 'New Title', '中心主题');
    const d = cmd.execute(doc);
    expect(d.sheets[0]!.rootTopic.title).toBe('New Title');
    expect(cmd.undo(d).sheets[0]!.rootTopic.title).toBe('中心主题');
  });

  it('ToggleCollapseCommand toggles collapsed', () => {
    const { doc, sheetId, rootId } = setup();
    let d = new AddTopicCommand(sheetId, rootId, 'child').execute(doc);
    const cmd = new ToggleCollapseCommand(sheetId, rootId);
    d = cmd.execute(d);
    expect(d.sheets[0]!.rootTopic.collapsed).toBe(true);
    d = cmd.undo(d);
    expect(d.sheets[0]!.rootTopic.collapsed).toBe(false);
  });
});
