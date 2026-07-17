import { ref, computed } from 'vue';
import { SearchService, type SearchResult } from '@mymind/core';
import { useDocumentStore } from '../stores/document';

export function useSearch() {
  const query = ref('');
  const results = ref<SearchResult[]>([]);
  const service = new SearchService();

  function search() {
    const store = useDocumentStore();
    if (!store.document) {
      results.value = [];
      return;
    }
    results.value = service.searchDocument(store.document, query.value);
  }

  function selectResult(result: SearchResult) {
    const store = useDocumentStore();
    store.activeSheetId = result.sheetId;
    store.selection = [result.topicId];
  }

  const hasResults = computed(() => results.value.length > 0);

  return { query, results, hasResults, search, selectResult };
}
