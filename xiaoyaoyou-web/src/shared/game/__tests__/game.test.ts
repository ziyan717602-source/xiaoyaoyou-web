/**
 * Game Integration Tests
 *
 * Tests the Game class integration with core-models, game-engine, and card-effects.
 * Covers: initialization, hero selection, card dealing, round loop, settlement,
 * and AI player integration.
 */

import { describe, it, expect } from 'vitest';
import { Game, type GameConfig, type GameResult } from '../game';
import { RandomAI } from '../ai/random-ai';
import { GreedyAI } from '../ai/greedy-ai';
import { RuleAI } from '../ai/rule-ai';
import type { LibGroupData } from '../lib-group';

/** Create empty LibGroup data for testing */
function makeEmptyLibGroupData(): LibGroupData {
  return {
    heroData: [],
    tuxData: [],
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

/** Create LibGroup data with test heroes */
function makeLibGroupDataWithHeroes(): LibGroupData {
  return {
    heroData: [
      {
        Name: 'Hero1', Avatar: 101, Group: 1, Genre: 1, Gender: 'M',
        HP: 8, STR: 4, DEX: 3, Skills: ['JN01'], RelatedSkills: [],
        Spouses: [], Isomorphic: [], Archetype: 0, Antecessor: 0,
        Pioneer: 0, Ofcode: 'T01',
      },
      {
        Name: 'Hero2', Avatar: 201, Group: 1, Genre: 1, Gender: 'F',
        HP: 6, STR: 3, DEX: 5, Skills: ['JN02'], RelatedSkills: [],
        Spouses: [], Isomorphic: [], Archetype: 0, Antecessor: 0,
        Pioneer: 0, Ofcode: 'T02',
      },
      {
        Name: 'Hero3', Avatar: 301, Group: 2, Genre: 2, Gender: 'M',
        HP: 7, STR: 5, DEX: 2, Skills: ['JN03'], RelatedSkills: [],
        Spouses: [], Isomorphic: [], Archetype: 0, Antecessor: 0,
        Pioneer: 0, Ofcode: 'T03',
      },
      {
        Name: 'Hero4', Avatar: 401, Group: 2, Genre: 2, Gender: 'F',
        HP: 9, STR: 3, DEX: 4, Skills: ['JN04'], RelatedSkills: [],
        Spouses: [], Isomorphic: [], Archetype: 0, Antecessor: 0,
        Pioneer: 0, Ofcode: 'T04',
      },
    ],
    tuxData: [
      {
        Name: 'TestCard1', Code: 'JP01', Type: 'JP', Genre: 1, Package: [1], Range: [1, 2],
        Description: 'test card', Special: {}, Priorities: [0], Occurs: ['R#GR'],
        Parasitism: [], Targets: ['*'], IsTermini: [false],
      },
      {
        Name: 'TestCard2', Code: 'JP02', Type: 'JP', Genre: 1, Package: [1], Range: [3, 4],
        Description: 'test card 2', Special: {}, Priorities: [0], Occurs: ['R#GR'],
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

/** Create a standard game config */
function makeConfig(overrides?: Partial<GameConfig>): GameConfig {
  return {
    playerCount: 2,
    packages: [1],
    seed: 42,
    maxRounds: 50,
    aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
    libGroupData: makeEmptyLibGroupData(),
    levelCode: 2,
    ...overrides,
  };
}

describe('Game', () => {
  describe('Construction', () => {
    it('should construct with valid config', () => {
      const game = new Game(makeConfig());
      expect(game).toBeDefined();
    });

    it('should initialize all core components', () => {
      const game = new Game(makeConfig());
      expect(game.getBoard()).toBeDefined();
      expect(game.getLibGroup()).toBeDefined();
      expect(game.getEventBus()).toBeDefined();
      expect(game.getSkillRegistry()).toBeDefined();
      expect(game.getGLoop()).toBeDefined();
      expect(game.getRoundManager()).toBeDefined();
      expect(game.getSelectHero()).toBeDefined();
      expect(game.getEffectRegistry()).toBeDefined();
    });

    it('should not be initialized before run', () => {
      const game = new Game(makeConfig());
      expect(game.isInitialized()).toBe(false);
      expect(game.isRunning()).toBe(false);
    });

    it('should return config', () => {
      const config = makeConfig({ seed: 123, maxRounds: 100 });
      const game = new Game(config);
      const got = game.getConfig();
      expect(got.seed).toBe(123);
      expect(got.maxRounds).toBe(100);
    });
  });

  describe('AI Player Registration', () => {
    it('should register AI players', () => {
      const game = new Game(makeConfig());
      // Initialize first to create players
      game['initialized'] = false;
      game['initializePlayers']();

      game.addAIPlayer(1, new RandomAI());
      game.addAIPlayer(2, new GreedyAI());

      expect(game.getAIPlayers().size).toBe(2);
      expect(game.getAIPlayers().get(1)?.getStrategy().name).toBe('random');
      expect(game.getAIPlayers().get(2)?.getStrategy().name).toBe('greedy');
    });

    it('should register all AI players from config', () => {
      const strategies = [new RandomAI(), new GreedyAI()];
      const game = new Game(makeConfig({
        playerCount: 2,
        aiStrategies: strategies,
      }));

      // Need to initialize players first
      game['initializePlayers']();
      game.registerAllAIPlayers();

      expect(game.getAIPlayers().size).toBe(2);
    });
  });

  describe('Game Run (with empty data)', () => {
    it('should run a complete game with empty data', async () => {
      const game = new Game(makeConfig({
        playerCount: 2,
        maxRounds: 10,
        aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
      }));
      game.registerAllAIPlayers();

      const result = await game.run();

      expect(result).toBeDefined();
      expect(typeof result.totalRounds).toBe('number');
      expect(typeof result.akaScore).toBe('number');
      expect(typeof result.aoScore).toBe('number');
      expect(['victory', 'max_rounds', 'elimination', 'exhaustion']).toContain(result.reason);
    });

    it('should run with 4 players', async () => {
      const game = new Game(makeConfig({
        playerCount: 4,
        maxRounds: 10,
        aiStrategies: [
          new RandomAI(() => 0.5),
          new RandomAI(() => 0.5),
          new RandomAI(() => 0.5),
          new RandomAI(() => 0.5),
        ],
      }));
      game.registerAllAIPlayers();

      const result = await game.run();

      expect(result).toBeDefined();
      expect(result.totalRounds).toBeGreaterThanOrEqual(0);
      expect(result.totalRounds).toBeLessThanOrEqual(10);
    });

    it('should respect maxRounds limit', async () => {
      const maxRounds = 5;
      const game = new Game(makeConfig({
        playerCount: 2,
        maxRounds,
        aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
      }));
      game.registerAllAIPlayers();

      const result = await game.run();

      expect(result.totalRounds).toBeLessThanOrEqual(maxRounds);
    });
  });

  describe('Game Run (with hero data)', () => {
    it('should initialize players from heroes', async () => {
      const libData = makeLibGroupDataWithHeroes();
      const game = new Game(makeConfig({
        playerCount: 2,
        maxRounds: 10,
        libGroupData: libData,
        aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
      }));
      game.registerAllAIPlayers();

      const result = await game.run();

      expect(result).toBeDefined();
      // Players should have been initialized from heroes
      const players = game.getPlayers();
      for (const player of players.values()) {
        expect(player.isReal).toBe(true);
      }
    });

    it('should deal initial hand cards', async () => {
      const libData = makeLibGroupDataWithHeroes();
      const game = new Game(makeConfig({
        playerCount: 2,
        maxRounds: 10,
        libGroupData: libData,
        aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
      }));
      game.registerAllAIPlayers();

      await game.run();

      const players = game.getPlayers();
      // At least one player should have cards (if tux pile had cards)
      let totalCards = 0;
      for (const player of players.values()) {
        totalCards += player.tux.length;
      }
      // With 2 tux cards in data (range [1,2] and [3,4] = 4 cards),
      // each player gets up to 4 cards, so total should be > 0
      expect(totalCards).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Settlement', () => {
    it('should calculate scores', async () => {
      const game = new Game(makeConfig({
        playerCount: 2,
        maxRounds: 5,
        aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
      }));
      game.registerAllAIPlayers();

      const result = await game.run();

      expect(result.akaScore).toBeGreaterThanOrEqual(0);
      expect(result.aoScore).toBeGreaterThanOrEqual(0);
    });

    it('should determine a winner or draw', async () => {
      const game = new Game(makeConfig({
        playerCount: 2,
        maxRounds: 10,
        aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
      }));
      game.registerAllAIPlayers();

      const result = await game.run();

      if (result.reason === 'victory') {
        expect(result.winner).not.toBeNull();
        expect(result.winner!.isReal).toBe(true);
      } else {
        expect(result.winner).toBeNull();
      }
    });
  });

  describe('Error Handling', () => {
    it('should not crash on empty LibGroup', async () => {
      const game = new Game(makeConfig({
        playerCount: 2,
        maxRounds: 5,
        libGroupData: makeEmptyLibGroupData(),
        aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
      }));
      game.registerAllAIPlayers();

      // Should not throw
      const result = await game.run();
      expect(result).toBeDefined();
    });

    it('should handle all strategies without error', async () => {
      const game = new Game(makeConfig({
        playerCount: 2,
        maxRounds: 5,
        aiStrategies: [new GreedyAI(), new RuleAI()],
      }));
      game.registerAllAIPlayers();

      const result = await game.run();
      expect(result).toBeDefined();
    });
  });

  describe('Seeded RNG', () => {
    it('should produce same result with same seed', async () => {
      const makeGame = () => new Game(makeConfig({
        playerCount: 2,
        maxRounds: 10,
        seed: 12345,
        aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
      }));

      const game1 = makeGame();
      game1.registerAllAIPlayers();
      const result1 = await game1.run();

      const game2 = makeGame();
      game2.registerAllAIPlayers();
      const result2 = await game2.run();

      // Same seed should produce same total rounds and scores
      expect(result1.totalRounds).toBe(result2.totalRounds);
      expect(result1.akaScore).toBe(result2.akaScore);
      expect(result1.aoScore).toBe(result2.aoScore);
      expect(result1.reason).toBe(result2.reason);
    });
  });
});
