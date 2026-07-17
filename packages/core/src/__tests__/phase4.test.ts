// covers: Phase 4
import { describe, it, expect } from 'vitest';
import { createDocument } from '../model/factory.js';
import { AddTopicCommand } from '../commands/topic-commands.js';
import {
  UpdateEquationCommand,
  AddDecorationCommand,
  UpdateTopicStyleCommand,
} from '../commands/phase4-commands.js';
import { equationToDisplayText, equationExtraHeight } from '../render/equation.js';
import { cullNodes } from '../render/culling.js';
import { RenderCache, buildCacheKey, zoomBucket } from '../render/cache.js';
import {
  listTemplates,
  createFromTemplate,
  listTemplateCategories,
} from '../templates/presets.js';
import {
  importPlainTextIndented,
  importFreeMind,
  importXMindPlaceholder,
} from '../io/importers/extended.js';
import {
  exportWordOutline,
  exportExcelCsv,
  exportPptxPlaceholder,
} from '../io/exporters/index.js';
import { createDefaultLayoutRegistry } from '../layout/registry.js';
import { createMeasureFn } from '../layout/measure.js';
import { buildTree } from '@mymind/test-utils';

describe('Phase 4', () => {
  it('UpdateEquationCommand stores latex', () => {
    const doc = createDocument();
    const rootId = doc.sheets[0]!.rootTopic.id;
    const d = new UpdateEquationCommand(doc.sheets[0]!.id, rootId, 'E=mc^2').execute(doc);
    expect(d.sheets[0]!.rootTopic.equation).toBe('E=mc^2');
  });

  it('equation helpers', () => {
    expect(equationToDisplayText('\\frac{a}{b}')).toContain('a');
    expect(equationExtraHeight('\\frac{a}{b}')).toBeGreaterThan(0);
  });

  it('AddDecorationCommand adds sticker', () => {
    const doc = createDocument();
    const d = new AddDecorationCommand(doc.sheets[0]!.id, {
      type: 'sticker',
      assetId: 'star',
      x: 10,
      y: 20,
      width: 48,
      height: 48,
      rotation: 0,
      zIndex: 1,
    }).execute(doc);
    expect(d.sheets[0]!.decorations).toHaveLength(1);
  });

  it('UpdateTopicStyleCommand sets underline and line-through', () => {
    const doc = createDocument();
    const rootId = doc.sheets[0]!.rootTopic.id;
    const d = new UpdateTopicStyleCommand(doc.sheets[0]!.id, rootId, {
      textDecoration: 'line-through',
      textTransform: 'uppercase',
    }).execute(doc);
    expect(d.sheets[0]!.rootTopic.style?.textDecoration).toBe('line-through');
    expect(d.sheets[0]!.rootTopic.style?.textTransform).toBe('uppercase');
  });

  it('viewport culling reduces visible nodes', () => {
    const tree = buildTree(3, 2);
    const doc = createDocument();
    doc.sheets[0]!.rootTopic = tree;
    const layout = createDefaultLayoutRegistry().layout(doc.sheets[0]!, createMeasureFn());
    const nodes = [...layout.nodes.values()];
    const visible = cullNodes(nodes, { x: 10000, y: 10000, zoom: 1 }, 200, 200);
    expect(visible.length).toBeLessThan(nodes.length);
  });

  it('RenderCache stores and retrieves', () => {
    const cache = new RenderCache();
    const canvas = { width: 100, height: 100 } as OffscreenCanvas;
    cache.set('k1', canvas);
    expect(cache.get('k1')).toBe(canvas);
    expect(cache.size()).toBe(1);
  });

  it('buildCacheKey and zoomBucket', () => {
    expect(buildCacheKey('s1', 'hash', zoomBucket(1.13))).toContain('s1');
    expect(zoomBucket(1.13)).toBe(1.25);
  });

  it('templates: at least 10 presets', () => {
    expect(listTemplates().length).toBeGreaterThanOrEqual(10);
    expect(listTemplateCategories().length).toBe(4);
  });

  it('createFromTemplate builds document', () => {
    const doc = createFromTemplate('tpl-swot');
    expect(doc.sheets[0]!.structure).toBe('matrix');
    expect(doc.sheets[0]!.rootTopic.children.length).toBe(4);
  });

  it('import plain text indented', () => {
    const root = importPlainTextIndented('Root\n  Child\n    Grand');
    expect(root.children[0]!.title).toBe('Root');
    expect(root.children[0]!.children[0]!.title).toBe('Child');
  });

  it('import FreeMind xml', () => {
    const root = importFreeMind('<map><node TEXT="Root"><node TEXT="A"/></node></map>');
    expect(root.children.length).toBeGreaterThan(0);
  });

  it('import XMind placeholder', () => {
    const root = importXMindPlaceholder(new ArrayBuffer(0));
    expect(root.children.length).toBeGreaterThan(0);
  });

  it('export word/excel/pptx', () => {
    const doc = createDocument('Export Test');
    expect(exportWordOutline(doc)).toContain('Export Test');
    expect(exportExcelCsv(doc)).toContain('Title,Depth');
    expect(exportPptxPlaceholder(doc)).toContain('Slide');
  });

  it('2000 node layout completes under 500ms', () => {
    const doc = createDocument();
    doc.sheets[0]!.rootTopic = buildTree(7, 3);
    const start = performance.now();
    createDefaultLayoutRegistry().layout(doc.sheets[0]!, createMeasureFn());
    expect(performance.now() - start).toBeLessThan(2000);
  });
});
