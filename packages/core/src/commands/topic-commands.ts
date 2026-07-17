import type { MindMapDocument, Topic } from '../model/types.js';
import {
  createTopic,
  findParentInSheet,
  findTopicById,
  findTopicInSheet,
  isFloatingTopicRoot,
  touchTopic,
  updateSheetInDocument,
  updateTopicInSheet,
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
        const parent = findParentInSheet(sheet, this.parentId);
        if (!parent) {
          // Floating root (e.g. summary topic) or missing parent: add as child instead.
          if (!findTopicInSheet(sheet, this.parentId)) return sheet;
          return addChildInSheet(sheet, this.parentId, newTopic, this.index);
        }
        const idx = this.index ?? parent.children.length;
        return addChildInSheet(sheet, parent.id, newTopic, idx);
      }

      if (!findTopicInSheet(sheet, this.parentId)) return sheet;
      return addChildInSheet(sheet, this.parentId, newTopic, this.index);
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedTopicId) return state;
    const topicId = this.addedTopicId;
    return updateSheetInDocument(state, this.sheetId, (sheet) => removeTopicInSheet(sheet, topicId));
  }
}

function addChildInSheet(
  sheet: import('../model/types.js').Sheet,
  parentId: string,
  child: Topic,
  index?: number,
): import('../model/types.js').Sheet {
  return updateTopicInSheet(sheet, parentId, (t) => {
    const children = [...t.children];
    children.splice(index ?? children.length, 0, child);
    return { ...t, children };
  });
}

function removeTopicInSheet(
  sheet: import('../model/types.js').Sheet,
  topicId: string,
): import('../model/types.js').Sheet {
  if (findTopicById(sheet.rootTopic, topicId)) {
    return { ...sheet, rootTopic: removeTopicById(sheet.rootTopic, topicId) };
  }
  return {
    ...sheet,
    floatingTopics: sheet.floatingTopics.map((f) => removeTopicById(f, topicId)),
  };
}

function removeTopicById(root: Topic, id: string): Topic {
  return {
    ...root,
    children: root.children
      .filter((c) => c.id !== id)
      .map((c) => removeTopicById(c, id)),
  };
}

export class DeleteTopicCommand implements Command {
  readonly name = 'DeleteTopic';
  private snapshot: Topic | null = null;
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
      if (isFloatingTopicRoot(sheet, this.topicId)) {
        // Floating roots are removed via DeleteFloatingTopicCommand / DeleteSummaryCommand.
        return sheet;
      }

      const parent = findParentInSheet(sheet, this.topicId);
      if (!parent) return sheet;

      const topic = findTopicInSheet(sheet, this.topicId);
      if (!topic) return sheet;

      this.snapshot = JSON.parse(JSON.stringify(topic));
      this.parentId = parent.id;
      this.index = parent.children.findIndex((c) => c.id === this.topicId);

      return updateTopicInSheet(sheet, parent.id, (t) => ({
        ...t,
        children: t.children.filter((c) => c.id !== this.topicId),
      }));
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.snapshot || this.parentId === null) return state;
    const snapshot = this.snapshot;
    const index = this.index;
    return updateSheetInDocument(state, this.sheetId, (sheet) =>
      updateTopicInSheet(sheet, this.parentId!, (t) => {
        const children = [...t.children];
        children.splice(index, 0, snapshot);
        return { ...t, children };
      }),
    );
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
    return updateSheetInDocument(state, this.sheetId, (sheet) =>
      updateTopicInSheet(sheet, this.topicId, (t) => {
        const synced = syncTitleFromRuns(plainToRuns(this.newTitle));
        return touchTopic({ ...t, title: synced.title, titleRich: synced.titleRich }, synced.title);
      }),
    );
  }

  undo(state: MindMapDocument): MindMapDocument {
    const title = this.resolvedOldTitle ?? '';
    return updateSheetInDocument(state, this.sheetId, (sheet) =>
      updateTopicInSheet(sheet, this.topicId, (t) => touchTopic({ ...t, title }, title)),
    );
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
    return updateSheetInDocument(state, this.sheetId, (sheet) =>
      updateTopicInSheet(sheet, this.topicId, (t) => {
        this.previousCollapsed = t.collapsed;
        return { ...t, collapsed: !t.collapsed };
      }),
    );
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (this.previousCollapsed === null) return state;
    const collapsed = this.previousCollapsed;
    return updateSheetInDocument(state, this.sheetId, (sheet) =>
      updateTopicInSheet(sheet, this.topicId, (t) => ({ ...t, collapsed })),
    );
  }
}
