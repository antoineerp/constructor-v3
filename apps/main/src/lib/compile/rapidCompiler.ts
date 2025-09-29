// Interface utilitaire pour utiliser le worker de compilation rapide

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (v: any) => void>();

export function ensureWorker() {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent) => {
      const { id, ...rest } = e.data;
      const res = pending.get(id);
      if (res) {
        pending.delete(id);
        res(rest);
      }
    };
  }
  return worker;
}

export function compileRapid(code: string, filename = 'Component.svelte', options: Record<string, any> = {}) {
  ensureWorker();
  const id = ++seq;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker!.postMessage({ id, code, filename, options });
  });
}
