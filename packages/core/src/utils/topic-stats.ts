import type { Topic } from '../model/types.js';

/** Count all topics in a tree (including root). */
export function countTopics(root: Topic): number {
  let n = 1;
  for (const c of root.children) n += countTopics(c);
  return n;
}

/** TE-005: plain character count (CJK + latin). */
export function charCount(text: string | undefined | null): number {
  if (!text) return 0;
  return [...text].length;
}

export function topicWordStats(topic: Topic): { titleChars: number; noteChars: number; total: number } {
  const titleChars = charCount(topic.title);
  const noteChars = charCount(topic.note);
  return { titleChars, noteChars, total: titleChars + noteChars };
}
