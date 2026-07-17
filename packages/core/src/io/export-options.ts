import type { MindMapDocument, Sheet } from '../model/types.js';

export interface ExportOptions {
  scale: 1 | 2 | 3;
  transparentBackground: boolean;
  sheetScope: 'current' | 'all';
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  scale: 1,
  transparentBackground: false,
  sheetScope: 'current',
};

export function getExportSheets(
  doc: MindMapDocument,
  activeSheetId: string,
  options: ExportOptions,
): Sheet[] {
  if (options.sheetScope === 'all') return doc.sheets;
  return doc.sheets.filter((s) => s.id === activeSheetId);
}
