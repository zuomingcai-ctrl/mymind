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

  it('buildBracePath emits valid cubic commands and stays in bounds', () => {
    const bounds = { x: 10, y: 20, width: 18, height: 80 };
    for (const side of ['right', 'left'] as const) {
      const d = buildBracePath(bounds, side);
      const tokens = d.trim().split(/[\s,]+/);
      let i = 0;
      while (i < tokens.length) {
        const cmd = tokens[i]!;
        expect(cmd).toMatch(/^[MC]$/);
        i += 1;
        const arity = cmd === 'M' ? 2 : 6;
        for (let k = 0; k < arity; k++) {
          const n = Number(tokens[i + k]);
          expect(Number.isFinite(n)).toBe(true);
          if (k % 2 === 0) {
            expect(n).toBeGreaterThanOrEqual(bounds.x - 0.5);
            expect(n).toBeLessThanOrEqual(bounds.x + bounds.width + 0.5);
          } else {
            expect(n).toBeGreaterThanOrEqual(bounds.y - 0.5);
            expect(n).toBeLessThanOrEqual(bounds.y + bounds.height + 0.5);
          }
        }
        i += arity;
      }
      if (side === 'right') {
        expect(d.startsWith(`M ${bounds.x + bounds.width}`)).toBe(true);
      } else {
        expect(d.startsWith(`M ${bounds.x}`)).toBe(true);
      }
    }
  });

  it('uses braces as connectors without tree edges or stems', () => {
    const doc = createDocument('x', 'brace-map');
    const sheet = doc.sheets[0]!;
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'c1').execute(doc);
    d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'c2').execute(d);
    const layout = registry.layout(d.sheets[0]!, measure);
    expect(layout.edges.filter((e) => e.type === 'tree')).toHaveLength(0);
    const brace = layout.extraShapes.find((s) => s.type === 'brace')!;
    expect(brace.style.stemFromX).toBeUndefined();
    expect(brace.style.stemFromY).toBeUndefined();
    const svg = extraShapeSvgElement(brace);
    // One path for the brace glyph only — no parent→cusp stem.
    expect(svg.match(/<path/g)?.length).toBe(1);
  });

  it('aligns brace cusp with parent when a child has nested descendants', () => {
    const doc = createDocument('x', 'brace-map');
    const sheet = doc.sheets[0]!;
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'leaf').execute(doc);
    d = new AddTopicCommand(sheet.id, d.sheets[0]!.rootTopic.id, 'branch').execute(d);
    const branchId = d.sheets[0]!.rootTopic.children[1]!.id;
    d = new AddTopicCommand(sheet.id, branchId, 'a').execute(d);
    d = new AddTopicCommand(sheet.id, branchId, 'b').execute(d);
    d = new AddTopicCommand(sheet.id, branchId, 'c').execute(d);
    const layout = registry.layout(d.sheets[0]!, measure);
    const root = layout.nodes.get(d.sheets[0]!.rootTopic.id)!;
    const rootBrace = layout.extraShapes.find((s) => s.id === `brace-${root.id}`)!;
    const parentMid = root.y + root.height / 2;
    const braceMid = rootBrace.bounds.y + rootBrace.bounds.height / 2;
    expect(Math.abs(braceMid - parentMid)).toBeLessThan(1);

    const branch = layout.nodes.get(branchId)!;
    const branchBrace = layout.extraShapes.find((s) => s.id === `brace-${branchId}`)!;
    const branchMid = branch.y + branch.height / 2;
    const nestedBraceMid = branchBrace.bounds.y + branchBrace.bounds.height / 2;
    expect(Math.abs(nestedBraceMid - branchMid)).toBeLessThan(1);
  });

  it('places brace tightly after parent instead of mid-gap', () => {
    const doc = createDocument('x', 'brace-map');
    const sheet = doc.sheets[0]!;
    sheet.structureOptions = {
      type: 'brace-map',
      braceSide: 'right',
      partPosition: 'opposite',
    };
    let d = new AddTopicCommand(sheet.id, sheet.rootTopic.id, 'c1').execute(doc);
    d = new AddTopicCommand(sheet.id, d.sheets[0]!.rootTopic.id, 'c2').execute(d);
    const layout = registry.layout(d.sheets[0]!, measure);
    const root = layout.nodes.get(d.sheets[0]!.rootTopic.id)!;
    const brace = layout.extraShapes.find((s) => s.type === 'brace')!;
    const parts = [...layout.nodes.values()].filter((n) => n.depth === 1);
    expect(brace.bounds.x).toBeGreaterThan(root.x + root.width);
    expect(brace.bounds.x - (root.x + root.width)).toBeLessThan(40);
    expect(Math.min(...parts.map((p) => p.x))).toBeGreaterThan(brace.bounds.x + brace.bounds.width);
  });
});
