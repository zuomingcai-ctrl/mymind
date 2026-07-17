import type { MindMapDocument } from '../model/types.js';
import type { Command } from './types.js';

export class CommandBus {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxStackSize = 100;
  private document: MindMapDocument;

  constructor(initialDocument: MindMapDocument) {
    this.document = initialDocument;
  }

  getDocument(): MindMapDocument {
    return this.document;
  }

  setDocument(doc: MindMapDocument): void {
    this.document = doc;
    this.undoStack = [];
    this.redoStack = [];
  }

  dispatch(command: Command): MindMapDocument {
    const top = this.undoStack[this.undoStack.length - 1];
    if (top?.canMerge?.(command) && top.merge) {
      this.undoStack[this.undoStack.length - 1] = top.merge(command);
    } else {
      this.undoStack.push(command);
      if (this.undoStack.length > this.maxStackSize) {
        this.undoStack.shift();
      }
    }
    this.redoStack = [];
    this.document = command.execute(this.document);
    return this.document;
  }

  undo(): MindMapDocument | null {
    const command = this.undoStack.pop();
    if (!command) return null;
    this.redoStack.push(command);
    this.document = command.undo(this.document);
    return this.document;
  }

  redo(): MindMapDocument | null {
    const command = this.redoStack.pop();
    if (!command) return null;
    this.undoStack.push(command);
    this.document = command.execute(this.document);
    return this.document;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoStackSize(): number {
    return this.undoStack.length;
  }
}
