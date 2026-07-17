import type { MindMapDocument, Zone, ZoneStyle, TodoItem } from '../model/types.js';
import { generateId, updateSheetInDocument, updateTopicInTree } from '../model/factory.js';
import type { Command } from './types.js';
import { syncProgressMarkers } from '../utils/todo-markers.js';

export class AddZoneCommand implements Command {
  readonly name = 'AddZone';
  private addedId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly zone: Omit<Zone, 'id'>,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const sheet = state.sheets.find((s) => s.id === this.sheetId);
    if (zoneWrapsCentral(this.zone, sheet?.rootTopic.id ?? '')) {
      throw new Error('Zone cannot wrap central topic');
    }
    const zone: Zone = { ...this.zone, id: generateId() };
    this.addedId = zone.id;
    return updateSheetInDocument(state, this.sheetId, (s) => ({
      ...s,
      zones: [...s.zones, zone],
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedId) return state;
    return updateSheetInDocument(state, this.sheetId, (s) => ({
      ...s,
      zones: s.zones.filter((z) => z.id !== this.addedId),
    }));
  }
}

function zoneWrapsCentral(zone: Omit<Zone, 'id'>, rootId: string): boolean {
  return zone.topicIds.includes(rootId);
}

export class ToggleTodoCommand implements Command {
  readonly name = 'ToggleTodo';
  private oldChecked: boolean | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly todoId: string,
  ) {}

  private oldMarkers: string[] | null = null;

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        const todos = (t.todos ?? []).map((item) => {
          if (item.id === this.todoId) {
            this.oldChecked = item.checked;
            return { ...item, checked: !item.checked };
          }
          return item;
        });
        this.oldMarkers = [...t.markers];
        return { ...t, todos, markers: syncProgressMarkers(t.markers, todos) };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (this.oldChecked === null) return state;
    const checked = this.oldChecked;
    const markers = this.oldMarkers;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        todos: (t.todos ?? []).map((item) =>
          item.id === this.todoId ? { ...item, checked } : item,
        ),
        markers: markers ?? t.markers,
      })),
    }));
  }
}

export class UpdateZoneStyleCommand implements Command {
  readonly name = 'UpdateZoneStyle';
  private previous: { style?: ZoneStyle; aspectPreset?: string; title?: string; showTitle?: boolean } | null =
    null;

  constructor(
    private readonly sheetId: string,
    private readonly zoneId: string,
    private readonly patch: {
      style?: Partial<ZoneStyle>;
      aspectPreset?: string;
      title?: string;
      showTitle?: boolean;
    },
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      zones: sheet.zones.map((z) => {
        if (z.id !== this.zoneId) return z;
        this.previous = {
          style: z.style ? { ...z.style } : undefined,
          aspectPreset: z.aspectPreset,
          title: z.title,
          showTitle: z.showTitle,
        };
        return {
          ...z,
          title: this.patch.title ?? z.title,
          showTitle: this.patch.showTitle ?? z.showTitle,
          aspectPreset: this.patch.aspectPreset ?? z.aspectPreset,
          style: this.patch.style ? { ...(z.style ?? defaultZoneStyle()), ...this.patch.style } : z.style,
        };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.previous) return state;
    const prev = this.previous;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      zones: sheet.zones.map((z) =>
        z.id === this.zoneId
          ? {
              ...z,
              style: prev.style,
              aspectPreset: prev.aspectPreset,
              title: prev.title,
              showTitle: prev.showTitle ?? z.showTitle,
            }
          : z,
      ),
    }));
  }
}

function defaultZoneStyle(): ZoneStyle {
  return {
    backgroundColor: 'rgba(64,158,255,0.08)',
    borderColor: '#409eff',
    borderWidth: 1,
    opacity: 1,
  };
}

export class AddTodoCommand implements Command {
  readonly name = 'AddTodo';
  private addedId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly text: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const item: TodoItem = {
      id: generateId(),
      text: this.text,
      checked: false,
      order: 0,
    };
    this.addedId = item.id;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        const todos = [...(t.todos ?? []), { ...item, order: (t.todos ?? []).length }];
        return { ...t, todos };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedId) return state;
    const id = this.addedId;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        todos: (t.todos ?? []).filter((x) => x.id !== id),
      })),
    }));
  }
}

export class DeleteTodoCommand implements Command {
  readonly name = 'DeleteTodo';
  private snapshot: TodoItem | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly todoId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        const item = (t.todos ?? []).find((x) => x.id === this.todoId);
        this.snapshot = item ? { ...item } : null;
        const todos = (t.todos ?? [])
          .filter((x) => x.id !== this.todoId)
          .map((x, order) => ({ ...x, order }));
        return { ...t, todos };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.snapshot) return state;
    const snap = this.snapshot;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        const todos = [...(t.todos ?? []), snap].sort((a, b) => a.order - b.order);
        return { ...t, todos: todos.map((x, order) => ({ ...x, order })) };
      }),
    }));
  }
}

export class ReorderTodosCommand implements Command {
  readonly name = 'ReorderTodos';
  private previous: TodoItem[] | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly orderedIds: string[],
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        this.previous = (t.todos ?? []).map((x) => ({ ...x }));
        const byId = new Map((t.todos ?? []).map((x) => [x.id, x]));
        const todos = this.orderedIds
          .map((id, order) => {
            const item = byId.get(id);
            return item ? { ...item, order } : null;
          })
          .filter((x): x is TodoItem => !!x);
        return { ...t, todos };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.previous) return state;
    const prev = this.previous;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        todos: prev,
      })),
    }));
  }
}

export function todoCompletionRate(todos: TodoItem[]): { done: number; total: number; label: string } {
  const total = todos.length;
  const done = todos.filter((t) => t.checked).length;
  return { done, total, label: `${done}/${total}` };
}
