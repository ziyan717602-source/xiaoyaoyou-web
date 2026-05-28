import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../event-bus';
import { SkillRegistry } from '../skill-registry';
import { GLoop, UEchoCode } from '../g-loop';
import { Board } from '../../board';
import { Player } from '../../player';
import { SimpleGMessage } from '../g-message';

function makePlayer(uid: number, team: number): Player {
  const p = new Player(`p${uid}`, uid * 1000, uid);
  p.team = team;
  p.isAlive = true;
  return p;
}

function makeBoard(): Board {
  const board = new Board();
  const p1 = makePlayer(1, 1);
  const p2 = makePlayer(2, 2);
  board.garden.set(1, p1);
  board.garden.set(2, p2);
  board.rounder = p1;
  return board;
}

describe('GLoop', () => {
  let eventBus: EventBus;
  let board: Board;
  let skillRegistry: SkillRegistry;
  let gLoop: GLoop;

  beforeEach(() => {
    eventBus = new EventBus();
    board = makeBoard();
    skillRegistry = new SkillRegistry(eventBus);
    skillRegistry.registerBasicSKTs();
    gLoop = new GLoop(eventBus, board, skillRegistry);
  });

  it('should construct with defaults', () => {
    expect(gLoop.queueLength).toBe(0);
  });

  it('should accept config overrides', () => {
    const custom = new GLoop(eventBus, board, skillRegistry, {
      maxQueueSize: 500,
      enableLogging: false,
    });
    expect(custom.queueLength).toBe(0);
  });

  it('should queue messages', () => {
    const msg = new SimpleGMessage('G0OH', 1, 2, ['3', '1']);
    gLoop.send(msg);
    expect(gLoop.queueLength).toBe(1);
  });

  it('should clear queue', () => {
    const msg = new SimpleGMessage('G0OH', 1, 2, ['3', '1']);
    gLoop.send(msg);
    gLoop.clearQueue();
    expect(gLoop.queueLength).toBe(0);
  });

  it('should start and stop', () => {
    gLoop.start();
    gLoop.stop();
    expect(gLoop.queueLength).toBe(0);
  });

  it('should raise G messages', () => {
    const handler = vi.fn();
    eventBus.on('G0OH', handler);

    gLoop.raiseGMessage('G0OH,1,2,3,1');
    expect(handler).toHaveBeenCalled();
  });

  it('should handle G2 messages', () => {
    const handler = vi.fn();
    eventBus.on('G2AS', handler);

    gLoop.raiseGMessage('G2AS,0');
    expect(handler).toHaveBeenCalled();
  });

  it('should emit to event bus on raise', () => {
    const handler = vi.fn();
    eventBus.on('G1TH', handler);

    gLoop.raiseGMessage('G1TH,1,0,5,-3,1');
    expect(handler).toHaveBeenCalled();
  });

  it('should broadcast messages via handler', () => {
    const broadcast = vi.fn();
    gLoop.setMessageHandler(broadcast);

    gLoop.raiseGMessage('G0OH,1,2,3,1');
    expect(broadcast).toHaveBeenCalledWith('G0OH,1,2,3,1');
  });

  it('should handle unknown event types gracefully', () => {
    // Should not throw
    gLoop.raiseGMessage('G0XX,1,2');
  });

  it('should support pause and resume', () => {
    gLoop.start();
    gLoop.pause();
    gLoop.resume();
    gLoop.stop();
  });
});
