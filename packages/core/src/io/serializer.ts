import type { MindMapDocument } from '../model/types.js';

export function serializeDocument(doc: MindMapDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function deserializeDocument(json: string): MindMapDocument {
  const parsed = JSON.parse(json) as MindMapDocument;
  if (typeof parsed.formatVersion !== 'number') {
    throw new Error('Invalid document: missing formatVersion');
  }
  if (!Array.isArray(parsed.sheets) || parsed.sheets.length === 0) {
    throw new Error('Invalid document: missing sheets');
  }
  return parsed;
}

export function parseDocumentFile(content: string): MindMapDocument {
  return deserializeDocument(content);
}
