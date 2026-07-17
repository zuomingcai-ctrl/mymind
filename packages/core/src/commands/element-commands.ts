import type { MindMapDocument, Topic, Summary, Boundary } from '../model/types.js';
import {
  createTopic,
  findTopicInSheet,
  generateId,
  updateSheetInDocument,
  updateTopicInTree,
} from '../model/factory.js';
import type { Command } from './types.js';

export class UpdateNoteCommand implements Command {
  readonly name = 'UpdateNote';
  private oldNote: string | undefined;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly note: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        this.oldNote = t.note;
        return { ...t, note: this.note };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        note: this.oldNote,
      })),
    }));
  }
}

export class AddLabelCommand implements Command {
  readonly name = 'AddLabel';
  private addedLabelId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly text: string,
    private readonly color = '#4A90D9',
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const label = { id: generateId(), text: this.text, color: this.color };
    this.addedLabelId = label.id;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        labels: [...t.labels, label],
      })),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedLabelId) return state;
    const id = this.addedLabelId;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        labels: t.labels.filter((l) => l.id !== id),
      })),
    }));
  }
}

export class AddMarkerCommand implements Command {
  readonly name = 'AddMarker';
  private markerId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly markerIconId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    this.markerId = this.markerIconId;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        markers: [...t.markers, this.markerIconId],
      })),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.markerId) return state;
    const id = this.markerId;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        markers: t.markers.filter((m) => m !== id),
      })),
    }));
  }
}

export class MoveTopicCommand implements Command {
  readonly name = 'MoveTopic';
  private snapshot: { oldParentId: string; oldIndex: number } | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly newParentId: string,
    private readonly newIndex: number,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      if (sheet.rootTopic.id === this.topicId) return sheet;
      const oldParent = findParent(sheet.rootTopic, this.topicId);
      if (!oldParent) return sheet;
      this.snapshot = {
        oldParentId: oldParent.id,
        oldIndex: oldParent.children.findIndex((c) => c.id === this.topicId),
      };

      let moved: Topic | null = null;
      const strip = (root: Topic): Topic => ({
        ...root,
        children: root.children
          .filter((c) => {
            if (c.id === this.topicId) {
              moved = JSON.parse(JSON.stringify(c));
              return false;
            }
            return true;
          })
          .map(strip),
      });

      let root = strip(sheet.rootTopic);
      if (!moved) return sheet;
      root = insertChild(root, this.newParentId, moved, this.newIndex);
      return { ...sheet, rootTopic: root };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.snapshot) return state;
    const { oldParentId, oldIndex } = this.snapshot;
    return new MoveTopicCommand(
      this.sheetId,
      this.topicId,
      oldParentId,
      oldIndex,
    ).execute(state);
  }
}

export class AddFloatingTopicCommand implements Command {
  readonly name = 'AddFloatingTopic';
  addedTopicId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly title = '自由主题',
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const topic = createTopic(this.title);
    this.addedTopicId = topic.id;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      floatingTopics: [...sheet.floatingTopics, topic],
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedTopicId) return state;
    const id = this.addedTopicId;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      floatingTopics: sheet.floatingTopics.filter((t) => t.id !== id),
    }));
  }
}

function findParent(root: Topic, id: string): Topic | null {
  for (const child of root.children) {
    if (child.id === id) return root;
    const found = findParent(child, id);
    if (found) return found;
  }
  return null;
}

function insertChild(root: Topic, parentId: string, child: Topic, index: number): Topic {
  if (root.id === parentId) {
    const children = [...root.children];
    children.splice(index, 0, child);
    return { ...root, children };
  }
  return {
    ...root,
    children: root.children.map((c) => insertChild(c, parentId, child, index)),
  };
}

export interface ClipboardPayload {
  format: 'mymind/topics/v1';
  sourceSheetId: string;
  topics: Topic[];
  summaries?: Summary[];
  boundaries?: Boundary[];
}

export function remapTopics(topics: Topic[]): Topic[] {
  const idMap = new Map<string, string>();

  function remap(topic: Topic): Topic {
    const newId = generateId();
    idMap.set(topic.id, newId);
    return {
      ...topic,
      id: newId,
      children: topic.children.map(remap),
    };
  }

  return topics.map(remap);
}

export class PasteTopicsCommand implements Command {
  readonly name = 'PasteTopics';
  private pastedRootIds: string[] = [];

  constructor(
    private readonly sheetId: string,
    private readonly parentId: string,
    private readonly payload: ClipboardPayload,
    private readonly insertIndex?: number,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const remapped = remapTopics(this.payload.topics);
    this.pastedRootIds = remapped.map((t) => t.id);

    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      if (this.parentId === '__floating__') {
        return { ...sheet, floatingTopics: [...sheet.floatingTopics, ...remapped] };
      }
      const idx = this.insertIndex ?? findTopicInSheet(sheet, this.parentId)?.children.length ?? 0;
      return {
        ...sheet,
        rootTopic: insertMultiple(sheet.rootTopic, this.parentId, remapped, idx),
      };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      let root = sheet.rootTopic;
      for (const id of this.pastedRootIds) {
        root = removeById(root, id);
      }
      return {
        ...sheet,
        rootTopic: root,
        floatingTopics: sheet.floatingTopics.filter(
          (t) => !this.pastedRootIds.includes(t.id),
        ),
      };
    });
  }
}

function insertMultiple(root: Topic, parentId: string, children: Topic[], startIndex: number): Topic {
  if (root.id === parentId) {
    const list = [...root.children];
    list.splice(startIndex, 0, ...children);
    return { ...root, children: list };
  }
  return {
    ...root,
    children: root.children.map((c) => insertMultiple(c, parentId, children, startIndex)),
  };
}

function removeById(root: Topic, id: string): Topic {
  return {
    ...root,
    children: root.children.filter((c) => c.id !== id).map((c) => removeById(c, id)),
  };
}
