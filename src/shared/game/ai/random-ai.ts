/**
 * RandomAI - Random decision strategy for stress testing
 *
 * Makes uniformly random choices for all decisions.
 * Useful for stress testing to exercise various code paths.
 */

import type { AIStrategy } from './types';
import type { Board } from '../board';
import type { Player } from '../player';
import type { Hero } from '../card/hero';

export class RandomAI implements AIStrategy {
  readonly name = 'random';
  private rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  selectHero(availableHeroes: Hero[]): number {
    if (availableHeroes.length === 0) return 0;
    const index = Math.floor(this.rng() * availableHeroes.length);
    return availableHeroes[index].avatar;
  }

  makeMainPhaseDecision(
    _player: Player,
    _board: Board,
    validActions: string[],
  ): string {
    if (validActions.length === 0) return 'skip';
    const index = Math.floor(this.rng() * validActions.length);
    return validActions[index];
  }

  makeBattleDecision(
    _player: Player,
    _board: Board,
    validTargets: number[],
  ): number {
    if (validTargets.length === 0) return 0;
    const index = Math.floor(this.rng() * validTargets.length);
    return validTargets[index];
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
    const index = Math.floor(this.rng() * options.length);
    return options[index];
  }

  /**
   * Parse the format string to extract selectable options.
   * Format examples: "(p1p2p3)" -> ["1", "2", "3"]
   *                  "(c101c102)" -> ["101", "102"]
   *                  "(p1p2)(c101)" -> first option set
   */
  private parseOptions(format: string): string[] {
    // Try player format: (p1p2p3)
    const playerMatch = format.match(/\(p(\d+(?:p\d+)*)\)/);
    if (playerMatch) {
      return playerMatch[1].split('p');
    }

    // Try card format: (c101c102)
    const cardMatch = format.match(/\(c(\d+(?:c\d+)*)\)/);
    if (cardMatch) {
      return cardMatch[1].split('c');
    }

    // Try generic format: (X1X2X3) where X is any letter
    const genericMatch = format.match(/\(([a-zA-Z])(\d+(?:\1\d+)*)\)/);
    if (genericMatch) {
      return genericMatch[2].split(genericMatch[1]);
    }

    return [];
  }
}
