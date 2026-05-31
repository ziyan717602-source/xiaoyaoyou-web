import React, { useState, useRef, useEffect } from 'react';
import CardImage from '../common/CardImage';
import CardTooltip from '../common/CardTooltip';

interface HandAreaProps {
  /** Card codes (e.g. "JP01", "HL001") from game state */
  cards: string[];
  /** Currently selected card codes */
  selectedCards: string[];
  /** Handler when a card is clicked */
  onCardSelect: (cardCode: string) => void;
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
  selectedCards,
  onCardSelect,
  disabled = false,
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [playingCards, setPlayingCards] = useState<Set<string>>(new Set());
  const prevCardsRef = useRef<string[]>(cards);

  // Detect cards that were just removed (played) and trigger animation
  useEffect(() => {
    const prevCards = prevCardsRef.current;
    const removed = prevCards.filter(c => !cards.includes(c));
    if (removed.length > 0) {
      setPlayingCards(prev => {
        const next = new Set(prev);
        removed.forEach(c => next.add(c));
        return next;
      });
      // Clear playing state after animation completes
      const timer = setTimeout(() => {
        setPlayingCards(prev => {
          const next = new Set(prev);
          removed.forEach(c => next.delete(c));
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
        {cards.map((cardCode) => {
          const cardType = getCardType(cardCode);
          return (
            <div
              key={cardCode}
              className={`hand-card-wrapper hand-card-${cardType} ${playingCards.has(cardCode) ? 'card-playing' : ''}`}
              onMouseEnter={() => setHoveredCard(cardCode)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <CardImage
                cardCode={cardCode}
                size="medium"
                selected={selectedCards.includes(cardCode)}
                disabled={disabled}
                onClick={() => onCardSelect(cardCode)}
              />
              <CardTooltip cardCode={cardCode} visible={hoveredCard === cardCode} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HandArea;
