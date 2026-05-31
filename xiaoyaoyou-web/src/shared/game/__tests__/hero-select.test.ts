/**
 * Hero Selection Tests
 *
 * Tests the hero selection flow with AI and network players:
 * - AI players select heroes immediately
 * - Network players wait for selection via EventBus
 * - Selection events are emitted for network bridging
 * - Hero initialization from selected hero
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Game, type GameConfig } from '../game';
import { RandomAI } from '../ai/random-ai';
import type { LibGroupData } from '../lib-group';
import { EventBus } from '../engine/event-bus';

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

/** Create a game config */
function makeConfig(overrides?: Partial<GameConfig>): GameConfig {
  return {
    playerCount: 2,
    packages: [1],
    seed: 42,
    maxRounds: 50,
    aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
    libGroupData: makeLibGroupDataWithHeroes(),
    levelCode: 2,
    ...overrides,
  };
}

describe('Hero Selection', () => {
  describe('AI Player Selection', () => {
    it('should assign heroes to all AI players', async () => {
      const game = new Game(makeConfig({
        playerCount: 2,
        aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
      }));
      game.registerAllAIPlayers();

      await game.run();

      const players = game.getPlayers();
      for (const player of players.values()) {
        expect(player.selectHero).toBeGreaterThan(0);
        expect(player.hp).toBeGreaterThan(0);
      }
    });

    it('should assign different heroes to different players', async () => {
      const game = new Game(makeConfig({
        playerCount: 2,
        aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
      }));
      game.registerAllAIPlayers();

      await game.run();

      const players = game.getPlayers();
      const heroes = Array.from(players.values()).map(p => p.selectHero);
      expect(heroes[0]).not.toBe(heroes[1]);
    });

    it('should initialize player stats from hero', async () => {
      const game = new Game(makeConfig({
        playerCount: 2,
        aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
      }));
      game.registerAllAIPlayers();

      await game.run();

      const players = game.getPlayers();
      for (const player of players.values()) {
        expect(player.hpBase).toBeGreaterThan(0);
        expect(player.strh).toBeGreaterThanOrEqual(0);
        expect(player.dexh).toBeGreaterThanOrEqual(0);
        expect(player.isAlive).toBe(true);
      }
    });
  });

  describe('Selection Events', () => {
    it('should emit hero_select_start event', async () => {
      const game = new Game(makeConfig({
        playerCount: 2,
        aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
      }));
      game.registerAllAIPlayers();

      // Initialize first (skillRegistry.clear() removes all listeners)
      game['initialize']();

      // Add listener AFTER initialize
      const events: string[] = [];
      const gameEventBus = game.getEventBus();
      gameEventBus.on('hero_select_start', () => { events.push('hero_select_start'); });

      // Run selectHeroes directly
      await game['selectHeroes']();

      expect(events).toContain('hero_select_start');
    });

    it('should emit hero_selected event for each player', async () => {
      const game = new Game(makeConfig({
        playerCount: 2,
        aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
      }));
      game.registerAllAIPlayers();

      // Initialize first
      game['initialize']();

      const selections: { uid: number; heroId: number }[] = [];
      const gameEventBus = game.getEventBus();
      gameEventBus.on('hero_selected', (data) => {
        const d = data as { uid: number; heroId: number };
        selections.push({ uid: d.uid, heroId: d.heroId });
      });

      await game['selectHeroes']();

      expect(selections).toHaveLength(2);
      expect(selections[0].uid).toBe(1);
      expect(selections[0].heroId).toBeGreaterThan(0);
      expect(selections[1].uid).toBe(2);
      expect(selections[1].heroId).toBeGreaterThan(0);
    });
  });

  describe('Network Player Selection', () => {
    it('should support direct selection via processSelection', async () => {
      const game = new Game(makeConfig({
        playerCount: 2,
        aiStrategies: [],
      }));
      game.registerAllAIPlayers();
      game['initialize']();

      const selectHero = game.getSelectHero();

      // Initialize the casting
      await selectHero['initialize']();

      // Get available heroes from the casting
      const casting = selectHero.getCasting();
      expect(casting).not.toBeNull();

      // Directly process selections (simulates network input)
      const success1 = selectHero.processSelection(1, 101);
      const success2 = selectHero.processSelection(2, 201);

      expect(success1).toBe(true);
      expect(success2).toBe(true);

      // Confirm selections
      await selectHero['confirmSelection']();

      // Verify selections
      const players = game.getPlayers();
      expect(players.get(1)!.selectHero).toBe(101);
      expect(players.get(2)!.selectHero).toBe(201);
    });
  });

  describe('No Heroes Available', () => {
    it('should handle empty hero pool', async () => {
      const game = new Game(makeConfig({
        playerCount: 2,
        libGroupData: {
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
        },
        aiStrategies: [new RandomAI(() => 0.5), new RandomAI(() => 0.5)],
      }));
      game.registerAllAIPlayers();

      const result = await game.run();

      // Game should still complete with default stats
      expect(result).toBeDefined();
      const players = game.getPlayers();
      for (const player of players.values()) {
        expect(player.hp).toBeGreaterThan(0);
      }
    });
  });
});
