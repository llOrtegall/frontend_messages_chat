/** Minimal observable state holder, shaped for React's useSyncExternalStore. */
export class Store<S> {
  private readonly listeners = new Set<() => void>();

  constructor(private state: S) {}

  getSnapshot = (): S => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  protected setState(patch: Partial<S> | ((s: S) => Partial<S>)): void {
    const next = typeof patch === "function" ? patch(this.state) : patch;
    if (Object.keys(next).length === 0) return;
    this.state = { ...this.state, ...next };
    for (const l of this.listeners) l();
  }
}
