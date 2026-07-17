import type { MindMapDocument, InlineRun, ImageAttachment, Hyperlink, FileAttachment, AudioAttachment } from '../model/types.js';
import {
  touchTopic,
  generateId,
  updateSheetInDocument,
  updateTopicInTree,
} from '../model/factory.js';
import { syncTitleFromRuns, plainToRuns } from '../model/inline-run.js';
import type { Command } from './types.js';

export class UpdateTopicRichTitleCommand implements Command {
  readonly name = 'UpdateTopicRichTitle';
  private oldTitle = '';
  private oldRich: InlineRun[] | undefined;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly runs: InlineRun[],
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const synced = syncTitleFromRuns(this.runs);
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        this.oldTitle = t.title;
        this.oldRich = t.titleRich;
        return touchTopic({ ...t, title: synced.title, titleRich: synced.titleRich }, synced.title);
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) =>
        touchTopic(
          { ...t, title: this.oldTitle, titleRich: this.oldRich ?? plainToRuns(this.oldTitle) },
          this.oldTitle,
        ),
      ),
    }));
  }
}

export class UpdateImageCommand implements Command {
  readonly name = 'UpdateImage';
  private oldImage: ImageAttachment | undefined;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly image: ImageAttachment | undefined,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        this.oldImage = t.image;
        return { ...t, image: this.image };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        image: this.oldImage,
      })),
    }));
  }
}

export class UpdateHyperlinkCommand implements Command {
  readonly name = 'UpdateHyperlink';
  private oldLink: Hyperlink | undefined;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly hyperlink: Hyperlink | undefined,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        this.oldLink = t.hyperlink;
        return { ...t, hyperlink: this.hyperlink };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        hyperlink: this.oldLink,
      })),
    }));
  }
}

export class AddAttachmentCommand implements Command {
  readonly name = 'AddAttachment';
  private addedId: string | null = null;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly attachment: Omit<FileAttachment, 'id'>,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    const file: FileAttachment = { ...this.attachment, id: generateId() };
    this.addedId = file.id;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        attachments: [...t.attachments, file],
      })),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    if (!this.addedId) return state;
    const id = this.addedId;
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        attachments: t.attachments.filter((a) => a.id !== id),
      })),
    }));
  }
}

export class UpdateAudioCommand implements Command {
  readonly name = 'UpdateAudio';
  private oldAudio: AudioAttachment | undefined;

  constructor(
    private readonly sheetId: string,
    private readonly topicId: string,
    private readonly audio: AudioAttachment | undefined,
  ) {}

  execute(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => {
        this.oldAudio = t.audio ? { ...t.audio } : undefined;
        return { ...t, audio: this.audio };
      }),
    }));
  }

  undo(state: MindMapDocument): MindMapDocument {
    return updateSheetInDocument(state, this.sheetId, (sheet) => ({
      ...sheet,
      rootTopic: updateTopicInTree(sheet.rootTopic, this.topicId, (t) => ({
        ...t,
        audio: this.oldAudio,
      })),
    }));
  }
}
