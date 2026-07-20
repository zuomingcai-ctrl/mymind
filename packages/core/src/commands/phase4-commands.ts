import type { MindMapDocument, TopicStyle, CanvasDecoration } from '../model/types.js';
import {
  generateId,
  updateSheetInDocument,
  updateTopicInSheet,
  updateTopicInTree,
} from '../model/factory.js';
import type { Command } from './types.js';

export class UpdateEquationCommand implements Command {
  readonly name = 'UpdateEquation';
  private oldEquation: string | undefined;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly equation: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        this.oldEquation = t.equation;
        return { ...t, equation: this.equation };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        equation: this.oldEquation,
      })),
    }));
  }
}

export class AddDecorationCommand implements Command {
  readonly name = 'AddDecoration';
  private addedId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly decoration: Omit<CanvasDecoration, 'id'>,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const dec: CanvasDecoration = { ...this.decoration, id: generateId() };
    this.addedId = dec.id;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      decorations: [...sheet.decorations, dec],
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedId) return state;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      decorations: sheet.decorations.filter((d) => d.id !== this.addedId),
    }));
  }
}

export class UpdateDecorationCommand implements Command {
  readonly name = 'UpdateDecoration';
  private snapshot: CanvasDecoration | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly decorationId: string,
    private readonly patch: Partial<CanvasDecoration>,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      decorations: sheet.decorations.map((d) => {
        if (d.id !== this.decorationId) return d;
        this.snapshot = { ...d };
        return { ...d, ...this.patch };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.snapshot) return state;
    const snap = this.snapshot;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      decorations: sheet.decorations.map((d) => (d.id === snap.id ? snap : d)),
    }));
  }
}

export class DeleteDecorationCommand implements Command {
  readonly name = 'DeleteDecoration';
  private snapshot: CanvasDecoration | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly decorationId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      const d = sheet.decorations.find((x) => x.id === this.decorationId);
      this.snapshot = d ? { ...d } : null;
      return {
        ...sheet,
        decorations: sheet.decorations.filter((x) => x.id !== this.decorationId),
      };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.snapshot) return state;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      decorations: [...sheet.decorations, this.snapshot!],
    }));
  }
}

export class UpdateTopicStyleCommand implements Command {
  readonly name = 'UpdateTopicStyle';
  private oldStyle: TopicStyle | undefined;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly style: Partial<TopicStyle>,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) =>
      updateTopicInSheet(sheet, this.topicId, (t) => {
        this.oldStyle = t.style ? { ...t.style } : undefined;
        const next: TopicStyle = { shape: 'rounded', ...t.style, ...this.style };
        // Explicit undefined in the patch means "clear override" (fall back to theme).
        for (const key of Object.keys(this.style) as (keyof TopicStyle)[]) {
          if (this.style[key] === undefined) delete next[key];
        }
        if (!next.shape) next.shape = 'rounded';
        return { ...t, style: next };
      }),
    );
  }

  undo(state: MindMapDocument): MindMapDocument {
    const style = this.oldStyle;
    return updateSheetInDocument(state, this.sheetId, (sheet) =>
      updateTopicInSheet(sheet, this.topicId, (t) => ({
        ...t,
        style,
      })),
    );
  }
}

export class UpdateSummaryRangeCommand implements Command {
  readonly name = 'UpdateSummaryRange';
  private oldRange: [string, string] | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly summaryId: string,
    private readonly topicRange: [string, string],
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      summaries: sheet.summaries.map((s) => {
        if (s.id !== this.summaryId) return s;
        this.oldRange = s.topicRange;
        return { ...s, topicRange: this.topicRange };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.oldRange) return state;
    const range = this.oldRange;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      summaries: sheet.summaries.map((s) =>
        s.id === this.summaryId ? { ...s, topicRange: range } : s,
      ),
    }));
  }
}

export class UpdateBoundaryPaddingCommand implements Command {
  readonly name = 'UpdateBoundaryPadding';
  private oldPadding: import('../model/types.js').Boundary['padding'] | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly boundaryId: string,
    private readonly padding: { top: number; right: number; bottom: number; left: number },
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      boundaries: sheet.boundaries.map((b) => {
        if (b.id !== this.boundaryId) return b;
        this.oldPadding = b.padding ? { ...b.padding } : undefined;
        return { ...b, padding: this.padding };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    const old = this.oldPadding;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      boundaries: sheet.boundaries.map((b) =>
        b.id === this.boundaryId ? { ...b, padding: old ?? undefined } : b,
      ),
    }));
  }
}

export class UpdateRelationshipControlPointsCommand implements Command {
  readonly name = 'UpdateRelationshipControlPoints';
  private oldPoints: import('../model/types.js').Point[] | undefined;
  private captured = false;

  constructor(
    private readonly sheetId: string,
    private readonly relationshipId: string,
    private readonly controlPoints: import('../model/types.js').Point[],
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      relationships: sheet.relationships.map((r) => {
        if (r.id !== this.relationshipId) return r;
        if (!this.captured) {
          this.oldPoints = r.controlPoints ? r.controlPoints.map((p) => ({ ...p })) : undefined;
          this.captured = true;
        }
        return { ...r, controlPoints: this.controlPoints };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      relationships: sheet.relationships.map((r) =>
        r.id === this.relationshipId ? { ...r, controlPoints: this.oldPoints } : r,
      ),
    }));
  }

  canMerge(other: Command): boolean {
    return (
      other instanceof UpdateRelationshipControlPointsCommand &&
      other.sheetId === this.sheetId &&
      other.relationshipId === this.relationshipId
    );
  }

  merge(other: Command): Command {
    const o = other as UpdateRelationshipControlPointsCommand;
    const merged = new UpdateRelationshipControlPointsCommand(
      this.sheetId,
      this.relationshipId,
      o.controlPoints,
    );
    merged.oldPoints = this.oldPoints;
    merged.captured = true;
    return merged;
  }
}

export class UpdateRelationshipTitleCommand implements Command {
  readonly name = 'UpdateRelationshipTitle';
  private oldTitle: string | undefined;

  constructor(
    private readonly sheetId: string,
    private readonly relationshipId: string,
    private readonly title: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      relationships: sheet.relationships.map((r) => {
        if (r.id !== this.relationshipId) return r;
        this.oldTitle = r.title;
        return { ...r, title: this.title };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      relationships: sheet.relationships.map((r) =>
        r.id === this.relationshipId ? { ...r, title: this.oldTitle } : r,
      ),
    }));
  }

  canMerge(other: Command): boolean {
    return (
      other instanceof UpdateRelationshipTitleCommand &&
      other.sheetId === this.sheetId &&
      other.relationshipId === this.relationshipId
    );
  }

  merge(other: Command): Command {
    const o = other as UpdateRelationshipTitleCommand;
    const merged = new UpdateRelationshipTitleCommand(this.sheetId, this.relationshipId, o.title);
    merged.oldTitle = this.oldTitle;
    return merged;
  }
}

export class UpdateRelationshipStyleCommand implements Command {
  readonly name = 'UpdateRelationshipStyle';
  private oldStyle: import('../model/types.js').EdgeStyle | undefined;

  constructor(
    private readonly sheetId: string,
    private readonly relationshipId: string,
    private readonly patch: Partial<import('../model/types.js').EdgeStyle>,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      relationships: sheet.relationships.map((r) => {
        if (r.id !== this.relationshipId) return r;
        this.oldStyle = r.style ? { ...r.style } : undefined;
        const base: import('../model/types.js').EdgeStyle = r.style ?? {
          lineType: 'curve',
          color: '#666',
          width: 2,
          arrowStart: false,
          arrowEnd: true,
        };
        return { ...r, style: { ...base, ...this.patch } };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      relationships: sheet.relationships.map((r) =>
        r.id === this.relationshipId ? { ...r, style: this.oldStyle } : r,
      ),
    }));
  }
}
