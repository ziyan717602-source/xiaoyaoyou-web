/**
 * DeckManager Tests
 *
 * Tests the unified deck lifecycle management for tux, monster, and event decks.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DeckManager } from '../deck-manager';
import { Board } from '../../board';
import { Rueue } from '../../utils/rueue';

function makeBoard(): Board {
  const board = new Board();
  return board;
}

describe('DeckManager', () => {
  let board: Board;
  let deckManager: DeckManager;

  beforeEach(() => {
    board = makeBoard();
    deckManager = new DeckManager(board);
  });

  describe('drawTux', () => {
    it('should draw the requested number of cards', () => {
      board.tuxPiles.enqueueRange([1, 2, 3, 4, 5]);
      const result = deckManager.drawTux(3);

      expect(result.drawn).toBe(3);
      expect(result.cards).toEqual([1, 2, 3]);
      expect(result.reshuffled).toBe(false);
      expect(result.exhausted).toBe(false);
      expect(board.tuxPiles.count).toBe(2);
    });

    it('should reshuffle discard pile when draw pile is empty', () => {
      // Draw pile has 1 card, discard pile has 5
      board.tuxPiles.enqueue(1);
      board.tuxDises.push(10, 11, 12, 13, 14);

      const result = deckManager.drawTux(3);

      expect(result.drawn).toBe(3);
      expect(result.reshuffled).toBe(true);
      expect(result.exhausted).toBe(false);
      // First card from original pile, then 2 from reshuffled discard
      expect(result.cards.length).toBe(3);
      expect(board.tuxDises.length).toBe(0);
    });

    it('should return partial results when both piles are empty', () => {
      const result = deckManager.drawTux(3);

      expect(result.drawn).toBe(0);
      expect(result.cards).toEqual([]);
      expect(result.exhausted).toBe(true);
      expect(result.reshuffled).toBe(false);
    });

    it('should return partial when draw pile has fewer cards than requested', () => {
      board.tuxPiles.enqueueRange([1, 2]);
      const result = deckManager.drawTux(5);

      expect(result.drawn).toBe(2);
      expect(result.cards).toEqual([1, 2]);
      expect(result.exhausted).toBe(true);
    });

    it('should handle zero count request', () => {
      board.tuxPiles.enqueueRange([1, 2, 3]);
      const result = deckManager.drawTux(0);

      expect(result.drawn).toBe(0);
      expect(result.cards).toEqual([]);
      expect(result.exhausted).toBe(false);
    });
  });

  describe('discardTux', () => {
    it('should add cards to the discard pile', () => {
      deckManager.discardTux([1, 2, 3], 'test');

      expect(board.tuxDises).toEqual([1, 2, 3]);
    });

    it('should append to existing discard pile', () => {
      board.tuxDises.push(10, 11);
      deckManager.discardTux([1, 2], 'test');

      expect(board.tuxDises).toEqual([10, 11, 1, 2]);
    });
  });

  describe('drawMonsterOrNpc', () => {
    it('should draw one monster/NPC card', () => {
      board.monPiles.enqueueRange([100, 200, 300]);
      const result = deckManager.drawMonsterOrNpc();

      expect(result.drawn).toBe(1);
      expect(result.cards).toEqual([100]);
      expect(result.exhausted).toBe(false);
      expect(board.monPiles.count).toBe(2);
    });

    it('should return exhausted when pile is empty', () => {
      const result = deckManager.drawMonsterOrNpc();

      expect(result.drawn).toBe(0);
      expect(result.exhausted).toBe(true);
      expect(result.cards).toEqual([]);
    });

    it('should not reshuffle discard pile', () => {
      board.monPiles.enqueue(100);
      board.monDises.push(200, 300);

      const result = deckManager.drawMonsterOrNpc();

      expect(result.drawn).toBe(1);
      expect(result.reshuffled).toBe(false);
      expect(board.monDises).toEqual([200, 300]);
    });
  });

  describe('drawEvent', () => {
    it('should draw one event card', () => {
      board.evePiles.enqueueRange([10, 20, 30]);
      const result = deckManager.drawEvent();

      expect(result.drawn).toBe(1);
      expect(result.cards).toEqual([10]);
      expect(result.exhausted).toBe(false);
      expect(board.evePiles.count).toBe(2);
    });

    it('should return exhausted when pile is empty', () => {
      const result = deckManager.drawEvent();

      expect(result.drawn).toBe(0);
      expect(result.exhausted).toBe(true);
    });
  });
});
