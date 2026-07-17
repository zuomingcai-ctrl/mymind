import { computed, onMounted, onUnmounted, ref } from 'vue';
import { isEditableTarget } from './useClipboard';

export function useCanvasPan(pan: (dx: number, dy: number) => void) {
  const isPanning = ref(false);
  const spacePressed = ref(false);
  const lastPan = ref({ x: 0, y: 0 });
  const suppressClick = ref(false);

  const panCursor = computed(() => {
    if (!spacePressed.value && !isPanning.value) return 'default';
    return isPanning.value ? 'grabbing' : 'grab';
  });

  function shouldStartPan(
    e: MouseEvent,
    hitTopicId: string | null,
    rootTopicId: string | null,
  ): boolean {
    if (e.button === 1 || (e.button === 0 && e.altKey)) return true;
    if (e.button !== 0) return false;
    if (spacePressed.value) return true;
    if (!hitTopicId) return true;
    return hitTopicId === rootTopicId;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code !== 'Space' || e.repeat) return;
    if (isEditableTarget(e)) return;
    e.preventDefault();
    spacePressed.value = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code !== 'Space') return;
    spacePressed.value = false;
    isPanning.value = false;
  }

  function onBlur() {
    spacePressed.value = false;
    isPanning.value = false;
  }

  function onPointerDown(
    e: MouseEvent,
    hitTopicId: string | null,
    rootTopicId: string | null,
  ): boolean {
    if (!shouldStartPan(e, hitTopicId, rootTopicId)) return false;
    isPanning.value = true;
    suppressClick.value = false;
    lastPan.value = { x: e.clientX, y: e.clientY };
    e.preventDefault();
    return true;
  }

  function onPointerMove(e: MouseEvent) {
    if (!isPanning.value) return;
    const dx = e.clientX - lastPan.value.x;
    const dy = e.clientY - lastPan.value.y;
    if (dx !== 0 || dy !== 0) suppressClick.value = true;
    pan(dx, dy);
    lastPan.value = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp() {
    isPanning.value = false;
  }

  function shouldSuppressClick(): boolean {
    const v = suppressClick.value;
    suppressClick.value = false;
    return v;
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
  });

  return {
    spacePressed,
    isPanning,
    panCursor,
    onPointerDown,
    shouldSuppressClick,
  };
}
