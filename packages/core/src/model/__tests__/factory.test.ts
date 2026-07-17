// covers: ED-001, SH-004
import { describe, it, expect } from 'vitest';
import { createDocument, createSheet, createTopic } from '../factory.js';

describe('createDocument', () => {
  it('creates document with unique root topic', () => {
    const doc = createDocument();
    expect(doc.formatVersion).toBe(1);
    expect(doc.sheets).toHaveLength(1);
    expect(doc.sheets[0]!.rootTopic.id).toBeTruthy();
    expect(doc.sheets[0]!.rootTopic.title).toBe('中心主题');
  });

  it('createSheet defaults to mindmap structure', () => {
    const sheet = createSheet();
    expect(sheet.structure).toBe('mindmap');
    expect(sheet.structureOptions.type).toBe('mindmap');
  });

  it('createDocument accepts initial structure', () => {
    const doc = createDocument('Test', 'logic-chart');
    expect(doc.sheets[0]!.structure).toBe('logic-chart');
  });

  it('createTopic generates unique ids', () => {
    const a = createTopic();
    const b = createTopic();
    expect(a.id).not.toBe(b.id);
  });
});
