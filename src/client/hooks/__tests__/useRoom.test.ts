import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRoom } from '../useRoom';
import type { UseWebSocketReturn } from '../useWebSocket';
import type { ServerMessage } from '@shared/network';

function createMockWs(connected = true): UseWebSocketReturn & { emit: (msg: ServerMessage) => void } {
  let handler: ((msg: ServerMessage) => void) | null = null;
  return {
    state: { isConnected: connected, isReconnecting: false, reconnectAttempts: 0, error: null },
    send: vi.fn(),
    onMessage: (h) => { handler = h; return () => { handler = null; }; },
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: (msg) => { handler?.(msg); },
  };
}

describe('useRoom', () => {
  let ws: ReturnType<typeof createMockWs>;

  beforeEach(() => {
    localStorage.clear();
    ws = createMockWs();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useRoom(ws));
    expect(result.current.rooms).toEqual([]);
    expect(result.current.currentRoom).toBeNull();
    expect(result.current.myUid).toBeNull();
    expect(result.current.playerName).toBeNull();
  });

  it('should restore state from localStorage', () => {
    localStorage.setItem('xyy_room', JSON.stringify({ roomId: 'ABCD', players: [] }));
    localStorage.setItem('xyy_myUid', '1');
    localStorage.setItem('xyy_playerName', '测试');
    const { result } = renderHook(() => useRoom(ws));
    expect(result.current.currentRoom).toEqual({ roomId: 'ABCD', players: [] });
    expect(result.current.myUid).toBe(1);
    expect(result.current.playerName).toBe('测试');
  });

  it('should update rooms on room_list message', () => {
    const { result } = renderHook(() => useRoom(ws));
    const rooms = [{ roomId: 'ABCD', playerCount: 2, maxPlayers: 4, hostName: 'Host', packages: [1], status: 'waiting' as const }];
    act(() => {
      ws.emit({ type: 'room_list', payload: { rooms } });
    });
    expect(result.current.rooms).toEqual(rooms);
  });

  it('should set room on room_created message', () => {
    const { result } = renderHook(() => useRoom(ws));
    act(() => {
      ws.emit({
        type: 'room_created',
        payload: {
          roomId: 'ABCD',
          players: [{ uid: 1, name: '房主', isReady: false, isConnected: true }],
          myUid: 1,
          maxPlayers: 4,
        },
      });
    });
    expect(result.current.currentRoom?.roomId).toBe('ABCD');
    expect(result.current.myUid).toBe(1);
    expect(result.current.playerName).toBe('房主');
    expect(localStorage.getItem('xyy_room')).toContain('ABCD');
  });

  it('should set room on room_joined message', () => {
    const { result } = renderHook(() => useRoom(ws));
    act(() => {
      ws.emit({
        type: 'room_joined',
        payload: {
          roomId: 'EFGH',
          players: [
            { uid: 1, name: 'Host', isReady: false, isConnected: true },
            { uid: 2, name: 'P2', isReady: false, isConnected: true },
          ],
          myUid: 2,
          maxPlayers: 4,
        },
      });
    });
    expect(result.current.currentRoom?.roomId).toBe('EFGH');
    expect(result.current.myUid).toBe(2);
  });

  it('should clear room on room_left message', () => {
    const { result } = renderHook(() => useRoom(ws));
    // First set up a room
    act(() => {
      ws.emit({
        type: 'room_created',
        payload: {
          roomId: 'ABCD',
          players: [{ uid: 1, name: 'Host', isReady: false, isConnected: true }],
          myUid: 1,
          maxPlayers: 6,
        },
      });
    });
    expect(result.current.currentRoom).not.toBeNull();
    // Then leave
    act(() => {
      ws.emit({ type: 'room_left', payload: { roomId: 'ABCD' } });
    });
    expect(result.current.currentRoom).toBeNull();
    expect(result.current.myUid).toBeNull();
    expect(localStorage.getItem('xyy_room')).toBeNull();
  });

  it('should update players on player_joined', () => {
    const { result } = renderHook(() => useRoom(ws));
    act(() => {
      ws.emit({
        type: 'room_created',
        payload: {
          roomId: 'ABCD',
          players: [{ uid: 1, name: 'Host', isReady: false, isConnected: true }],
          myUid: 1,
          maxPlayers: 6,
        },
      });
    });
    act(() => {
      ws.emit({
        type: 'player_joined',
        payload: {
          playerName: 'P2',
          players: [
            { uid: 1, name: 'Host', isReady: false, isConnected: true },
            { uid: 2, name: 'P2', isReady: false, isConnected: true },
          ],
        },
      });
    });
    expect(result.current.currentRoom?.players.length).toBe(2);
  });

  it('should update players on player_left', () => {
    const { result } = renderHook(() => useRoom(ws));
    act(() => {
      ws.emit({
        type: 'room_created',
        payload: {
          roomId: 'ABCD',
          players: [
            { uid: 1, name: 'Host', isReady: false, isConnected: true },
            { uid: 2, name: 'P2', isReady: false, isConnected: true },
          ],
          myUid: 1,
          maxPlayers: 4,
        },
      });
    });
    act(() => {
      ws.emit({
        type: 'player_left',
        payload: {
          playerName: 'P2',
          players: [{ uid: 1, name: 'Host', isReady: false, isConnected: true }],
        },
      });
    });
    expect(result.current.currentRoom?.players.length).toBe(1);
  });

  it('should send create_room message', () => {
    const { result } = renderHook(() => useRoom(ws));
    act(() => {
      result.current.createRoom(4, [1]);
    });
    expect(ws.send).toHaveBeenCalledWith({
      type: 'create_room',
      payload: { playerCount: 4, packages: [1] },
    });
  });

  it('should send join_room message', () => {
    const { result } = renderHook(() => useRoom(ws));
    act(() => {
      result.current.joinRoom('ABCD', '玩家');
    });
    expect(ws.send).toHaveBeenCalledWith({
      type: 'join_room',
      payload: { roomId: 'ABCD', playerName: '玩家' },
    });
  });

  it('should send leave_room message and clear local state', () => {
    const { result } = renderHook(() => useRoom(ws));
    act(() => {
      result.current.leaveRoom();
    });
    expect(ws.send).toHaveBeenCalledWith({ type: 'leave_room' });
    expect(result.current.currentRoom).toBeNull();
  });

  it('should send start_game message', () => {
    const { result } = renderHook(() => useRoom(ws));
    act(() => {
      result.current.startGame();
    });
    expect(ws.send).toHaveBeenCalledWith({ type: 'start_game' });
  });

  it('should send list_rooms message', () => {
    const { result } = renderHook(() => useRoom(ws));
    act(() => {
      result.current.refreshRooms();
    });
    expect(ws.send).toHaveBeenCalledWith({ type: 'list_rooms' });
  });

  it('should send only one reconnect on mount when connected with saved room', () => {
    localStorage.setItem('xyy_room', JSON.stringify({ roomId: 'ABCD', players: [] }));
    localStorage.setItem('xyy_myUid', '1');
    localStorage.setItem('xyy_playerName', '测试');
    renderHook(() => useRoom(ws));
    // Should send exactly one reconnect (not two)
    const mockSend = ws.send as ReturnType<typeof vi.fn>;
    const reconnectCalls = mockSend.mock.calls.filter(
      (c: unknown[]) => (c[0] as { type: string }).type === 'reconnect'
    );
    expect(reconnectCalls.length).toBe(1);
    expect(reconnectCalls[0][0]).toEqual({
      type: 'reconnect',
      payload: { roomId: 'ABCD', playerName: '测试' },
    });
  });

  it('should not send reconnect on mount when not connected', () => {
    localStorage.setItem('xyy_room', JSON.stringify({ roomId: 'ABCD', players: [] }));
    localStorage.setItem('xyy_myUid', '1');
    localStorage.setItem('xyy_playerName', '测试');
    const disconnectedWs = createMockWs(false);
    renderHook(() => useRoom(disconnectedWs));
    const mockSendDisconnected = disconnectedWs.send as ReturnType<typeof vi.fn>;
    const reconnectCalls = mockSendDisconnected.mock.calls.filter(
      (c: unknown[]) => (c[0] as { type: string }).type === 'reconnect'
    );
    expect(reconnectCalls.length).toBe(0);
  });
});
