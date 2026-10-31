// Antrean per kunci (mis. nomor HP): tugas dengan kunci sama berjalan berurutan,
// kunci berbeda berjalan paralel. Batas antrean per kunci menahan spam.
export function createKeyedQueue(maxPending: number) {
  const tails = new Map<string, Promise<void>>();
  const pending = new Map<string, number>();

  return {
    // false bila antrean kunci ini penuh (tugas dibuang)
    enqueue(key: string, task: () => Promise<void>): boolean {
      const count = pending.get(key) ?? 0;
      if (count >= maxPending) return false;
      pending.set(key, count + 1);

      const prev = tails.get(key) ?? Promise.resolve();
      const next = prev
        .then(async () => {
          try {
            await task();
          } catch (err) {
            console.error("[keyed-queue] task error:", err);
          }
        })
        .then(() => {
          const left = (pending.get(key) ?? 1) - 1;
          if (left <= 0) {
            pending.delete(key);
            tails.delete(key);
          } else {
            pending.set(key, left);
          }
        });
      tails.set(key, next);
      return true;
    },
  };
}
