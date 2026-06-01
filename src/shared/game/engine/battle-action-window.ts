/**
 * BattleActionWindow - Manages the ZD battle card phase
 *
 * Handles the action loop where players can play battle cards (ZP01-ZP04)
 * during the ZD phase. Tracks restZP (remaining battle card plays per player)
 * and collects legal actions based on combatant status and hit results.
 */

import type { DecisionResponse, LegalAction, CardInstanceState } from '../../network/protocol';

export interface BattleActionContext {
  rounderUid: number;
  supporterUid?: number;
  hinderUid?: number;
  supportSucc: boolean;
  hinderSucc: boolean;
  rPool: number;
  oPool: number;
}

export interface BattleActionResult {
  applied: boolean;
  cardCode?: string;
  effect?: string;
  poolChange?: { side: 'r' | 'o'; delta: number };
  terminateBattle?: boolean;
}

export class BattleActionWindow {
  private restZP: Map<number, number> = new Map();
  private context: BattleActionContext;

  constructor(context: BattleActionContext, participants: number[]) {
    this.context = context;
    for (const uid of participants) {
      this.restZP.set(uid, 1); // Each player gets 1 battle card per fight
    }
  }

  /**
   * Collect legal actions for a player during the ZD phase.
   * Returns available battle card actions based on combatant status and hit results.
   */
  collectLegalActions(uid: number, hand: CardInstanceState[]): LegalAction[] {
    const actions: LegalAction[] = [];
    const isCombatant = this.isCombatant(uid);
    const hasHit = this.hasHit(uid);
    const restZP = this.restZP.get(uid) ?? 0;

    if (restZP <= 0) {
      // No battle cards left, only PASS
      actions.push({ actionId: 'PASS', type: 'PASS', actorUid: uid });
      return actions;
    }

    // ZP01 金蝉脱壳: combatants only
    if (isCombatant) {
      const jctk = hand.find(c => c.code === 'ZP01');
      if (jctk) {
        actions.push({
          actionId: 'ZP01',
          type: 'PLAY_CARD',
          actorUid: uid,
          cardInstanceIds: [jctk.instanceId],
          requiresConfirm: true,
        });
      }
    }

    // ZP02 天罡战气: combatants who hit
    if (isCombatant && hasHit) {
      const tgzq = hand.find(c => c.code === 'ZP02');
      if (tgzq) {
        actions.push({
          actionId: 'ZP02',
          type: 'PLAY_CARD',
          actorUid: uid,
          cardInstanceIds: [tgzq.instanceId],
        });
      }
    }

    // ZP03 金蚕王: combatants who hit
    if (isCombatant && hasHit) {
      const jcw = hand.find(c => c.code === 'ZP03');
      if (jcw) {
        actions.push({
          actionId: 'ZP03',
          type: 'PLAY_CARD',
          actorUid: uid,
          cardInstanceIds: [jcw.instanceId],
        });
      }
    }

    // ZP04 天玄五音: anyone with the card (non-combatants included)
    const txwy = hand.find(c => c.code === 'ZP04');
    if (txwy) {
      actions.push({
        actionId: 'ZP04',
        type: 'PLAY_CARD',
        actorUid: uid,
        cardInstanceIds: [txwy.instanceId],
        options: [
          { value: 'aka', label: '我方战力+2' },
          { value: 'ao', label: '敌方战力+2' },
        ],
      });
    }

    // Always include PASS
    actions.push({ actionId: 'PASS', type: 'PASS', actorUid: uid });

    return actions;
  }

  /**
   * Apply a player's battle card action.
   * Returns the result of the action (pool changes, battle termination, etc.)
   */
  apply(response: DecisionResponse): BattleActionResult {
    if (response.actionId === 'PASS') {
      return { applied: false };
    }

    // Check restZP
    const rest = this.restZP.get(response.uid) ?? 0;
    if (rest <= 0) return { applied: false };

    // Consume battle card
    this.restZP.set(response.uid, rest - 1);

    // Apply card effect
    return this.applyCard(response.actionId, response);
  }

  /**
   * Check if there are still players with legal actions.
   */
  shouldContinue(): boolean {
    for (const [uid, rest] of this.restZP) {
      if (rest > 0) return true;
    }
    return false;
  }

  /**
   * Get the remaining battle card count for a player.
   */
  getRestZP(uid: number): number {
    return this.restZP.get(uid) ?? 0;
  }

  private isCombatant(uid: number): boolean {
    return uid === this.context.rounderUid ||
           uid === this.context.supporterUid ||
           uid === this.context.hinderUid;
  }

  private hasHit(uid: number): boolean {
    if (uid === this.context.rounderUid) return true;
    if (uid === this.context.supporterUid) return this.context.supportSucc;
    if (uid === this.context.hinderUid) return this.context.hinderSucc;
    return false;
  }

  private applyCard(code: string, response: DecisionResponse): BattleActionResult {
    switch (code) {
      case 'ZP01': return { applied: true, cardCode: 'ZP01', terminateBattle: true };
      case 'ZP02': return { applied: true, cardCode: 'ZP02', effect: 'double_pool_values' };
      case 'ZP03': return { applied: true, cardCode: 'ZP03', poolChange: { side: 'r', delta: 3 } };
      case 'ZP04': {
        const side = response.payload.optionValues?.[0] === 'ao' ? 'o' : 'r';
        return { applied: true, cardCode: 'ZP04', poolChange: { side, delta: 2 } };
      }
      default: return { applied: false };
    }
  }
}
