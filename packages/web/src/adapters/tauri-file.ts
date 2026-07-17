/** Optional Tauri IPC bridge for desktop file I/O (EL-004c / FI-002/003) */

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

type InvokeFn = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

async function getInvoke(): Promise<InvokeFn | null> {
  if (!isTauri()) return null;
  try {
    // Dynamic path — package only present in desktop builds
    const mod = (await (Function('return import("@tauri-apps/api/core")')() as Promise<{
      invoke: InvokeFn;
    }>));
    return mod.invoke;
  } catch {
    return null;
  }
}

export async function tauriReadTextFile(path: string): Promise<string> {
  const invoke = await getInvoke();
  if (!invoke) throw new Error('Tauri unavailable');
  return invoke<string>('read_text_file', { path });
}

export async function tauriWriteTextFile(path: string, contents: string): Promise<void> {
  const invoke = await getInvoke();
  if (!invoke) throw new Error('Tauri unavailable');
  await invoke('write_text_file', { path, contents });
}

export async function openLocalFileLink(path: string): Promise<void> {
  if (!isTauri()) {
    window.alert(`本地文件链接（桌面端打开）:\n${path}`);
    return;
  }
  window.alert(`打开本地文件:\n${path}`);
}
