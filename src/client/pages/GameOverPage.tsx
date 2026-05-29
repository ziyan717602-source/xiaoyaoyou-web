import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GameOverResult from '../components/game/GameOverResult';
import { useWebSocket } from '../hooks/useWebSocket';
import { useGameState } from '../hooks/useGameState';

const GameOverPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const websocket = useWebSocket();
  const { gameResult } = useGameState(websocket);

  const result = gameResult || {
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
