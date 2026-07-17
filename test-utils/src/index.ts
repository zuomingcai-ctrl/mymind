import { createTopic, type Topic } from '@mymind/core';

export function buildTree(depth: number, branching = 2): Topic {
  function build(currentDepth: number, title: string): Topic {
    const topic = createTopic(title);
    if (currentDepth >= depth) return topic;
    for (let i = 0; i < branching; i++) {
      topic.children.push(build(currentDepth + 1, `${title}-${i + 1}`));
    }
    return topic;
  }
  return build(0, 'root');
}

export function countTopics(topic: Topic): number {
  return 1 + topic.children.reduce((sum, c) => sum + countTopics(c), 0);
}
