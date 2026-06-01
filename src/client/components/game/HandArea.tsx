import React, { useState, useRef, useEffect } from 'react';
import CardImage from '../common/CardImage';
import CardTooltip from '../common/CardTooltip';
import type { CardInstanceState } from '@shared/network/protocol';

interface HandAreaProps {
  /** Card instances from game state */
  cards: CardInstanceState[];
  /** Currently selected card instance IDs */
  selectedCardInstanceIds: number[];
  /** Handler when a card is clicked */
  onCardSelect: (instanceId: number) => void;
  /** Whether the hand area is disabled */
  disabled?: boolean;
}

/** Get card type from code prefix */
function getCardType(code: string): string {
  const upper = code.toUpperCase();
  if (upper.startsWith('JP')) return 'skill';    // 技牌-绿
  if (upper.startsWith('TP')) return 'battle';   // 战牌-红
  if (upper.startsWith('ZP')) return 'special';  // 特殊-紫
  if (upper.startsWith('WQ') || upper.startsWith('FJ')) return 'equip'; // 装备-蓝
  return 'other';
}

const HandArea: React.FC<HandAreaProps> = ({
  cards,
  selectedCardInstanceIds,
  onCardSelect,
  disabled = false,
}) => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [playingCards, setPlayingCards] = useState<Set<number>>(new Set());
  const prevCardsRef = useRef<CardInstanceState[]>(cards);

  // Detect cards that were just removed (played) and trigger animation
  useEffect(() => {
    const prevCards = prevCardsRef.current;
    const prevIds = prevCards.map(c => c.instanceId);
    const currentIds = cards.map(c => c.instanceId);
    const removed = prevIds.filter(id => !currentIds.includes(id));
    if (removed.length > 0) {
      setPlayingCards(prev => {
        const next = new Set(prev);
        removed.forEach(id => next.add(id));
        return next;
      });
      // Clear playing state after animation completes
      const timer = setTimeout(() => {
        setPlayingCards(prev => {
          const next = new Set(prev);
          removed.forEach(id => next.delete(id));
          return next;
        });
      }, 400);
      prevCardsRef.current = cards;
      return () => clearTimeout(timer);
    }
    prevCardsRef.current = cards;
  }, [cards]);

  return (
    <div className="hand-area">
      <div className="hand-area-header">
        <span className="hand-area-title">手牌</span>
        <span className="hand-area-count">({cards.length})</span>
      </div>
      <div className="hand-area-cards">
        {cards.length === 0 && (
          <div className="hand-area-empty">暂无手牌</div>
        )}
        {cards.map((card) => {
          const cardType = getCardType(card.code);
          return (
            <div
              key={card.instanceId}
              className={`hand-card-wrapper hand-card-${cardType} ${playingCards.has(card.instanceId) ? 'card-playing' : ''}`}
              onMouseEnter={() => setHoveredCard(card.instanceId)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <CardImage
                cardCode={card.code}
                size="medium"
                selected={selectedCardInstanceIds.includes(card.instanceId)}
                disabled={disabled}
                onClick={() => onCardSelect(card.instanceId)}
              />
              <CardTooltip cardCode={card.code} visible={hoveredCard === card.instanceId} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HandArea;
