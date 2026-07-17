export interface RenderCacheEntry {
  key: string;
  canvas: OffscreenCanvas | null;
  hitCount: number;
  lastUsed: number;
}

export class RenderCache {
  private cache = new Map<string, RenderCacheEntry>();
  private maxEntries = 8;

  get(key: string): OffscreenCanvas | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    entry.hitCount++;
    entry.lastUsed = Date.now();
    return entry.canvas;
  }

  set(key: string, canvas: OffscreenCanvas): void {
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }
    this.cache.set(key, { key, canvas, hitCount: 0, lastUsed: Date.now() });
  }

  invalidate(key?: string): void {
    if (key) this.cache.delete(key);
    else this.cache.clear();
  }

  private evictOldest(): void {
    let oldest: RenderCacheEntry | null = null;
    for (const entry of this.cache.values()) {
      if (!oldest || entry.lastUsed < oldest.lastUsed) oldest = entry;
    }
    if (oldest) this.cache.delete(oldest.key);
  }

  size(): number {
    return this.cache.size;
  }
}

export function buildCacheKey(sheetId: string, contentHash: string, zoomBucket: number): string {
  return `${sheetId}:${contentHash}:${zoomBucket}`;
}

export function zoomBucket(zoom: number): number {
  return Math.round(zoom * 4) / 4;
}
