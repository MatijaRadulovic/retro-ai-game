/** Process-local, per-game gate shared by the paused-shop AI actions. */
export function createAiRequestGate() {
  const active = new Set<string>();
  return {
    acquire(gameId: string): (() => void) | null {
      if (active.has(gameId)) return null;
      active.add(gameId);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        active.delete(gameId);
      };
    },
    isBusy(gameId: string): boolean { return active.has(gameId); },
  };
}
export type AiRequestGate = ReturnType<typeof createAiRequestGate>;
