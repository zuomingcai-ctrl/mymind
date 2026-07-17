import type { Topic } from '../../model/types.js';

export function importMarkdown(text: string): Topic {
  const lines = text.split('\n').filter((l) => l.trim());
  const root = createImportTopic('Imported');
  const stack: { topic: Topic; level: number }[] = [{ topic: root, level: 1 }];

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (!match) continue;
    const level = match[1]!.length;
    const title = match[2]!.trim();
    const topic = createImportTopic(title);
    while (stack.length > 1 && stack[stack.length - 1]!.level >= level) stack.pop();
    stack[stack.length - 1]!.topic.children.push(topic);
    stack.push({ topic, level });
  }
  return root;
}

export function importOpml(xml: string): Topic {
  const root = createImportTopic('Imported');
  const flat = xml.replace(/\n/g, '');
  const tagRegex = /<\/?outline[^>]*>/g;
  const stack: Topic[] = [root];
  let t;
  while ((t = tagRegex.exec(flat)) !== null) {
    if (t[0].startsWith('</')) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const textMatch = t[0].match(/text="([^"]*)"/);
    if (textMatch) {
      const topic = createImportTopic(textMatch[1]!);
      stack[stack.length - 1]!.children.push(topic);
      stack.push(topic);
    }
  }
  return root;
}

function createImportTopic(title: string): Topic {
  const now = new Date().toISOString();
  return {
    id: `import-${Math.random().toString(36).slice(2, 9)}`,
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
