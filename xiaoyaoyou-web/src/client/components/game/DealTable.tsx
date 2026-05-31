/**
 * DealTable - Card selection popup
 *
 * Used for C/Z/M/I/G/F/E/H format types where the player needs to
 * select from a presented set of cards.
 *
 * Inspired by WPF's DealTable.xaml — a popup showing card candidates
 * with click-to-select and confirm button.
 */

import React, { useState, useCallback } from 'react';
import CardImage from '../common/CardImage';
import type { InputSegment } from '../../utils/format-parser';

interface DealTableCard {
  id: number;
  code: string;
  faceDown?: boolean;
}

interface DealTableProps {
  /** Cards to display */
  cards: DealTableCard[];
  /** The input segment being fulfilled */
  segment: InputSegment;
  /** Description text to show */
  description?: string;
  /** Called when selection is confirmed */
  onSelect: (selectedIds: number[]) => void;
  /** Called when the player skips (if optional) */
  onSkip?: () => void;
  /** Called when the player closes the popup */
  onClose: () => void;
}

const DealTable: React.FC<DealTableProps> = ({
  cards,
  segment,
  description,
  onSelect,
  onSkip,
  onClose,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const count = segment.count;
  const maxCount = segment.maxCount || segment.count;
  const isOptional = segment.optional;

  const handleCardClick = useCallback((id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= maxCount) {
        // Replace the oldest selection
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  }, [maxCount]);

  const canConfirm = selectedIds.length >= count && selectedIds.length <= maxCount;

  const handleConfirm = useCallback(() => {
    if (canConfirm) {
      onSelect(selectedIds);
    }
  }, [canConfirm, selectedIds, onSelect]);

  const handleSkip = useCallback(() => {
    if (onSkip) onSkip();
  }, [onSkip]);

  return (
    <div className="deal-table-overlay" onClick={onClose}>
      <div className="deal-table" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="deal-table-header">
          <span className="deal-table-title">
            {description || `选择${count}张卡牌`}
          </span>
          <span className="deal-table-count">
            已选 {selectedIds.length}/{maxCount}
          </span>
        </div>

        {/* Cards grid */}
        <div className="deal-table-cards">
          {cards.map(card => (
            <div
              key={card.id}
              className={`deal-table-card-wrapper ${selectedIds.includes(card.id) ? 'selected' : ''}`}
              onClick={() => handleCardClick(card.id)}
            >
              {card.faceDown ? (
                <div className="deal-table-card-back">
                  <span>?</span>
                </div>
              ) : (
                <CardImage cardCode={card.code} size="medium" />
              )}
              {selectedIds.includes(card.id) && (
                <div className="deal-table-selected-badge">
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="deal-table-actions">
          {isOptional && (
            <button className="btn btn-skip" onClick={handleSkip}>
              跳过
            </button>
          )}
          <button
            className="btn btn-primary"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            确认选择
          </button>
        </div>
      </div>
    </div>
  );
};

export default DealTable;
