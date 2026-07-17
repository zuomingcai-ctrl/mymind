import type { Topic } from '../../model/types.js';
import { generateId } from '../../model/factory.js';

export function importPlainTextIndented(text: string): Topic {
  const lines = text.split('\n').filter((l) => l.trim());
  const root = createTopic('Imported');
  const stack: { topic: Topic; indent: number }[] = [{ topic: root, indent: -1 }];

  for (const line of lines) {
    const indent = line.search(/\S/);
    const title = line.trim();
    const topic = createTopic(title);
    while (stack.length > 1 && stack[stack.length - 1]!.indent >= indent) stack.pop();
    stack[stack.length - 1]!.topic.children.push(topic);
    stack.push({ topic, indent });
  }
  return root;
}

export function importFreeMind(xml: string): Topic {
  const root = createTopic('Imported');
  const nodes = parseNestedFreeMind(xml);
  if (nodes.length === 0) {
    const flat = xml.replace(/\n/g, ' ');
    const simple = /<node\s+TEXT="([^"]*)"/g;
    let m;
    while ((m = simple.exec(flat)) !== null) {
      root.children.push(createTopic(m[1]!));
    }
    return root;
  }
  const first = nodes[0]!;
  root.title = first.title;
  root.children = first.children;
  return root;
}

interface FmNode {
  title: string;
  children: Topic[];
}

function parseNestedFreeMind(xml: string): FmNode[] {
  // Lightweight nested parse using position stack on <node ...> / </node>
  const tokens = xml.match(/<\/?node\b[^>]*>/gi) ?? [];
  const stack: FmNode[] = [];
  const roots: FmNode[] = [];
  for (const tok of tokens) {
    if (/^<\/node/i.test(tok)) {
      const done = stack.pop();
      if (!done) continue;
      if (stack.length) stack[stack.length - 1]!.children.push(fmToTopic(done));
      else roots.push(done);
      continue;
    }
    const textMatch = tok.match(/TEXT="([^"]*)"/i);
    const title = textMatch ? decodeXml(textMatch[1]!) : 'Node';
    const node: FmNode = { title, children: [] };
    stack.push(node);
  }
  return roots;
}

function fmToTopic(n: FmNode): Topic {
  const t = createTopic(n.title);
  t.children = n.children;
  return t;
}

/**
 * XMind .xmind is a ZIP. When given raw ArrayBuffer, try to extract content.json
 * via a minimal ZIP local-file scan (no external deps). Falls back to placeholder.
 */
export function importXMind(data: ArrayBuffer): Topic {
  try {
    const text = extractZipText(data, /content\.json$/i) ?? extractZipText(data, /content\.xml$/i);
    if (!text) return importXMindPlaceholder(data);
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      return parseXMindJson(text);
    }
    return parseXMindXml(text);
  } catch {
    return importXMindPlaceholder(data);
  }
}

export function importXMindPlaceholder(_data: ArrayBuffer): Topic {
  const root = createTopic('XMind Import');
  root.children.push(createTopic('未能解析内容 — 请确认文件为有效 .xmind'));
  return root;
}

function parseXMindJson(json: string): Topic {
  const data = JSON.parse(json) as unknown;
  const sheets = Array.isArray(data) ? data : [data];
  const first = sheets[0] as { rootTopic?: XMindTopic; title?: string };
  if (!first?.rootTopic) {
    const root = createTopic('XMind');
    root.children.push(createTopic('无 rootTopic'));
    return root;
  }
  return convertXMindTopic(first.rootTopic);
}

interface XMindTopic {
  id?: string;
  title?: string;
  children?: { attached?: XMindTopic[] };
}

function convertXMindTopic(xt: XMindTopic): Topic {
  const t = createTopic(xt.title ?? '主题');
  const kids = xt.children?.attached ?? [];
  t.children = kids.map(convertXMindTopic);
  return t;
}

function parseXMindXml(xml: string): Topic {
  const root = createTopic('XMind');
  const titles = [...xml.matchAll(/<title[^>]*>([^<]*)<\/title>/gi)].map((m) => decodeXml(m[1]!));
  if (titles.length) {
    root.title = titles[0]!;
    for (let i = 1; i < Math.min(titles.length, 50); i++) {
      root.children.push(createTopic(titles[i]!));
    }
  }
  return root;
}

function extractZipText(data: ArrayBuffer, nameRe: RegExp): string | null {
  const bytes = new Uint8Array(data);
  const view = new DataView(data);
  let offset = 0;
  while (offset + 30 < bytes.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break;
    const method = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const nameBytes = bytes.subarray(offset + 30, offset + 30 + nameLen);
    const name = new TextDecoder().decode(nameBytes);
    const dataStart = offset + 30 + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    if (nameRe.test(name) && method === 0) {
      return new TextDecoder().decode(bytes.subarray(dataStart, dataEnd));
    }
    // Deflated entries: try TextDecoder on raw (may fail) — skip compressed without inflate
    offset = dataEnd;
  }
  return null;
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

function createTopic(title: string): Topic {
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
