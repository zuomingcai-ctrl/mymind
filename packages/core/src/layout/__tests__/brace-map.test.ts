import { describe, it, expect } from 'vitest';
import { createDocument } from '../../model/factory.js';
import { AddTopicCommand } from '../../commands/topic-commands.js';
import { createMeasureFn } from '../measure.js';
import { createDefaultLayoutRegistry } from '../registry.js';
import { buildBracePath, extraShapeSvgElement } from '../../render/draw-extra-shape.js';

describe('brace map', () => {
  const measure = createMeasureFn();
  const registry = createDefaultLayoutRegistry();

  it('adds a brace extra shape aligned to children', () => {
    const doc = createDocument('x', 'brace-map');
    const sheet = doc.sheets[0]!;
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'c1').execute(doc);
    d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'c2').execute(d);
    const layout = registry.layout(d.sheets[0]!, measure);
    const brace = layout.extraShapes.find((s) => s.type === 'brace');
    expect(brace).toBeDefined();
    expect(brace!.bounds.height).toBeGreaterThan(0);
    expect(brace!.bounds.y).toBeGreaterThanOrEqual(0);
  });

  it('renders brace as path, not rectangle', () => {
    const svg = extraShapeSvgElement({
      id: 'b',
      type: 'brace',
      bounds: { x: 10, y: 20, width: 14, height: 80 },
      style: { openSide: 'right' },
    });
    expect(svg).toContain('<path');
    expect(svg).not.toContain('<rect');
    const path = buildBracePath({ x: 10, y: 20, width: 14, height: 80 }, 'right');
    expect(path).toMatch(/^M /);
  });
});
