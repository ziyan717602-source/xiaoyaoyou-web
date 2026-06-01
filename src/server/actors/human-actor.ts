/**
 * HumanActor - Human player decision-making via network
 *
 * Sends DecisionRequest to the client over WebSocket and waits for
 * the DecisionResponse. Uses InputManager for request/response tracking.
 */

import type { Actor } from './actor';
import type { DecisionRequest, DecisionResponse } from '../../shared/network/protocol';
import type { InputManager } from '../../shared/game/input-manager';
import type { ConnectionManager } from '../connection';

export class HumanActor implements Actor {
  readonly kind = 'human' as const;

  constructor(
    readonly uid: number,
    private connectionManager: ConnectionManager,
    private inputManager: InputManager,
    private connectionId: string,
  ) {}

  /**
   * Request a decision from the human player.
   * Sends decision_request over WebSocket and waits for decision_response.
   */
  async requestDecision(request: DecisionRequest): Promise<DecisionResponse | null> {
    // Send decision_request to the client
    this.connectionManager.send(this.connectionId, {
      type: 'decision_request',
      payload: request,
    });

    // Wait for response via InputManager
    return this.inputManager.requestDecision(request);
  }
}
