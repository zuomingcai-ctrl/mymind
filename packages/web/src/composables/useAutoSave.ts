import { ref, onUnmounted } from 'vue';
import { useDocumentStore } from '../stores/document';
import { saveDocument } from '../adapters/browser-export';

export function useAutoSave(intervalMs = 30000) {
  const enabled = ref(true);
  let timer: ReturnType<typeof setInterval> | null = null;

  function start() {
    stop();
    timer = setInterval(async () => {
      if (!enabled.value) return;
      const store = useDocumentStore();
      if (store.document) await saveDocument(store.document);
    }, intervalMs);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  start();
  onUnmounted(stop);

  return { enabled, start, stop };
}
