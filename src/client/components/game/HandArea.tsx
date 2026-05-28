import React from 'react';
import CardImage from '../common/CardImage';

interface HandAreaProps {
  /** Card IDs (numeric) from game state */
  cards: number[];
  /** Currently selected card IDs */
  selectedCards: number[];
  /** Handler when a card is clicked */
  onCardSelect: (cardId: number) => void;
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
        {cards.map((cardId) => (
          <CardImage
            key={cardId}
            cardCode={String(cardId)}
            size="medium"
            selected={selectedCards.includes(cardId)}
            disabled={disabled}
            onClick={() => onCardSelect(cardId)}
            tooltip={`卡牌 #${cardId}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HandArea;
