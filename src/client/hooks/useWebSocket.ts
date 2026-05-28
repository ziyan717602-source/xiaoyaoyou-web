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

const WS_URL = 'ws://localhost:3000';
const MAX_RECONNECT_ATTEMPTS = 10;

export function useWebSocket(url: string = WS_URL): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, (message: ServerMessage) => void>>(new Map());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
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

  const connect = useCallback(() => {
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
      };

      ws.onmessage = (event) => {
        const message = parseServerMessage(event.data);
        if (message) {
          handlersRef.current.forEach(handler => handler(message));
        }
      };

      ws.onclose = () => {
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
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { state, send, onMessage, connect, disconnect };
}
