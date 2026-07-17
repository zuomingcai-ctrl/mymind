import type { MindMapDocument } from '@mymind/core';
import { serializeDocument, deserializeDocument } from '@mymind/core';

const DB_NAME = 'mymind';
const DB_VERSION = 1;
const STORE = 'documents';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function saveDocument(doc: MindMapDocument): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(doc);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDocument(id: string): Promise<MindMapDocument | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as MindMapDocument) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listDocuments(): Promise<MindMapDocument[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as MindMapDocument[]);
    req.onerror = () => reject(req.error);
  });
}

export function downloadAsJson(doc: MindMapDocument, filename?: string): void {
  downloadBlob(
    new Blob([serializeDocument(doc)], { type: 'application/json' }),
    filename ?? `${doc.title || '未命名'}.mymind`,
  );
}

export function openJsonFile(): Promise<MindMapDocument> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mymind,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      const text = await file.text();
      resolve(deserializeDocument(text));
    };
    input.click();
  });
}

export async function exportPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.size > 0) resolve(blob);
      else reject(new Error('Failed to export PNG'));
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string, mimeType: string): void {
  downloadBlob(new Blob([text], { type: mimeType }), filename);
}

export interface ImportFilePayload {
  name: string;
  text?: string;
  buffer?: ArrayBuffer;
}

export function pickImportFile(): Promise<ImportFilePayload> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.opml,.mm,.txt,.xmind';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      if (file.name.toLowerCase().endsWith('.xmind')) {
        resolve({ name: file.name, buffer: await file.arrayBuffer() });
      } else {
        resolve({ name: file.name, text: await file.text() });
      }
    };
    input.click();
  });
}
