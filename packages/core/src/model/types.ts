export type StructureType =
  | 'mindmap'
  | 'logic-chart'
  | 'tree-chart'
  | 'org-chart'
  | 'timeline'
  | 'fishbone'
  | 'matrix'
  | 'brace-map'
  | 'tree-table';

export type StructureOptions =
  | { type: 'mindmap'; balanced: boolean; direction?: 'auto' | 'left' | 'right' }
  | {
      type: 'logic-chart';
      direction: 'left' | 'right';
      lineStyle?: 'curve' | 'polyline';
      nodeDisplay?: 'box' | 'underline' | 'mixed';
      groupLeaves?: 'none' | 'brace';
      rootDisplay?: 'box' | 'underline';
    }
  | { type: 'tree-chart'; direction: 'top-down' | 'bottom-up' }
  | { type: 'org-chart'; compact: boolean }
  | { type: 'timeline'; axis: 'horizontal' | 'vertical'; alternate: boolean; showScale: boolean }
  | { type: 'fishbone'; headPosition: 'left' | 'right'; branchAngle: number }
  | { type: 'matrix'; rows: number; cols: number; titles: string[]; assignMode: 'auto' | 'manual' }
  | { type: 'brace-map'; braceSide: 'left' | 'right'; partPosition?: 'same' | 'opposite' }
  | { type: 'tree-table'; columns: TreeTableColumn[]; showTreeLine: boolean };

export interface TreeTableColumn {
  id: string;
  field: 'title' | 'note' | 'labels' | 'markers' | 'task';
  width: number;
  label: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSize?: number;
}

export interface TopicStyle {
  shape: 'rounded' | 'rectangle' | 'ellipse' | 'diamond' | 'none';
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderDash?: number[];
  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  fontWeight?: 'normal' | 'bold' | 'light' | 'medium';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textAlign?: 'left' | 'center' | 'right';
  width?: number;
  widthMode?: 'auto' | 'fixed';
}

export interface Label {
  id: string;
  text: string;
  color: string;
}

export interface Hyperlink {
  type: 'url' | 'topic' | 'file' | 'folder';
  target: string;
  title?: string;
}

export interface Callout {
  id: string;
  text: string;
  offset: { x: number; y: number };
  showLeader: boolean;
  style?: {
    backgroundColor: string;
    borderColor: string;
    fontSize: number;
  };
}

/** Local single-user comment (CM-001/002); collaboration fields reserved for v2.0 */
export interface TopicComment {
  id: string;
  text: string;
  createdAt: string;
  author?: string;
}

export interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
  order: number;
}

export interface TaskInfo {
  startDate?: string;
  endDate?: string;
  progress: number;
  priority: 'none' | 'low' | 'medium' | 'high';
  assignee?: string;
}

export interface ImageAttachment {
  src: string;
  width: number;
  height: number;
}

export interface FileAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  data?: string;
  blobRef?: string;
  path?: string;
}

/** EL-021: audio note attached to a topic */
export interface AudioAttachment {
  id: string;
  name: string;
  mimeType: string;
  durationMs?: number;
  /** data URL or blob ref */
  data?: string;
  blobRef?: string;
}

export interface Topic {
  id: string;
  title: string;
  titleRich?: InlineRun[];
  children: Topic[];
  collapsed: boolean;
  style?: TopicStyle;
  note?: string;
  labels: Label[];
  markers: string[];
  image?: ImageAttachment;
  hyperlink?: Hyperlink;
  attachments: FileAttachment[];
  audio?: AudioAttachment;
  task?: TaskInfo;
  quadrantIndex?: number;
  date?: string;
  callout?: Callout;
  todos?: TodoItem[];
  comments?: TopicComment[];
  equation?: string;
  createdAt: string;
  modifiedAt: string;
}

export interface SummaryStyle {
  lineColor: string;
  lineWidth: number;
  lineType: 'arc';
}

export interface Summary {
  id: string;
  parentTopicId: string;
  topicRange: [string, string];
  summaryTopicId: string;
  style?: SummaryStyle;
}

export interface EdgeStyle {
  lineType: 'curve' | 'polyline' | 'straight';
  color: string;
  width: number;
  dash?: number[];
  arrowStart: boolean;
  arrowEnd: boolean;
}

/** Endpoint kind for relationships (ZN-008); default topic when omitted */
export type RelEndpointKind = 'topic' | 'zone' | 'boundary';

export interface Relationship {
  id: string;
  /** Endpoint id (topic / zone / boundary depending on fromKind) */
  fromTopicId: string;
  toTopicId: string;
  fromKind?: RelEndpointKind;
  toKind?: RelEndpointKind;
  title?: string;
  controlPoints?: Point[];
  style?: EdgeStyle;
}

export interface BoundaryStyle {
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  borderDash?: number[];
  opacity: number;
  borderRadius: number;
}

export interface Boundary {
  id: string;
  title?: string;
  topicIds: string[];
  padding?: { top: number; right: number; bottom: number; left: number };
  style?: BoundaryStyle;
}

export interface ZoneStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  opacity: number;
  /** Optional border dash pattern */
  borderDash?: number[];
}

export interface Zone {
  id: string;
  title?: string;
  topicIds: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  showTitle: boolean;
  aspectPreset?: string;
  style?: ZoneStyle;
}

export interface CanvasDecoration {
  id: string;
  type: 'sticker' | 'illustration';
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  attachedTopicId?: string;
}

export interface CanvasSettings {
  backgroundColor: string;
  backgroundPattern: 'solid' | 'grid' | 'dots';
  globalFontFamily?: string;
  coloredBranch: boolean;
  themeId: string;
  handDrawn: boolean;
  aspectGuide?: 'none' | 'a4' | 'a3' | '16:9' | '4:3' | '1:1';
}

export interface PitchSlide {
  id: string;
  topicId: string;
  order: number;
  backgroundColor?: string;
  transition?: 'none' | 'fade' | 'zoom';
}

export interface PitchSettings {
  slides: PitchSlide[];
}

export interface Sheet {
  id: string;
  title: string;
  structure: StructureType;
  structureOptions: StructureOptions;
  rootTopic: Topic;
  relationships: Relationship[];
  boundaries: Boundary[];
  summaries: Summary[];
  zones: Zone[];
  floatingTopics: Topic[];
  decorations: CanvasDecoration[];
  canvasSettings: CanvasSettings;
  pitchSettings: PitchSettings;
}

export interface DocumentSettings {
  autoSave: boolean;
  autoSaveIntervalMs: number;
  locale: 'zh-CN' | 'en-US';
}

export interface MindMapDocument {
  formatVersion: number;
  id: string;
  title: string;
  createdAt: string;
  modifiedAt: string;
  sheets: Sheet[];
  themeId: string;
  settings: DocumentSettings;
}

export interface Theme {
  id: string;
  name: string;
  colors: {
    background: string;
    centralTopic: TopicStyle;
    mainTopic: TopicStyle;
    subTopic: TopicStyle;
    floatingTopic: TopicStyle;
    branchColors: string[];
  };
  edge: EdgeStyle;
  fontFamily: string;
  handDrawn: boolean;
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  /** Logic-chart underline / line-style nodes */
  display?: 'box' | 'underline';
  angle?: number;
  rowIndex?: number;
  colIndex?: number;
  hidden?: boolean;
}

export interface LayoutEdge {
  id: string;
  from: string;
  to: string;
  points: Point[];
  type: 'tree' | 'relationship' | 'summary';
}

export interface ExtraShape {
  id: string;
  type:
    | 'brace'
    | 'matrix-cell'
    | 'timeline-axis'
    | 'boundary'
    | 'summary'
    | 'callout'
    | 'zone'
    | 'table-cell';
  bounds: Rect;
  path?: string;
  label?: string;
  style: Record<string, unknown>;
}

export interface LayoutResult {
  nodes: Map<string, LayoutNode>;
  edges: LayoutEdge[];
  extraShapes: ExtraShape[];
  bounds: Rect;
}

export type MeasureFn = (topic: Topic, depth: number) => Size;

/** Optional sheet data layout strategies may use (e.g. summary reserves). */
export interface LayoutExtras {
  floatingTopics?: Topic[];
  summaries?: Summary[];
}

export interface LayoutStrategy {
  readonly type: StructureType;
  layout(
    root: Topic,
    options: StructureOptions,
    measure: MeasureFn,
    extras?: LayoutExtras,
  ): LayoutResult;
}

export interface RenderFrame {
  layers: RenderLayer[];
  bounds: Rect;
}

export type RenderLayer =
  | { type: 'background'; color: string }
  | { type: 'extra-shapes'; shapes: ExtraShape[] }
  | { type: 'edges'; edges: LayoutEdge[] }
  | { type: 'topics'; nodes: LayoutNode[]; topics: Map<string, Topic> };

export const FORMAT_VERSION = 1;

export function runsToPlain(runs: InlineRun[]): string {
  return runs.map((r) => r.text).join('');
}

export function defaultStructureOptions(type: StructureType): StructureOptions {
  switch (type) {
    case 'mindmap':
      return { type: 'mindmap', balanced: true };
    case 'logic-chart':
      return {
        type: 'logic-chart',
        direction: 'right',
        lineStyle: 'curve',
        nodeDisplay: 'mixed',
        groupLeaves: 'brace',
        rootDisplay: 'box',
      };
    case 'tree-chart':
      return { type: 'tree-chart', direction: 'top-down' };
    case 'org-chart':
      return { type: 'org-chart', compact: false };
    case 'timeline':
      return { type: 'timeline', axis: 'horizontal', alternate: true, showScale: true };
    case 'fishbone':
      return { type: 'fishbone', headPosition: 'right', branchAngle: 45 };
    case 'matrix':
      return { type: 'matrix', rows: 2, cols: 2, titles: ['S', 'W', 'O', 'T'], assignMode: 'auto' };
    case 'brace-map':
      return { type: 'brace-map', braceSide: 'right', partPosition: 'opposite' };
    case 'tree-table':
      return {
        type: 'tree-table',
        columns: [
          { id: 'title', field: 'title', width: 200, label: '主题' },
          { id: 'note', field: 'note', width: 160, label: '备注' },
        ],
        showTreeLine: true,
      };
  }
}
