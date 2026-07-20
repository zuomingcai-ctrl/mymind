export * from './model/index.js';
export {
  runsToPlain,
  plainToRuns,
  syncTitleFromRuns,
  measureRunsWidth,
  measureRunWidth,
  mergeRuns,
} from './model/inline-run.js';
export * from './commands/index.js';
export { serializeDocument, deserializeDocument, parseDocumentFile } from './io/serializer.js';
export { DEFAULT_EXPORT_OPTIONS, getExportSheets, type ExportOptions } from './io/export-options.js';
export {
  exportMarkdown,
  exportOpml,
  exportSvg,
  exportPdf,
  exportPdfPlaceholder,
  exportWordOutline,
  exportExcelCsv,
  exportExcelXml,
  exportPptxOutline,
  exportPptxPlaceholder,
  exportTextBundle,
  exportTextBundleZip,
} from './io/exporters/index.js';
export { exportPptx } from './io/exporters/pptx.js';
export { importMarkdown, importOpml } from './io/importers/index.js';
export {
  importPlainTextIndented,
  importFreeMind,
  importXMind,
  importXMindPlaceholder,
} from './io/importers/extended.js';
export {
  mergeDocuments,
  encryptDocumentJson,
  decryptDocumentJson,
  isEncryptedDocumentJson,
  documentToUserTemplate,
  createFromUserTemplate,
  type UserTemplate,
} from './io/document-utils.js';
export {
  encryptDocumentJsonV2,
  decryptDocumentJsonV2,
  isEncryptedDocumentJsonAny,
  isEncryptedV2,
} from './io/crypto-v2.js';
export { countTopics, charCount, topicWordStats } from './utils/topic-stats.js';
export { nextTextTransform, applyTextTransform, type TextTransformMode } from './utils/text-transform.js';
export { todoProgressMarkerId, syncProgressMarkers, PROGRESS_MARKERS } from './utils/todo-markers.js';
export {
  listMarkers,
  getMarker,
  markerGlyph,
  markerColor,
  MARKER_PRESETS,
  MARKER_PALETTE,
  PRIORITY_COLORS,
  layoutMarkerHits,
  markerOriginForNode,
  type MarkerPreset,
  type MarkerCategory,
  type MarkerIconKind,
  type MarkerHitRect,
} from './markers/presets.js';
export { drawMarker, drawMarkerPreset } from './markers/draw.js';
export {
  layoutTopicContent,
  listTopicAccessories,
  layoutInnerMarkerHits,
  accessoryGlyph,
  estimateLabelChipWidth,
  TOPIC_PAD_X,
  MARKER_SIZE,
  ACCESSORY_SIZE,
  LABEL_CHIP_H,
  LABEL_CHIP_GAP,
  LABEL_CHIP_PAD_X,
  type TopicAccessoryKind,
  type TopicContentLayout,
} from './render/topic-adornments.js';
export {
  listDecorationAssets,
  getDecorationAsset,
  DECORATION_ASSETS,
  type DecorationAsset,
} from './decorations/assets.js';
export {
  resolveDecorationWorldRect,
  decorationOffsetBesideTopic,
  decorationAtViewportCenter,
  type DecorationWorldRect,
} from './decorations/placement.js';
export {
  TextMeasurer,
  createMeasureFn,
  wrapPlainText,
  approximateLineWidth,
  resolveFixedTopicWidth,
  themeFontSizeResolver,
  type FontSizeResolver,
  type TextMeasurerOptions,
} from './layout/measure.js';
export { LayoutRegistry, createDefaultLayoutRegistry } from './layout/registry.js';
export { buildFrame } from './render/pipeline.js';
export { strokeEdge, traceEdgePath, autoCubicControlPoints, defaultRelationshipControlPoint, defaultRelationshipCubicControlPoints, drawRelationshipHandles, drawRelationshipArrows, relationshipLabelPoint, type DrawEdgeOptions } from './render/draw-edge.js';
export {
  HAND_DRAWN_FONT_FAMILY,
  beginHandDrawnDiamond,
  beginHandDrawnEllipse,
  beginHandDrawnLine,
  beginHandDrawnRoundedRect,
  jitterPolyline,
  resolveCanvasFontFamily,
  sampleEdgePoints,
  seedForId,
  traceHandDrawnEdge,
  type HandDrawnStrokeOptions,
} from './render/hand-drawn.js';
export {
  calloutBoundsFromOffset,
  calloutTipSide,
  measureCalloutSize,
  topicCalloutAnchor,
  type CalloutTipSide,
} from './render/callout-geometry.js';
export {
  buildBracePath,
  buildBraceStem,
  drawExtraShape,
  extraShapeSvgElement,
  type DrawExtraShapeOptions,
} from './render/draw-extra-shape.js';
export {
  worldToScreen,
  screenToWorld,
  fitToContent,
  ensureRectVisible,
  hitTestTopic,
  hitTestRelationship,
  hitTestSummary,
  hitTestBoundary,
  hitTestCallout,
  hitTestRelationshipControlPoint,
  hitTestRelationshipControlHandle,
  clampZoom,
  MIN_ZOOM,
  MAX_ZOOM,
  type Viewport,
} from './render/viewport.js';
export {
  COLLAPSE_BTN_RADIUS,
  collapseButtonCenter,
  defaultCollapseSide,
  hitTestCollapseButton,
  inferCollapseSide,
  layoutCollapseButton,
  pointInCollapseButton,
  type CollapseButtonLayout,
  type CollapseSide,
} from './render/collapse-button.js';
export { listThemes, getBuiltinTheme, BUILTIN_THEMES } from './theme/presets.js';
export { generatePalette, generateThemeFromSeed } from './theme/color-gen.js';
export {
  loadCustomThemes,
  saveCustomTheme,
  deleteCustomTheme,
  listAllThemes,
  getTheme,
} from './theme/custom.js';
export { SearchService, getBranchTopicIds, type SearchResult, type SearchOptions } from './search/service.js';
export { sanitizeHtml, stripHtml } from './utils/sanitize.js';
export {
  listTemplates,
  getTemplate,
  createFromTemplate,
  listTemplateCategories,
  TEMPLATE_PRESETS,
  type TemplatePreset,
  type TemplateCategory,
} from './templates/presets.js';
export {
  listCanvasStyleTemplates,
  saveCanvasStyleTemplate,
  deleteCanvasStyleTemplate,
  captureCanvasStyleTemplate,
  type CanvasStyleTemplate,
} from './templates/canvas-style.js';
export {
  STRUCTURE_VARIANTS,
  STRUCTURE_SECTIONS,
  getStructureVariant,
  getVariantsForStructure,
  getDefaultVariantForStructure,
  matchStructureVariant,
  createDocumentWithVariant,
  type StructureVariant,
  type StructureVariantPreview,
  type StructureSection,
  type PreviewLayout,
  type PreviewNodeStyle,
  type PreviewShape,
  type PreviewLineType,
} from './structure/variants.js';
export { equationToDisplayText, equationExtraHeight, wrapEquationForSvg } from './render/equation.js';
export { cullNodes, cullRatio } from './render/culling.js';
export { RenderCache, buildCacheKey, zoomBucket } from './render/cache.js';
