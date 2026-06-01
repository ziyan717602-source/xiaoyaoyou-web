/**
 * AI Strategy types - Interface for AI player decision-making
 *
 * Provides the AIStrategy interface and AIPlayer adapter for automated play.
 * AI players make decisions through the strategy pattern, allowing different
 * AI algorithms (random, greedy, rule-based) to be swapped at runtime.
 */

import type { Board } from '../board';
import type { Player } from '../player';
import type { Hero } from '../card/hero';

/**
 * AIStrategy - Interface for AI decision-making algorithms.
 * Each strategy implements hero selection and in-game decision methods.
 */
export interface AIStrategy {
  /** Strategy name for identification */
  readonly name: string;

  /** Select a hero from available heroes during hero selection phase */
  selectHero(availableHeroes: Hero[]): number;

  /** Make a decision during the main phase (play card, use skill, etc.) */
  makeMainPhaseDecision(
    player: Player,
    board: Board,
    validActions: string[],
  ): string;

  /** Choose a battle target from valid targets */
  makeBattleDecision(
    player: Player,
    board: Board,
    validTargets: number[],
  ): number;

  /** Make an input decision (select target, select card, etc.) */
  makeInputDecision(
    player: Player,
    board: Board,
    format: string,
    code: string,
    arg: string,
  ): string;
}

/**
 * AIPlayer - Adapter that connects an AIStrategy to the game's input system.
 * Wraps strategy calls with board state lookup for the target player.
 */
export class AIPlayer {
  private uid: number;
  private strategy: AIStrategy;
  private board: Board;

  constructor(uid: number, strategy: AIStrategy, board: Board) {
    this.uid = uid;
    this.strategy = strategy;
    this.board = board;
  }

  /** Get the player UID */
  getUid(): number {
    return this.uid;
  }

  /** Get the strategy */
  getStrategy(): AIStrategy {
    return this.strategy;
  }

  /** Select a hero during hero selection phase */
  selectHero(availableHeroes: Hero[]): number {
    return this.strategy.selectHero(availableHeroes);
  }

  /** Make a main phase decision */
  makeMainPhaseDecision(player: Player, validActions: string[]): string {
    return this.strategy.makeMainPhaseDecision(player, this.board, validActions);
  }

  /** Choose a battle target */
  makeBattleDecision(player: Player, validTargets: number[]): number {
    return this.strategy.makeBattleDecision(player, this.board, validTargets);
  }

  /** Get input for the game's async input system */
  getInput(format: string, code: string, arg: string): string {
    const player = this.board.garden.get(this.uid);
    if (!player) return '';

    return this.strategy.makeInputDecision(
      player,
      this.board,
      format,
      code,
      arg,
    );
  }
}
