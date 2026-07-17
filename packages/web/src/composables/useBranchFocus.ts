import { ref, computed } from 'vue';
import { getBranchTopicIds } from '@mymind/core';
import { useDocumentStore } from '../stores/document';

export function useBranchFocus() {
  const focusId = ref<string | null>(null);
  const store = useDocumentStore();

  const visibleIds = computed(() => {
    if (!focusId.value || !store.activeSheet) return null;
    return getBranchTopicIds(store.activeSheet.rootTopic, focusId.value);
  });

  function focus(topicId: string) {
    focusId.value = topicId;
  }

  function clear() {
    focusId.value = null;
  }

  return { focusId, visibleIds, focus, clear };
}
