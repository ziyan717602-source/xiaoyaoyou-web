import React from 'react';
import CardImage from '../common/CardImage';

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

const HandArea: React.FC<HandAreaProps> = ({
  cards,
  selectedCards,
  onCardSelect,
  disabled = false,
}) => {
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
        {cards.map((cardCode) => (
          <CardImage
            key={cardCode}
            cardCode={cardCode}
            size="medium"
            selected={selectedCards.includes(cardCode)}
            disabled={disabled}
            onClick={() => onCardSelect(cardCode)}
            tooltip={cardCode}
          />
        ))}
      </div>
    </div>
  );
};

export default HandArea;
