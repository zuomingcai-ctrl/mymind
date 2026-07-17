import { ref, onUnmounted } from 'vue';

export function useZenMode() {
  const active = ref(false);

  function enter() {
    active.value = true;
  }

  function exit() {
    active.value = false;
  }

  function toggle() {
    active.value = !active.value;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && active.value) {
      exit();
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
    onUnmounted(() => window.removeEventListener('keydown', onKeyDown));
  }

  return { active, enter, exit, toggle };
}
