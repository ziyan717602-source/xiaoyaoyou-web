/**
 * DeckManager - Unified deck lifecycle management
 *
 * Handles drawing, discarding, and reshuffling for all deck types:
 * - Tux (hand cards): reshuffles discard pile when empty
 * - Monster/NPC: exhaustion triggers G1WJ, no reshuffle
 * - Event: exhaustion triggers game logic, no reshuffle
 *
 * Centralizes all tuxPiles.dequeue() and tuxDises.push() calls
 * to ensure consistent behavior and enable deck tracking.
 */

import type { Board } from '../board';

export type DeckKind = 'tux' | 'event' | 'monster';

export interface DrawResult {
  cards: number[];
  requested: number;
  drawn: number;
  reshuffled: boolean;
  exhausted: boolean;
}

export class DeckManager {
  constructor(private board: Board) {}

  /**
   * Draw hand cards (tux). When the draw pile is empty,
   * reshuffles the discard pile back into the draw pile.
   * When both piles are empty, returns partial results without throwing.
   */
  drawTux(count: number): DrawResult {
    const cards: number[] = [];
    let remaining = count;
    let reshuffled = false;

    // Draw from main pile
    while (remaining > 0 && this.board.tuxPiles.count > 0) {
      cards.push(this.board.tuxPiles.dequeue()!);
      remaining--;
    }

    // If we need more cards and the discard pile has cards, reshuffle
    if (remaining > 0 && this.board.tuxDises.length > 0) {
      const shuffled = this.shuffle(this.board.tuxDises);
      this.board.tuxPiles.enqueueRange(shuffled);
      this.board.tuxDises = [];
      reshuffled = true;

      // Continue drawing from the reshuffled pile
      while (remaining > 0 && this.board.tuxPiles.count > 0) {
        cards.push(this.board.tuxPiles.dequeue()!);
        remaining--;
      }
    }

    return {
      cards,
      requested: count,
      drawn: cards.length,
      reshuffled,
      exhausted: cards.length < count,
    };
  }

  /**
   * Discard hand cards. Cards go to the discard pile.
   */
  discardTux(cardIds: number[], _reason: string): void {
    this.board.tuxDises.push(...cardIds);
  }

  /**
   * Draw a monster/NPC card. When the pile is exhausted,
   * returns exhausted=true (caller should trigger G1WJ).
   * Does NOT reshuffle.
   */
  drawMonsterOrNpc(): DrawResult {
    if (this.board.monPiles.count === 0) {
      return { cards: [], requested: 1, drawn: 0, reshuffled: false, exhausted: true };
    }
    const card = this.board.monPiles.dequeue()!;
    return { cards: [card], requested: 1, drawn: 1, reshuffled: false, exhausted: false };
  }

  /**
   * Draw an event card. When the pile is exhausted,
   * returns exhausted=true.
   */
  drawEvent(): DrawResult {
    if (this.board.evePiles.count === 0) {
      return { cards: [], requested: 1, drawn: 0, reshuffled: false, exhausted: true };
    }
    const card = this.board.evePiles.dequeue()!;
    return { cards: [card], requested: 1, drawn: 1, reshuffled: false, exhausted: false };
  }

  /**
   * Fisher-Yates shuffle (seeded RNG not available here, uses Math.random).
   */
  private shuffle(cards: number[]): number[] {
    const arr = [...cards];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
