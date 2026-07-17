import type { Callout, MindMapDocument, TaskInfo, TopicComment } from '../model/types.js';
import { generateId, updateSheetInDocument, updateTopicInTree } from '../model/factory.js';
import type { Command } from './types.js';

export class AddCalloutCommand implements Command {
  readonly name = 'AddCallout';
  private calloutId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly text = '标注',
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const callout: Callout = {
      id: generateId(),
      text: this.text,
      offset: { x: 40, y: -40 },
      showLeader: true,
      style: {
        backgroundColor: '#FFF9E6',
        borderColor: '#E6C35C',
        fontSize: 12,
      },
    };
    this.calloutId = callout.id;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        callout,
      })),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.calloutId) return state;
    const id = this.calloutId;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        if (t.callout?.id !== id) return t;
        return { ...t, callout: undefined };
      }),
    }));
  }
}

export class UpdateCalloutCommand implements Command {
  readonly name = 'UpdateCallout';
  private oldCallout: Callout | undefined;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly patch: Partial<Omit<Callout, 'id'>>,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        this.oldCallout = t.callout ? { ...t.callout } : undefined;
        if (!t.callout) return t;
        return { ...t, callout: { ...t.callout, ...this.patch } };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        callout: this.oldCallout,
      })),
    }));
  }
}

export class DeleteCalloutCommand implements Command {
  readonly name = 'DeleteCallout';
  private snapshot: Callout | undefined;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        this.snapshot = t.callout ? { ...t.callout } : undefined;
        return { ...t, callout: undefined };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        callout: this.snapshot,
      })),
    }));
  }
}

export class AddCommentCommand implements Command {
  readonly name = 'AddComment';
  private addedId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly text: string,
    private readonly author = '我',
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const comment: TopicComment = {
      id: generateId(),
      text: this.text,
      createdAt: new Date().toISOString(),
      author: this.author,
    };
    this.addedId = comment.id;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        comments: [...(t.comments ?? []), comment],
      })),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedId) return state;
    const id = this.addedId;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        comments: (t.comments ?? []).filter((c) => c.id !== id),
      })),
    }));
  }
}

export class UpdateTaskCommand implements Command {
  readonly name = 'UpdateTask';
  private oldTask: TaskInfo | undefined;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly task: TaskInfo | undefined,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        this.oldTask = t.task ? { ...t.task } : undefined;
        return { ...t, task: this.task };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        task: this.oldTask,
      })),
    }));
  }
}
