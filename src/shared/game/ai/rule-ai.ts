/**
 * RuleAI - Rule-based decision strategy
 *
 * Follows basic game rules: heals when low HP, attacks when enemies are weak,
 * and selects heroes with balanced stats.
 */

import type { AIStrategy } from './types';
import type { Board } from '../board';
import type { Player } from '../player';
import type { Hero } from '../card/hero';

export class RuleAI implements AIStrategy {
  readonly name = 'rule';

  selectHero(availableHeroes: Hero[]): number {
    if (availableHeroes.length === 0) return 0;

    let bestHero = availableHeroes[0];
    let bestScore = -1;

    for (const hero of availableHeroes) {
      let score = hero.hp;
      // Bonus for healing skills
      if (hero.skills.some(s => s.includes('heal') || s.includes('cure') || s.includes('IH'))) {
        score += 10;
      }
      // Bonus for attack skills
      if (hero.skills.some(s => s.includes('attack') || s.includes('harm') || s.includes('OH'))) {
        score += 5;
      }
      // Bonus for balanced stats
      score += hero.str + hero.dex;

      if (score > bestScore) {
        bestScore = score;
        bestHero = hero;
      }
    }

    return bestHero.avatar;
  }

  makeMainPhaseDecision(
    player: Player,
    board: Board,
    validActions: string[],
  ): string {
    if (validActions.length === 0) return 'skip';

    const healActions = validActions.filter(a => this.isHealAction(a));
    const attackActions = validActions.filter(a => this.isAttackAction(a));

    // Heal if HP is below 50%
    if (player.hp < player.hpBase * 0.5 && healActions.length > 0) {
      return healActions[0];
    }

    // Attack if enemy HP is below 30%
    const opponent = board.getOpponent(player);
    if (opponent && opponent.uid !== 0 && opponent.hp < opponent.hpBase * 0.3 && attackActions.length > 0) {
      return attackActions[0];
    }

    // Default: first available action
    return validActions[0];
  }

  makeBattleDecision(
    _player: Player,
    board: Board,
    validTargets: number[],
  ): number {
    if (validTargets.length === 0) return 0;

    // Target lowest HP enemy
    let bestTarget = validTargets[0];
    let minHp = Infinity;

    for (const targetId of validTargets) {
      const target = board.garden.get(targetId);
      if (target && target.hp < minHp) {
        minHp = target.hp;
        bestTarget = targetId;
      }
    }

    return bestTarget;
  }

  makeInputDecision(
    _player: Player,
    _board: Board,
    format: string,
    _code: string,
    _arg: string,
  ): string {
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    return options[0];
  }

  private isHealAction(action: string): boolean {
    return action.includes('heal') || action.includes('cure') ||
      action.includes('IH') || action.includes('TP02');
  }

  private isAttackAction(action: string): boolean {
    return action.includes('attack') || action.includes('harm') ||
      action.includes('OH') || action.includes('JP');
  }

  private parseOptions(format: string): string[] {
    const playerMatch = format.match(/\(p(\d+(?:p\d+)*)\)/);
    if (playerMatch) {
      return playerMatch[1].split('p');
    }

    const cardMatch = format.match(/\(c(\d+(?:c\d+)*)\)/);
    if (cardMatch) {
      return cardMatch[1].split('c');
    }

    const genericMatch = format.match(/\(([a-zA-Z])(\d+(?:\1\d+)*)\)/);
    if (genericMatch) {
      return genericMatch[2].split(genericMatch[1]);
    }

    return [];
  }
}
