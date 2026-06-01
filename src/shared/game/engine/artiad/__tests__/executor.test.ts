import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../../event-bus';
import { Board } from '../../../board';
import { Player } from '../../../player';
import { Executor } from '../executor';
import { SimpleGMessage } from '../../g-message';

function makePlayer(uid: number, team: number): Player {
  const p = new Player(`p${uid}`, uid * 1000, uid);
  p.team = team;
  p.isAlive = true;
  return p;
}

describe('Executor', () => {
  let eventBus: EventBus;
  let board: Board;
  let executor: Executor;

  beforeEach(() => {
    eventBus = new EventBus();
    board = new Board();
    const p1 = makePlayer(1, 1);
    const p2 = makePlayer(2, 2);
    board.garden.set(1, p1);
    board.garden.set(2, p2);
    board.rounder = p1;
    executor = new Executor(eventBus, board);
  });

  it('should construct', () => {
    expect(executor).toBeDefined();
  });

  it('should build context from message', () => {
    const msg = new SimpleGMessage('G0OH', 1, 2, ['3', '1']);
    const context = executor.buildContext(msg);

    expect(context.message).toBe(msg);
    expect(context.board).toBe(board);
    expect(context.sender?.uid).toBe(1);
    expect(context.receiver?.uid).toBe(2);
    expect(context.args).toEqual(['3', '1']);
  });

  it('should build context with null receiver', () => {
    const msg = new SimpleGMessage('G0OH', 1, 0, ['3']);
    const context = executor.buildContext(msg);

    expect(context.sender?.uid).toBe(1);
    expect(context.receiver).toBeNull();
  });

  it('should execute a message', async () => {
    const handler = vi.fn();
    eventBus.on('G0OH', handler);

    const msg = new SimpleGMessage('G0OH', 1, 2, ['3', '1']);
    const result = await executor.execute(msg);

    expect(result.success).toBe(true);
    expect(handler).toHaveBeenCalled();
  });

  it('should fail pre-check for dead sender', async () => {
    const p1 = board.garden.get(1)!;
    p1.isAlive = false;

    const msg = new SimpleGMessage('G0OH', 1, 2, ['3', '1']);
    const result = await executor.execute(msg);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Pre-execution check failed');
  });

  it('should handle execution errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    eventBus.on('G0OH', () => { throw new Error('test error'); });

    const msg = new SimpleGMessage('G0OH', 1, 2, ['3', '1']);
    const result = await executor.execute(msg);

    // EventBus catches errors internally, so execution succeeds
    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
