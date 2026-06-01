import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, ServerMessage } from '@shared/network';
import { parseServerMessage } from '@shared/network';

export interface WebSocketState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  error: string | null;
}

export interface UseWebSocketReturn {
  state: WebSocketState;
  send: (message: ClientMessage) => void;
  onMessage: (handler: (message: ServerMessage) => void) => () => void;
  connect: () => void;
  disconnect: () => void;
}

const WS_URL = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_WS_URL || 'ws://localhost:5181';
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL = 25000; // 25 seconds
const MAX_QUEUE_SIZE = 50; // Max buffered messages during disconnect

export function useWebSocket(url: string = WS_URL): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, (message: ServerMessage) => void>>(new Map());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const messageQueueRef = useRef<ClientMessage[]>([]);
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isReconnecting: false,
    reconnectAttempts: 0,
    error: null,
  });

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  }, []);

  const mountedRef = useRef(false);

  const connect = useCallback(() => {
    // Don't create a new connection if we already have an open one
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    cleanup();

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setState(prev => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          reconnectAttempts: 0,
          error: null,
        }));

        // Flush queued messages
        const queue = messageQueueRef.current;
        messageQueueRef.current = [];
        for (const msg of queue) {
          ws.send(JSON.stringify(msg));
        }

        // Start heartbeat
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        pingTimerRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping', payload: { timestamp: Date.now() } }));
          }
        }, PING_INTERVAL);
      };

      ws.onmessage = (event) => {
        const message = parseServerMessage(event.data);
        if (message) {
          handlersRef.current.forEach(handler => handler(message));
        }
      };

      ws.onclose = () => {
        if (pingTimerRef.current) {
          clearInterval(pingTimerRef.current);
          pingTimerRef.current = null;
        }
        setState(prev => ({
          ...prev,
          isConnected: false,
        }));

        // Auto reconnect with exponential backoff
        const attempts = reconnectAttemptsRef.current;
        if (attempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current = attempts + 1;
          const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
          setState(prev => ({
            ...prev,
            isReconnecting: true,
            reconnectAttempts: attempts + 1,
          }));
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setState(prev => ({
            ...prev,
            isReconnecting: false,
            error: '连接失败，请检查服务器是否启动',
          }));
        }
      };

      ws.onerror = () => {
        // onclose will handle reconnection
      };
    } catch {
      setState(prev => ({
        ...prev,
        error: '无法建立 WebSocket 连接',
      }));
    }
  }, [url, cleanup]);

  const disconnect = useCallback(() => {
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS; // Prevent reconnect
    cleanup();
    setState({
      isConnected: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      error: null,
    });
  }, [cleanup]);

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message for later delivery
      if (messageQueueRef.current.length < MAX_QUEUE_SIZE) {
        messageQueueRef.current.push(message);
      }
    }
  }, []);

  const onMessage = useCallback((handler: (message: ServerMessage) => void) => {
    const id = Math.random().toString(36).substring(2, 9);
    handlersRef.current.set(id, handler);
    return () => {
      handlersRef.current.delete(id);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      // In React 18 dev mode, effects run twice (cleanup + re-run).
      // Use setTimeout(0) to defer disconnect: if the component re-mounts
      // before the timeout fires, mountedRef will be true and we skip disconnect.
      mountedRef.current = false;
      setTimeout(() => {
        if (!mountedRef.current) {
          disconnect();
        }
      }, 0);
    };
  }, [connect, disconnect]);

  return { state, send, onMessage, connect, disconnect };
}
