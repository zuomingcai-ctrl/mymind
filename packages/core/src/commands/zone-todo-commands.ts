import type { MindMapDocument, Zone, TodoItem } from '../model/types.js';
import { generateId, updateSheetInDocument, updateTopicInTree } from '../model/factory.js';
import type { Command } from './types.js';

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
        return { ...t, todos };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (this.oldChecked === null) return state;
    const checked = this.oldChecked;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        todos: (t.todos ?? []).map((item) =>
          item.id === this.todoId ? { ...item, checked } : item,
        ),
      })),
    }));
  }
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

export function todoCompletionRate(todos: TodoItem[]): { done: number; total: number; label: string } {
  const total = todos.length;
  const done = todos.filter((t) => t.checked).length;
  return { done, total, label: `${done}/${total}` };
}
