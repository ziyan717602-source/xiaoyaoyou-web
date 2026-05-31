import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';
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

describe('useGameState', () => {
  let ws: ReturnType<typeof createMockWs>;

  beforeEach(() => {
    ws = createMockWs();
  });

  it('should initialize with null state', () => {
    const { result } = renderHook(() => useGameState(ws));
    expect(result.current.gameState).toBeNull();
    expect(result.current.gameResult).toBeNull();
    expect(result.current.inputRequest).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should update gameState on game_state message', () => {
    const { result } = renderHook(() => useGameState(ws));
    const state = {
      players: [],
      currentTurn: 1,
      phase: 'main',
      board: { tuxPileCount: 20, monPileCount: 15, evePileCount: 10, activeMonster: null, activeEvent: null, tuxDises: [], monDises: [], eveDises: [] },
    };
    act(() => {
      ws.emit({ type: 'game_state', payload: { state } });
    });
    expect(result.current.gameState).toEqual(state);
  });

  it('should update inputRequest on input_request message', () => {
    const { result } = renderHook(() => useGameState(ws));
    act(() => {
      ws.emit({
        type: 'input_request',
        payload: { uid: 1, format: '(p1p2)', code: 'G0OH', arg: '选择目标' },
      });
    });
    expect(result.current.inputRequest).toEqual({
      uid: 1, format: '(p1p2)', code: 'G0OH', arg: '选择目标',
    });
  });

  it('should update gameResult on game_over message', () => {
    const { result } = renderHook(() => useGameState(ws));
    const gameResult = {
      winner: 1, totalRounds: 10, akaScore: 3, aoScore: 2, reason: 'victory' as const,
    };
    act(() => {
      ws.emit({ type: 'game_over', payload: { result: gameResult } });
    });
    expect(result.current.gameResult).toEqual(gameResult);
  });

  it('should update error on error message', () => {
    const { result } = renderHook(() => useGameState(ws));
    act(() => {
      ws.emit({ type: 'error', payload: { code: 'TEST', message: 'Something failed' } });
    });
    expect(result.current.error).toBe('Something failed');
  });

  it('should clear inputRequest via clearInputRequest', () => {
    const { result } = renderHook(() => useGameState(ws));
    act(() => {
      ws.emit({
        type: 'input_request',
        payload: { uid: 1, format: 'a', code: 'TEST', arg: '' },
      });
    });
    expect(result.current.inputRequest).not.toBeNull();
    act(() => {
      result.current.clearInputRequest();
    });
    expect(result.current.inputRequest).toBeNull();
  });

  it('should clear error via clearError', () => {
    const { result } = renderHook(() => useGameState(ws));
    act(() => {
      ws.emit({ type: 'error', payload: { code: 'TEST', message: 'err' } });
    });
    expect(result.current.error).toBe('err');
    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });

  it('should not update state on pong message', () => {
    const { result } = renderHook(() => useGameState(ws));
    act(() => {
      ws.emit({ type: 'pong', payload: { timestamp: Date.now() } });
    });
    expect(result.current.gameState).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should handle multiple messages in sequence', () => {
    const { result } = renderHook(() => useGameState(ws));
    act(() => {
      ws.emit({ type: 'error', payload: { code: 'E1', message: 'err1' } });
    });
    expect(result.current.error).toBe('err1');
    act(() => {
      ws.emit({ type: 'error', payload: { code: 'E2', message: 'err2' } });
    });
    expect(result.current.error).toBe('err2');
  });
});
