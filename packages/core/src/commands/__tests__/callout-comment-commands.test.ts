import { describe, it, expect } from 'vitest';
import { createDocument } from '../../model/factory.js';
import {
  AddCalloutCommand,
  UpdateCalloutCommand,
  DeleteCalloutCommand,
  AddCommentCommand,
  UpdateTaskCommand,
} from '../callout-comment-commands.js';
import { createDefaultLayoutRegistry } from '../../layout/registry.js';
import { createMeasureFn } from '../../layout/measure.js';

describe('callout / comment / task commands', () => {
  it('AddCalloutCommand attaches callout and layouts bubble', () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    const d = new AddCalloutCommand(sheetId, rootId, '提示').execute(doc);
    expect(d.sheets[0]!.rootTopic.callout?.text).toBe('提示');
    const layout = createDefaultLayoutRegistry().layout(d.sheets[0]!, createMeasureFn());
    expect(layout.extraShapes.some((s) => s.type === 'callout')).toBe(true);
  });

  it('UpdateCalloutCommand and DeleteCalloutCommand roundtrip', () => {
    let doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    doc = new AddCalloutCommand(sheetId, rootId).execute(doc);
    doc = new UpdateCalloutCommand(sheetId, rootId, { text: '已改' }).execute(doc);
    expect(doc.sheets[0]!.rootTopic.callout?.text).toBe('已改');
    doc = new DeleteCalloutCommand(sheetId, rootId).execute(doc);
    expect(doc.sheets[0]!.rootTopic.callout).toBeUndefined();
  });

  it('AddCommentCommand appends local comment', () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    const d = new AddCommentCommand(sheetId, rootId, '本地评论').execute(doc);
    expect(d.sheets[0]!.rootTopic.comments).toHaveLength(1);
    expect(d.sheets[0]!.rootTopic.comments![0]!.text).toBe('本地评论');
  });

  it('UpdateTaskCommand sets task fields', () => {
    const doc = createDocument();
    const sheetId = doc.sheets[0]!.id;
    const rootId = doc.sheets[0]!.rootTopic.id;
    const d = new UpdateTaskCommand(sheetId, rootId, {
      progress: 25,
      priority: 'high',
      assignee: 'Alice',
    }).execute(doc);
    expect(d.sheets[0]!.rootTopic.task?.priority).toBe('high');
    expect(d.sheets[0]!.rootTopic.task?.assignee).toBe('Alice');
  });
});
