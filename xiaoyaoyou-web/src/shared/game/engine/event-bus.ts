/**
 * EventBus - Core event dispatch system
 * Translation of C# PSDGamepkg.XI sk02 event dispatch
 *
 * The EventBus manages event listeners with priority-based ordering.
 * It supports the G-Loop's message dispatch pattern where skills register
 * for specific message types (e.g. G0OH, G1TH) and are invoked in priority order.
 */

/** Handler function type - returns void, boolean, or Promise */
export type EventHandler = (data: unknown) => void | boolean | Promise<void | boolean>;

/** Registered event listener entry */
export interface EventListener {
  handler: EventHandler;
  priority: number;
  once: boolean;
  source: string;
}

/** Result of an event emission */
export interface EventResult {
  handled: boolean;
  cancelled: boolean;
  results: unknown[];
}

/**
 * EventBus: priority-ordered publish/subscribe dispatcher.
 * Replaces C#'s sk02 dictionary dispatch with a functional approach.
 */
export class EventBus {
  private listeners = new Map<string, EventListener[]>();
  private processing = false;
  private queue: Array<{ event: string; data: unknown; resolve: (result: EventResult) => void }> = [];

  /**
   * Register an event listener with optional priority and source.
   * Higher priority handlers execute first.
   */
  on(event: string, handler: EventHandler, priority = 0, source = ''): void {
    const list = this.listeners.get(event);
    const entry: EventListener = { handler, priority, once: false, source };
    if (list) {
      // Insert in priority order (higher priority first)
      let inserted = false;
      for (let i = 0; i < list.length; i++) {
        if (priority > list[i].priority) {
          list.splice(i, 0, entry);
          inserted = true;
          break;
        }
      }
      if (!inserted) list.push(entry);
    } else {
      this.listeners.set(event, [entry]);
    }
  }

  /**
   * Register a one-time event listener. Auto-removes after first invocation.
   */
  once(event: string, handler: EventHandler, priority = 0, source = ''): void {
    const list = this.listeners.get(event);
    const entry: EventListener = { handler, priority, once: true, source };
    if (list) {
      let inserted = false;
      for (let i = 0; i < list.length; i++) {
        if (priority > list[i].priority) {
          list.splice(i, 0, entry);
          inserted = true;
          break;
        }
      }
      if (!inserted) list.push(entry);
    } else {
      this.listeners.set(event, [entry]);
    }
  }

  /**
   * Remove a specific event listener.
   */
  off(event: string, handler: EventHandler): void {
    const list = this.listeners.get(event);
    if (list) {
      const idx = list.findIndex(l => l.handler === handler);
      if (idx !== -1) list.splice(idx, 1);
      if (list.length === 0) this.listeners.delete(event);
    }
  }

  /**
   * Remove all listeners registered by a specific source.
   */
  offBySource(source: string): void {
    for (const [event, list] of this.listeners) {
      const filtered = list.filter(l => l.source !== source);
      if (filtered.length === 0) {
        this.listeners.delete(event);
      } else {
        this.listeners.set(event, filtered);
      }
    }
  }

  /**
   * Emit an event synchronously. Returns results from all handlers.
   * If any handler returns false, propagation is stopped.
   */
  emit(event: string, data?: unknown): EventResult {
    const list = this.listeners.get(event);
    if (!list || list.length === 0) {
      return { handled: false, cancelled: false, results: [] };
    }

    const results: unknown[] = [];
    let cancelled = false;
    const toRemove: EventListener[] = [];

    for (const listener of list) {
      try {
        const result = listener.handler(data);
        results.push(result);
        if (listener.once) {
          toRemove.push(listener);
        }
        if (result === false) {
          cancelled = true;
          break;
        }
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    }

    // Remove once listeners
    for (const listener of toRemove) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
    if (list.length === 0) this.listeners.delete(event);

    return { handled: results.length > 0, cancelled, results };
  }

  /**
   * Emit an event asynchronously, supporting async handlers.
   */
  async emitAsync(event: string, data?: unknown): Promise<EventResult> {
    const list = this.listeners.get(event);
    if (!list || list.length === 0) {
      return { handled: false, cancelled: false, results: [] };
    }

    const results: unknown[] = [];
    let cancelled = false;
    const toRemove: EventListener[] = [];

    for (const listener of list) {
      try {
        const result = await listener.handler(data);
        results.push(result);
        if (listener.once) {
          toRemove.push(listener);
        }
        if (result === false) {
          cancelled = true;
          break;
        }
      } catch (err) {
        console.error(`[EventBus] Async error in handler for "${event}":`, err);
      }
    }

    for (const listener of toRemove) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
    if (list.length === 0) this.listeners.delete(event);

    return { handled: results.length > 0, cancelled, results };
  }

  /**
   * Clear all listeners for all events.
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Get the number of listeners for a specific event.
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  /**
   * Get all registered event names.
   */
  eventNames(): string[] {
    return [...this.listeners.keys()];
  }
}
