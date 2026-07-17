import type { MindMapDocument, Sheet, Topic } from '../../model/types.js';
import PptxGenJS from 'pptxgenjs';

function findTitle(root: Topic, id: string): string | null {
  if (root.id === id) return root.title;
  for (const c of root.children) {
    const f = findTitle(c, id);
    if (f) return f;
  }
  return null;
}

function collectTitles(root: Topic): string[] {
  const out = [root.title];
  for (const c of root.children) out.push(...collectTitles(c));
  return out;
}

function slideTitles(sheet: Sheet): string[] {
  if (sheet.pitchSettings.slides.length > 0) {
    return sheet.pitchSettings.slides
      .slice()
      .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
      .map((s: { topicId: string }) => findTitle(sheet.rootTopic, s.topicId) ?? s.topicId);
  }
  return collectTitles(sheet.rootTopic);
}

/** VW-023 / PP-P06: real PowerPoint export via pptxgenjs */
export async function exportPptx(
  doc: MindMapDocument,
  sheet?: Sheet,
  options?: { slideBackgrounds?: (string | undefined)[] },
): Promise<Uint8Array> {
  const target = sheet ?? doc.sheets[0];
  if (!target) return new Uint8Array();

  const pptx = new PptxGenJS();
  pptx.author = 'MyMind';
  pptx.title = doc.title;
  const titles = slideTitles(target);
  const slides =
    target.pitchSettings.slides.length > 0
      ? [...target.pitchSettings.slides].sort((a, b) => a.order - b.order)
      : titles.map((_, i) => ({ backgroundColor: options?.slideBackgrounds?.[i] }));

  titles.forEach((title, i) => {
    const slide = pptx.addSlide();
    const bg = slides[i]?.backgroundColor ?? options?.slideBackgrounds?.[i] ?? 'FFFFFF';
    slide.background = { color: bg.replace('#', '') };
    slide.addText(title, {
      x: 0.5,
      y: 2.2,
      w: 9,
      h: 1.5,
      fontSize: 32,
      bold: true,
      color: '222222',
      align: 'center',
    });
    slide.addText(`${doc.title} · ${i + 1}/${titles.length}`, {
      x: 0.5,
      y: 5,
      w: 9,
      h: 0.4,
      fontSize: 12,
      color: '888888',
      align: 'center',
    });
  });

  const out = (await pptx.write({ outputType: 'uint8array' })) as Uint8Array;
  return out;
}
