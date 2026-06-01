/**
 * InputManager - Manages player input for network games
 *
 * Provides async input waiting mechanism for network players.
 * The game engine calls waitForInput() which returns a Promise.
 * When network input arrives via queueInput(), the Promise resolves.
 *
 * This bridges the synchronous game engine with async network I/O.
 *
 * M2 extension: Adds DecisionRequest/Response support for structured input.
 */

import type { DecisionRequest, DecisionResponse, SubmitResult } from '../network/protocol';

/** Input request info (legacy format) */
export interface InputRequest {
  uid: number;
  format: string;
  code: string;
  arg: string;
  timestamp: number;
}

/** Pending input resolver (legacy) */
interface PendingInput {
  resolve: (input: string) => void;
  timer: ReturnType<typeof setTimeout> | null;
  request: InputRequest;
}

/** Pending decision resolver (M2) */
interface PendingDecision {
  request: DecisionRequest;
  resolve: (response: DecisionResponse | null) => void;
  timer: ReturnType<typeof setTimeout> | null;
  consumed: boolean;
}

/** Callback type for notifying when input is requested */
export type InputRequestCallback = (uid: number, format: string, code: string, arg: string) => void;

/** Callback type for notifying when decision is requested (M2) */
export type DecisionRequestCallback = (request: DecisionRequest) => void;

/**
 * InputManager - manages async player input.
 */
export class InputManager {
  // Legacy input tracking
  private pendingInputs = new Map<number, PendingInput>();
  private inputQueues = new Map<number, string[]>();
  private disconnectedPlayers = new Set<number>();
  private onRequestCallback: InputRequestCallback | null = null;

  // M2 Decision tracking
  private pendingDecisions = new Map<string, PendingDecision>();
  private onDecisionRequestCallback: DecisionRequestCallback | null = null;

  /**
   * Register a callback to be notified when input is requested.
   * Used by GameSession to send input_request to the specific player.
   */
  onRequest(callback: InputRequestCallback): void {
    this.onRequestCallback = callback;
  }

  /**
   * Register a callback to be notified when decision is requested (M2).
   * Used by GameSession to send decision_request to the specific player.
   */
  onDecisionRequest(callback: DecisionRequestCallback): void {
    this.onDecisionRequestCallback = callback;
  }

  // ─── Legacy Input Methods ───

  /**
   * Wait for input from a player (legacy format string).
   * Returns a Promise that resolves when input is provided or timeout occurs.
   */
  async waitForInput(
    uid: number,
    format: string,
    code: string,
    arg: string,
    timeoutMs: number = 30000,
  ): Promise<string> {
    if (this.disconnectedPlayers.has(uid)) {
      return '';
    }

    const queue = this.inputQueues.get(uid);
    if (queue && queue.length > 0) {
      return queue.shift()!;
    }

    return new Promise<string>((resolve) => {
      const request: InputRequest = { uid, format, code, arg, timestamp: Date.now() };

      console.log(`[InputManager] waitForInput uid=${uid} format=${format} code=${code}`);
      this.onRequestCallback?.(uid, format, code, arg);

      const timer = setTimeout(() => {
        this.pendingInputs.delete(uid);
        resolve('');
      }, timeoutMs);

      this.pendingInputs.set(uid, { resolve, timer, request });
    });
  }

  /**
   * Queue input for a player (legacy).
   */
  queueInput(uid: number, input: string): void {
    console.log(`[InputManager] queueInput uid=${uid} input="${input}"`);
    const pending = this.pendingInputs.get(uid);
    if (pending) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.resolve(input);
      this.pendingInputs.delete(uid);
      return;
    }
    if (!this.inputQueues.has(uid)) {
      this.inputQueues.set(uid, []);
    }
    this.inputQueues.get(uid)!.push(input);
  }

  /**
   * Cancel pending input for a player (legacy).
   */
  cancelInput(uid: number): void {
    const pending = this.pendingInputs.get(uid);
    if (pending) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.resolve('');
      this.pendingInputs.delete(uid);
    }
  }

  // ─── M2 Decision Methods ───

  /**
   * Request a structured decision from a player.
   * Returns a Promise that resolves when the player responds or timeout occurs.
   */
  requestDecision(request: DecisionRequest): Promise<DecisionResponse | null> {
    // If disconnected, return null immediately
    if (request.recipients.length === 1 && this.disconnectedPlayers.has(request.recipients[0])) {
      return Promise.resolve(null);
    }

    // Notify callback to send decision_request to the client
    console.log(`[InputManager] requestDecision requestId=${request.requestId} code=${request.code}`);
    this.onDecisionRequestCallback?.(request);

    return new Promise<DecisionResponse | null>((resolve) => {
      const timer = setTimeout(() => {
        this.pendingDecisions.delete(request.requestId);
        resolve(null);
      }, request.timeoutMs);

      this.pendingDecisions.set(request.requestId, {
        request,
        resolve,
        timer,
        consumed: false,
      });
    });
  }

  /**
   * Submit a decision response from a player.
   * Validates the response and resolves the pending decision.
   */
  submitDecision(response: DecisionResponse): SubmitResult {
    const pending = this.pendingDecisions.get(response.requestId);

    if (!pending) {
      return { accepted: false, reason: 'Unknown or expired requestId' };
    }

    if (pending.consumed) {
      return { accepted: false, reason: 'Decision already consumed' };
    }

    if (!pending.request.recipients.includes(response.uid)) {
      return { accepted: false, reason: 'Player is not a recipient of this decision' };
    }

    // Accept the response
    pending.consumed = true;
    if (pending.timer) clearTimeout(pending.timer);
    pending.resolve(response);
    this.pendingDecisions.delete(response.requestId);

    return { accepted: true };
  }

  /**
   * Cancel a pending decision by requestId.
   */
  cancelDecision(requestId: string): void {
    const pending = this.pendingDecisions.get(requestId);
    if (pending) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.resolve(null);
      this.pendingDecisions.delete(requestId);
    }
  }

  /**
   * Get all pending decisions for a specific player.
   */
  getPendingForUid(uid: number): DecisionRequest[] {
    const requests: DecisionRequest[] = [];
    for (const pending of this.pendingDecisions.values()) {
      if (pending.request.recipients.includes(uid) && !pending.consumed) {
        requests.push(pending.request);
      }
    }
    return requests;
  }

  // ─── Common Methods ───

  /**
   * Mark a player as disconnected.
   */
  markDisconnected(uid: number): void {
    this.disconnectedPlayers.add(uid);
    this.cancelInput(uid);
    // Cancel all pending decisions for this player
    for (const [requestId, pending] of this.pendingDecisions) {
      if (pending.request.recipients.includes(uid)) {
        this.cancelDecision(requestId);
      }
    }
  }

  /**
   * Clear a player's input queue.
   */
  clearQueue(uid: number): void {
    this.inputQueues.delete(uid);
  }

  /**
   * Cancel all pending inputs and decisions for all players.
   */
  cancelAll(): void {
    for (const pending of this.pendingInputs.values()) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.resolve('');
    }
    this.pendingInputs.clear();

    for (const pending of this.pendingDecisions.values()) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.resolve(null);
    }
    this.pendingDecisions.clear();
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
   * Clear all pending inputs, decisions, and queues.
   */
  clear(): void {
    for (const pending of this.pendingInputs.values()) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.resolve('');
    }
    this.pendingInputs.clear();

    for (const pending of this.pendingDecisions.values()) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.resolve(null);
    }
    this.pendingDecisions.clear();

    this.inputQueues.clear();
    this.disconnectedPlayers.clear();
  }
}
