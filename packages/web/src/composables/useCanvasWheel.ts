export function useCanvasWheel(
  pan: (dx: number, dy: number) => void,
  zoomBy: (delta: number) => void,
) {
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.ctrlKey) {
      zoomBy(e.deltaY > 0 ? -0.1 : 0.1);
      return;
    }
    const dx = (e.shiftKey ? -e.deltaY : -e.deltaX) || 0;
    const dy = (e.shiftKey ? 0 : -e.deltaY) || 0;
    if (dx !== 0 || dy !== 0) {
      pan(dx, dy);
    }
  }

  return { onWheel };
}
