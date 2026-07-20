import { describe, it, expect } from 'vitest';
import {
  COLLAPSE_BTN_RADIUS,
  collapseButtonCenter,
  defaultCollapseSide,
  hitTestCollapseButton,
  inferCollapseSide,
  layoutCollapseButton,
  pointInCollapseButton,
} from '../collapse-button.js';
import { createDocument, createTopic } from '../../model/factory.js';
import type { LayoutNode, LayoutResult } from '../../model/types.js';

function node(
  id: string,
  x: number,
  y: number,
  width = 80,
  height = 30,
): LayoutNode {
  return { id, x, y, width, height, depth: 0 };
}

function emptyLayout(nodes: LayoutNode[], edges: LayoutResult['edges'] = []): LayoutResult {
  return {
    nodes: new Map(nodes.map((n) => [n.id, n])),
    edges,
    extraShapes: [],
    bounds: { x: 0, y: 0, width: 200, height: 200 },
  };
}

describe('collapse-button', () => {
  it('defaultCollapseSide follows structure', () => {
    expect(defaultCollapseSide('mindmap')).toBe('right');
    expect(
      defaultCollapseSide('mindmap', { type: 'mindmap', balanced: false, direction: 'left' }),
    ).toBe('left');
    expect(defaultCollapseSide('org-chart')).toBe('bottom');
    expect(
      defaultCollapseSide('logic-chart', { type: 'logic-chart', direction: 'left' }),
    ).toBe('left');
    expect(
      defaultCollapseSide('brace-map', { type: 'brace-map', braceSide: 'left' }),
    ).toBe('left');
    expect(
      defaultCollapseSide('brace-map', { type: 'brace-map', braceSide: 'right' }),
    ).toBe('right');
  });

  it('collapseButtonCenter sits outside the node edge', () => {
    const n = node('a', 10, 20, 100, 40);
    expect(collapseButtonCenter(n, 'right')).toEqual({
      x: 10 + 100 + COLLAPSE_BTN_RADIUS,
      y: 20 + 20,
    });
    expect(collapseButtonCenter(n, 'left')).toEqual({
      x: 10 - COLLAPSE_BTN_RADIUS,
      y: 40,
    });
    expect(collapseButtonCenter(n, 'bottom')).toEqual({
      x: 60,
      y: 20 + 40 + COLLAPSE_BTN_RADIUS,
    });
  });

  it('collapseButtonCenter sits on the baseline for underline topics', () => {
    const n: LayoutNode = {
      ...node('u', 10, 20, 100, 40),
      display: 'underline',
    };
    expect(collapseButtonCenter(n, 'right')).toEqual({
      x: 10 + 100 + COLLAPSE_BTN_RADIUS,
      y: 20 + 40,
    });
    expect(collapseButtonCenter(n, 'left')).toEqual({
      x: 10 - COLLAPSE_BTN_RADIUS,
      y: 60,
    });
  });

  it('inferCollapseSide uses edge exit direction', () => {
    const parent = node('p', 0, 0, 80, 30);
    const c1 = node('c1', 120, -20);
    const c2 = node('c2', 120, 40);
    const layout = emptyLayout([parent, c1, c2], [
      {
        id: 'e1',
        from: 'p',
        to: 'c1',
        points: [
          { x: 80, y: 15 },
          { x: 100, y: 15 },
          { x: 120, y: -5 },
        ],
        type: 'tree',
      },
      {
        id: 'e2',
        from: 'p',
        to: 'c2',
        points: [
          { x: 80, y: 15 },
          { x: 100, y: 15 },
          { x: 120, y: 55 },
        ],
        type: 'tree',
      },
    ]);
    expect(inferCollapseSide('p', parent, layout, 'mindmap')).toBe('right');
  });

  it('inferCollapseSide stays bottom for wide tree-chart sibling rows', () => {
    // Parent above a wide row: child centers are mostly left/right of parent,
    // but connectors leave from the bottom (vertical tree edges).
    const parent = node('p', 200, 0, 80, 30);
    const children = [
      node('c0', 0, 80),
      node('c1', 100, 80),
      node('c2', 200, 80),
      node('c3', 300, 80),
      node('c4', 400, 80),
    ];
    const layout = emptyLayout([parent, ...children], children.map((c) => ({
      id: `e-${c.id}`,
      from: 'p',
      to: c.id,
      points: [
        { x: 240, y: 30 },
        { x: 240, y: 55 },
        { x: c.x + c.width / 2, y: 55 },
        { x: c.x + c.width / 2, y: 80 },
      ],
      type: 'tree' as const,
    })));
    expect(inferCollapseSide('p', parent, layout, 'tree-chart')).toBe('bottom');
  });

  it('layoutCollapseButton is null for leaves', () => {
    const topic = createTopic('leaf');
    const n = node(topic.id, 0, 0);
    const layout = emptyLayout([n]);
    expect(layoutCollapseButton(topic, n, layout, 'mindmap')).toBeNull();
  });

  it('layoutCollapseButton reports child count when collapsed', () => {
    const child = createTopic('c');
    const topic = { ...createTopic('p'), children: [child], collapsed: true };
    const n = node(topic.id, 0, 0);
    const layout = emptyLayout([n]);
    const btn = layoutCollapseButton(topic, n, layout, 'mindmap');
    expect(btn).toMatchObject({
      topicId: topic.id,
      collapsed: true,
      childCount: 1,
      side: 'right',
    });
  });

  it('hitTestCollapseButton hits the control circle', () => {
    const doc = createDocument('Test');
    const sheet = doc.sheets[0]!;
    const child = createTopic('child');
    sheet.rootTopic = { ...sheet.rootTopic, children: [child], collapsed: true };
    const rootNode = node(sheet.rootTopic.id, 0, 0, 100, 40);
    const layout = emptyLayout([rootNode]);
    const btn = layoutCollapseButton(
      sheet.rootTopic,
      rootNode,
      layout,
      sheet.structure,
      sheet.structureOptions,
    )!;
    expect(hitTestCollapseButton(btn.center, sheet, layout)?.topicId).toBe(sheet.rootTopic.id);
    expect(pointInCollapseButton({ x: btn.center.x + 20, y: btn.center.y }, btn.center)).toBe(
      false,
    );
  });
});
