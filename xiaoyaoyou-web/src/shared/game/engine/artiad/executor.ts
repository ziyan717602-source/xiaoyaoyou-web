/**
 * Artiad Executor - Execute parsed game actions
 * Translation of C# PSDGamepkg.Artiad action handling
 *
 * The executor builds context from a G-message and dispatches it through
 * the event bus for skill resolution.
 */

import { EventBus, type EventResult } from '../event-bus';
import type { GMessage } from '../g-message';
import type { Board } from '../../board';
import type { Player } from '../../player';
import { Parser } from './parser';

/** Execution context for an action */
export interface ExecutionContext {
  message: GMessage;
  board: Board;
  sender: Player | null;
  receiver: Player | null;
  args: string[];
}

/** Execution result */
export interface ExecutionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Executor - handles execution of parsed actions.
 */
export class Executor {
  private eventBus: EventBus;
  private board: Board;

  constructor(eventBus: EventBus, board: Board) {
    this.eventBus = eventBus;
    this.board = board;
  }

  /**
   * Execute a G-message action.
   */
  async execute(message: GMessage): Promise<ExecutionResult> {
    const context = this.buildContext(message);

    if (!this.preExecute(context)) {
      return { success: false, error: 'Pre-execution check failed' };
    }

    try {
      const result = this.eventBus.emit(message.type, context);
      this.postExecute(context, result);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build execution context from a message.
   */
  buildContext(message: GMessage): ExecutionContext {
    return {
      message,
      board: this.board,
      sender: this.board.garden.get(message.sender) ?? null,
      receiver: message.receiver === 0
        ? null
        : this.board.garden.get(message.receiver) ?? null,
      args: message.args,
    };
  }

  /**
   * Pre-execution checks.
   */
  private preExecute(context: ExecutionContext): boolean {
    if (context.sender && !context.sender.isAlive) {
      return false;
    }
    if (context.receiver && !context.receiver.isAlive) {
      return false;
    }
    return true;
  }

  /**
   * Post-execution processing.
   */
  private postExecute(context: ExecutionContext, result: unknown): void {
    // Logging, state updates, etc.
  }
}
