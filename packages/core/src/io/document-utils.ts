import type { MindMapDocument, Sheet } from '../model/types.js';
import { generateId, createDocument } from '../model/factory.js';
import type { TemplateCategory } from '../templates/presets.js';

/** FI-008: merge sheets from other docs into target */
export function mergeDocuments(
  target: MindMapDocument,
  sources: MindMapDocument[],
): MindMapDocument {
  const sheets: Sheet[] = [...target.sheets];
  for (const src of sources) {
    for (const sheet of src.sheets) {
      const copy: Sheet = JSON.parse(JSON.stringify(sheet));
      copy.id = generateId();
      copy.title = `${src.title} · ${sheet.title}`;
      sheets.push(copy);
    }
  }
  return {
    ...target,
    sheets,
    modifiedAt: new Date().toISOString(),
  };
}

/** FI-007: simple XOR obfuscation (local password gate, not crypto-grade) */
export function encryptDocumentJson(json: string, password: string): string {
  const key = password || 'mymind';
  const bytes = new TextEncoder().encode(json);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i]! ^ key.charCodeAt(i % key.length);
  }
  const b64 = btoa(String.fromCharCode(...out));
  return JSON.stringify({
    format: 'mymind-encrypted',
    version: 1,
    payload: b64,
  });
}

export function decryptDocumentJson(encrypted: string, password: string): string {
  const parsed = JSON.parse(encrypted) as { format?: string; payload?: string };
  if (parsed.format !== 'mymind-encrypted' || !parsed.payload) {
    throw new Error('Not an encrypted MyMind file');
  }
  const key = password || 'mymind';
  const raw = atob(parsed.payload);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw.charCodeAt(i)! ^ key.charCodeAt(i % key.length);
  }
  return new TextDecoder().decode(out);
}

export function isEncryptedDocumentJson(text: string): boolean {
  try {
    const p = JSON.parse(text) as { format?: string };
    return p.format === 'mymind-encrypted';
  } catch {
    return false;
  }
}

/** TP-004: persist user template as a document snapshot */
export interface UserTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  document: MindMapDocument;
  createdAt: string;
}

export function documentToUserTemplate(
  doc: MindMapDocument,
  name: string,
  category: TemplateCategory = 'work',
): UserTemplate {
  const snapshot = JSON.parse(JSON.stringify(doc)) as MindMapDocument;
  snapshot.id = generateId();
  snapshot.title = name;
  return {
    id: generateId(),
    name,
    category,
    document: snapshot,
    createdAt: new Date().toISOString(),
  };
}

export function createFromUserTemplate(tpl: UserTemplate): MindMapDocument {
  const doc = JSON.parse(JSON.stringify(tpl.document)) as MindMapDocument;
  doc.id = generateId();
  doc.createdAt = new Date().toISOString();
  doc.modifiedAt = doc.createdAt;
  return doc;
}

/** Empty helper kept for callers that need a blank shell */
export function emptyDocument(title = '未命名'): MindMapDocument {
  return createDocument(title);
}
