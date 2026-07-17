import { ref, computed } from 'vue';
import { useDocumentStore } from '../stores/document';

export function usePitchMode() {
  const active = ref(false);
  const slideIndex = ref(0);
  const store = useDocumentStore();

  const slides = computed(() => {
    const sheet = store.activeSheet;
    if (!sheet) return [];
    const configured = sheet.pitchSettings.slides;
    if (configured.length) return configured.map((s) => s.topicId);
    return collectTopicIds(sheet.rootTopic);
  });

  const currentTopicId = computed(() => slides.value[slideIndex.value] ?? null);

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

  return { active, slideIndex, slides, currentTopicId, enter, exit, next, prev };
}

function collectTopicIds(root: import('@mymind/core').Topic): string[] {
  const ids: string[] = [root.id];
  for (const c of root.children) ids.push(...collectTopicIds(c));
  return ids;
}
