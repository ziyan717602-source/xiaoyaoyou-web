/**
 * Battle Phases Tests
 *
 * Tests the complete battle phase sequence:
 * Z1 (monster silence) -> Z8 (mid-combat) -> CC (debut) -> PD (reaction)
 * -> ZC (player pool) -> ZD (combat cards) -> ZN (result) -> VS (effects) -> ZF (cleanup)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../../player';
import { Board } from '../../board';
import { EventBus } from '../event-bus';
import { RoundManager, RoundPhase } from '../round';
import { LibGroup } from '../../lib-group';
import { GLoop } from '../g-loop';
import { SkillRegistry } from '../skill-registry';

describe('Battle Phases', () => {
  let board: Board;
  let eventBus: EventBus;
  let roundManager: RoundManager;
  let players: Player[];

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    roundManager = new RoundManager(board, eventBus, new LibGroup());

    // Create 2 players
    players = [];
    for (let i = 1; i <= 2; i++) {
      const p = new Player(`Player${i}`, i, i);
      p.isAlive = true;
      p.isTared = true;
      p.team = i % 2 === 1 ? 1 : 2;
      p.hp = 10;
      p.hpBase = 10;
      p.strh = 3;
      p.dexh = 2;
      board.garden.set(i, p);
      players.push(p);
    }
    board.rounder = players[0];
  });

  describe('Phase Transitions', () => {
    it('should have Z1 in phase transitions', () => {
      expect(RoundPhase.Z1).toBeDefined();
      expect(PHASE_TRANSITIONS[RoundPhase.Z1]).toContain(RoundPhase.Z8);
    });

    it('should have Z8 in phase transitions', () => {
      expect(RoundPhase.Z8).toBeDefined();
      expect(PHASE_TRANSITIONS[RoundPhase.Z8]).toContain(RoundPhase.CC);
    });

    it('should have CC in phase transitions', () => {
      expect(RoundPhase.CC).toBeDefined();
      expect(PHASE_TRANSITIONS[RoundPhase.CC]).toContain(RoundPhase.PD);
    });

    it('should have PD in phase transitions', () => {
      expect(RoundPhase.PD).toBeDefined();
      expect(PHASE_TRANSITIONS[RoundPhase.PD]).toContain(RoundPhase.ZC);
    });

    it('should have ZC in phase transitions', () => {
      expect(RoundPhase.ZC).toBeDefined();
      expect(PHASE_TRANSITIONS[RoundPhase.ZC]).toContain(RoundPhase.ZD);
    });

    it('should have ZD in phase transitions', () => {
      expect(RoundPhase.ZD).toBeDefined();
      expect(PHASE_TRANSITIONS[RoundPhase.ZD]).toContain(RoundPhase.ZN);
    });

    it('should have ZF in phase transitions', () => {
      expect(RoundPhase.ZF).toBeDefined();
      expect(PHASE_TRANSITIONS[RoundPhase.ZF]).toContain(RoundPhase.ZZ);
      expect(PHASE_TRANSITIONS[RoundPhase.ZF]).toContain(RoundPhase.ED);
    });
  });

  describe('Battle State', () => {
    it('should reset battle state in Z0', async () => {
      // Set some battle state
      board.monster1 = 101;
      board.monster2 = 102;
      board.rPool = 5;
      board.oPool = 3;

      // Transition to Z0
      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);
      await roundManager.transition(RoundPhase.EP);
      await roundManager.transition(RoundPhase.EV);
      await roundManager.transition(RoundPhase.EE);
      await roundManager.transition(RoundPhase.GS);
      await roundManager.transition(RoundPhase.GR);
      await roundManager.transition(RoundPhase.GE);
      await roundManager.transition(RoundPhase.SK);
      await roundManager.transition(RoundPhase.Z0);

      // Verify state is reset
      expect(board.monster1).toBe(0);
      expect(board.monster2).toBe(0);
      expect(board.rPool).toBe(0);
      expect(board.oPool).toBe(0);
    });

    it('should set up support/hinder in ZW', async () => {
      // Set up round
      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);
      await roundManager.transition(RoundPhase.EP);
      await roundManager.transition(RoundPhase.EV);
      await roundManager.transition(RoundPhase.EE);
      await roundManager.transition(RoundPhase.GS);
      await roundManager.transition(RoundPhase.GR);
      await roundManager.transition(RoundPhase.GE);
      await roundManager.transition(RoundPhase.SK);
      await roundManager.transition(RoundPhase.Z0);
      await roundManager.transition(RoundPhase.ZW);

      // Verify support/hinder positions
      expect(board.posSupporters.length).toBeGreaterThan(0);
      expect(board.posHinders.length).toBeGreaterThan(0);
    });
  });

  describe('Z1 - Monster Silence', () => {
    it('should set inCampaign flag', async () => {
      // Set up round
      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);
      await roundManager.transition(RoundPhase.EP);
      await roundManager.transition(RoundPhase.EV);
      await roundManager.transition(RoundPhase.EE);
      await roundManager.transition(RoundPhase.GS);
      await roundManager.transition(RoundPhase.GR);
      await roundManager.transition(RoundPhase.GE);
      await roundManager.transition(RoundPhase.SK);
      await roundManager.transition(RoundPhase.Z0);
      await roundManager.transition(RoundPhase.ZW);
      await roundManager.transition(RoundPhase.ZU);
      await roundManager.transition(RoundPhase.ZM);
      await roundManager.transition(RoundPhase.Z1);

      // Verify battle state
      expect(board.inCampaign).toBe(true);
      expect(board.poolEnabled).toBe(true);
    });
  });

  describe('ZD - Main Battle', () => {
    it('should enable player pool', async () => {
      // Set up round
      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);
      await roundManager.transition(RoundPhase.EP);
      await roundManager.transition(RoundPhase.EV);
      await roundManager.transition(RoundPhase.EE);
      await roundManager.transition(RoundPhase.GS);
      await roundManager.transition(RoundPhase.GR);
      await roundManager.transition(RoundPhase.GE);
      await roundManager.transition(RoundPhase.SK);
      await roundManager.transition(RoundPhase.Z0);
      await roundManager.transition(RoundPhase.ZW);
      await roundManager.transition(RoundPhase.ZU);
      await roundManager.transition(RoundPhase.ZM);
      await roundManager.transition(RoundPhase.Z1);
      await roundManager.transition(RoundPhase.Z8);
      await roundManager.transition(RoundPhase.CC);
      await roundManager.transition(RoundPhase.PD);
      await roundManager.transition(RoundPhase.ZC);
      await roundManager.transition(RoundPhase.ZD);

      // Verify player pool is enabled
      expect(board.playerPoolEnabled).toBe(true);
    });
  });

  describe('ZF - Fight Result', () => {
    it('should clean up battle state', async () => {
      // Set up round
      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);
      await roundManager.transition(RoundPhase.EP);
      await roundManager.transition(RoundPhase.EV);
      await roundManager.transition(RoundPhase.EE);
      await roundManager.transition(RoundPhase.GS);
      await roundManager.transition(RoundPhase.GR);
      await roundManager.transition(RoundPhase.GE);
      await roundManager.transition(RoundPhase.SK);
      await roundManager.transition(RoundPhase.Z0);
      await roundManager.transition(RoundPhase.ZW);
      await roundManager.transition(RoundPhase.ZU);
      await roundManager.transition(RoundPhase.ZM);
      await roundManager.transition(RoundPhase.Z1);
      await roundManager.transition(RoundPhase.Z8);
      await roundManager.transition(RoundPhase.CC);
      await roundManager.transition(RoundPhase.PD);
      await roundManager.transition(RoundPhase.ZC);
      await roundManager.transition(RoundPhase.ZD);
      await roundManager.transition(RoundPhase.ZN);
      await roundManager.transition(RoundPhase.VS);
      await roundManager.transition(RoundPhase.ZF);

      // Verify cleanup - inCampaign and isMonsterDebut are reset in ED, not ZF
      // isBattleWin is set in ZN and persists through ZF
      expect(board.fightTangled).toBe(false);
    });
  });
});

// Import PHASE_TRANSITIONS
import { PHASE_TRANSITIONS } from '../round';

describe('GS/GR/GE Phase Events', () => {
  let board: Board;
  let eventBus: EventBus;
  let roundManager: RoundManager;
  let players: Player[];

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    roundManager = new RoundManager(board, eventBus, new LibGroup());

    players = [];
    for (let i = 1; i <= 2; i++) {
      const p = new Player(`Player${i}`, i, i);
      p.isAlive = true;
      p.isTared = true;
      p.team = i % 2 === 1 ? 1 : 2;
      p.hp = 10;
      p.hpBase = 10;
      p.strh = 3;
      p.dexh = 2;
      board.garden.set(i, p);
      players.push(p);
    }
    board.rounder = players[0];
  });

  it('should emit round:gs event', async () => {
    const handler = vi.fn();
    eventBus.on('round:gs', handler);

    await roundManager.transition(RoundPhase.OC);
    await roundManager.transition(RoundPhase.ST);
    await roundManager.transition(RoundPhase.EP);
    await roundManager.transition(RoundPhase.EV);
    await roundManager.transition(RoundPhase.EE);
    await roundManager.transition(RoundPhase.GS);

    expect(handler).toHaveBeenCalled();
  });

  it('should emit run:stage with R{rounder}GS', async () => {
    const runStageHandler = vi.fn();
    eventBus.on('run:stage', runStageHandler);

    await roundManager.transition(RoundPhase.OC);
    await roundManager.transition(RoundPhase.ST);
    await roundManager.transition(RoundPhase.EP);
    await roundManager.transition(RoundPhase.EV);
    await roundManager.transition(RoundPhase.EE);
    await roundManager.transition(RoundPhase.GS);

    expect(runStageHandler).toHaveBeenCalled();
    const gsCalls = runStageHandler.mock.calls.filter((c: [{ stageCode: string }]) => c[0].stageCode === 'R1GS');
    expect(gsCalls.length).toBeGreaterThan(0);
  });

  it('should emit round:gr event', async () => {
    const handler = vi.fn();
    eventBus.on('round:gr', handler);

    await roundManager.transition(RoundPhase.OC);
    await roundManager.transition(RoundPhase.ST);
    await roundManager.transition(RoundPhase.EP);
    await roundManager.transition(RoundPhase.EV);
    await roundManager.transition(RoundPhase.EE);
    await roundManager.transition(RoundPhase.GS);
    await roundManager.transition(RoundPhase.GR);

    expect(handler).toHaveBeenCalled();
  });

  it('should emit run:stage with R{rounder}GR', async () => {
    const runStageHandler = vi.fn();
    eventBus.on('run:stage', runStageHandler);

    await roundManager.transition(RoundPhase.OC);
    await roundManager.transition(RoundPhase.ST);
    await roundManager.transition(RoundPhase.EP);
    await roundManager.transition(RoundPhase.EV);
    await roundManager.transition(RoundPhase.EE);
    await roundManager.transition(RoundPhase.GS);
    await roundManager.transition(RoundPhase.GR);

    expect(runStageHandler).toHaveBeenCalled();
    const grCalls = runStageHandler.mock.calls.filter((c: [{ stageCode: string }]) => c[0].stageCode === 'R1GR');
    expect(grCalls.length).toBeGreaterThan(0);
  });

  it('should emit round:ge event', async () => {
    const handler = vi.fn();
    eventBus.on('round:ge', handler);

    await roundManager.transition(RoundPhase.OC);
    await roundManager.transition(RoundPhase.ST);
    await roundManager.transition(RoundPhase.EP);
    await roundManager.transition(RoundPhase.EV);
    await roundManager.transition(RoundPhase.EE);
    await roundManager.transition(RoundPhase.GS);
    await roundManager.transition(RoundPhase.GR);
    await roundManager.transition(RoundPhase.GE);

    expect(handler).toHaveBeenCalled();
  });

  it('should emit run:stage with R{rounder}GE', async () => {
    const runStageHandler = vi.fn();
    eventBus.on('run:stage', runStageHandler);

    await roundManager.transition(RoundPhase.OC);
    await roundManager.transition(RoundPhase.ST);
    await roundManager.transition(RoundPhase.EP);
    await roundManager.transition(RoundPhase.EV);
    await roundManager.transition(RoundPhase.EE);
    await roundManager.transition(RoundPhase.GS);
    await roundManager.transition(RoundPhase.GR);
    await roundManager.transition(RoundPhase.GE);

    expect(runStageHandler).toHaveBeenCalled();
    const geCalls = runStageHandler.mock.calls.filter((c: [{ stageCode: string }]) => c[0].stageCode === 'R1GE');
    expect(geCalls.length).toBeGreaterThan(0);
  });
});

describe('GLoop.runStage for GS/GR/GE', () => {
  let board: Board;
  let eventBus: EventBus;
  let skillRegistry: SkillRegistry;
  let gLoop: GLoop;
  let libGroup: LibGroup;
  let messages: string[];

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    skillRegistry = new SkillRegistry(eventBus);
    messages = [];

    for (let i = 1; i <= 2; i++) {
      const p = new Player(`Player${i}`, i, i);
      p.isAlive = true;
      p.isTared = true;
      p.team = i % 2 === 1 ? 1 : 2;
      p.hp = 10;
      p.hpBase = 10;
      board.garden.set(i, p);
    }
    board.rounder = board.garden.get(1)!;

    libGroup = new LibGroup();
    gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
    gLoop.setMessageHandler((msg) => messages.push(msg));

    eventBus.on('run:stage', async (data: { stageCode: string }) => {
      await gLoop.runStage(data.stageCode);
    });
  });

  it('should broadcast GS start and end', async () => {
    await gLoop.runStage('R1GS');

    expect(messages).toContain('R1GS,0');
    expect(messages).toContain('R1GS,1');
  });

  it('should broadcast GR start and end', async () => {
    await gLoop.runStage('R1GR');

    expect(messages).toContain('R1GR,0');
    expect(messages).toContain('R1GR,1');
  });

  it('should broadcast GE start and end', async () => {
    await gLoop.runStage('R1GE');

    expect(messages).toContain('R1GE,0');
    expect(messages).toContain('R1GE,1');
  });
});
