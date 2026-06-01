/**
 * Actor - Abstraction for player decision-making
 *
 * Provides a common interface for both human and AI players.
 * The game engine calls requestDecision() which returns a Promise.
 * HumanActor sends the request over the network and waits for response.
 * AIActor computes the response locally using a strategy.
 */

import type { DecisionRequest, DecisionResponse } from '../../shared/network/protocol';

/**
 * Actor - Interface for player decision-making.
 * Both human and AI players implement this interface.
 */
export interface Actor {
  /** Player UID */
  readonly uid: number;
  /** Actor kind */
  readonly kind: 'human' | 'ai';
  /** Request a decision from this player */
  requestDecision(request: DecisionRequest): Promise<DecisionResponse | null>;
}
