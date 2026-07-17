import type { MindMapDocument, Sheet, Topic } from '../model/types.js';

export interface SearchResult {
  topicId: string;
  sheetId: string;
  title: string;
  matchField: 'title' | 'note' | 'label';
  snippet: string;
}

export class SearchService {
  searchDocument(doc: MindMapDocument, query: string): SearchResult[] {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: SearchResult[] = [];
    for (const sheet of doc.sheets) {
      results.push(...this.searchSheet(sheet, q));
    }
    return results;
  }

  searchSheet(sheet: Sheet, query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const walk = (topic: Topic) => {
      if (topic.title.toLowerCase().includes(query)) {
        results.push({
          topicId: topic.id,
          sheetId: sheet.id,
          title: topic.title,
          matchField: 'title',
          snippet: topic.title,
        });
      }
      if (topic.note?.toLowerCase().includes(query)) {
        results.push({
          topicId: topic.id,
          sheetId: sheet.id,
          title: topic.title,
          matchField: 'note',
          snippet: topic.note.slice(0, 80),
        });
      }
      for (const label of topic.labels) {
        if (label.text.toLowerCase().includes(query)) {
          results.push({
            topicId: topic.id,
            sheetId: sheet.id,
            title: topic.title,
            matchField: 'label',
            snippet: label.text,
          });
        }
      }
      for (const child of topic.children) walk(child);
    };
    walk(sheet.rootTopic);
    for (const f of sheet.floatingTopics) walk(f);
    return results;
  }

  filterByLabel(sheet: Sheet, labelText: string): Topic[] {
    const results: Topic[] = [];
    const walk = (topic: Topic) => {
      if (topic.labels.some((l) => l.text === labelText)) results.push(topic);
      for (const c of topic.children) walk(c);
    };
    walk(sheet.rootTopic);
    return results;
  }
}

export function getBranchTopicIds(root: Topic, focusId: string): Set<string> {
  const ids = new Set<string>();
  function collectDescendants(topic: Topic) {
    for (const child of topic.children) {
      ids.add(child.id);
      collectDescendants(child);
    }
  }
  function findAndCollect(topic: Topic, path: string[]): boolean {
    if (topic.id === focusId) {
      for (const id of path) ids.add(id);
      ids.add(topic.id);
      collectDescendants(topic);
      return true;
    }
    for (const child of topic.children) {
      if (findAndCollect(child, [...path, topic.id])) return true;
    }
    return false;
  }
  findAndCollect(root, []);
  return ids;
}
