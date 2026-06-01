/**
 * ActorRegistry - Manages Actor instances for all players in a game
 *
 * Provides lookup by UID and a convenience method to request a decision
 * from the appropriate actor based on the request's recipients.
 */

import type { Actor } from './actor';
import type { DecisionRequest, DecisionResponse } from '../../shared/network/protocol';

export class ActorRegistry {
  private actors = new Map<number, Actor>();

  /**
   * Register an actor for a player UID.
   */
  register(actor: Actor): void {
    this.actors.set(actor.uid, actor);
  }

  /**
   * Get the actor for a player UID.
   */
  get(uid: number): Actor | undefined {
    return this.actors.get(uid);
  }

  /**
   * Get all registered actors.
   */
  getAll(): Actor[] {
    return [...this.actors.values()];
  }

  /**
   * Get the number of registered actors.
   */
  get size(): number {
    return this.actors.size;
  }

  /**
   * Request a decision from the first recipient actor.
   * Returns null if no actor found for recipients.
   */
  async requestDecision(request: DecisionRequest): Promise<DecisionResponse | null> {
    for (const uid of request.recipients) {
      const actor = this.actors.get(uid);
      if (actor) {
        return actor.requestDecision(request);
      }
    }
    return null;
  }

  /**
   * Request decisions from all recipient actors in parallel.
   * Returns array of responses (null for actors that didn't respond).
   */
  async requestDecisionAll(request: DecisionRequest): Promise<(DecisionResponse | null)[]> {
    const promises = request.recipients.map(uid => {
      const actor = this.actors.get(uid);
      if (actor) {
        return actor.requestDecision(request);
      }
      return Promise.resolve(null);
    });
    return Promise.all(promises);
  }
}
