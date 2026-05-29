import React from 'react';
import type { PlayerState, BoardState } from '@shared/network';
import PlayerInfo from './PlayerInfo';
import MonsterArea from './MonsterArea';

interface BattleAreaProps {
  players: PlayerState[];
  currentTurnUid: number;
  currentPlayerUid: number;
  phase: string;
  board: BoardState;
}

const PHASE_LABELS: Record<string, string> = {
  'start_turn': '回合开始',
  'draw': '摸牌阶段',
  'discard': '弃牌阶段',
  'main': '主要阶段',
  'battle': '战斗阶段',
  'end_turn': '回合结束',
  'escape': '逃跑判定',
  'equip': '装备阶段',
  'buy': '购买阶段',
};

const BattleArea: React.FC<BattleAreaProps> = ({
  players,
  currentTurnUid,
  currentPlayerUid,
  phase,
  board,
}) => {
  const displayPhase = PHASE_LABELS[phase] || phase;

  return (
    <div className="battle-area">
      <div className="battle-area-info">
        <div className="battle-info-row">
          <span className="battle-info-label">当前阶段</span>
          <span className="battle-info-value">{displayPhase}</span>
        </div>
        <div className="battle-info-row">
          <span className="battle-info-label">手牌堆</span>
          <span className="battle-info-value">{board.tuxPileCount}</span>
        </div>
        <div className="battle-info-row">
          <span className="battle-info-label">怪物堆</span>
          <span className="battle-info-value">{board.monPileCount}</span>
        </div>
        <div className="battle-info-row">
          <span className="battle-info-label">事件堆</span>
          <span className="battle-info-value">{board.evePileCount}</span>
        </div>
        <MonsterArea monster={board.activeMonster} />
      </div>
      <div className="battle-area-players">
        {players.map((player) => (
          <PlayerInfo
            key={player.uid}
            player={player}
            isCurrentTurn={player.uid === currentTurnUid}
            isCurrentPlayer={player.uid === currentPlayerUid}
          />
        ))}
      </div>
    </div>
  );
};

export default BattleArea;
