import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../event-bus';

describe('EventBus', () => {
  it('should register and trigger listeners', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('test', handler);
    bus.emit('test', { value: 42 });

    expect(handler).toHaveBeenCalledWith({ value: 42 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should trigger multiple listeners', () => {
    const bus = new EventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on('test', handler1);
    bus.on('test', handler2);
    bus.emit('test');

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should execute handlers in priority order', () => {
    const bus = new EventBus();
    const order: number[] = [];

    bus.on('test', () => { order.push(1); }, 10);
    bus.on('test', () => { order.push(3); }, 30);
    bus.on('test', () => { order.push(2); }, 20);

    bus.emit('test');

    expect(order).toEqual([3, 2, 1]);
  });

  it('should stop propagation when handler returns false', () => {
    const bus = new EventBus();
    const handler1 = vi.fn().mockReturnValue(false);
    const handler2 = vi.fn();

    bus.on('test', handler1, 10);
    bus.on('test', handler2, 5);
    bus.emit('test');

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should support once listeners', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.once('test', handler);
    bus.emit('test');
    bus.emit('test');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should remove listeners with off', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('test', handler);
    bus.off('test', handler);
    bus.emit('test');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should remove listeners by source', () => {
    const bus = new EventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on('test', handler1, 0, 'source1');
    bus.on('test', handler2, 0, 'source2');
    bus.offBySource('source1');
    bus.emit('test');

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should clear all listeners', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('test', handler);
    bus.clear();
    bus.emit('test');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should return listener count', () => {
    const bus = new EventBus();
    expect(bus.listenerCount('test')).toBe(0);

    bus.on('test', () => {});
    bus.on('test', () => {});
    expect(bus.listenerCount('test')).toBe(2);
  });

  it('should return event names', () => {
    const bus = new EventBus();
    bus.on('event1', () => {});
    bus.on('event2', () => {});

    const names = bus.eventNames();
    expect(names).toContain('event1');
    expect(names).toContain('event2');
  });

  it('should handle async emission', async () => {
    const bus = new EventBus();
    const handler = vi.fn().mockResolvedValue(undefined);

    bus.on('test', handler);
    const result = await bus.emitAsync('test');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.handled).toBe(true);
  });

  it('should return correct result for emit', () => {
    const bus = new EventBus();
    const result = bus.emit('nonexistent');
    expect(result.handled).toBe(false);
    expect(result.cancelled).toBe(false);
    expect(result.results).toEqual([]);
  });

  it('should track cancelled state', () => {
    const bus = new EventBus();
    bus.on('test', () => false, 10);
    const result = bus.emit('test');
    expect(result.cancelled).toBe(true);
  });

  it('should handle errors in handlers gracefully', () => {
    const bus = new EventBus();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    bus.on('test', () => { throw new Error('test error'); });
    bus.on('test', () => { /* second handler should still run */ });

    const result = bus.emit('test');
    expect(result.handled).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
