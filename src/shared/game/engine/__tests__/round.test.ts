import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoundManager, RoundPhase, PHASE_TRANSITIONS } from '../round';
import { EventBus } from '../event-bus';
import { Board } from '../../board';
import { Player } from '../../player';
import { LibGroup } from '../../lib-group';

function makePlayer(uid: number, team: number): Player {
  const p = new Player(`p${uid}`, uid * 1000, uid);
  p.team = team;
  p.isAlive = true;
  return p;
}

describe('RoundPhase', () => {
  it('should have all phase stages', () => {
    expect(RoundPhase.INIT).toBe('00');
    expect(RoundPhase.OC).toBe('OC');
    expect(RoundPhase.ST).toBe('ST');
    expect(RoundPhase.EP).toBe('EP');
    expect(RoundPhase.EV).toBe('EV');
    expect(RoundPhase.EE).toBe('EE');
    expect(RoundPhase.GS).toBe('GS');
    expect(RoundPhase.GR).toBe('GR');
    expect(RoundPhase.GE).toBe('GE');
    expect(RoundPhase.Z0).toBe('Z0');
    expect(RoundPhase.ZW).toBe('ZW');
    expect(RoundPhase.ZU).toBe('ZU');
    expect(RoundPhase.ZM).toBe('ZM');
    expect(RoundPhase.NP).toBe('NP');
    expect(RoundPhase.Z1).toBe('Z1');
    expect(RoundPhase.Z8).toBe('Z8');
    expect(RoundPhase.CC).toBe('CC');
    expect(RoundPhase.PD).toBe('PD');
    expect(RoundPhase.ZC).toBe('ZC');
    expect(RoundPhase.ZD).toBe('ZD');
    expect(RoundPhase.ZF).toBe('ZF');
    expect(RoundPhase.ZE).toBe('ZE');
    expect(RoundPhase.ED).toBe('ED');
  });

  it('should define valid transitions', () => {
    expect(PHASE_TRANSITIONS[RoundPhase.INIT]).toContain(RoundPhase.OC);
    expect(PHASE_TRANSITIONS[RoundPhase.OC]).toContain(RoundPhase.ST);
    expect(PHASE_TRANSITIONS[RoundPhase.ST]).toContain(RoundPhase.EP);
    expect(PHASE_TRANSITIONS[RoundPhase.EP]).toContain(RoundPhase.EV);
    expect(PHASE_TRANSITIONS[RoundPhase.EV]).toContain(RoundPhase.EE);
    expect(PHASE_TRANSITIONS[RoundPhase.EE]).toContain(RoundPhase.GS);
  });
});

describe('RoundManager', () => {
  let eventBus: EventBus;
  let board: Board;
  let roundManager: RoundManager;

  beforeEach(() => {
    eventBus = new EventBus();
    board = new Board();
    const p1 = makePlayer(1, 1);
    const p2 = makePlayer(2, 2);
    board.garden.set(1, p1);
    board.garden.set(2, p2);
    board.rounder = p1;
    roundManager = new RoundManager(board, eventBus, new LibGroup());
  });

  it('should construct with initial state', () => {
    expect(roundManager.phase).toBe(RoundPhase.INIT);
    expect(roundManager.roundNumber).toBe(0);
  });

  it('should check valid transitions', () => {
    expect(roundManager.canTransition(RoundPhase.OC)).toBe(true);
    expect(roundManager.canTransition(RoundPhase.ST)).toBe(false);
  });

  it('should transition to valid phase', async () => {
    await roundManager.transition(RoundPhase.OC);
    expect(roundManager.phase).toBe(RoundPhase.OC);
  });

  it('should reject invalid transitions', async () => {
    await expect(roundManager.transition(RoundPhase.ST)).rejects.toThrow('Invalid transition');
  });

  it('should emit phase events', async () => {
    const beforeHandler = vi.fn();
    const afterHandler = vi.fn();
    eventBus.on('phase:before', beforeHandler);
    eventBus.on('phase:after', afterHandler);

    await roundManager.transition(RoundPhase.OC);

    expect(beforeHandler).toHaveBeenCalled();
    expect(afterHandler).toHaveBeenCalled();
  });

  it('should track previous phase', async () => {
    await roundManager.transition(RoundPhase.OC);
    const state = roundManager.getState();
    expect(state.previousPhase).toBe(RoundPhase.INIT);
  });

  it('should get state snapshot', async () => {
    await roundManager.transition(RoundPhase.OC);
    const state = roundManager.getState();
    expect(state.phase).toBe(RoundPhase.OC);
    expect(state).not.toBe(roundManager.getState()); // Different object
  });

  it('should have currentPhase getter', () => {
    expect(roundManager.currentPhase).toBe(RoundPhase.INIT);
  });

  it('should set custom phase handler', async () => {
    const customHandler = vi.fn();
    roundManager.setPhaseHandler(RoundPhase.OC, customHandler);

    await roundManager.transition(RoundPhase.OC);
    expect(customHandler).toHaveBeenCalled();
  });
});
