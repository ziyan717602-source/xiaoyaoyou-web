import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHeroSelect } from '../useHeroSelect';
import type { UseWebSocketReturn } from '../useWebSocket';
import type { ServerMessage } from '@shared/network';

function createMockWs(): UseWebSocketReturn & { emit: (msg: ServerMessage) => void } {
  let handler: ((msg: ServerMessage) => void) | null = null;
  return {
    state: { isConnected: true, isReconnecting: false, reconnectAttempts: 0, error: null },
    send: vi.fn(),
    onMessage: (h) => { handler = h; return () => { handler = null; }; },
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: (msg) => { handler?.(msg); },
  };
}

const mockHeroes = [
  { avatar: 1001, name: '李逍遥', group: 1, gender: 'M', hp: 10, str: 4, dex: 3 },
  { avatar: 1002, name: '赵灵儿', group: 1, gender: 'F', hp: 8, str: 2, dex: 4 },
];

describe('useHeroSelect', () => {
  let ws: ReturnType<typeof createMockWs>;

  beforeEach(() => {
    ws = createMockWs();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useHeroSelect(ws));
    expect(result.current.availableHeroes).toEqual([]);
    expect(result.current.selectedHeroes.size).toBe(0);
    expect(result.current.mySelection).toBeNull();
  });

  it('should populate availableHeroes on hero_select_request', () => {
    const { result } = renderHook(() => useHeroSelect(ws));
    act(() => {
      ws.emit({
        type: 'hero_select_request',
        payload: { uid: 1, availableHeroes: mockHeroes },
      });
    });
    expect(result.current.availableHeroes).toEqual(mockHeroes);
  });

  it('should reset selectedHeroes and mySelection on new hero_select_request', () => {
    const { result } = renderHook(() => useHeroSelect(ws));
    // First request
    act(() => {
      ws.emit({
        type: 'hero_select_request',
        payload: { uid: 1, availableHeroes: mockHeroes },
      });
    });
    act(() => {
      result.current.selectHero(1001);
    });
    expect(result.current.mySelection).toBe(1001);
    // Second request resets
    act(() => {
      ws.emit({
        type: 'hero_select_request',
        payload: { uid: 1, availableHeroes: mockHeroes },
      });
    });
    expect(result.current.mySelection).toBeNull();
    expect(result.current.selectedHeroes.size).toBe(0);
  });

  it('should add to selectedHeroes on successful hero_select_response', () => {
    const { result } = renderHook(() => useHeroSelect(ws));
    act(() => {
      ws.emit({
        type: 'hero_select_response',
        payload: { uid: 2, heroId: 1001, success: true },
      });
    });
    expect(result.current.selectedHeroes.get(2)).toEqual({ heroId: 1001 });
  });

  it('should not add to selectedHeroes on failed hero_select_response', () => {
    const { result } = renderHook(() => useHeroSelect(ws));
    act(() => {
      ws.emit({
        type: 'hero_select_response',
        payload: { uid: 2, heroId: 1001, success: false },
      });
    });
    expect(result.current.selectedHeroes.size).toBe(0);
  });

  it('should track multiple players selections', () => {
    const { result } = renderHook(() => useHeroSelect(ws));
    act(() => {
      ws.emit({
        type: 'hero_select_response',
        payload: { uid: 1, heroId: 1001, success: true },
      });
    });
    act(() => {
      ws.emit({
        type: 'hero_select_response',
        payload: { uid: 2, heroId: 1002, success: true },
      });
    });
    expect(result.current.selectedHeroes.size).toBe(2);
    expect(result.current.selectedHeroes.get(1)?.heroId).toBe(1001);
    expect(result.current.selectedHeroes.get(2)?.heroId).toBe(1002);
  });

  it('should set mySelection and send message on selectHero', () => {
    const { result } = renderHook(() => useHeroSelect(ws));
    act(() => {
      result.current.selectHero(1001);
    });
    expect(result.current.mySelection).toBe(1001);
    expect(ws.send).toHaveBeenCalledWith({
      type: 'hero_select',
      payload: { heroId: 1001 },
    });
  });

  it('should allow changing selection', () => {
    const { result } = renderHook(() => useHeroSelect(ws));
    act(() => {
      result.current.selectHero(1001);
    });
    act(() => {
      result.current.selectHero(1002);
    });
    expect(result.current.mySelection).toBe(1002);
    expect(ws.send).toHaveBeenCalledTimes(2);
  });

  it('should ignore non-hero messages', () => {
    const { result } = renderHook(() => useHeroSelect(ws));
    act(() => {
      ws.emit({ type: 'pong', payload: { timestamp: Date.now() } });
    });
    expect(result.current.availableHeroes).toEqual([]);
    expect(result.current.selectedHeroes.size).toBe(0);
  });
});
