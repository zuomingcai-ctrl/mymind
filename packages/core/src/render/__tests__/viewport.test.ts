// covers: CV-001, CV-002
import { describe, it, expect } from 'vitest';
import { worldToScreen, screenToWorld, fitToContent, ensureRectVisible, clampZoom } from '../viewport.js';

describe('viewport', () => {
  it('worldToScreen and screenToWorld are inverse', () => {
    const viewport = { x: 100, y: 50, zoom: 1.5 };
    const world = { x: 200, y: 300 };
    const screen = worldToScreen(world, viewport);
    const back = screenToWorld(screen, viewport);
    expect(back.x).toBeCloseTo(world.x);
    expect(back.y).toBeCloseTo(world.y);
  });

  it('clampZoom limits range 0.25-4', () => {
    expect(clampZoom(0.1)).toBe(0.25);
    expect(clampZoom(10)).toBe(4);
    expect(clampZoom(1)).toBe(1);
  });

  it('fitToContent computes zoom for bounds', () => {
    const vp = fitToContent({ x: 0, y: 0, width: 1000, height: 800 }, 800, 600);
    expect(vp.zoom).toBeLessThanOrEqual(1);
    expect(vp.zoom).toBeGreaterThan(0);
  });

  it('ensureRectVisible keeps viewport when rect is already visible', () => {
    const viewport = { x: 0, y: 0, zoom: 1 };
    const next = ensureRectVisible({ x: 100, y: 100, width: 80, height: 40 }, viewport, 800, 600);
    expect(next).toBe(viewport);
  });

  it('ensureRectVisible pans right when rect is off-screen to the right', () => {
    const viewport = { x: 0, y: 0, zoom: 1 };
    const next = ensureRectVisible({ x: 900, y: 100, width: 80, height: 40 }, viewport, 800, 600);
    expect(next.x).toBeGreaterThan(viewport.x);
    expect(next.y).toBe(viewport.y);
    expect(next.zoom).toBe(viewport.zoom);
  });

  it('ensureRectVisible pans up when rect is off-screen above', () => {
    const viewport = { x: 0, y: 200, zoom: 1 };
    const next = ensureRectVisible({ x: 100, y: 50, width: 80, height: 40 }, viewport, 800, 600);
    expect(next.y).toBeLessThan(viewport.y);
  });
});
