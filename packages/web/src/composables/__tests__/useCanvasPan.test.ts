import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useCanvasPan } from '../useCanvasPan';

function createPanApi(onPan: (dx: number, dy: number) => void) {
  let api: ReturnType<typeof useCanvasPan> | null = null;
  mount(
    defineComponent({
      setup() {
        api = useCanvasPan(onPan);
        return () => h('div');
      },
    }),
  );
  return api!;
}

describe('useCanvasPan', () => {
  it('pans on blank-area left drag', () => {
    const onPan = vi.fn();
    const api = createPanApi(onPan);

    api.onPointerDown(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 20 }), null, null);
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, clientY: 50 }));

    expect(onPan).toHaveBeenCalledWith(20, 30);
  });

  it('does not pan on left click over a topic without space', () => {
    const onPan = vi.fn();
    const api = createPanApi(onPan);

    const started = api.onPointerDown(
      new MouseEvent('mousedown', { button: 0, clientX: 0, clientY: 0 }),
      'child-id',
      'root-id',
    );

    expect(started).toBe(false);
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 0 }));
    expect(onPan).not.toHaveBeenCalled();
  });

  it('pans with space held even when pointer starts on a topic', () => {
    const onPan = vi.fn();
    const api = createPanApi(onPan);

    const keydown = new KeyboardEvent('keydown', { code: 'Space', bubbles: true });
    Object.defineProperty(keydown, 'target', { value: document.body });
    window.dispatchEvent(keydown);

    api.onPointerDown(new MouseEvent('mousedown', { button: 0, clientX: 0, clientY: 0 }), 'root-id', 'root-id');
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 5 }));

    expect(onPan).toHaveBeenCalledWith(10, 5);
  });

  it('pans when dragging from the root topic', () => {
    const onPan = vi.fn();
    const api = createPanApi(onPan);

    api.onPointerDown(
      new MouseEvent('mousedown', { button: 0, clientX: 0, clientY: 0 }),
      'root-id',
      'root-id',
    );
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 8, clientY: 12 }));

    expect(onPan).toHaveBeenCalledWith(8, 12);
  });

  it('suppresses click after a pan drag', () => {
    const onPan = vi.fn();
    const api = createPanApi(onPan);

    api.onPointerDown(new MouseEvent('mousedown', { button: 0, clientX: 0, clientY: 0 }), null, 'root-id');
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 4, clientY: 0 }));
    window.dispatchEvent(new MouseEvent('mouseup'));

    expect(api.shouldSuppressClick()).toBe(true);
    expect(api.shouldSuppressClick()).toBe(false);
  });
});
