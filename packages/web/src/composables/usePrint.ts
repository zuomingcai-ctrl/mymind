import { ref, computed, type Ref } from 'vue';
import type { MindMapDocument } from '@mymind/core';

export type PaperSize = 'a4' | 'letter';
export type PrintScope = 'current' | 'all';

export function usePrint(document: Ref<MindMapDocument | null>, activeSheetId: Ref<string | null>) {
  const paper = ref<PaperSize>('a4');
  const scope = ref<PrintScope>('current');

  const pageCount = computed(() => {
    if (!document.value) return 0;
    return scope.value === 'all' ? document.value.sheets.length : 1;
  });

  const sheetIds = computed(() => {
    if (!document.value) return [];
    if (scope.value === 'all') return document.value.sheets.map((s) => s.id);
    const id = activeSheetId.value ?? document.value.sheets[0]?.id;
    return id ? [id] : [];
  });

  function print() {
    window.print();
  }

  return { paper, scope, pageCount, sheetIds, print };
}
