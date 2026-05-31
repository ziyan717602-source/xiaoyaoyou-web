/**
 * Skill Phase Tests (ST)
 *
 * Tests the ST (Skill/Start) phase of the round:
 * 1. ST broadcasts R{rounder}ST,0 at start
 * 2. ST runs skill dispatch for stage code R{rounder}ST
 * 3. ST broadcasts R{rounder}ST,1 at end
 * 4. ST transitions to EP
 *
 * The ST phase is where hero passives, equipment effects, etc. trigger
 * at the start of a round via sk02 stage-based dispatch.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../../player';
import { Board } from '../../board';
import { EventBus } from '../event-bus';
import { RoundManager, RoundPhase, PHASE_TRANSITIONS } from '../round';
import { LibGroup } from '../../lib-group';
import { GLoop } from '../g-loop';
import { SkillRegistry } from '../skill-registry';

function makePlayer(uid: number, team: number): Player {
  const p = new Player(`Player${uid}`, uid * 1000, uid);
  p.isAlive = true;
  p.isTared = true;
  p.team = team;
  p.hp = 10;
  p.hpBase = 10;
  p.selectHero = uid * 1000;
  return p;
}

describe('Skill Phase (ST)', () => {
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
      const p = makePlayer(i, i % 2 === 1 ? 1 : 2);
      board.garden.set(i, p);
      players.push(p);
    }
    board.rounder = players[0];
  });

  describe('Phase Transitions', () => {
    it('should have ST in phase transitions', () => {
      expect(RoundPhase.ST).toBeDefined();
      expect(PHASE_TRANSITIONS[RoundPhase.ST]).toContain(RoundPhase.EP);
    });

    it('should have OC transitioning to ST', () => {
      expect(PHASE_TRANSITIONS[RoundPhase.OC]).toContain(RoundPhase.ST);
    });
  });

  describe('ST broadcasts', () => {
    it('should emit run:stage with R{rounder}ST stage code', async () => {
      const runStageHandler = vi.fn();
      eventBus.on('run:stage', runStageHandler);

      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);

      expect(runStageHandler).toHaveBeenCalled();
      const data = runStageHandler.mock.calls[0][0];
      expect(data.stageCode).toBe('R1ST');
    });

    it('should emit round:st event', async () => {
      const handler = vi.fn();
      eventBus.on('round:st', handler);

      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('ST skill dispatch', () => {
    it('should include rounder uid in stage code', async () => {
      // Player 2 is rounder
      board.rounder = players[1];

      const runStageHandler = vi.fn();
      eventBus.on('run:stage', runStageHandler);

      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);

      const data = runStageHandler.mock.calls[0][0];
      expect(data.stageCode).toBe('R2ST');
    });
  });

  describe('ST transitions to EP', () => {
    it('should transition from ST to EP', async () => {
      expect(PHASE_TRANSITIONS[RoundPhase.ST]).toContain(RoundPhase.EP);
    });

    it('should execute EP handler after ST', async () => {
      const epHandler = vi.fn();
      eventBus.on('round:ep', epHandler);

      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);
      await roundManager.transition(RoundPhase.EP);

      expect(epHandler).toHaveBeenCalled();
    });
  });
});

describe('GLoop.runStage', () => {
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
      const p = makePlayer(i, i % 2 === 1 ? 1 : 2);
      board.garden.set(i, p);
    }
    board.rounder = board.garden.get(1)!;

    libGroup = new LibGroup();
    gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
    gLoop.setMessageHandler((msg) => messages.push(msg));

    // Wire run:stage event to GLoop (same as production GameSession wiring)
    eventBus.on('run:stage', async (data: { stageCode: string }) => {
      await gLoop.runStage(data.stageCode);
    });
  });

  it('should broadcast R{rounder}ST,0 when runStage is called', async () => {
    await gLoop.runStage('R1ST');

    expect(messages).toContain('R1ST,0');
  });

  it('should broadcast R{rounder}ST,1 when runStage is called', async () => {
    await gLoop.runStage('R1ST');

    expect(messages).toContain('R1ST,1');
  });

  it('should do nothing when no handlers are registered for stage', async () => {
    // No skills registered for R1ST - just broadcasts start/end and ACK
    const msgsBefore = messages.length;
    await gLoop.runStage('R1ST');

    // Should have 3 messages: start, end, ACK
    expect(messages.length).toBe(msgsBefore + 3);
    expect(messages[msgsBefore]).toBe('R1ST,0');
    expect(messages[msgsBefore + 1]).toBe('R1ST,1');
    expect(messages[msgsBefore + 2]).toBe('G2AS,0');
  });

  it('should handle different rounder UIDs', async () => {
    await gLoop.runStage('R2ST');

    expect(messages).toContain('R2ST,0');
    expect(messages).toContain('R2ST,1');
  });
});
