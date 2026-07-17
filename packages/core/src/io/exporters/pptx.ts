import type { MindMapDocument, Sheet, Topic } from '../../model/types.js';
import PptxGenJS from 'pptxgenjs';

function collectTitles(root: Topic): string[] {
  const out = [root.title];
  for (const c of root.children) out.push(...collectTitles(c));
  return out;
}

/** Topic-tree PowerPoint export via pptxgenjs */
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
  const titles = collectTitles(target.rootTopic);

  titles.forEach((title, i) => {
    const slide = pptx.addSlide();
    const bg = options?.slideBackgrounds?.[i] ?? 'FFFFFF';
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
