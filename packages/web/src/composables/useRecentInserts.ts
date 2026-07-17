import { ref, watch } from 'vue';
import type { InsertActionId } from '../insert/insert-items';

const STORAGE_KEY = 'mymind.recentInserts';
const MAX_RECENT = 3;

function loadRecent(): InsertActionId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is InsertActionId => typeof x === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

const recent = ref<InsertActionId[]>(loadRecent());

watch(recent, (ids) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota / private mode
  }
});

export function useRecentInserts() {
  function record(id: InsertActionId) {
    recent.value = [id, ...recent.value.filter((x) => x !== id)].slice(0, MAX_RECENT);
  }

  return { recent, record };
}
