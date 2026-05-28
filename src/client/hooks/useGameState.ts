import { useCallback, useEffect, useState } from 'react';
import type { GameState, GameResultPayload } from '@shared/network';
import type { UseWebSocketReturn } from './useWebSocket';

export interface InputRequest {
  format: string;
  code: string;
  arg: string;
}

export interface GameStateManager {
  gameState: GameState | null;
  gameResult: GameResultPayload | null;
  inputRequest: InputRequest | null;
  clearInputRequest: () => void;
  error: string | null;
  clearError: () => void;
}

export function useGameState(websocket: UseWebSocketReturn): GameStateManager {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameResult, setGameResult] = useState<GameResultPayload | null>(null);
  const [inputRequest, setInputRequest] = useState<InputRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = websocket.onMessage((message) => {
      switch (message.type) {
        case 'game_state':
          setGameState(message.payload.state);
          break;
        case 'input_request':
          setInputRequest(message.payload);
          break;
        case 'game_over':
          setGameResult(message.payload.result);
          break;
        case 'error':
          setError(message.payload.message);
          break;
        case 'pong':
          // heartbeat response, no action needed
          break;
      }
    });

    return unsubscribe;
  }, [websocket]);

  const clearInputRequest = useCallback(() => {
    setInputRequest(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { gameState, gameResult, inputRequest, clearInputRequest, error, clearError };
}
