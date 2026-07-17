import { ref, computed } from 'vue';
import { useDocumentStore } from '../stores/document';
import type { PitchSlide } from '@mymind/core';

export function usePitchMode() {
  const active = ref(false);
  const slideIndex = ref(0);
  const store = useDocumentStore();

  const slideRecords = computed((): PitchSlide[] => {
    const sheet = store.activeSheet;
    if (!sheet) return [];
    if (sheet.pitchSettings.slides.length) {
      return [...sheet.pitchSettings.slides].sort((a, b) => a.order - b.order);
    }
    return collectTopicIds(sheet.rootTopic).map((topicId, order) => ({
      id: `auto-${topicId}`,
      topicId,
      order,
    }));
  });

  const slides = computed(() => slideRecords.value.map((s) => s.topicId));

  const currentTopicId = computed(() => slides.value[slideIndex.value] ?? null);
  const currentSlide = computed(() => slideRecords.value[slideIndex.value] ?? null);

  function enter() {
    active.value = true;
    slideIndex.value = 0;
  }

  function exit() {
    active.value = false;
  }

  function next() {
    if (slideIndex.value < slides.value.length - 1) slideIndex.value++;
  }

  function prev() {
    if (slideIndex.value > 0) slideIndex.value--;
  }

  return { active, slideIndex, slides, currentTopicId, currentSlide, enter, exit, next, prev };
}

function collectTopicIds(root: import('@mymind/core').Topic): string[] {
  const ids: string[] = [root.id];
  for (const c of root.children) ids.push(...collectTopicIds(c));
  return ids;
}
