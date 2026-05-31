import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

// Mock parseServerMessage
vi.mock('@shared/network', () => ({
  parseServerMessage: (data: string) => {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },
}));

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  url: string;

  send = vi.fn();
  close = vi.fn();

  static instances: MockWebSocket[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  simulateError() {
    this.onerror?.();
  }

  static lastInstance(): MockWebSocket {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }

  static reset() {
    MockWebSocket.instances = [];
  }
}

describe('useWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.reset();
    (globalThis as any).WebSocket = MockWebSocket;
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Flush pending timers before restoring real timers
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    // Don't delete WebSocket — hook cleanup callbacks may still reference it
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useWebSocket());
    expect(result.current.state.isConnected).toBe(false);
    expect(result.current.state.isReconnecting).toBe(false);
    expect(result.current.state.reconnectAttempts).toBe(0);
    expect(result.current.state.error).toBeNull();
  });

  it('should create WebSocket on mount and connect', () => {
    renderHook(() => useWebSocket());
    expect(MockWebSocket.instances.length).toBe(1);
    const ws = MockWebSocket.lastInstance();
    act(() => { ws.simulateOpen(); });
  });

  it('should set isConnected=true on open', () => {
    const { result } = renderHook(() => useWebSocket());
    const ws = MockWebSocket.lastInstance();
    act(() => { ws.simulateOpen(); });
    expect(result.current.state.isConnected).toBe(true);
    expect(result.current.state.isReconnecting).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('should send message when connected', () => {
    const { result } = renderHook(() => useWebSocket());
    const ws = MockWebSocket.lastInstance();
    act(() => { ws.simulateOpen(); });
    act(() => {
      result.current.send({ type: 'list_rooms' });
    });
    expect(ws.send).toHaveBeenCalledWith('{"type":"list_rooms"}');
  });

  it('should queue messages when disconnected and flush on reconnect', () => {
    const { result } = renderHook(() => useWebSocket());
    const ws = MockWebSocket.lastInstance();
    // Don't open the connection — messages should be queued
    act(() => {
      result.current.send({ type: 'list_rooms' });
      result.current.send({ type: 'ping', payload: { timestamp: 1 } });
    });
    expect(ws.send).not.toHaveBeenCalled();

    // Connect — queued messages should be flushed
    act(() => { ws.simulateOpen(); });
    expect(ws.send).toHaveBeenCalledTimes(2);
    expect(ws.send).toHaveBeenCalledWith('{"type":"list_rooms"}');
    expect(ws.send).toHaveBeenCalledWith('{"type":"ping","payload":{"timestamp":1}}');
  });

  it('should not queue messages beyond max limit', () => {
    const { result } = renderHook(() => useWebSocket());
    const ws = MockWebSocket.lastInstance();
    // Queue 50+ messages while disconnected
    act(() => {
      for (let i = 0; i < 55; i++) {
        result.current.send({ type: 'ping', payload: { timestamp: i } });
      }
    });
    // Connect — only first 50 should flush
    act(() => { ws.simulateOpen(); });
    expect(ws.send).toHaveBeenCalledTimes(50);
  });

  it('should dispatch messages to registered handlers', () => {
    const { result } = renderHook(() => useWebSocket());
    const ws = MockWebSocket.lastInstance();
    act(() => { ws.simulateOpen(); });

    const handler = vi.fn();
    let unsub: () => void;
    act(() => { unsub = result.current.onMessage(handler); });

    act(() => {
      ws.simulateMessage(JSON.stringify({ type: 'room_list', payload: { rooms: [] } }));
    });
    expect(handler).toHaveBeenCalledWith({ type: 'room_list', payload: { rooms: [] } });

    // Unsubscribe
    act(() => { unsub(); });
    act(() => {
      ws.simulateMessage(JSON.stringify({ type: 'room_list', payload: { rooms: [] } }));
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should ignore invalid JSON messages', () => {
    const { result } = renderHook(() => useWebSocket());
    const ws = MockWebSocket.lastInstance();
    act(() => { ws.simulateOpen(); });

    const handler = vi.fn();
    act(() => { result.current.onMessage(handler); });

    act(() => { ws.simulateMessage('not json'); });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should set disconnected state on close', () => {
    const { result } = renderHook(() => useWebSocket());
    const ws = MockWebSocket.lastInstance();
    act(() => { ws.simulateOpen(); });
    expect(result.current.state.isConnected).toBe(true);

    act(() => { ws.simulateClose(); });
    expect(result.current.state.isConnected).toBe(false);
  });

  it('should attempt reconnect on close with exponential backoff', () => {
    const { result } = renderHook(() => useWebSocket());
    const ws1 = MockWebSocket.lastInstance();
    act(() => { ws1.simulateOpen(); });
    act(() => { ws1.simulateClose(); });

    expect(result.current.state.isReconnecting).toBe(true);
    expect(result.current.state.reconnectAttempts).toBe(1);

    // First reconnect after 1s
    act(() => { vi.advanceTimersByTime(1000); });
    expect(MockWebSocket.instances.length).toBe(2);
  });

  it('should set error after max reconnect attempts', () => {
    const { result } = renderHook(() => useWebSocket());
    const ws = MockWebSocket.lastInstance();
    act(() => { ws.simulateOpen(); });

    // Close to trigger reconnect (attempt 1)
    act(() => { ws.simulateClose(); });
    expect(result.current.state.isReconnecting).toBe(true);
    expect(result.current.state.reconnectAttempts).toBe(1);

    // Let reconnect fire, then close again (attempt 2)
    act(() => { vi.advanceTimersByTime(1000); });
    const ws2 = MockWebSocket.lastInstance();
    act(() => { ws2.simulateClose(); });
    expect(result.current.state.reconnectAttempts).toBe(2);
  });

  it('should not create duplicate connections', () => {
    const { result } = renderHook(() => useWebSocket());
    expect(MockWebSocket.instances.length).toBe(1);

    // Call connect again while already connected
    const ws = MockWebSocket.lastInstance();
    act(() => { ws.simulateOpen(); });
    act(() => { result.current.connect(); });
    expect(MockWebSocket.instances.length).toBe(1);
  });

  it('should clean up on disconnect', () => {
    const { result } = renderHook(() => useWebSocket());
    const ws = MockWebSocket.lastInstance();
    act(() => { ws.simulateOpen(); });

    act(() => { result.current.disconnect(); });
    expect(result.current.state.isConnected).toBe(false);
    expect(result.current.state.isReconnecting).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('should send ping at interval when connected', () => {
    const { result } = renderHook(() => useWebSocket());
    const ws = MockWebSocket.lastInstance();
    act(() => { ws.simulateOpen(); });

    // Advance 25 seconds (ping interval)
    act(() => { vi.advanceTimersByTime(25000); });
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('"type":"ping"'));
  });
});
