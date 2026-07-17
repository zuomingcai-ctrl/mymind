import type { MindMapDocument, Summary, Boundary, Relationship } from '../model/types.js';
import { createTopic, generateId, updateSheetInDocument } from '../model/factory.js';
import type { Command } from './types.js';

export class AddSummaryCommand implements Command {
  readonly name = 'AddSummary';
  private addedSummaryId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly parentTopicId: string,
    private readonly topicRange: [string, string],
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const summaryTopic = createTopic('概要');
    const summary: Summary = {
      id: generateId(),
      parentTopicId: this.parentTopicId,
      topicRange: this.topicRange,
      summaryTopicId: summaryTopic.id,
    };
    this.addedSummaryId = summary.id;

    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      summaries: [...sheet.summaries, summary],
      floatingTopics: [...sheet.floatingTopics, summaryTopic],
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedSummaryId) return state;
    const id = this.addedSummaryId;
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      const summary = sheet.summaries.find((s) => s.id === id);
      return {
        ...sheet,
        summaries: sheet.summaries.filter((s) => s.id !== id),
        floatingTopics: summary
          ? sheet.floatingTopics.filter((t) => t.id !== summary.summaryTopicId)
          : sheet.floatingTopics,
      };
    });
  }
}

export class DeleteSummaryCommand implements Command {
  readonly name = 'DeleteSummary';
  private snapshot: Summary | null = null;
  private topicSnapshot: import('../model/types.js').Topic | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly summaryId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      const summary = sheet.summaries.find((s) => s.id === this.summaryId);
      if (!summary) return sheet;
      this.snapshot = JSON.parse(JSON.stringify(summary));
      const topic = sheet.floatingTopics.find((t) => t.id === summary.summaryTopicId);
      this.topicSnapshot = topic ? JSON.parse(JSON.stringify(topic)) : null;
      return {
        ...sheet,
        summaries: sheet.summaries.filter((s) => s.id !== this.summaryId),
        floatingTopics: sheet.floatingTopics.filter((t) => t.id !== summary.summaryTopicId),
      };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.snapshot) return state;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      summaries: [...sheet.summaries, this.snapshot!],
      floatingTopics: this.topicSnapshot
        ? [...sheet.floatingTopics, this.topicSnapshot]
        : sheet.floatingTopics,
    }));
  }
}

export class AddBoundaryCommand implements Command {
  readonly name = 'AddBoundary';
  private addedId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicIds: string[],
    private readonly title?: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const boundary: Boundary = {
      id: generateId(),
      topicIds: [...this.topicIds],
      title: this.title,
    };
    this.addedId = boundary.id;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      boundaries: [...sheet.boundaries, boundary],
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedId) return state;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      boundaries: sheet.boundaries.filter((b) => b.id !== this.addedId),
    }));
  }
}

export class DeleteBoundaryCommand implements Command {
  readonly name = 'DeleteBoundary';
  private snapshot: Boundary | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly boundaryId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      const b = sheet.boundaries.find((x) => x.id === this.boundaryId);
      if (!b) return sheet;
      this.snapshot = JSON.parse(JSON.stringify(b));
      return {
        ...sheet,
        boundaries: sheet.boundaries.filter((x) => x.id !== this.boundaryId),
      };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.snapshot) return state;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      boundaries: [...sheet.boundaries, this.snapshot!],
    }));
  }
}

export class AddRelationshipCommand implements Command {
  readonly name = 'AddRelationship';
  private addedId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly fromTopicId: string,
    private readonly toTopicId: string,
    private readonly title?: string,
    private readonly fromKind: import('../model/types.js').RelEndpointKind = 'topic',
    private readonly toKind: import('../model/types.js').RelEndpointKind = 'topic',
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    if (this.fromTopicId === this.toTopicId && this.fromKind === this.toKind) {
      throw new Error('Relationship cannot be self-loop');
    }
    const rel: Relationship = {
      id: generateId(),
      fromTopicId: this.fromTopicId,
      toTopicId: this.toTopicId,
      fromKind: this.fromKind,
      toKind: this.toKind,
      title: this.title,
      style: { lineType: 'curve', color: '#666', width: 2, arrowStart: false, arrowEnd: true },
    };
    this.addedId = rel.id;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      relationships: [...sheet.relationships, rel],
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedId) return state;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      relationships: sheet.relationships.filter((r) => r.id !== this.addedId),
    }));
  }
}

export class DeleteRelationshipCommand implements Command {
  readonly name = 'DeleteRelationship';
  private snapshot: Relationship | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly relationshipId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      const r = sheet.relationships.find((x) => x.id === this.relationshipId);
      if (!r) return sheet;
      this.snapshot = JSON.parse(JSON.stringify(r));
      return {
        ...sheet,
        relationships: sheet.relationships.filter((x) => x.id !== this.relationshipId),
      };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.snapshot) return state;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      relationships: [...sheet.relationships, this.snapshot!],
    }));
  }
}
