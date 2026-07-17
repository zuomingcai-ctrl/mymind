import type { MindMapDocument } from '../model/types.js';

export interface Command {
  readonly name: string;
  execute(state: MindMapDocument): MindMapDocument;
  undo(state: MindMapDocument): MindMapDocument;
  canMerge?(other: Command): boolean;
  merge?(other: Command): Command;
}

export interface CommandContext {
  activeSheetId: string;
}
