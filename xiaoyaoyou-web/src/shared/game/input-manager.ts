/**
 * InputManager - Manages player input for network games
 *
 * Provides async input waiting mechanism for network players.
 * The game engine calls waitForInput() which returns a Promise.
 * When network input arrives via queueInput(), the Promise resolves.
 *
 * This bridges the synchronous game engine with async network I/O.
 */

/** Input request info */
export interface InputRequest {
  uid: number;
  format: string;
  code: string;
  arg: string;
  timestamp: number;
}

/** Pending input resolver */
interface PendingInput {
  resolve: (input: string) => void;
  timer: ReturnType<typeof setTimeout> | null;
  request: InputRequest;
}

/** Callback type for notifying when input is requested */
export type InputRequestCallback = (uid: number, format: string, code: string, arg: string) => void;

/**
 * InputManager - manages async player input.
 */
export class InputManager {
  private pendingInputs = new Map<number, PendingInput>();
  private inputQueues = new Map<number, string[]>();
  private disconnectedPlayers = new Set<number>();
  private onRequestCallback: InputRequestCallback | null = null;

  /**
   * Register a callback to be notified when input is requested.
   * Used by GameSession to send input_request to the specific player.
   */
  onRequest(callback: InputRequestCallback): void {
    this.onRequestCallback = callback;
  }

  /**
   * Wait for input from a player.
   * Returns a Promise that resolves when input is provided or timeout occurs.
   *
   * @param uid Player UID
   * @param format Input format string (e.g., "S", "T1(p1p2)")
   * @param code Effect code (e.g., "CZ01")
   * @param arg Additional arguments
   * @param timeoutMs Timeout in milliseconds (default 30000)
   * @returns Input string, empty on timeout/disconnect
   */
  async waitForInput(
    uid: number,
    format: string,
    code: string,
    arg: string,
    timeoutMs: number = 30000,
  ): Promise<string> {
    // If disconnected, return empty immediately
    if (this.disconnectedPlayers.has(uid)) {
      return '';
    }

    // Check if input already queued
    const queue = this.inputQueues.get(uid);
    if (queue && queue.length > 0) {
      return queue.shift()!;
    }

    // Wait for input
    return new Promise<string>((resolve) => {
      const request: InputRequest = {
        uid,
        format,
        code,
        arg,
        timestamp: Date.now(),
      };

      // Notify the callback (GameSession) to send input_request to the player
      console.log(`[InputManager] waitForInput uid=${uid} format=${format} code=${code}`);
      this.onRequestCallback?.(uid, format, code, arg);

      const timer = setTimeout(() => {
        this.pendingInputs.delete(uid);
        resolve('');
      }, timeoutMs);

      this.pendingInputs.set(uid, {
        resolve,
        timer,
        request,
      });
    });
  }

  /**
   * Queue input for a player.
   * If a pending request exists, resolves it immediately.
   * Otherwise, queues for the next waitForInput call.
   */
  queueInput(uid: number, input: string): void {
    console.log(`[InputManager] queueInput uid=${uid} input="${input}"`);
    // Check for pending request
    const pending = this.pendingInputs.get(uid);
    if (pending) {
      // Clear timeout
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      // Resolve the promise
      pending.resolve(input);
      this.pendingInputs.delete(uid);
      return;
    }

    // Queue for later
    if (!this.inputQueues.has(uid)) {
      this.inputQueues.set(uid, []);
    }
    this.inputQueues.get(uid)!.push(input);
  }

  /**
   * Cancel pending input for a player.
   * Resolves with empty string.
   */
  cancelInput(uid: number): void {
    const pending = this.pendingInputs.get(uid);
    if (pending) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      pending.resolve('');
      this.pendingInputs.delete(uid);
    }
  }

  /**
   * Mark a player as disconnected.
   * All pending input will resolve with empty string.
   */
  markDisconnected(uid: number): void {
    this.disconnectedPlayers.add(uid);
    this.cancelInput(uid);
  }

  /**
   * Clear a player's input queue.
   */
  clearQueue(uid: number): void {
    this.inputQueues.delete(uid);
  }

  /**
   * Cancel all pending inputs for all players.
   */
  cancelAll(): void {
    for (const pending of this.pendingInputs.values()) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      pending.resolve('');
    }
    this.pendingInputs.clear();
  }

  /**
   * Check if a player has a pending input request.
   */
  hasPendingInput(uid: number): boolean {
    return this.pendingInputs.has(uid);
  }

  /**
   * Get the pending input request for a player.
   */
  getRequest(uid: number): InputRequest | null {
    const pending = this.pendingInputs.get(uid);
    return pending ? pending.request : null;
  }

  /**
   * Clear all pending inputs and queues.
   */
  clear(): void {
    for (const pending of this.pendingInputs.values()) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      pending.resolve('');
    }
    this.pendingInputs.clear();
    this.inputQueues.clear();
    this.disconnectedPlayers.clear();
  }
}
