/**
 * AIActor - AI player decision-making
 *
 * Uses an AIStrategy to compute decisions locally.
 * M5: Supports optional delay policy for visible AI thinking time.
 */

import type { Actor } from './actor';
import type { DecisionRequest, DecisionResponse } from '../../shared/network/protocol';
import type { AIStrategy } from '../../shared/game/ai/types';
import type { Board } from '../../shared/game/board';
import type { Player } from '../../shared/game/player';
import type { DelayPolicy } from '../../shared/game/engine/event-queue';
import { ZERO_DELAY } from '../../shared/game/engine/event-queue';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class AIActor implements Actor {
  readonly kind = 'ai' as const;
  private delayPolicy: DelayPolicy;

  constructor(
    readonly uid: number,
    private strategy: AIStrategy,
    private board: Board,
    delayPolicy?: DelayPolicy,
  ) {
    this.delayPolicy = delayPolicy ?? ZERO_DELAY;
  }

  /**
   * Set the delay policy for AI thinking time.
   */
  setDelayPolicy(policy: DelayPolicy): void {
    this.delayPolicy = policy;
  }

  /**
   * Request a decision from the AI player.
   * Uses the strategy to compute a response locally.
   * M5: Applies delay policy for visible AI thinking time.
   */
  async requestDecision(request: DecisionRequest): Promise<DecisionResponse | null> {
    const player = this.board.garden.get(this.uid);
    if (!player || !player.isAlive) {
      return null;
    }

    try {
      // Apply AI thinking delay
      const delayMs = this.delayPolicy.aiThinkMs(request);
      if (delayMs > 0) {
        await sleep(delayMs);
      }

      // Convert DecisionRequest to format string for legacy AI strategy
      const format = this.buildFormatString(request);
      const input = this.strategy.makeInputDecision(player, this.board, format, request.code, '');

      // Convert AI response to DecisionResponse
      return this.parseAiResponse(request, input);
    } catch (err) {
      console.error(`[AIActor] Error computing decision for uid=${this.uid}:`, err);
      // Fallback: return PASS if available
      const passAction = request.legalActions.find(a => a.type === 'PASS');
      if (passAction) {
        return {
          requestId: request.requestId,
          phaseId: request.phaseId,
          uid: this.uid,
          actionId: passAction.actionId,
          payload: {},
        };
      }
      return null;
    }
  }

  /**
   * Build a format string from DecisionRequest for legacy AI strategy.
   */
  private buildFormatString(request: DecisionRequest): string {
    if (request.sourceFormat) {
      return request.sourceFormat;
    }

    // Build a minimal format string from the request
    const parts: string[] = [];
    if (request.candidates && request.candidates.length > 0) {
      const playerCandidates = request.candidates
        .filter(c => c.kind === 'player' && c.uid)
        .map(c => `T${c.uid}`);
      if (playerCandidates.length > 0) {
        parts.push(`T1(p${playerCandidates.join('p')})`);
      }
    }
    return parts.join('') || '#skip';
  }

  /**
   * Parse AI strategy response into a DecisionResponse.
   */
  private parseAiResponse(request: DecisionRequest, input: string): DecisionResponse | null {
    if (!input || input === '' || input === '/') {
      // No action - check if there's a PASS action
      const passAction = request.legalActions.find(a => a.type === 'PASS');
      if (passAction) {
        return {
          requestId: request.requestId,
          phaseId: request.phaseId,
          uid: this.uid,
          actionId: passAction.actionId,
          payload: {},
        };
      }
      return null;
    }

    // Try to match input to a legal action
    // Input format: "T1" for target selection, card codes for play card, etc.
    const targetMatch = input.match(/^T(\d+)$/);
    if (targetMatch) {
      const targetUid = parseInt(targetMatch[1], 10);
      const targetAction = request.legalActions.find(
        a => a.type === 'SELECT_TARGET' && a.targetUids?.includes(targetUid),
      );
      if (targetAction) {
        return {
          requestId: request.requestId,
          phaseId: request.phaseId,
          uid: this.uid,
          actionId: targetAction.actionId,
          payload: { targetUids: [targetUid] },
        };
      }
    }

    // Card code match (e.g., "JP03")
    const cardAction = request.legalActions.find(
      a => a.type === 'PLAY_CARD' && a.actionId === input,
    );
    if (cardAction) {
      return {
        requestId: request.requestId,
        phaseId: request.phaseId,
        uid: this.uid,
        actionId: cardAction.actionId,
        payload: { cardInstanceIds: cardAction.cardInstanceIds },
      };
    }

    // Fallback: use first legal action or PASS
    const firstAction = request.legalActions[0];
    if (firstAction) {
      return {
        requestId: request.requestId,
        phaseId: request.phaseId,
        uid: this.uid,
        actionId: firstAction.actionId,
        payload: {},
      };
    }

    return null;
  }
}
