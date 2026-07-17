// covers: FI-003
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createDocument, createTopic } from '../../model/factory.js';
import { serializeDocument, deserializeDocument } from '../../io/serializer.js';

describe('serializer', () => {
  it('round-trips fixed sample', () => {
    const doc = createDocument('Test Doc');
    const child = createTopic('Child');
    doc.sheets[0]!.rootTopic.children.push(child);
    const json = serializeDocument(doc);
    const restored = deserializeDocument(json);
    expect(restored).toEqual(doc);
  });

  it('property: serialize/deserialize is identity', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (title) => {
        const doc = createDocument(title);
        const restored = deserializeDocument(serializeDocument(doc));
        expect(restored.title).toBe(title);
        expect(restored.sheets[0]!.rootTopic.id).toBe(doc.sheets[0]!.rootTopic.id);
      }),
    );
  });
});
