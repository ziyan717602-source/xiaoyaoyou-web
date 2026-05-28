/**
 * GreedyAI - Greedy decision strategy
 *
 * Prioritizes aggressive actions: deals damage when possible,
 * targets lowest-HP enemies, and selects high-HP heroes.
 */

import type { AIStrategy } from './types';
import type { Board } from '../board';
import type { Player } from '../player';
import type { Hero } from '../card/hero';

export class GreedyAI implements AIStrategy {
  readonly name = 'greedy';

  selectHero(availableHeroes: Hero[]): number {
    if (availableHeroes.length === 0) return 0;
    // Select hero with highest HP
    let bestHero = availableHeroes[0];
    for (const hero of availableHeroes) {
      if (hero.hp > bestHero.hp) {
        bestHero = hero;
      }
    }
    return bestHero.avatar;
  }

  makeMainPhaseDecision(
    _player: Player,
    _board: Board,
    validActions: string[],
  ): string {
    if (validActions.length === 0) return 'skip';

    // Prioritize: play card > use skill > other actions
    const cardActions = validActions.filter(a => a.startsWith('play:'));
    if (cardActions.length > 0) return cardActions[0];

    const skillActions = validActions.filter(a => a.startsWith('skill:'));
    if (skillActions.length > 0) return skillActions[0];

    return validActions[0];
  }

  makeBattleDecision(
    _player: Player,
    board: Board,
    validTargets: number[],
  ): number {
    if (validTargets.length === 0) return 0;

    // Target the player with lowest HP
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
    // Greedy: select first available option
    return options[0];
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
