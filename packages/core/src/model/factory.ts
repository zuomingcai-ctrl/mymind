import { nanoid } from 'nanoid';
import type {
  MindMapDocument,
  Sheet,
  StructureType,
  Topic,
} from './types.js';
import {
  FORMAT_VERSION,
  defaultStructureOptions,
} from './types.js';

export function generateId(): string {
  return nanoid();
}

export function createTopic(title = '中心主题'): Topic {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title,
    children: [],
    collapsed: false,
    labels: [],
    markers: [],
    attachments: [],
    createdAt: now,
    modifiedAt: now,
  };
}

export function createSheet(
  title = '画布 1',
  structure: StructureType = 'mindmap',
): Sheet {
  return {
    id: generateId(),
    title,
    structure,
    structureOptions: defaultStructureOptions(structure),
    rootTopic: createTopic('中心主题'),
    relationships: [],
    boundaries: [],
    summaries: [],
    zones: [],
    floatingTopics: [],
    decorations: [],
    canvasSettings: {
      backgroundColor: '#ffffff',
      backgroundPattern: 'solid',
      coloredBranch: true,
      themeId: 'default',
      handDrawn: false,
    },
    pitchSettings: { slides: [] },
  };
}

export function createDocument(
  title = '未命名',
  structure: StructureType = 'mindmap',
): MindMapDocument {
  const now = new Date().toISOString();
  return {
    formatVersion: FORMAT_VERSION,
    id: generateId(),
    title,
    createdAt: now,
    modifiedAt: now,
    sheets: [createSheet('画布 1', structure)],
    themeId: 'default',
    settings: {
      autoSave: true,
      autoSaveIntervalMs: 30000,
      locale: 'zh-CN',
    },
  };
}

export function findTopicById(root: Topic, id: string): Topic | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findTopicById(child, id);
    if (found) return found;
  }
  return null;
}

export function findTopicInSheet(sheet: Sheet, id: string): Topic | null {
  const inTree = findTopicById(sheet.rootTopic, id);
  if (inTree) return inTree;
  for (const floating of sheet.floatingTopics) {
    const found = findTopicById(floating, id);
    if (found) return found;
  }
  return null;
}

export function findTopicInDocument(
  doc: MindMapDocument,
  topicId: string,
): { sheet: Sheet; topic: Topic } | null {
  for (const sheet of doc.sheets) {
    const topic = findTopicInSheet(sheet, topicId);
    if (topic) return { sheet, topic };
  }
  return null;
}

export function findParentOfTopic(root: Topic, id: string): Topic | null {
  for (const child of root.children) {
    if (child.id === id) return root;
    const found = findParentOfTopic(child, id);
    if (found) return found;
  }
  return null;
}

export function cloneTopic(topic: Topic): Topic {
  return JSON.parse(JSON.stringify(topic)) as Topic;
}

export function cloneDocument(doc: MindMapDocument): MindMapDocument {
  return JSON.parse(JSON.stringify(doc)) as MindMapDocument;
}

export function collectVisibleTopics(root: Topic): Topic[] {
  const result: Topic[] = [root];
  if (root.collapsed) return result;
  for (const child of root.children) {
    result.push(...collectVisibleTopics(child));
  }
  return result;
}

export function getSheet(doc: MindMapDocument, sheetId: string): Sheet | undefined {
  return doc.sheets.find((s) => s.id === sheetId);
}

export function touchDocument(doc: MindMapDocument): MindMapDocument {
  return {
    ...doc,
    modifiedAt: new Date().toISOString(),
  };
}

export function touchTopic(topic: Topic, title?: string): Topic {
  return {
    ...topic,
    ...(title !== undefined ? { title } : {}),
    modifiedAt: new Date().toISOString(),
  };
}

export function updateSheetInDocument(
  doc: MindMapDocument,
  sheetId: string,
  updater: (sheet: Sheet) => Sheet,
): MindMapDocument {
  return touchDocument({
    ...doc,
    sheets: doc.sheets.map((s) => (s.id === sheetId ? updater(s) : s)),
  });
}

export function updateTopicInTree(
  root: Topic,
  topicId: string,
  updater: (topic: Topic) => Topic,
): Topic {
  if (root.id === topicId) return updater(root);
  return {
    ...root,
    children: root.children.map((c) => updateTopicInTree(c, topicId, updater)),
  };
}
