import {
  AddLabelCommand,
  UpdateNoteCommand,
  AddCalloutCommand,
  AddCommentCommand,
  AddTodoCommand,
  UpdateTaskCommand,
  UpdateHyperlinkCommand,
  AddAttachmentCommand,
  AddDecorationCommand,
  UpdateImageCommand,
  UpdateEquationCommand,
  AddZoneCommand,
  type Sheet,
  type Command,
} from '@mymind/core';
import type { InsertActionId } from '../insert/insert-items';

export interface InsertActionResult {
  command?: Command;
  /** Focus property panel field after insert */
  focusPanel?: 'note' | 'comment' | 'todo' | 'task' | 'equation' | 'hyperlink';
}

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Build the command / side-effect for an insert action.
 * Returns null when user cancels a prompt/picker.
 */
export async function buildInsertAction(
  id: InsertActionId,
  sheet: Sheet,
  selection: string[],
): Promise<InsertActionResult | null> {
  const topicId = selection[0];
  const sheetId = sheet.id;

  switch (id) {
    case 'zone': {
      const topicIds = selection.filter((tid) => tid !== sheet.rootTopic.id);
      if (topicIds.length === 0) return null;
      return {
        command: new AddZoneCommand(sheetId, {
          title: '专区',
          topicIds,
          x: 0,
          y: 0,
          width: 320,
          height: 240,
          collapsed: false,
          showTitle: true,
        }),
      };
    }
    case 'note': {
      if (!topicId) return null;
      const existing = findTopicNote(sheet, topicId);
      if (!existing) {
        return {
          command: new UpdateNoteCommand(sheetId, topicId, ''),
          focusPanel: 'note',
        };
      }
      return { focusPanel: 'note' };
    }
    case 'label': {
      if (!topicId) return null;
      const text = window.prompt('标签文字', '新标签');
      if (text === null) return null;
      return { command: new AddLabelCommand(sheetId, topicId, text.trim() || '新标签') };
    }
    case 'callout': {
      if (!topicId) return null;
      const text = window.prompt('标注文字', '标注');
      if (text === null) return null;
      return { command: new AddCalloutCommand(sheetId, topicId, text.trim() || '标注') };
    }
    case 'comment': {
      if (!topicId) return null;
      const text = window.prompt('评论内容', '');
      if (text === null || !text.trim()) return null;
      return {
        command: new AddCommentCommand(sheetId, topicId, text.trim()),
        focusPanel: 'comment',
      };
    }
    case 'todo': {
      if (!topicId) return null;
      const text = window.prompt('待办事项', '待办');
      if (text === null) return null;
      return {
        command: new AddTodoCommand(sheetId, topicId, text.trim() || '待办'),
        focusPanel: 'todo',
      };
    }
    case 'task': {
      if (!topicId) return null;
      return {
        command: new UpdateTaskCommand(sheetId, topicId, {
          progress: 0,
          priority: 'medium',
          assignee: '',
        }),
        focusPanel: 'task',
      };
    }
    case 'link-web': {
      if (!topicId) return null;
      const url = window.prompt('网页链接 URL', 'https://');
      if (url === null || !url.trim()) return null;
      return {
        command: new UpdateHyperlinkCommand(sheetId, topicId, {
          type: 'url',
          target: url.trim(),
        }),
        focusPanel: 'hyperlink',
      };
    }
    case 'link-topic': {
      if (!topicId) return null;
      const target = window.prompt('目标主题 ID（本图画布）', '');
      if (target === null || !target.trim()) return null;
      return {
        command: new UpdateHyperlinkCommand(sheetId, topicId, {
          type: 'topic',
          target: target.trim(),
        }),
        focusPanel: 'hyperlink',
      };
    }
    case 'link-file': {
      if (!topicId) return null;
      const path = window.prompt('本地文件路径', '');
      if (path === null || !path.trim()) return null;
      return {
        command: new UpdateHyperlinkCommand(sheetId, topicId, {
          type: 'file',
          target: path.trim(),
        }),
        focusPanel: 'hyperlink',
      };
    }
    case 'attachment': {
      if (!topicId) return null;
      const file = await pickFile('*/*');
      if (!file) return null;
      const data = await readAsDataUrl(file);
      return {
        command: new AddAttachmentCommand(sheetId, topicId, {
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          data,
        }),
      };
    }
    case 'sticker': {
      const assets = (await import('@mymind/core')).listDecorationAssets('sticker');
      const asset = assets[0]!;
      return {
        command: new AddDecorationCommand(sheetId, {
          type: 'sticker',
          assetId: asset.id,
          x: 40,
          y: 40,
          width: asset.defaultWidth,
          height: asset.defaultHeight,
          rotation: 0,
          zIndex: sheet.decorations.length + 1,
          attachedTopicId: topicId,
        }),
      };
    }
    case 'illustration': {
      const assets = (await import('@mymind/core')).listDecorationAssets('illustration');
      const asset = assets[0]!;
      return {
        command: new AddDecorationCommand(sheetId, {
          type: 'illustration',
          assetId: asset.id,
          x: 80,
          y: 80,
          width: asset.defaultWidth,
          height: asset.defaultHeight,
          rotation: 0,
          zIndex: sheet.decorations.length + 1,
          attachedTopicId: topicId,
        }),
      };
    }
    case 'image': {
      if (!topicId) return null;
      const file = await pickFile('image/*');
      if (!file) return null;
      const src = await readAsDataUrl(file);
      return {
        command: new UpdateImageCommand(sheetId, topicId, {
          src,
          width: 160,
          height: 120,
        }),
      };
    }
    case 'equation': {
      if (!topicId) return null;
      const latex = window.prompt('LaTeX 公式', 'E=mc^2');
      if (latex === null) return null;
      return {
        command: new UpdateEquationCommand(sheetId, topicId, latex.trim() || 'E=mc^2'),
        focusPanel: 'equation',
      };
    }
    default:
      return null;
  }
}

function findTopicNote(sheet: Sheet, topicId: string): string | undefined {
  const walk = (t: typeof sheet.rootTopic): string | undefined => {
    if (t.id === topicId) return t.note;
    for (const c of t.children) {
      const n = walk(c);
      if (n !== undefined) return n;
    }
    return undefined;
  };
  return walk(sheet.rootTopic);
}
