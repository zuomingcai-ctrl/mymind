import type { MindMapDocument, TopicStyle } from '../model/types.js';
import { findTopicInSheet, updateSheetInDocument, updateTopicInTree } from '../model/factory.js';
import type { Command } from './types.js';

export class FormatPainterCommand implements Command {
  readonly name = 'FormatPainter';
  private oldStyles = new Map<string, TopicStyle | undefined>();

  constructor(
    private readonly sheetId: string,
    private readonly sourceTopicId: string,
    private readonly targetTopicIds: string[],
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const sheet = state.sheets.find((s) => s.id === this.sheetId);
    const source = sheet ? findTopicInSheet(sheet, this.sourceTopicId) : null;
    if (!source?.style) return state;

    return updateSheetInDocument(state, this.sheetId, (s) => {
      let root = s.rootTopic;
      for (const id of this.targetTopicIds) {
        root = updateTopicInTree(root, id, (t) => {
          this.oldStyles.set(id, t.style);
          return { ...t, style: { ...source.style! } };
        });
      }
      return { ...s, rootTopic: root };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (s) => {
      let root = s.rootTopic;
      for (const [id, style] of this.oldStyles) {
        root = updateTopicInTree(root, id, (t) => ({ ...t, style }));
      }
      return { ...s, rootTopic: root };
    });
  }
}

export class SaveAsDocumentCommand implements Command {
  readonly name = 'SaveAsDocument';

  constructor(private readonly newTitle: string) {}

  execute(state: MindMapDocument): MindMapDocument {
    const now = new Date().toISOString();
    return {
      ...JSON.parse(JSON.stringify(state)),
      id: cryptoRandomId(),
      title: this.newTitle,
      createdAt: now,
      modifiedAt: now,
    };
  }

  undo(state: MindMapDocument): MindMapDocument {
    return state;
  }
}

function cryptoRandomId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
