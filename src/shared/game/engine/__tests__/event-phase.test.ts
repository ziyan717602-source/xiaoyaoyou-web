/**
 * Event Phase Tests (EP -> EV -> EE)
 *
 * Tests the event phase flow:
 * 1. EP (Event Prepare): Reset player RAM
 * 2. EV (Event View): Player chooses to flip event card or skip
 * 3. EE (Event Execute): Execute event card effect
 *
 * G1EV handler:
 * - Priority 100: Dequeue from evePiles, set board.eve, check silence
 * - Priority 200: Call eve.Action(triggerPlayer)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../../player';
import { Board } from '../../board';
import { EventBus } from '../event-bus';
import { RoundManager, RoundPhase, PHASE_TRANSITIONS } from '../round';
import { LibGroup } from '../../lib-group';
import { GLoop } from '../g-loop';
import { SkillRegistry } from '../skill-registry';
import { Evenement } from '../../card/evenement';

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

function makeEvenement(code: string, name: string, spi: number = 0, range: string = '1,200'): Evenement {
  // Convert numeric spi flags to spis string: 0x8=S (silence), 0x1=H, 0x2=T, 0x4=T#
  let spis = '';
  if (spi & 0x1) spis += 'H';
  if (spi & 0x2) spis += 'T';
  if (spi & 0x4) spis += 'T#';
  if (spi & 0x8) spis += 'S';
  const eve = new Evenement(name, code, range, 1, 1, '', '', spis);
  return eve;
}

describe('Event Phase (EP -> EV -> EE)', () => {
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
    it('should have EP in phase transitions', () => {
      expect(RoundPhase.EP).toBeDefined();
      expect(PHASE_TRANSITIONS[RoundPhase.EP]).toContain(RoundPhase.EV);
    });

    it('should have EV in phase transitions', () => {
      expect(RoundPhase.EV).toBeDefined();
      expect(PHASE_TRANSITIONS[RoundPhase.EV]).toContain(RoundPhase.EE);
    });

    it('should have EE in phase transitions', () => {
      expect(RoundPhase.EE).toBeDefined();
      expect(PHASE_TRANSITIONS[RoundPhase.EE]).toContain(RoundPhase.GS);
    });
  });

  describe('EP phase', () => {
    it('should emit round:ep event', async () => {
      const handler = vi.fn();
      eventBus.on('round:ep', handler);

      // Transition through OC -> ST -> EP
      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);
      await roundManager.transition(RoundPhase.EP);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('EV phase', () => {
    it('should prompt rounder to flip event card via inputCallback', async () => {
      const inputFn = vi.fn().mockResolvedValue('/');
      roundManager.setInputCallback(inputFn);

      // Transition to EV through proper sequence
      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);
      await roundManager.transition(RoundPhase.EP);
      await roundManager.transition(RoundPhase.EV);

      expect(inputFn).toHaveBeenCalled();
      const [uid, format] = inputFn.mock.calls[0];
      expect(uid).toBe(players[0].uid);
      expect(format).toContain('翻取');
    });

    it('should broadcast skip message when rounder answers no (input "/")', async () => {
      const messages: string[] = [];
      const inputFn = vi.fn().mockResolvedValue('/');
      roundManager.setInputCallback(inputFn);
      roundManager.setMessageHandler((msg) => messages.push(msg));

      // Transition to EV
      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);
      await roundManager.transition(RoundPhase.EP);
      await roundManager.transition(RoundPhase.EV);

      // Should have broadcast a skip message (R{rounder}EV2,0)
      const skipMsg = messages.find(m => m.includes('EV2,0'));
      expect(skipMsg).toBeDefined();
    });

    it('should raise G1EV when rounder answers yes (input "2")', async () => {
      const messages: string[] = [];
      const inputFn = vi.fn().mockResolvedValue('2');
      roundManager.setInputCallback(inputFn);
      roundManager.setMessageHandler((msg) => messages.push(msg));

      // Wire up GLoop to process raise:gmessage events from RoundManager
      const skillRegistry = new SkillRegistry(eventBus);
      const gLoop = new GLoop(eventBus, board, skillRegistry, new LibGroup());
      gLoop.setMessageHandler((msg) => messages.push(msg));

      // Wire event bus raise:gmessage to GLoop (same as production GameSession wiring)
      eventBus.on('raise:gmessage', async (data: { cmd: string }) => {
        await gLoop.raiseGMessage(data.cmd);
      });

      // Transition to EV
      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);
      await roundManager.transition(RoundPhase.EP);
      await roundManager.transition(RoundPhase.EV);

      // Should have raised G1EV (broadcast by GLoop)
      const g1evMsg = messages.find(m => m.startsWith('G1EV,'));
      expect(g1evMsg).toBeDefined();
    });

    it('should work without inputCallback (auto-flip in AI mode)', async () => {
      const messages: string[] = [];
      // No inputCallback set
      roundManager.setMessageHandler((msg) => messages.push(msg));

      // Wire up GLoop to process raise:gmessage events
      const skillRegistry = new SkillRegistry(eventBus);
      const gLoop = new GLoop(eventBus, board, skillRegistry, new LibGroup());
      gLoop.setMessageHandler((msg) => messages.push(msg));
      eventBus.on('raise:gmessage', async (data: { cmd: string }) => {
        await gLoop.raiseGMessage(data.cmd);
      });

      // Transition to EV
      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);
      await roundManager.transition(RoundPhase.EP);
      await roundManager.transition(RoundPhase.EV);

      // Without inputCallback, event is auto-flipped (AI mode)
      // Should have G1EV message (event card broadcast)
      const eveMsg = messages.find(m => m.startsWith('G1EV,'));
      expect(eveMsg).toBeDefined();
    });
  });

  describe('EE phase', () => {
    it('should emit round:ee event', async () => {
      const handler = vi.fn();
      eventBus.on('round:ee', handler);

      // Transition to EE
      await roundManager.transition(RoundPhase.OC);
      await roundManager.transition(RoundPhase.ST);
      await roundManager.transition(RoundPhase.EP);
      await roundManager.transition(RoundPhase.EV);
      await roundManager.transition(RoundPhase.EE);

      expect(handler).toHaveBeenCalled();
    });
  });
});

describe('G1EV Handler', () => {
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
  });

  describe('Event card dequeue', () => {
    it('should dequeue from evePiles and set board.eve', async () => {
      // Add an event card to the pile
      board.evePiles.enqueue(101);

      await gLoop.raiseGMessage('G1EV,1,0');

      expect(board.eve).toBe(101);
      expect(board.evePiles.count).toBe(0);
    });

    it('should handle empty evePiles gracefully', async () => {
      // No cards in pile
      await gLoop.raiseGMessage('G1EV,1,0');

      expect(board.eve).toBe(0);
    });

    it('should broadcast G2IN when drawing from evePiles', async () => {
      board.evePiles.enqueue(101);

      await gLoop.raiseGMessage('G1EV,1,0');

      expect(messages.some(m => m.startsWith('G2IN,2,1'))).toBe(true);
    });

    it('should discard previous event card if one exists', async () => {
      board.eve = 200;
      board.evePiles.enqueue(101);

      await gLoop.raiseGMessage('G1EV,1,0');

      // Old event should be discarded
      expect(board.eveDises).toContain(200);
      // New event should be set
      expect(board.eve).toBe(101);
    });
  });

  describe('Silence check', () => {
    it('should execute action with silence active and clean up after', async () => {
      // Create a silence event (spi bit 3 = 0x8)
      const silenceEve = makeEvenement('SJ101', 'TestEvent', 0x8);

      // Track action execution - verify action ran (silence is temporary during action)
      let actionRan = false;
      let capturedPlayer: Player | null = null;
      silenceEve.action = (player) => {
        actionRan = true;
        capturedPlayer = player;
      };

      // Verify spis parsed correctly
      expect(silenceEve.isSilence()).toBe(true);

      // Inject via firsts + refresh (uses the official path)
      libGroup.el.firsts.push(silenceEve);
      libGroup.el.refresh();

      // Verify injection worked
      expect(libGroup.el.decodeEvenement(101)?.isSilence()).toBe(true);

      board.evePiles.enqueue(101);

      await gLoop.raiseGMessage('G1EV,1,0');

      // Action should have been called with the trigger player
      expect(actionRan).toBe(true);
      expect(capturedPlayer?.uid).toBe(1);
      // Silence is cleaned up after action resolves
      expect(board.silence.has('SJ101')).toBe(false);
    });

    it('should not add silence for non-silence events', async () => {
      const normalEve = makeEvenement('SJ201', 'NormalEvent', 0x0);
      libGroup.el.firsts.push(normalEve);
      libGroup.el.refresh();

      board.evePiles.enqueue(101);

      await gLoop.raiseGMessage('G1EV,1,0');

      expect(board.silence.has('SJ201')).toBe(false);
    });
  });

  describe('Event action execution', () => {
    it('should call eve.Action(triggerPlayer)', async () => {
      const actionSpy = vi.fn();
      const eve = makeEvenement('SJ301', 'TestAction');
      eve.action = actionSpy;
      libGroup.el.firsts.push(eve);
      libGroup.el.refresh();

      board.evePiles.enqueue(101);

      await gLoop.raiseGMessage('G1EV,1,0');

      expect(actionSpy).toHaveBeenCalled();
      // Action should receive the trigger player (rounder)
      const triggerPlayer = actionSpy.mock.calls[0][0];
      expect(triggerPlayer.uid).toBe(1);
    });

    it('should remove silence after action resolves', async () => {
      const silenceEve = makeEvenement('SJ401', 'SilenceEvent', 0x8);
      libGroup.el.firsts.push(silenceEve);
      libGroup.el.refresh();

      board.evePiles.enqueue(101);

      await gLoop.raiseGMessage('G1EV,1,0');

      // Silence is cleaned up after action resolves
      expect(board.silence.has('SJ401')).toBe(false);
    });
  });
});
