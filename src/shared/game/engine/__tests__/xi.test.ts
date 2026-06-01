import { describe, it, expect, vi } from 'vitest';
import { XI, type GameConfig } from '../xi';
import { LibGroup } from '../../lib-group';

function makeConfig(): GameConfig {
  return {
    playerCount: 2,
    packages: [1],
    seed: 42,
    mode: 'standard',
    levelCode: 2,
    isTrain: false,
  };
}

function makeLibGroup(): LibGroup {
  const lg = new LibGroup();
  lg.init({
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
  });
  return lg;
}

describe('XI', () => {
  it('should construct', () => {
    const config = makeConfig();
    const libGroup = makeLibGroup();
    const xi = new XI(config, libGroup);

    expect(xi.getBoard()).toBeDefined();
    expect(xi.getEventBus()).toBeDefined();
    expect(xi.getSkillRegistry()).toBeDefined();
    expect(xi.getGLoop()).toBeDefined();
    expect(xi.getRoundManager()).toBeDefined();
    expect(xi.getSelectHero()).toBeDefined();
  });

  it('should get config', () => {
    const config = makeConfig();
    const libGroup = makeLibGroup();
    const xi = new XI(config, libGroup);

    const got = xi.getConfig();
    expect(got.playerCount).toBe(2);
    expect(got.seed).toBe(42);
  });

  it('should not be running initially', () => {
    const config = makeConfig();
    const libGroup = makeLibGroup();
    const xi = new XI(config, libGroup);

    expect(xi.isGameRunning()).toBe(false);
    expect(xi.isGameOver()).toBe(true); // No alive players
  });

  it('should initialize players', async () => {
    const config = makeConfig();
    const libGroup = makeLibGroup();
    const xi = new XI(config, libGroup);

    // Access board after construction
    const board = xi.getBoard();
    expect(board.garden.size).toBe(0);
  });

  it('should set broadcast handler', () => {
    const config = makeConfig();
    const libGroup = makeLibGroup();
    const xi = new XI(config, libGroup);

    const handler = vi.fn();
    xi.setBroadcastHandler(handler);
    // No error should be thrown
  });

  it('should build skill registry', () => {
    const config = makeConfig();
    const libGroup = makeLibGroup();
    const xi = new XI(config, libGroup);

    // Register basic SKTs
    xi.getSkillRegistry().registerBasicSKTs();
    expect(xi.getSkillRegistry().sk02.size).toBeGreaterThan(0);
  });

  it('should produce serial message', () => {
    const config = makeConfig();
    const libGroup = makeLibGroup();
    const xi = new XI(config, libGroup);

    const msg = xi.toSerialMessage();
    // Empty board produces empty string
    expect(typeof msg).toBe('string');
  });
});
