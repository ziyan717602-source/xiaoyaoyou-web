import React, { useState, useEffect, useCallback } from 'react';
import type { PlayerState } from '@shared/network';
import { getHeroOfcode } from '../../data/card-info';
import CardImage from '../common/CardImage';
import type { AnimationEvent } from '../../hooks/useBattleAnimations';

interface PlayerInfoProps {
  player: PlayerState;
  isCurrentTurn: boolean;
  isCurrentPlayer?: boolean;
  /** true = valid target (golden border), false = invalid target (dimmed), undefined = no target mode */
  isValidTarget?: boolean;
  /** Whether this player is currently selected as a target */
  isSelected?: boolean;
  /** Called when a valid target is clicked */
  onSelect?: (uid: number) => void;
  onRegisterAnimation?: (uid: number, callback: (event: AnimationEvent) => void) => () => void;
}

const ELEMENT_NAMES = ['冰', '火', '雷', '风', '土', '阴', '阳'];
const ELEMENT_COLORS = ['#4fc3f7', '#ef5350', '#ffd54f', '#81c784', '#a1887f', '#9575cd', '#ffb74d'];

const STATUS_LABELS: Record<string, string> = {
  immobilized: '定身',
  petDisabled: '封灵',
  loved: '守护',
  restZP: '休息',
};

const PlayerInfo: React.FC<PlayerInfoProps> = ({
  player,
  isCurrentTurn,
  isCurrentPlayer = false,
  isValidTarget,
  isSelected = false,
  onSelect,
  onRegisterAnimation,
}) => {
  const [animationClass, setAnimationClass] = useState('');
  const [floatingNumber, setFloatingNumber] = useState<{ type: 'harm' | 'cure'; amount: number } | null>(null);

  // Register animation callback
  useEffect(() => {
    if (!onRegisterAnimation) return;

    const unregister = onRegisterAnimation(player.uid, (event: AnimationEvent) => {
      // Trigger flash animation
      setAnimationClass(event.type === 'harm' ? 'harm-flash' : 'cure-flash');
      setTimeout(() => setAnimationClass(''), 400);

      // Trigger floating number
      setFloatingNumber({ type: event.type, amount: event.amount });
      setTimeout(() => setFloatingNumber(null), 1000);
    });

    return unregister;
  }, [player.uid, onRegisterAnimation]);

  const className = [
    'player-info',
    isCurrentTurn ? 'player-info-turn' : '',
    isCurrentPlayer ? 'player-info-self' : '',
    player.hp <= 0 ? 'player-info-dead' : '',
    isValidTarget === true ? 'player-info-target-valid' : '',
    isValidTarget === false ? 'player-info-target-invalid' : '',
    isSelected ? 'player-info-selected' : '',
    isValidTarget && onSelect ? 'player-info-clickable' : '',
    animationClass,
  ].filter(Boolean).join(' ');

  const handleClick = useCallback(() => {
    if (isValidTarget && onSelect) {
      onSelect(player.uid);
    }
  }, [isValidTarget, onSelect, player.uid]);

  const hpPercent = player.hpBase > 0 ? Math.max(0, Math.min(100, (player.hp / player.hpBase) * 100)) : 0;
  const equippedPets = player.pets
    .map((id, idx) => (id > 0 ? { id, element: idx } : null))
    .filter(Boolean) as { id: number; element: number }[];

  const heroOfcode = player.heroAvatar ? getHeroOfcode(player.heroAvatar) : '';

  return (
    <div className={className} onClick={handleClick}>
      <div className="player-info-header">
        {heroOfcode && (
          <div className="player-hero-avatar">
            <CardImage cardCode={heroOfcode} size="small" />
          </div>
        )}
        <div className="player-info-text">
          <span className="player-name">{player.name}</span>
          <span className="player-team-badge">{player.team === 1 ? '仙' : '剑'}</span>
          {isCurrentTurn && <span className="player-turn-badge">当前回合</span>}
          {isCurrentPlayer && <span className="player-self-badge">自己</span>}
        </div>
      </div>

      {floatingNumber && (
        <div className={`floating-number ${floatingNumber.type}`}>
          {floatingNumber.type === 'harm' ? '-' : '+'}{floatingNumber.amount}
        </div>
      )}

      <div className="player-hp-bar">
        <div className="player-hp-fill" style={{ width: `${hpPercent}%` }} />
        <span className="player-hp-text">{player.hp}/{player.hpBase}</span>
      </div>

      <div className="player-info-stats">
        <div className="player-stat">
          <span className="stat-label">战力</span>
          <span className="stat-value stat-str">{player.str}</span>
        </div>
        <div className="player-stat">
          <span className="stat-label">命中</span>
          <span className="stat-value stat-dex">{player.dex}</span>
        </div>
        <div className="player-stat">
          <span className="stat-label">手牌</span>
          <span className="stat-value">{player.handCount}</span>
        </div>
        <div className="player-stat">
          <span className="stat-label">阵营</span>
          <span className="stat-value">{player.team === 1 ? '仙' : '剑'}</span>
        </div>
      </div>

      {equippedPets.length > 0 && (
        <div className="player-pet-row">
          {equippedPets.map(({ id, element }) => {
            const petCode = player.petCodes?.[element] || '';
            return petCode ? (
              <CardImage
                key={element}
                cardCode={petCode}
                size="small"
                tooltip={`${ELEMENT_NAMES[element]}灵兽`}
              />
            ) : (
              <span
                key={element}
                className="player-pet-icon"
                style={{ color: ELEMENT_COLORS[element] }}
                title={`${ELEMENT_NAMES[element]}灵兽`}
              >
                {ELEMENT_NAMES[element]}
              </span>
            );
          })}
        </div>
      )}

      {player.status.length > 0 && (
        <div className="player-status-icons">
          {player.status.map((s) => (
            <span key={s} className={`player-status-badge ${s}`}>{STATUS_LABELS[s] || s}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerInfo;
