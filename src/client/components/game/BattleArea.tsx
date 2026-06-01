import React from 'react';
import type { PlayerState, BoardState } from '@shared/network';
import PlayerInfo from './PlayerInfo';
import MonsterArea from './MonsterArea';
import type { AnimationEvent } from '../../hooks/useBattleAnimations';

interface BattleAreaProps {
  players: PlayerState[];
  currentTurnUid: number;
  currentPlayerUid: number;
  phase: string;
  board: BoardState;
  /** UIDs of valid targets for current input request. Empty = no target mode. */
  targetUids?: number[];
  /** UIDs of currently selected targets */
  selectedTargets?: number[];
  /** Called when a valid target is clicked */
  onTargetSelect?: (uid: number) => void;
  onRegisterAnimation?: (uid: number, callback: (event: AnimationEvent) => void) => () => void;
}

const PHASE_LABELS: Record<string, string> = {
  'start_turn': '回合开始',
  'draw': '摸牌',
  'discard': '弃牌',
  'main': '主要',
  'battle': '战斗',
  'end_turn': '回合结束',
  'escape': '逃跑',
  'equip': '装备',
  'buy': '购买',
};

/** Main round cycle phases in order */
const ROUND_PHASES = ['start_turn', 'draw', 'discard', 'main', 'battle', 'end_turn'];

const BattleArea: React.FC<BattleAreaProps> = ({
  players,
  currentTurnUid,
  currentPlayerUid,
  phase,
  board,
  targetUids,
  selectedTargets,
  onTargetSelect,
  onRegisterAnimation,
}) => {
  const displayPhase = PHASE_LABELS[phase] || phase;
  const phaseIndex = ROUND_PHASES.indexOf(phase);

  return (
    <div className="battle-area">
      <div className="battle-area-info">
        <div className="battle-info-row">
          <span className="battle-info-label">当前阶段</span>
          <span className="battle-info-value">{displayPhase}</span>
        </div>
        {/* Phase progress bar */}
        <div className="phase-progress">
          {ROUND_PHASES.map((p, i) => (
            <div
              key={p}
              className={`phase-step ${i < phaseIndex ? 'phase-done' : ''} ${i === phaseIndex ? 'phase-active' : ''}`}
            >
              <span className="phase-dot" />
              <span className="phase-label">{PHASE_LABELS[p]}</span>
            </div>
          ))}
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
        {board.activeEvent && (
          <div className="event-card-display" data-testid="event-card">
            <div className="event-card-header">
              <span className="event-card-icon">📜</span>
              <span className="event-card-title">事件卡</span>
            </div>
            <div className="event-card-name">{board.activeEvent.name}</div>
            {board.activeEvent.description && (
              <div className="event-card-desc">{board.activeEvent.description}</div>
            )}
          </div>
        )}
      </div>
      <div className="battle-area-players">
        {players.map((player) => (
          <PlayerInfo
            key={player.uid}
            player={player}
            isCurrentTurn={player.uid === currentTurnUid}
            isCurrentPlayer={player.uid === currentPlayerUid}
            isValidTarget={targetUids && targetUids.length > 0
              ? targetUids.includes(player.uid)
              : undefined}
            isSelected={selectedTargets?.includes(player.uid) || false}
            onSelect={onTargetSelect}
            onRegisterAnimation={onRegisterAnimation}
          />
        ))}
      </div>
    </div>
  );
};

export default BattleArea;
