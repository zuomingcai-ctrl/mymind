import { ref, computed } from 'vue';
import { clampZoom, fitToContent, ensureRectVisible, type Viewport, type Rect } from '@mymind/core';

export function useViewport(initialWidth = 800, initialHeight = 600) {
  const viewport = ref<Viewport>({ x: 0, y: 0, zoom: 1 });
  const viewWidth = ref(initialWidth);
  const viewHeight = ref(initialHeight);

  const zoomPercent = computed(() => Math.round(viewport.value.zoom * 100));

  function setZoom(zoom: number) {
    viewport.value = { ...viewport.value, zoom: clampZoom(zoom) };
  }

  function zoomBy(delta: number) {
    setZoom(viewport.value.zoom * (1 + delta));
  }

  function fitContent(bounds: Rect) {
    viewport.value = fitToContent(bounds, viewWidth.value, viewHeight.value);
  }

  function pan(dx: number, dy: number) {
    viewport.value = {
      ...viewport.value,
      x: viewport.value.x - dx / viewport.value.zoom,
      y: viewport.value.y - dy / viewport.value.zoom,
    };
  }

  function ensureVisible(bounds: Rect, padding = 40) {
    viewport.value = ensureRectVisible(
      bounds,
      viewport.value,
      viewWidth.value,
      viewHeight.value,
      padding,
    );
  }

  return {
    viewport,
    viewWidth,
    viewHeight,
    zoomPercent,
    setZoom,
    zoomBy,
    fitContent,
    pan,
    ensureVisible,
  };
}
