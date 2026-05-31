/**
 * AsyncInputAdapter - Bridges sync AI input with async network input
 *
 * The game engine uses a callback for input: (uid, format, code, arg) => string
 * This adapter allows it to work with both:
 * - Sync AI players (immediate response)
 * - Async network players (waits for response via InputManager)
 *
 * For network games, the adapter returns a Promise<string> that resolves
 * when the client sends input via WebSocket.
 */

import { InputManager, type InputRequest } from './input-manager';
import type { Board } from './board';

/** Player input mode */
export type PlayerInputMode = 'sync' | 'async';

/** Sync input callback (for AI players) */
export type SyncInputCallback = (uid: number, format: string, code: string, arg: string) => string;

/**
 * AsyncInputAdapter - bridges sync and async input.
 */
export class AsyncInputAdapter {
  private inputManager: InputManager;
  private board: Board;
  private syncCallbacks = new Map<number, SyncInputCallback>();
  private playerModes = new Map<number, PlayerInputMode>();

  constructor(inputManager: InputManager, board: Board) {
    this.inputManager = inputManager;
    this.board = board;
  }

  /**
   * Set a sync input callback for a player (AI).
   */
  setSyncInput(uid: number, callback: SyncInputCallback): void {
    this.syncCallbacks.set(uid, callback);
  }

  /**
   * Set player input mode.
   */
  setPlayerMode(uid: number, mode: PlayerInputMode): void {
    this.playerModes.set(uid, mode);
  }

  /**
   * Check if player is in sync mode.
   */
  isSyncMode(uid: number): boolean {
    return this.playerModes.get(uid) === 'sync';
  }

  /**
   * Get input from a player.
   * Uses sync callback if available, otherwise waits for async input.
   */
  async getInput(
    uid: number,
    format: string,
    code: string,
    arg: string,
    timeoutMs: number = 30000,
  ): Promise<string> {
    // Check if player has sync callback
    const syncCallback = this.syncCallbacks.get(uid);
    if (syncCallback) {
      // Use sync callback (for AI)
      return syncCallback(uid, format, code, arg);
    }

    // Use async input (for network)
    return this.inputManager.waitForInput(uid, format, code, arg, timeoutMs);
  }

  /**
   * Get the current input request for a player.
   */
  getCurrentRequest(uid: number): InputRequest | null {
    return this.inputManager.getRequest(uid);
  }

  /**
   * Cancel all pending inputs.
   */
  cancelAll(): void {
    for (const player of this.board.garden.keys()) {
      this.inputManager.cancelInput(player);
    }
  }

  /**
   * Handle player disconnect.
   */
  handleDisconnect(uid: number): void {
    this.inputManager.markDisconnected(uid);
    this.syncCallbacks.delete(uid);
    this.playerModes.delete(uid);
  }

  /**
   * Clear all state.
   */
  clear(): void {
    this.inputManager.clear();
    this.syncCallbacks.clear();
    this.playerModes.clear();
  }
}
