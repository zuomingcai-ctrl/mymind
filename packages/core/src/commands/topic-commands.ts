import type { MindMapDocument } from '../model/types.js';
import {
  createTopic,
  findParentOfTopic,
  findTopicInSheet,
  touchTopic,
  updateSheetInDocument,
  updateTopicInTree,
} from '../model/factory.js';
import { syncTitleFromRuns, plainToRuns } from '../model/inline-run.js';
import type { Command } from './types.js';

export class AddTopicCommand implements Command {
  readonly name = 'AddTopic';
  addedTopicId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly parentId: string,
    private readonly title = '分支主题',
    private readonly index?: number,
    private readonly asSibling = false,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const newTopic = createTopic(this.title);
    this.addedTopicId = newTopic.id;

    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      if (this.asSibling) {
        const parent = findParentOfTopic(sheet.rootTopic, this.parentId);
        if (!parent) return sheet;
        const idx = this.index ?? parent.children.length;
        const children = [...parent.children];
        children.splice(idx, 0, newTopic);
        return {
          ...sheet,
          rootTopic: updateTopicInTree(sheet.rootTopic, parent.id, (t) => ({
            ...t,
            children,
          })),
        };
      }

      const parent = findTopicInSheet(sheet, this.parentId);
      if (!parent) return sheet;

      const idx = this.index ?? parent.children.length;
      const children = [...parent.children];
      children.splice(idx, 0, newTopic);

      return {
        ...sheet,
        rootTopic: updateTopicInTree(sheet.rootTopic, this.parentId, (t) => ({
          ...t,
          children,
        })),
      };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedTopicId) return state;
    const topicId = this.addedTopicId;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: removeTopicById(sheet.rootTopic, topicId),
    }));
  }
}

function removeTopicById(
  root: import('../model/types.js').Topic,
  id: string,
): import('../model/types.js').Topic {
  return {
    ...root,
    children: root.children
      .filter((c) => c.id !== id)
      .map((c) => removeTopicById(c, id)),
  };
}

export class DeleteTopicCommand implements Command {
  readonly name = 'DeleteTopic';
  private snapshot: import('../model/types.js').Topic | null = null;
  private parentId: string | null = null;
  private index = 0;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      if (sheet.rootTopic.id === this.topicId) {
        throw new Error('Cannot delete root topic');
      }

      const parent = findParentOfTopic(sheet.rootTopic, this.topicId);
      if (!parent) return sheet;

      const topic = findTopicInSheet(sheet, this.topicId);
      if (!topic) return sheet;

      this.snapshot = JSON.parse(JSON.stringify(topic));
      this.parentId = parent.id;
      this.index = parent.children.findIndex((c) => c.id === this.topicId);

      return {
        ...sheet,
        rootTopic: updateTopicInTree(sheet.rootTopic, parent.id, (t) => ({
          ...t,
          children: t.children.filter((c) => c.id !== this.topicId),
        })),
      };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.snapshot || this.parentId === null) return state;

    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.parentId!, (t) => {
        const children = [...t.children];
        children.splice(this.index, 0, this.snapshot!);
        return { ...t, children };
      }),
    }));
  }
}

export class UpdateTopicTitleCommand implements Command {
  readonly name = 'UpdateTopicTitle';
  private resolvedOldTitle: string | undefined;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly newTitle: string,
    oldTitle?: string,
  ) {
    this.resolvedOldTitle = oldTitle;
  }

  execute(state: MindMapDocument): MindMapDocument {
    if (this.resolvedOldTitle === undefined) {
      const sheet = state.sheets.find((s) => s.id === this.sheetId);
      const topic = sheet ? findTopicInSheet(sheet, this.topicId) : null;
      this.resolvedOldTitle = topic?.title ?? '';
    }
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        const synced = syncTitleFromRuns(plainToRuns(this.newTitle));
        return touchTopic({ ...t, title: synced.title, titleRich: synced.titleRich }, synced.title);
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    const title = this.resolvedOldTitle ?? '';
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) =>
        touchTopic({ ...t, title }, title),
      ),
    }));
  }

  canMerge(other: Command): boolean {
    return (
      other instanceof UpdateTopicTitleCommand &&
      other.sheetId === this.sheetId &&
      other.topicId === this.topicId
    );
  }

  merge(other: Command): Command {
    const o = other as UpdateTopicTitleCommand;
    return new UpdateTopicTitleCommand(
      this.sheetId,
      this.topicId,
      o.newTitle,
      this.resolvedOldTitle,
    );
  }
}

export class ToggleCollapseCommand implements Command {
  readonly name = 'ToggleCollapse';
  private previousCollapsed: boolean | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        this.previousCollapsed = t.collapsed;
        return { ...t, collapsed: !t.collapsed };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (this.previousCollapsed === null) return state;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        collapsed: this.previousCollapsed!,
      })),
    }));
  }
}
