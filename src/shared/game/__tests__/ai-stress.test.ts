/**
 * AI Stress Tests
 *
 * Runs many complete games with AI players to verify:
 * - All games end (no infinite loops)
 * - No unhandled exceptions
 * - All players reach a final state (alive or dead)
 * - Seeded RNG produces deterministic results
 *
 * Uses a helper function to create minimal test data.
 */

import { describe, it, expect } from 'vitest';
import { Game, type GameConfig, type GameResult } from '../game';
import { RandomAI } from '../ai/random-ai';
import { GreedyAI } from '../ai/greedy-ai';
import { RuleAI } from '../ai/rule-ai';
import type { AIStrategy } from '../ai/types';
import type { LibGroupData } from '../lib-group';

/** Create minimal LibGroup data for stress testing */
function makeStressLibGroupData(): LibGroupData {
  return {
    heroData: [
      {
        Name: 'H1', Avatar: 101, Group: 1, Genre: 1, Gender: 'M',
        HP: 8, STR: 4, DEX: 3, Skills: [], RelatedSkills: [],
        Spouses: [], Isomorphic: [], Archetype: 0, Antecessor: 0,
        Pioneer: 0, Ofcode: 'S01',
      },
      {
        Name: 'H2', Avatar: 201, Group: 1, Genre: 1, Gender: 'F',
        HP: 6, STR: 3, DEX: 5, Skills: [], RelatedSkills: [],
        Spouses: [], Isomorphic: [], Archetype: 0, Antecessor: 0,
        Pioneer: 0, Ofcode: 'S02',
      },
      {
        Name: 'H3', Avatar: 301, Group: 2, Genre: 2, Gender: 'M',
        HP: 7, STR: 5, DEX: 2, Skills: [], RelatedSkills: [],
        Spouses: [], Isomorphic: [], Archetype: 0, Antecessor: 0,
        Pioneer: 0, Ofcode: 'S03',
      },
      {
        Name: 'H4', Avatar: 401, Group: 2, Genre: 2, Gender: 'F',
        HP: 9, STR: 3, DEX: 4, Skills: [], RelatedSkills: [],
        Spouses: [], Isomorphic: [], Archetype: 0, Antecessor: 0,
        Pioneer: 0, Ofcode: 'S04',
      },
      {
        Name: 'H5', Avatar: 501, Group: 3, Genre: 3, Gender: 'M',
        HP: 10, STR: 6, DEX: 3, Skills: [], RelatedSkills: [],
        Spouses: [], Isomorphic: [], Archetype: 0, Antecessor: 0,
        Pioneer: 0, Ofcode: 'S05',
      },
      {
        Name: 'H6', Avatar: 601, Group: 3, Genre: 3, Gender: 'F',
        HP: 5, STR: 2, DEX: 7, Skills: [], RelatedSkills: [],
        Spouses: [], Isomorphic: [], Archetype: 0, Antecessor: 0,
        Pioneer: 0, Ofcode: 'S06',
      },
    ],
    tuxData: [
      {
        Name: 'C1', Code: 'JP01', Type: 'JP', Genre: 1, Package: [1], Range: [1, 3],
        Description: '', Special: {}, Priorities: [0], Occurs: [],
        Parasitism: [], Targets: ['*'], IsTermini: [false],
      },
      {
        Name: 'C2', Code: 'JP02', Type: 'JP', Genre: 1, Package: [1], Range: [4, 6],
        Description: '', Special: {}, Priorities: [0], Occurs: [],
        Parasitism: [], Targets: ['*'], IsTermini: [false],
      },
      {
        Name: 'C3', Code: 'TP01', Type: 'TP', Genre: 1, Package: [1], Range: [7, 9],
        Description: '', Special: {}, Priorities: [0], Occurs: [],
        Parasitism: [], Targets: ['*'], IsTermini: [false],
      },
    ],
    monsterData: [],
    npcData: [],
    eveData: [],
    skillData: [],
    opsData: [],
    njData: [],
    runeData: [],
    exspData: [],
  };
}

/** Create a stress test game config */
function makeStressConfig(
  playerCount: number,
  seed: number,
  strategies: AIStrategy[],
  maxRounds = 30,
): GameConfig {
  return {
    playerCount,
    packages: [1],
    seed,
    maxRounds,
    aiStrategies: strategies,
    libGroupData: makeStressLibGroupData(),
    levelCode: 2,
  };
}

/**
 * Run a single AI game and return the result.
 * Catches any errors and returns them as part of the result.
 */
async function runAIGame(
  playerCount: number,
  strategies: AIStrategy[],
  seed: number,
  maxRounds = 30,
): Promise<{ result: GameResult; error: string | null }> {
  try {
    const config = makeStressConfig(playerCount, seed, strategies, maxRounds);
    const game = new Game(config);
    game.registerAllAIPlayers();

    const result = await game.run();
    return { result, error: null };
  } catch (error) {
    return {
      result: {
        winner: null,
        totalRounds: 0,
        akaScore: 0,
        aoScore: 0,
        reason: 'elimination',
      },
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

describe('AI Stress Tests', () => {
  describe('2-Player Games', () => {
    it('should run 100 RandomAI vs RandomAI games without crashes', async () => {
      const GAME_COUNT = 100;
      const errors: string[] = [];

      for (let i = 0; i < GAME_COUNT; i++) {
        const { result, error } = await runAIGame(
          2,
          [new RandomAI(() => Math.random()), new RandomAI(() => Math.random())],
          i + 1,
        );

        if (error) {
          errors.push(`Game ${i + 1}: ${error}`);
          continue;
        }

        // Verify game ended
        expect(result.totalRounds).toBeGreaterThanOrEqual(0);
        expect(result.totalRounds).toBeLessThanOrEqual(30);

        // Verify scores are non-negative
        expect(result.akaScore).toBeGreaterThanOrEqual(0);
        expect(result.aoScore).toBeGreaterThanOrEqual(0);

        // Verify reason is valid
        expect(['victory', 'max_rounds', 'elimination']).toContain(result.reason);
      }

      // No errors should have occurred
      expect(errors).toEqual([]);
    }, { timeout: 60000 });

    it('should run 100 seeded games deterministically', async () => {
      const GAME_COUNT = 100;

      for (let i = 0; i < GAME_COUNT; i++) {
        const seed = i + 1000;
        const makeGame = () => {
          const config = makeStressConfig(
            2,
            seed,
            [new RandomAI(), new RandomAI()],
          );
          const game = new Game(config);
          game.registerAllAIPlayers();
          return game;
        };

        const game1 = makeGame();
        const result1 = await game1.run();

        const game2 = makeGame();
        const result2 = await game2.run();

        // Same seed should produce identical results
        expect(result1.totalRounds).toBe(result2.totalRounds);
        expect(result1.akaScore).toBe(result2.akaScore);
        expect(result1.aoScore).toBe(result2.aoScore);
        expect(result1.reason).toBe(result2.reason);
      }
    }, { timeout: 60000 });
  });

  describe('4-Player Games', () => {
    it('should run 100 4-player RandomAI games without crashes', async () => {
      const GAME_COUNT = 100;
      const errors: string[] = [];

      for (let i = 0; i < GAME_COUNT; i++) {
        const strategies = [
          new RandomAI(() => Math.random()),
          new RandomAI(() => Math.random()),
          new RandomAI(() => Math.random()),
          new RandomAI(() => Math.random()),
        ];

        const { result, error } = await runAIGame(4, strategies, i + 2000);

        if (error) {
          errors.push(`Game ${i + 1}: ${error}`);
          continue;
        }

        expect(result.totalRounds).toBeGreaterThanOrEqual(0);
        expect(result.totalRounds).toBeLessThanOrEqual(30);
        expect(result.akaScore).toBeGreaterThanOrEqual(0);
        expect(result.aoScore).toBeGreaterThanOrEqual(0);
        expect(['victory', 'max_rounds', 'elimination']).toContain(result.reason);
      }

      expect(errors).toEqual([]);
    }, { timeout: 120000 });
  });

  describe('Mixed Strategy Games', () => {
    it('should run 50 RandomAI vs GreedyAI games', async () => {
      const GAME_COUNT = 50;
      const errors: string[] = [];

      for (let i = 0; i < GAME_COUNT; i++) {
        const { result, error } = await runAIGame(
          2,
          [new RandomAI(() => Math.random()), new GreedyAI()],
          i + 3000,
        );

        if (error) {
          errors.push(`Game ${i + 1}: ${error}`);
          continue;
        }

        expect(result.totalRounds).toBeGreaterThanOrEqual(0);
        expect(result.totalRounds).toBeLessThanOrEqual(30);
        expect(['victory', 'max_rounds', 'elimination']).toContain(result.reason);
      }

      expect(errors).toEqual([]);
    }, { timeout: 60000 });

    it('should run 50 RandomAI vs RuleAI games', async () => {
      const GAME_COUNT = 50;
      const errors: string[] = [];

      for (let i = 0; i < GAME_COUNT; i++) {
        const { result, error } = await runAIGame(
          2,
          [new RandomAI(() => Math.random()), new RuleAI()],
          i + 4000,
        );

        if (error) {
          errors.push(`Game ${i + 1}: ${error}`);
          continue;
        }

        expect(result.totalRounds).toBeGreaterThanOrEqual(0);
        expect(result.totalRounds).toBeLessThanOrEqual(30);
        expect(['victory', 'max_rounds', 'elimination']).toContain(result.reason);
      }

      expect(errors).toEqual([]);
    }, { timeout: 60000 });

    it('should run 50 GreedyAI vs RuleAI games', async () => {
      const GAME_COUNT = 50;
      const errors: string[] = [];

      for (let i = 0; i < GAME_COUNT; i++) {
        const { result, error } = await runAIGame(
          2,
          [new GreedyAI(), new RuleAI()],
          i + 5000,
        );

        if (error) {
          errors.push(`Game ${i + 1}: ${error}`);
          continue;
        }

        expect(result.totalRounds).toBeGreaterThanOrEqual(0);
        expect(result.totalRounds).toBeLessThanOrEqual(30);
        expect(['victory', 'max_rounds', 'elimination']).toContain(result.reason);
      }

      expect(errors).toEqual([]);
    }, { timeout: 60000 });
  });

  describe('Stress Test Verification', () => {
    it('should verify all players reach final state in 2-player games', async () => {
      const GAME_COUNT = 20;

      for (let i = 0; i < GAME_COUNT; i++) {
        const config = makeStressConfig(
          2,
          i + 6000,
          [new RandomAI(() => Math.random()), new RandomAI(() => Math.random())],
        );
        const game = new Game(config);
        game.registerAllAIPlayers();

        await game.run();

        // Verify all players are in a valid final state
        const players = game.getPlayers();
        expect(players.size).toBe(2);

        for (const player of players.values()) {
          // Player must be either alive or dead
          expect(typeof player.isAlive).toBe('boolean');
          // Player must have valid HP
          expect(typeof player.hp).toBe('number');
        }
      }
    }, { timeout: 30000 });

    it('should verify all players reach final state in 4-player games', async () => {
      const GAME_COUNT = 20;

      for (let i = 0; i < GAME_COUNT; i++) {
        const config = makeStressConfig(
          4,
          i + 7000,
          [
            new RandomAI(() => Math.random()),
            new RandomAI(() => Math.random()),
            new RandomAI(() => Math.random()),
            new RandomAI(() => Math.random()),
          ],
        );
        const game = new Game(config);
        game.registerAllAIPlayers();

        await game.run();

        const players = game.getPlayers();
        expect(players.size).toBe(4);

        for (const player of players.values()) {
          expect(typeof player.isAlive).toBe('boolean');
          expect(typeof player.hp).toBe('number');
        }
      }
    }, { timeout: 30000 });
  });
});
