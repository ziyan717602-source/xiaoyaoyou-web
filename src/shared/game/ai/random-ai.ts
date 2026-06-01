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
   *                  "J1(pT1pT2)" -> ["T1", "T2"] (ZW battle choice)
   *                  "S" -> ["1", "2"] (side selection)
   *                  "#...##opt1##opt2,Y2" -> ["1", "2"] (yes/no menu)
   */
  private parseOptions(format: string): string[] {
    // Side selection format: bare "S"
    if (format.trim() === 'S') {
      return ['1', '2'];
    }

    // Yes/No menu format: #描述##选项1##选项2,Y{count}
    const menuMatch = format.match(/##(.+),Y(\d+)/);
    if (menuMatch) {
      const optionsStr = menuMatch[1];
      const allOptions = optionsStr.split('##').filter(s => s !== '');
      return allOptions.map((_, i) => String(i + 1));
    }

    // ZW battle choice format: #为支援者(决定),—{uid}:{name}则不支援,J1(pT1pT2...)
    // Extract T- prefixed player IDs
    const zwMatch = format.match(/J1\(p(T\d+(?:pT\d+)*)\)/);
    if (zwMatch) {
      return zwMatch[1].split('p');
    }

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

    // Leading "/" option (skippable)
    if (format.startsWith('/')) {
      const afterSlash = format.substring(1);
      const slashOptions = this.parseOptions(afterSlash);
      if (slashOptions.length > 0) {
        return [...slashOptions, '/'];
      }
      return ['/'];
    }

    // If no options found but format contains "/" (skip option), return "/" as valid choice
    if (format.includes('/')) {
      return ['/'];
    }

    return [];
  }
}
