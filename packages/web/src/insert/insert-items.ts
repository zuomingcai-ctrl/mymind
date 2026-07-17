import type { Sheet } from '@mymind/core';

/** Insert action ids aligned with 功能特性规格 §5.0 */
export type InsertActionId =
  | 'zone'
  | 'note'
  | 'label'
  | 'callout'
  | 'comment'
  | 'todo'
  | 'task'
  | 'link-web'
  | 'link-topic'
  | 'link-file'
  | 'attachment'
  | 'sticker'
  | 'illustration'
  | 'image'
  | 'equation';

export interface InsertItemDef {
  id: InsertActionId;
  label: string;
  /** Requires at least one selected topic */
  requiresTopic: boolean;
  /** Extra enable predicate (e.g. zone cannot wrap central) */
  canEnable?: (ctx: InsertEnableContext) => boolean;
}

export interface InsertEnableContext {
  sheet: Sheet | null;
  selection: string[];
  rootId: string | null;
}

export const INSERT_ITEMS: InsertItemDef[] = [
  { id: 'zone', label: '专区', requiresTopic: true, canEnable: (ctx) =>
    ctx.selection.length > 0 && !!ctx.rootId && !ctx.selection.includes(ctx.rootId) },
  { id: 'note', label: '笔记', requiresTopic: true },
  { id: 'label', label: '标签', requiresTopic: true },
  { id: 'callout', label: '标注', requiresTopic: true },
  { id: 'comment', label: '评论', requiresTopic: true },
  { id: 'todo', label: '待办事项', requiresTopic: true },
  { id: 'task', label: '任务', requiresTopic: true },
  { id: 'link-web', label: '网页', requiresTopic: true },
  { id: 'link-topic', label: '主题', requiresTopic: true },
  { id: 'link-file', label: '文件', requiresTopic: true },
  { id: 'attachment', label: '附件', requiresTopic: true },
  { id: 'sticker', label: '贴纸', requiresTopic: false },
  { id: 'illustration', label: '插画', requiresTopic: false },
  { id: 'image', label: '本地图片', requiresTopic: true },
  { id: 'equation', label: '方程', requiresTopic: true },
];

export const INSERT_LEFT_COLUMN: InsertActionId[] = [
  'zone',
  'callout',
  'comment',
  'link-web', // parent shown as 链接 submenu
];

export const INSERT_RIGHT_COLUMN: InsertActionId[] = [
  'note',
  'label',
  'todo',
  'task',
  'attachment',
  'sticker',
  'illustration',
  'image',
  'equation',
];

export const LINK_SUBMENU: InsertActionId[] = ['link-web', 'link-topic', 'link-file'];

export function isInsertEnabled(id: InsertActionId, ctx: InsertEnableContext): boolean {
  const def = INSERT_ITEMS.find((i) => i.id === id);
  if (!def) return false;
  if (!ctx.sheet) return false;
  if (def.requiresTopic && ctx.selection.length === 0) return false;
  if (def.canEnable) return def.canEnable(ctx);
  return true;
}

export function insertItemLabel(id: InsertActionId): string {
  return INSERT_ITEMS.find((i) => i.id === id)?.label ?? id;
}
