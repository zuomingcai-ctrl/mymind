import type {
  MindMapDocument,
  StructureType,
  StructureOptions,
  CanvasSettings,
} from '../model/types.js';
import { createSheet, updateSheetInDocument } from '../model/factory.js';
import { defaultStructureOptions } from '../model/types.js';
import { getStructureVariant } from '../structure/variants.js';
import { getTheme } from '../theme/custom.js';
import type { Command } from './types.js';

export class UpdateSheetStructureCommand implements Command {
  readonly name = 'UpdateSheetStructure';
  private previousStructure: StructureType | null = null;
  private previousOptions: StructureOptions | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly structure: StructureType,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      this.previousStructure = sheet.structure;
      this.previousOptions = sheet.structureOptions;
      return {
        ...sheet,
        structure: this.structure,
        structureOptions: defaultStructureOptions(this.structure),
      };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.previousStructure || !this.previousOptions) return state;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      structure: this.previousStructure!,
      structureOptions: this.previousOptions!,
    }));
  }
}

/** Patch StructureOptions for the current structure type (type field must match sheet.structure). */
export class UpdateStructureOptionsCommand implements Command {
  readonly name = 'UpdateStructureOptions';
  private previousOptions: StructureOptions | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly options: StructureOptions,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      if (this.options.type !== sheet.structure) {
        throw new Error(
          `StructureOptions type ${this.options.type} does not match sheet structure ${sheet.structure}`,
        );
      }
      this.previousOptions = sheet.structureOptions;
      return { ...sheet, structureOptions: this.options };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.previousOptions) return state;
    const prev = this.previousOptions;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      structureOptions: prev,
    }));
  }
}

export class AddSheetCommand implements Command {
  readonly name = 'AddSheet';
  private addedSheetId: string | null = null;

  constructor(
    private readonly title = '新画布',
    private readonly structure: StructureType = 'mindmap',
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const sheet = createSheet(this.title, this.structure);
    this.addedSheetId = sheet.id;
    return {
      ...state,
      sheets: [...state.sheets, sheet],
      modifiedAt: new Date().toISOString(),
    };
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedSheetId) return state;
    return {
      ...state,
      sheets: state.sheets.filter((s) => s.id !== this.addedSheetId),
      modifiedAt: new Date().toISOString(),
    };
  }
}

export class DeleteSheetCommand implements Command {
  readonly name = 'DeleteSheet';
  private snapshot: import('../model/types.js').Sheet | null = null;
  private index = 0;

  constructor(private readonly sheetId: string) {}

  execute(state: MindMapDocument): MindMapDocument {
    if (state.sheets.length <= 1) {
      throw new Error('Cannot delete the last sheet');
    }
    this.index = state.sheets.findIndex((s) => s.id === this.sheetId);
    this.snapshot = JSON.parse(JSON.stringify(state.sheets[this.index]));
    return {
      ...state,
      sheets: state.sheets.filter((s) => s.id !== this.sheetId),
      modifiedAt: new Date().toISOString(),
    };
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.snapshot) return state;
    const sheets = [...state.sheets];
    sheets.splice(this.index, 0, this.snapshot);
    return { ...state, sheets, modifiedAt: new Date().toISOString() };
  }
}

export class RenameSheetCommand implements Command {
  readonly name = 'RenameSheet';
  private oldTitle = '';

  constructor(
    private readonly sheetId: string,
    private readonly newTitle: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      this.oldTitle = sheet.title;
      return { ...sheet, title: this.newTitle };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      title: this.oldTitle,
    }));
  }
}

export class SetActiveSheetCommand implements Command {
  readonly name = 'SetActiveSheet';

  constructor(
    readonly _sheetId: string,
    readonly _previousSheetId: string,
  ) {}

  execute(_state: MindMapDocument): MindMapDocument {
    return _state;
  }

  undo(_state: MindMapDocument): MindMapDocument {
    return _state;
  }
}

export class UpdateThemeCommand implements Command {
  readonly name = 'UpdateTheme';
  private previousThemeId = '';
  private previousHandDrawn = false;

  constructor(
    private readonly sheetId: string,
    private readonly themeId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      this.previousThemeId = sheet.canvasSettings.themeId;
      this.previousHandDrawn = sheet.canvasSettings.handDrawn;
      const themeChanged = this.themeId !== this.previousThemeId;
      const theme = getTheme(this.themeId);
      return {
        ...sheet,
        canvasSettings: {
          ...sheet.canvasSettings,
          themeId: this.themeId,
          // Sync sketch mode when switching themes; keep checkbox when only editing colors.
          ...(themeChanged ? { handDrawn: theme.handDrawn } : {}),
        },
      };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.previousThemeId) return state;
    const prev = this.previousThemeId;
    const prevHandDrawn = this.previousHandDrawn;
    const themeChanged = this.themeId !== prev;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      canvasSettings: {
        ...sheet.canvasSettings,
        themeId: prev,
        ...(themeChanged ? { handDrawn: prevHandDrawn } : {}),
      },
    }));
  }
}

/** Reset every sheet that uses `themeId` to `fallbackThemeId` (e.g. after deleting a custom theme). */
export class ClearThemeUsagesCommand implements Command {
  readonly name = 'ClearThemeUsages';
  private previous = new Map<string, string>();

  constructor(
    private readonly themeId: string,
    private readonly fallbackThemeId = 'default',
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    this.previous.clear();
    let next = state;
    for (const sheet of state.sheets) {
      if (sheet.canvasSettings.themeId !== this.themeId) continue;
      this.previous.set(sheet.id, sheet.canvasSettings.themeId);
      next = updateSheetInDocument(next, sheet.id, (s) => ({
        ...s,
        canvasSettings: { ...s.canvasSettings, themeId: this.fallbackThemeId },
      }));
    }
    return next;
  }

  undo(state: MindMapDocument): MindMapDocument {
    let next = state;
    for (const [sheetId, themeId] of this.previous) {
      next = updateSheetInDocument(next, sheetId, (s) => ({
        ...s,
        canvasSettings: { ...s.canvasSettings, themeId },
      }));
    }
    return next;
  }
}

export class UpdateCanvasSettingsCommand implements Command {
  readonly name = 'UpdateCanvasSettings';
  private previous: CanvasSettings | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly patch: Partial<CanvasSettings>,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      this.previous = { ...sheet.canvasSettings };
      return {
        ...sheet,
        canvasSettings: { ...sheet.canvasSettings, ...this.patch },
      };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.previous) return state;
    const prev = this.previous;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      canvasSettings: prev,
    }));
  }
}

export class ApplyStructureVariantCommand implements Command {
  readonly name = 'ApplyStructureVariant';
  private previous: {
    structure: StructureType;
    options: import('../model/types.js').StructureOptions;
    canvas: CanvasSettings;
  } | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly variantId: string,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const variant = getStructureVariant(this.variantId);
    if (!variant) throw new Error(`Unknown structure variant: ${this.variantId}`);

    return updateSheetInDocument(state, this.sheetId, (sheet) => {
      this.previous = {
        structure: sheet.structure,
        options: sheet.structureOptions,
        canvas: { ...sheet.canvasSettings },
      };
      return {
        ...sheet,
        structure: variant.structure,
        structureOptions: variant.structureOptions,
        canvasSettings: {
          ...sheet.canvasSettings,
          ...(variant.themeId ? { themeId: variant.themeId } : {}),
          ...(variant.handDrawn !== undefined ? { handDrawn: variant.handDrawn } : {}),
        },
      };
    });
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.previous) return state;
    const prev = this.previous;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      structure: prev.structure,
      structureOptions: prev.options,
      canvasSettings: prev.canvas,
    }));
  }
}
