import React, { useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import GameOverResult from '../components/game/GameOverResult';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { useGameState } from '../hooks/useGameState';

const GameOverPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const websocket = useWebSocketContext();
  const { gameResult } = useGameState(websocket);

  // Use route state if available, otherwise fall back to useGameState or defaults
  const routeResult = (location.state as { result?: typeof gameResult })?.result;
  const result = routeResult || gameResult || {
    winner: null,
    totalRounds: 0,
    akaScore: 0,
    aoScore: 0,
    reason: 'victory' as const,
  };

  const handleReturnToLobby = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <div className="game-over-page">
      <GameOverResult
        result={result}
        onReturnToLobby={handleReturnToLobby}
      />
    </div>
  );
};

export default GameOverPage;
