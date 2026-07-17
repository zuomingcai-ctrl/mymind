/** CV-006: alignment guides while dragging */
export interface AlignGuide {
  orientation: 'v' | 'h';
  /** world coordinate */
  pos: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: AlignGuide[];
}

const DEFAULT_THRESHOLD = 6;

export function computeSnap(
  drag: { x: number; y: number; width: number; height: number },
  others: Array<{ x: number; y: number; width: number; height: number }>,
  threshold = DEFAULT_THRESHOLD,
): SnapResult {
  const guides: AlignGuide[] = [];
  let x = drag.x;
  let y = drag.y;

  const dragCx = drag.x + drag.width / 2;
  const dragCy = drag.y + drag.height / 2;
  const dragRight = drag.x + drag.width;
  const dragBottom = drag.y + drag.height;

  let bestDx = threshold + 1;
  let bestDy = threshold + 1;
  let snapX: number | null = null;
  let snapY: number | null = null;
  let guideV: number | null = null;
  let guideH: number | null = null;

  for (const o of others) {
    const oCx = o.x + o.width / 2;
    const oCy = o.y + o.height / 2;
    const oRight = o.x + o.width;
    const oBottom = o.y + o.height;

    const candidatesX: Array<[number, number]> = [
      [o.x - drag.x, o.x],
      [oRight - dragRight, oRight],
      [oCx - dragCx, oCx],
      [o.x - dragRight, o.x],
      [oRight - drag.x, oRight],
    ];
    for (const [dx, g] of candidatesX) {
      const adx = Math.abs(dx);
      if (adx < bestDx) {
        bestDx = adx;
        snapX = drag.x + dx;
        guideV = g;
      }
    }

    const candidatesY: Array<[number, number]> = [
      [o.y - drag.y, o.y],
      [oBottom - dragBottom, oBottom],
      [oCy - dragCy, oCy],
      [o.y - dragBottom, o.y],
      [oBottom - drag.y, oBottom],
    ];
    for (const [dy, g] of candidatesY) {
      const ady = Math.abs(dy);
      if (ady < bestDy) {
        bestDy = ady;
        snapY = drag.y + dy;
        guideH = g;
      }
    }
  }

  if (snapX != null && bestDx <= threshold) {
    x = snapX;
    if (guideV != null) guides.push({ orientation: 'v', pos: guideV });
  }
  if (snapY != null && bestDy <= threshold) {
    y = snapY;
    if (guideH != null) guides.push({ orientation: 'h', pos: guideH });
  }

  return { x, y, guides };
}
