import React from 'react';
import type { GameResultPayload } from '@shared/network';

interface GameOverResultProps {
  result: GameResultPayload;
  onReturnToLobby: () => void;
}

const REASON_TEXT: Record<GameResultPayload['reason'], string> = {
  victory: '胜利',
  max_rounds: '达到最大回合数',
  elimination: '玩家淘汰',
};

const GameOverResult: React.FC<GameOverResultProps> = ({ result, onReturnToLobby }) => {
  return (
    <div className="game-over-result">
      <div className="game-over-result-header">
        <h2>游戏结束</h2>
      </div>
      <div className="game-over-result-body">
        <div className="result-winner">
          {result.winner !== null ? (
            <>
              <span className="result-label">胜者</span>
              <span className="result-value">玩家 {result.winner}</span>
            </>
          ) : (
            <span className="result-value">平局</span>
          )}
        </div>
        <div className="result-stats">
          <div className="result-stat">
            <span className="result-stat-label">总回合数</span>
            <span className="result-stat-value">{result.totalRounds}</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-label">仙阵营分数</span>
            <span className="result-stat-value">{result.akaScore}</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-label">剑阵营分数</span>
            <span className="result-stat-value">{result.aoScore}</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-label">结束原因</span>
            <span className="result-stat-value">{REASON_TEXT[result.reason]}</span>
          </div>
        </div>
      </div>
      <div className="game-over-result-footer">
        <button className="btn btn-primary" onClick={onReturnToLobby}>
          返回大厅
        </button>
      </div>
    </div>
  );
};

export default GameOverResult;
