import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GameOverResult from '../components/game/GameOverResult';
import type { GameResultPayload } from '@shared/network';

const GameOverPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // In a real app, gameResult would come from context/state
  // For now, we use a placeholder that will be populated by the game flow
  const result: GameResultPayload = {
    winner: null,
    totalRounds: 0,
    akaScore: 0,
    aoScore: 0,
    reason: 'victory',
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
