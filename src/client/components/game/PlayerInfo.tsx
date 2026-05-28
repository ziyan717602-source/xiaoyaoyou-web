import React from 'react';
import type { PlayerState } from '@shared/network';

interface PlayerInfoProps {
  player: PlayerState;
  isCurrentTurn: boolean;
  isCurrentPlayer?: boolean;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({
  player,
  isCurrentTurn,
  isCurrentPlayer = false,
}) => {
  const className = [
    'player-info',
    isCurrentTurn ? 'player-info-turn' : '',
    isCurrentPlayer ? 'player-info-self' : '',
    player.hp <= 0 ? 'player-info-dead' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <div className="player-info-header">
        <span className="player-name">{player.name}</span>
        {isCurrentTurn && <span className="player-turn-badge">当前回合</span>}
        {isCurrentPlayer && <span className="player-self-badge">自己</span>}
      </div>
      <div className="player-info-stats">
        <div className="player-stat">
          <span className="stat-label">HP</span>
          <span className="stat-value stat-hp">{player.hp}</span>
        </div>
        <div className="player-stat">
          <span className="stat-label">手牌</span>
          <span className="stat-value">{player.hand.length}</span>
        </div>
        <div className="player-stat">
          <span className="stat-label">阵营</span>
          <span className="stat-value">{player.team === 1 ? '仙' : '剑'}</span>
        </div>
      </div>
    </div>
  );
};

export default PlayerInfo;
