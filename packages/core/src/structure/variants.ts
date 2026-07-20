import type { CanvasSettings, MindMapDocument, StructureOptions, StructureType } from '../model/types.js';
import { defaultStructureOptions } from '../model/types.js';
import { createDocument } from '../model/factory.js';

export type PreviewLayout =
  | 'radial'
  | 'radial-right'
  | 'horizontal'
  | 'horizontal-left'
  | 'horizontal-brace'
  | 'horizontal-underline'
  | 'vertical'
  | 'vertical-up'
  | 'org'
  | 'timeline-h'
  | 'timeline-v'
  | 'fishbone'
  | 'matrix'
  | 'brace-left'
  | 'brace-right'
  | 'tree-table';

export type PreviewNodeStyle = 'filled' | 'outline' | 'ghost' | 'line';
export type PreviewShape = 'rounded' | 'rectangle' | 'ellipse' | 'circle';
export type PreviewLineType = 'curve' | 'polyline' | 'straight';

export interface StructureVariantPreview {
  layout: PreviewLayout;
  lineType: PreviewLineType;
  centralShape: PreviewShape;
  branchShape: PreviewShape;
  nodeStyle: PreviewNodeStyle;
  handDrawn?: boolean;
  thickBorder?: boolean;
}

export interface StructureVariant {
  id: string;
  structure: StructureType;
  structureOptions: StructureOptions;
  preview: StructureVariantPreview;
  themeId?: string;
  handDrawn?: boolean;
  pro?: boolean;
}

export interface StructureSection {
  type: StructureType;
  label: string;
}

export const STRUCTURE_SECTIONS: StructureSection[] = [
  { type: 'mindmap', label: '思维导图' },
  { type: 'logic-chart', label: '逻辑图' },
  { type: 'tree-chart', label: '树状图' },
  { type: 'org-chart', label: '组织结构图' },
  { type: 'timeline', label: '时间轴' },
  { type: 'fishbone', label: '鱼骨图' },
  { type: 'matrix', label: '矩阵图' },
  { type: 'brace-map', label: '括号图' },
  { type: 'tree-table', label: '树形表格' },
];

function mindmap(
  id: string,
  preview: StructureVariantPreview,
  options?: Partial<{ balanced: boolean; direction: 'auto' | 'left' | 'right' }>,
  extra?: Pick<StructureVariant, 'themeId' | 'handDrawn' | 'pro'>,
): StructureVariant {
  return {
    id,
    structure: 'mindmap',
    structureOptions: {
      type: 'mindmap',
      balanced: options?.balanced ?? true,
      direction: options?.direction,
    },
    preview,
    ...extra,
  };
}

function logic(
  id: string,
  preview: StructureVariantPreview,
  opts: {
    direction?: 'left' | 'right';
    lineStyle?: 'curve' | 'polyline';
    nodeDisplay?: 'box' | 'underline' | 'mixed';
    groupLeaves?: 'none' | 'brace';
    rootDisplay?: 'box' | 'underline';
  } = {},
  extra?: Pick<StructureVariant, 'themeId' | 'handDrawn' | 'pro'>,
): StructureVariant {
  return {
    id,
    structure: 'logic-chart',
    structureOptions: {
      type: 'logic-chart',
      direction: opts.direction ?? 'right',
      lineStyle: opts.lineStyle ?? 'curve',
      nodeDisplay: opts.nodeDisplay ?? 'mixed',
      groupLeaves: opts.groupLeaves ?? 'none',
      rootDisplay: opts.rootDisplay ?? 'box',
    },
    preview,
    ...extra,
  };
}

export const STRUCTURE_VARIANTS: StructureVariant[] = [
  mindmap('mindmap-balanced-classic', {
    layout: 'radial',
    lineType: 'curve',
    centralShape: 'rounded',
    branchShape: 'rounded',
    nodeStyle: 'ghost',
  }),
  mindmap('mindmap-balanced-outline', {
    layout: 'radial',
    lineType: 'curve',
    centralShape: 'rounded',
    branchShape: 'rounded',
    nodeStyle: 'outline',
  }),
  mindmap(
    'mindmap-balanced-selected',
    {
      layout: 'radial',
      lineType: 'curve',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'filled',
      thickBorder: true,
    },
    { balanced: true },
  ),
  mindmap('mindmap-balanced-line', {
    layout: 'radial',
    lineType: 'polyline',
    centralShape: 'rectangle',
    branchShape: 'rectangle',
    nodeStyle: 'line',
  }),
  mindmap('mindmap-balanced-straight', {
    layout: 'radial',
    lineType: 'straight',
    centralShape: 'rectangle',
    branchShape: 'rounded',
    nodeStyle: 'ghost',
  }),
  mindmap(
    'mindmap-balanced-hand',
    {
      layout: 'radial',
      lineType: 'polyline',
      centralShape: 'rectangle',
      branchShape: 'rounded',
      nodeStyle: 'outline',
      handDrawn: true,
      thickBorder: true,
    },
    { balanced: true },
    { themeId: 'hand-drawn', handDrawn: true },
  ),
  mindmap(
    'mindmap-balanced-polyline',
    {
      layout: 'radial',
      lineType: 'polyline',
      centralShape: 'rectangle',
      branchShape: 'rectangle',
      nodeStyle: 'outline',
    },
    { balanced: true },
    { pro: true },
  ),
  mindmap(
    'mindmap-balanced-circle',
    {
      layout: 'radial',
      lineType: 'polyline',
      centralShape: 'rounded',
      branchShape: 'circle',
      nodeStyle: 'outline',
    },
    { balanced: true },
    { pro: true },
  ),
  mindmap(
    'mindmap-balanced-t-junction',
    {
      layout: 'radial',
      lineType: 'polyline',
      centralShape: 'rectangle',
      branchShape: 'rectangle',
      nodeStyle: 'outline',
      thickBorder: true,
    },
    { balanced: true },
    { pro: true },
  ),
  mindmap(
    'mindmap-balanced-organic',
    {
      layout: 'radial',
      lineType: 'curve',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'outline',
      handDrawn: true,
      thickBorder: true,
    },
    { balanced: true },
    { themeId: 'hand-drawn', handDrawn: true, pro: true },
  ),
  mindmap(
    'mindmap-balanced-ellipse',
    {
      layout: 'radial',
      lineType: 'curve',
      centralShape: 'ellipse',
      branchShape: 'ellipse',
      nodeStyle: 'outline',
      handDrawn: true,
    },
    { balanced: true },
    { themeId: 'hand-drawn', handDrawn: true, pro: true },
  ),
  mindmap(
    'mindmap-balanced-soft',
    {
      layout: 'radial',
      lineType: 'curve',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'ghost',
      handDrawn: true,
    },
    { balanced: true },
    { themeId: 'hand-drawn', handDrawn: true, pro: true },
  ),
  mindmap(
    'mindmap-right-curve',
    {
      layout: 'radial-right',
      lineType: 'curve',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'filled',
    },
    { balanced: false, direction: 'right' },
  ),
  logic('logic-complex-terminals', {
    layout: 'horizontal-brace',
    lineType: 'curve',
    centralShape: 'rectangle',
    branchShape: 'rectangle',
    nodeStyle: 'ghost',
  }),
  logic('logic-standard-box', {
    layout: 'horizontal',
    lineType: 'curve',
    centralShape: 'rectangle',
    branchShape: 'rounded',
    nodeStyle: 'filled',
  }, { nodeDisplay: 'box', groupLeaves: 'none' }),
  logic('logic-bracket-box', {
    layout: 'horizontal-brace',
    lineType: 'curve',
    centralShape: 'rounded',
    branchShape: 'rounded',
    nodeStyle: 'outline',
  }, { nodeDisplay: 'mixed', groupLeaves: 'brace' }),
  logic('logic-orthogonal-shadow', {
    layout: 'horizontal',
    lineType: 'polyline',
    centralShape: 'rectangle',
    branchShape: 'rectangle',
    nodeStyle: 'filled',
    thickBorder: true,
  }, { lineStyle: 'polyline', nodeDisplay: 'box', groupLeaves: 'none' }, { themeId: 'mono', pro: true }),
  logic('logic-orthogonal-lines', {
    layout: 'horizontal-underline',
    lineType: 'polyline',
    centralShape: 'rectangle',
    branchShape: 'rectangle',
    nodeStyle: 'line',
  }, { lineStyle: 'polyline', nodeDisplay: 'underline', groupLeaves: 'none' }, { pro: true }),
  logic('logic-heart-brace', {
    layout: 'horizontal-brace',
    lineType: 'polyline',
    centralShape: 'ellipse',
    branchShape: 'rounded',
    nodeStyle: 'outline',
  }, { lineStyle: 'polyline', nodeDisplay: 'mixed', groupLeaves: 'brace' }, { themeId: 'fresh', pro: true }),
  logic('logic-sketch-bubble', {
    layout: 'horizontal-underline',
    lineType: 'curve',
    centralShape: 'rounded',
    branchShape: 'rectangle',
    nodeStyle: 'line',
    handDrawn: true,
  }, { nodeDisplay: 'underline', groupLeaves: 'none' }, { themeId: 'hand-drawn', handDrawn: true, pro: true }),
  logic('logic-sketch-capsule', {
    layout: 'horizontal-brace',
    lineType: 'curve',
    centralShape: 'rounded',
    branchShape: 'ellipse',
    nodeStyle: 'outline',
    handDrawn: true,
  }, { nodeDisplay: 'mixed', groupLeaves: 'brace' }, { themeId: 'hand-drawn', handDrawn: true, pro: true }),
  logic('logic-sketch-dense', {
    layout: 'horizontal',
    lineType: 'curve',
    centralShape: 'rectangle',
    branchShape: 'rectangle',
    nodeStyle: 'outline',
    handDrawn: true,
    thickBorder: true,
  }, { nodeDisplay: 'box', groupLeaves: 'none' }, { themeId: 'hand-drawn', handDrawn: true, pro: true }),
  {
    id: 'tree-down-classic',
    structure: 'tree-chart',
    structureOptions: { type: 'tree-chart', direction: 'top-down' },
    preview: {
      layout: 'vertical',
      lineType: 'curve',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'filled',
    },
  },
  {
    id: 'tree-down-polyline',
    structure: 'tree-chart',
    structureOptions: { type: 'tree-chart', direction: 'top-down' },
    preview: {
      layout: 'vertical',
      lineType: 'polyline',
      centralShape: 'rectangle',
      branchShape: 'rectangle',
      nodeStyle: 'outline',
    },
  },
  {
    id: 'tree-up-classic',
    structure: 'tree-chart',
    structureOptions: { type: 'tree-chart', direction: 'bottom-up' },
    preview: {
      layout: 'vertical-up',
      lineType: 'curve',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'filled',
    },
  },
  {
    id: 'tree-down-underline',
    structure: 'tree-chart',
    structureOptions: { type: 'tree-chart', direction: 'top-down' },
    preview: {
      layout: 'vertical',
      lineType: 'polyline',
      centralShape: 'rectangle',
      branchShape: 'rectangle',
      nodeStyle: 'line',
    },
    pro: true,
  },
  {
    id: 'tree-down-hand',
    structure: 'tree-chart',
    structureOptions: { type: 'tree-chart', direction: 'top-down' },
    preview: {
      layout: 'vertical',
      lineType: 'curve',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'outline',
      handDrawn: true,
    },
    themeId: 'hand-drawn',
    handDrawn: true,
    pro: true,
  },
  {
    id: 'tree-hand-drawn',
    structure: 'tree-chart',
    structureOptions: { type: 'tree-chart', direction: 'top-down' },
    preview: {
      layout: 'vertical',
      lineType: 'curve',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'outline',
      handDrawn: true,
    },
    themeId: 'hand-drawn',
    handDrawn: true,
    pro: true,
  },
  {
    id: 'org-standard',
    structure: 'org-chart',
    structureOptions: { type: 'org-chart', compact: false },
    preview: {
      layout: 'org',
      lineType: 'polyline',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'filled',
    },
  },
  {
    id: 'org-compact',
    structure: 'org-chart',
    structureOptions: { type: 'org-chart', compact: true },
    preview: {
      layout: 'org',
      lineType: 'polyline',
      centralShape: 'rectangle',
      branchShape: 'rectangle',
      nodeStyle: 'outline',
    },
    pro: true,
  },
  {
    id: 'org-hand-drawn',
    structure: 'org-chart',
    structureOptions: { type: 'org-chart', compact: false },
    preview: {
      layout: 'org',
      lineType: 'curve',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'outline',
      handDrawn: true,
    },
    themeId: 'hand-drawn',
    handDrawn: true,
    pro: true,
  },
  {
    id: 'timeline-h-alt',
    structure: 'timeline',
    structureOptions: { type: 'timeline', axis: 'horizontal', alternate: true, showScale: true },
    preview: {
      layout: 'timeline-h',
      lineType: 'straight',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'filled',
    },
  },
  {
    id: 'timeline-h-linear',
    structure: 'timeline',
    structureOptions: { type: 'timeline', axis: 'horizontal', alternate: false, showScale: true },
    preview: {
      layout: 'timeline-h',
      lineType: 'straight',
      centralShape: 'rectangle',
      branchShape: 'rounded',
      nodeStyle: 'ghost',
    },
  },
  {
    id: 'timeline-v',
    structure: 'timeline',
    structureOptions: { type: 'timeline', axis: 'vertical', alternate: true, showScale: true },
    preview: {
      layout: 'timeline-v',
      lineType: 'straight',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'filled',
    },
    pro: true,
  },
  {
    id: 'fishbone-left',
    structure: 'fishbone',
    structureOptions: { type: 'fishbone', headPosition: 'left', branchAngle: 45 },
    preview: {
      layout: 'fishbone',
      lineType: 'straight',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'filled',
    },
  },
  {
    id: 'fishbone-right',
    structure: 'fishbone',
    structureOptions: { type: 'fishbone', headPosition: 'right', branchAngle: 45 },
    preview: {
      layout: 'fishbone',
      lineType: 'straight',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'outline',
    },
  },
  {
    id: 'fishbone-hand',
    structure: 'fishbone',
    structureOptions: { type: 'fishbone', headPosition: 'left', branchAngle: 45 },
    preview: {
      layout: 'fishbone',
      lineType: 'curve',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'outline',
      handDrawn: true,
    },
    themeId: 'hand-drawn',
    handDrawn: true,
    pro: true,
  },
  {
    id: 'matrix-2x2',
    structure: 'matrix',
    structureOptions: {
      type: 'matrix',
      rows: 2,
      cols: 2,
      titles: ['S', 'W', 'O', 'T'],
      assignMode: 'auto',
    },
    preview: {
      layout: 'matrix',
      lineType: 'straight',
      centralShape: 'rectangle',
      branchShape: 'rectangle',
      nodeStyle: 'outline',
    },
  },
  {
    id: 'matrix-3x3',
    structure: 'matrix',
    structureOptions: {
      type: 'matrix',
      rows: 3,
      cols: 3,
      titles: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      assignMode: 'auto',
    },
    preview: {
      layout: 'matrix',
      lineType: 'straight',
      centralShape: 'rectangle',
      branchShape: 'rectangle',
      nodeStyle: 'ghost',
    },
    pro: true,
  },
  {
    id: 'brace-left',
    structure: 'brace-map',
    structureOptions: { type: 'brace-map', braceSide: 'left', partPosition: 'opposite' },
    preview: {
      layout: 'brace-left',
      lineType: 'straight',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'filled',
    },
  },
  {
    id: 'brace-right',
    structure: 'brace-map',
    structureOptions: { type: 'brace-map', braceSide: 'right', partPosition: 'opposite' },
    preview: {
      layout: 'brace-right',
      lineType: 'straight',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'outline',
    },
  },
  {
    id: 'tree-table-standard',
    structure: 'tree-table',
    structureOptions: {
      type: 'tree-table',
      columns: [{ id: 'title', field: 'title', width: 200, label: '主题' }],
      showTreeLine: true,
    },
    preview: {
      layout: 'tree-table',
      lineType: 'straight',
      centralShape: 'rectangle',
      branchShape: 'rectangle',
      nodeStyle: 'outline',
    },
  },
  {
    id: 'tree-table-compact',
    structure: 'tree-table',
    structureOptions: {
      type: 'tree-table',
      columns: [
        { id: 'title', field: 'title', width: 160, label: '主题' },
        { id: 'note', field: 'note', width: 120, label: '备注' },
      ],
      showTreeLine: false,
    },
    preview: {
      layout: 'tree-table',
      lineType: 'straight',
      centralShape: 'rectangle',
      branchShape: 'rectangle',
      nodeStyle: 'ghost',
    },
    pro: true,
  },
];

export function getStructureVariant(id: string): StructureVariant | undefined {
  return STRUCTURE_VARIANTS.find((v) => v.id === id);
}

export function getVariantsForStructure(type: StructureType): StructureVariant[] {
  return STRUCTURE_VARIANTS.filter((v) => v.structure === type);
}

export function getDefaultVariantForStructure(type: StructureType): StructureVariant {
  return getVariantsForStructure(type)[0] ?? {
    id: `${type}-default`,
    structure: type,
    structureOptions: defaultStructureOptions(type),
    preview: {
      layout: 'radial',
      lineType: 'curve',
      centralShape: 'rounded',
      branchShape: 'rounded',
      nodeStyle: 'filled',
    },
  };
}

function normalizeOptions(opts: StructureOptions): StructureOptions {
  if (opts.type === 'logic-chart') {
    const def = defaultStructureOptions('logic-chart');
    return { ...def, ...opts };
  }
  return opts;
}

function optionsEqual(a: StructureOptions, b: StructureOptions): boolean {
  return JSON.stringify(normalizeOptions(a)) === JSON.stringify(normalizeOptions(b));
}

export function matchStructureVariant(sheet: {
  structure: StructureType;
  structureOptions: StructureOptions;
  canvasSettings: CanvasSettings;
}): string | null {
  for (const variant of STRUCTURE_VARIANTS) {
    if (variant.structure !== sheet.structure) continue;
    if (!optionsEqual(variant.structureOptions, sheet.structureOptions)) continue;
    if (variant.themeId && variant.themeId !== sheet.canvasSettings.themeId) continue;
    if (variant.handDrawn !== undefined && variant.handDrawn !== sheet.canvasSettings.handDrawn) continue;
    return variant.id;
  }
  return getDefaultVariantForStructure(sheet.structure).id;
}

export function createDocumentWithVariant(
  variantId: string,
  title = '未命名',
): MindMapDocument {
  const variant = getStructureVariant(variantId) ?? getDefaultVariantForStructure('mindmap');
  const doc = createDocument(title, variant.structure);
  const sheet = doc.sheets[0]!;
  doc.sheets[0] = {
    ...sheet,
    structureOptions: variant.structureOptions,
    canvasSettings: {
      ...sheet.canvasSettings,
      ...(variant.themeId ? { themeId: variant.themeId } : {}),
      ...(variant.handDrawn !== undefined ? { handDrawn: variant.handDrawn } : {}),
    },
  };
  return doc;
}
