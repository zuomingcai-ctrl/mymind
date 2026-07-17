import { ref, computed } from 'vue';
import { SearchService } from '@mymind/core';
import { useDocumentStore } from '../stores/document';

export function useLabelFilter() {
  const labelText = ref<string | null>(null);
  const store = useDocumentStore();
  const service = new SearchService();

  const matchingIds = computed(() => {
    if (!labelText.value || !store.activeSheet) return null;
    const topics = service.filterByLabel(store.activeSheet, labelText.value);
    return new Set(topics.map((t) => t.id));
  });

  function setFilter(text: string | null) {
    labelText.value = text;
  }

  function clear() {
    labelText.value = null;
  }

  return { labelText, matchingIds, setFilter, clear };
}
