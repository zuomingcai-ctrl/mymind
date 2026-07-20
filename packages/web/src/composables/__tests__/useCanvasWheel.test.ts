import { describe, it, expect, vi } from 'vitest';
import { useCanvasWheel } from '../useCanvasWheel';

function wheel(overrides: Partial<WheelEvent> = {}): WheelEvent {
  return {
    deltaX: 0,
    deltaY: 0,
    ctrlKey: false,
    shiftKey: false,
    preventDefault: vi.fn(),
    ...overrides,
  } as WheelEvent;
}

describe('useCanvasWheel', () => {
  it('pans vertically on wheel', () => {
    const pan = vi.fn();
    const zoomBy = vi.fn();
    const { onWheel } = useCanvasWheel(pan, zoomBy);

    onWheel(wheel({ deltaY: 40 }));

    expect(pan).toHaveBeenCalledWith(0, -40);
    expect(zoomBy).not.toHaveBeenCalled();
  });

  it('pans horizontally on trackpad deltaX', () => {
    const pan = vi.fn();
    const { onWheel } = useCanvasWheel(pan, vi.fn());

    onWheel(wheel({ deltaX: 25 }));

    expect(pan).toHaveBeenCalledWith(-25, 0);
  });

  it('maps shift+wheel to horizontal pan', () => {
    const pan = vi.fn();
    const { onWheel } = useCanvasWheel(pan, vi.fn());

    onWheel(wheel({ deltaY: 30, shiftKey: true }));

    expect(pan).toHaveBeenCalledWith(-30, 0);
  });

  it('zooms when ctrl is held', () => {
    const pan = vi.fn();
    const zoomBy = vi.fn();
    const { onWheel } = useCanvasWheel(pan, zoomBy);

    onWheel(wheel({ deltaY: 10, ctrlKey: true }));

    expect(zoomBy).toHaveBeenCalledWith(-0.1);
    expect(pan).not.toHaveBeenCalled();
  });

  it('prevents default browser scrolling', () => {
    const event = wheel({ deltaY: 10 });
    const { onWheel } = useCanvasWheel(vi.fn(), vi.fn());

    onWheel(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });
});
