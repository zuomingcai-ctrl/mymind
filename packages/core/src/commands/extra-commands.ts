import type {
  MindMapDocument,
  PitchSettings,
  PitchSlide,
  Sheet,
  Topic,
} from '../model/types.js';
import {
  createTopic,
  findParentOfTopic,
  findTopicInSheet,
  generateId,
  updateSheetInDocument,
  updateTopicInTree,
} from '../model/factory.js';
import type { Command } from './types.js';

/** ED-004: insert a parent above the current topic */
export class InsertParentTopicCommand implements Command {
  readonly name = 'InsertParentTopic';
  addedTopicId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly title = '父主题',
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      if (sheet.rootTopic.id === this.topicId) return sheet;
      const parent = findParentOfTopic(sheet.rootTopic, this.topicId);
      if (!parent) return sheet;
      const idx = parent.children.findIndex((c) => c.id === this.topicId);
      if (idx < 0) return sheet;
      const child = parent.children[idx]!;
      const newParent = createTopic(this.title);
      newParent.children = [JSON.parse(JSON.stringify(child))];
      this.addedTopicId = newParent.id;
      const children = [...parent.children];
      children.splice(idx, 1, newParent);
      return {
        ...sheet,
        rootTopic: updateTopicInTree(sheet.rootTopic, parent.id, (t) => ({
          ...t,
          children,
        })),
      };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedTopicId) return state;
    const parentId = this.addedTopicId;
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      const parent = findTopicInSheet(sheet, parentId);
      if (!parent || parent.children.length !== 1) return sheet;
      const child = parent.children[0]!;
      const grand = findParentOfTopic(sheet.rootTopic, parentId);
      if (!grand) return sheet;
      const idx = grand.children.findIndex((c) => c.id === parentId);
      const children = [...grand.children];
      children.splice(idx, 1, child);
      return {
        ...sheet,
        rootTopic: updateTopicInTree(sheet.rootTopic, grand.id, (t) => ({
          ...t,
          children,
        })),
      };
    });
  }
}

/** SH-005: duplicate an entire sheet */
export class CopySheetCommand implements Command {
  readonly name = 'CopySheet';
  addedSheetId: string | null = null;

  constructor(private readonly sheetId: string) {}

  execute(state: MindMapDocument): MindMapDocument {
    const src = state.sheets.find((s) => s.id === this.sheetId);
    if (!src) return state;
    const copy: Sheet = JSON.parse(JSON.stringify(src));
    copy.id = generateId();
    copy.title = `${src.title} 副本`;
    remapSheetIds(copy);
    this.addedSheetId = copy.id;
    return { ...state, sheets: [...state.sheets, copy] };
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedSheetId) return state;
    return {
      ...state,
      sheets: state.sheets.filter((s) => s.id !== this.addedSheetId),
    };
  }
}

function remapSheetIds(sheet: Sheet): void {
  const map = new Map<string, string>();
  const walk = (t: Topic) => {
    const nid = generateId();
    map.set(t.id, nid);
    t.id = nid;
    for (const c of t.children) walk(c);
  };
  walk(sheet.rootTopic);
  for (const f of sheet.floatingTopics) walk(f);
  const mapId = (id: string) => map.get(id) ?? id;
  for (const b of sheet.boundaries) {
    b.id = generateId();
    b.topicIds = b.topicIds.map(mapId);
  }
  for (const r of sheet.relationships) {
    r.id = generateId();
    r.fromTopicId = mapId(r.fromTopicId);
    r.toTopicId = mapId(r.toTopicId);
  }
  for (const s of sheet.summaries) {
    s.id = generateId();
    s.parentTopicId = mapId(s.parentTopicId);
    s.topicRange = [mapId(s.topicRange[0]), mapId(s.topicRange[1])];
    s.summaryTopicId = mapId(s.summaryTopicId);
  }
  for (const z of sheet.zones) {
    z.id = generateId();
    z.topicIds = z.topicIds.map(mapId);
  }
  for (const d of sheet.decorations) {
    d.id = generateId();
    if (d.attachedTopicId) d.attachedTopicId = mapId(d.attachedTopicId);
  }
  for (const slide of sheet.pitchSettings.slides) {
    slide.id = generateId();
    slide.topicId = mapId(slide.topicId);
  }
}

export class UpdatePitchSettingsCommand implements Command {
  readonly name = 'UpdatePitchSettings';
  private previous: PitchSettings | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly pitchSettings: PitchSettings,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      this.previous = JSON.parse(JSON.stringify(sheet.pitchSettings));
      return { ...sheet, pitchSettings: this.pitchSettings };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.previous) return state;
    const prev = this.previous;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      pitchSettings: prev,
    }));
  }
}

export class AddPitchSlideCommand implements Command {
  readonly name = 'AddPitchSlide';
  private addedId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      const slide: PitchSlide = {
        id: generateId(),
        topicId: this.topicId,
        order: sheet.pitchSettings.slides.length,
      };
      this.addedId = slide.id;
      return {
        ...sheet,
        pitchSettings: {
          slides: [...sheet.pitchSettings.slides, slide],
        },
      };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedId) return state;
    const id = this.addedId;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      pitchSettings: {
        slides: sheet.pitchSettings.slides.filter((s) => s.id !== id),
      },
    }));
  }
}

export class DeletePitchSlideCommand implements Command {
  readonly name = 'DeletePitchSlide';
  private snapshot: PitchSlide | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly slideId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      this.snapshot = sheet.pitchSettings.slides.find((s) => s.id === this.slideId) ?? null;
      return {
        ...sheet,
        pitchSettings: {
          slides: sheet.pitchSettings.slides.filter((s) => s.id !== this.slideId),
        },
      };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.snapshot) return state;
    const snap = this.snapshot;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      pitchSettings: {
        slides: [...sheet.pitchSettings.slides, snap].sort((a, b) => a.order - b.order),
      },
    }));
  }
}

export class ReorderPitchSlidesCommand implements Command {
  readonly name = 'ReorderPitchSlides';
  private previous: PitchSlide[] | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly orderedIds: string[],
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      this.previous = [...sheet.pitchSettings.slides];
      const byId = new Map(sheet.pitchSettings.slides.map((s) => [s.id, s]));
      const slides = this.orderedIds
        .map((id, order) => {
          const s = byId.get(id);
          return s ? { ...s, order } : null;
        })
        .filter((s): s is PitchSlide => !!s);
      return { ...sheet, pitchSettings: { slides } };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.previous) return state;
    const prev = this.previous;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      pitchSettings: { slides: prev },
    }));
  }
}

export class DeleteMarkerCommand implements Command {
  readonly name = 'DeleteMarker';
  private had = false;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly markerId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        this.had = t.markers.includes(this.markerId);
        return { ...t, markers: t.markers.filter((m) => m !== this.markerId) };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.had) return state;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        markers: [...t.markers, this.markerId],
      })),
    }));
  }
}

/** SR-003: find & replace across titles (and optionally notes) */
export class ReplaceTextCommand implements Command {
  readonly name = 'ReplaceText';
  private changes: { topicId: string; field: 'title' | 'note'; old: string }[] = [];

  constructor(
    private readonly sheetId: string,
    private readonly find: string,
    private readonly replace: string,
    private readonly includeNotes = false,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    if (!this.find) return state;
    this.changes = [];
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      const walk = (t: Topic): Topic => {
        let title = t.title;
        let note = t.note;
        if (title.includes(this.find)) {
          this.changes.push({ topicId: t.id, field: 'title', old: title });
          title = title.split(this.find).join(this.replace);
        }
        if (this.includeNotes && note?.includes(this.find)) {
          this.changes.push({ topicId: t.id, field: 'note', old: note });
          note = note.split(this.find).join(this.replace);
        }
        return {
          ...t,
          title,
          note,
          children: t.children.map(walk),
        };
      };
      return { ...sheet, rootTopic: walk(sheet.rootTopic) };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      let root = sheet.rootTopic;
      for (const ch of this.changes) {
        root = updateTopicInTree(root, ch.topicId, (t) =>
          ch.field === 'title' ? { ...t, title: ch.old } : { ...t, note: ch.old },
        );
      }
      return { ...sheet, rootTopic: root };
    });
  }
}

export class DeleteLabelCommand implements Command {
  readonly name = 'DeleteLabel';
  private snapshot: { id: string; text: string; color: string } | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly labelId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        const label = t.labels.find((l) => l.id === this.labelId);
        this.snapshot = label ? { ...label } : null;
        return { ...t, labels: t.labels.filter((l) => l.id !== this.labelId) };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.snapshot) return state;
    const snap = this.snapshot;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        labels: [...t.labels, snap],
      })),
    }));
  }
}
