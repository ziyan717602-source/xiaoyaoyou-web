import React, { useState } from 'react';
import CardImage from '../common/CardImage';
import CardTooltip from '../common/CardTooltip';

interface DiscardPilePanelProps {
  tuxDises: number[];
  monDises: number[];
  eveDises: number[];
}

const PILE_LABELS: Record<string, string> = {
  tux: '技牌',
  mon: '怪物',
  eve: '事件',
};

const DiscardPilePanel: React.FC<DiscardPilePanelProps> = ({
  tuxDises,
  monDises,
  eveDises,
}) => {
  const [expandedPile, setExpandedPile] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const piles = [
    { key: 'tux', cards: tuxDises },
    { key: 'mon', cards: monDises },
    { key: 'eve', cards: eveDises },
  ];

  return (
    <div className="discard-pile-panel">
      <div className="discard-pile-header">弃牌堆</div>
      <div className="discard-pile-list">
        {piles.map((pile) => (
          <div
            key={pile.key}
            className={`discard-pile-item ${expandedPile === pile.key ? 'expanded' : ''}`}
          >
            <button
              className="discard-pile-toggle"
              onClick={() => setExpandedPile(expandedPile === pile.key ? null : pile.key)}
            >
              <span className="discard-pile-label">{PILE_LABELS[pile.key]}</span>
              <span className="discard-pile-count">{pile.cards.length}</span>
            </button>
            {expandedPile === pile.key && pile.cards.length > 0 && (
              <div className="discard-pile-cards">
                {[...pile.cards].reverse().map((cardId, idx) => (
                  <div
                    key={`${cardId}-${idx}`}
                    className="discard-pile-card"
                    onMouseEnter={() => setHoveredCard(String(cardId))}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <CardImage cardId={cardId} size="small" />
                    <CardTooltip cardCode={String(cardId)} visible={hoveredCard === String(cardId)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiscardPilePanel;
