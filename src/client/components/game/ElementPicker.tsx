/**
 * ElementPicker - Element/attribute selection for V format segments
 *
 * Renders the 7 elements (冰/火/雷/风/土/阴/阳) as clickable buttons.
 * Based on WPF's DealTable property display.
 */

import React, { useState, useCallback } from 'react';

const ELEMENTS = [
  { id: 0, name: '冰', color: '#4fc3f7' },
  { id: 1, name: '火', color: '#ef5350' },
  { id: 2, name: '雷', color: '#ffd54f' },
  { id: 3, name: '风', color: '#81c784' },
  { id: 4, name: '土', color: '#a1887f' },
  { id: 5, name: '阴', color: '#9575cd' },
  { id: 6, name: '阳', color: '#ffb74d' },
];

interface ElementPickerProps {
  /** Number of elements to select */
  count: number;
  /** Maximum number of elements */
  maxCount?: number;
  /** Called when selection is confirmed */
  onSelect: (selectedIds: number[]) => void;
  /** Description text */
  description?: string;
}

const ElementPicker: React.FC<ElementPickerProps> = ({
  count,
  maxCount,
  onSelect,
  description,
}) => {
  const [selected, setSelected] = useState<number[]>([]);
  const max = maxCount || count;

  const handleClick = useCallback((id: number) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= max) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  }, [max]);

  const canConfirm = selected.length >= count && selected.length <= max;

  return (
    <div className="element-picker">
      {description && (
        <div className="element-picker-desc">{description}</div>
      )}
      <div className="element-picker-options">
        {ELEMENTS.map(el => (
          <button
            key={el.id}
            className={`btn element-picker-btn ${selected.includes(el.id) ? 'selected' : ''}`}
            style={{ borderColor: selected.includes(el.id) ? el.color : undefined }}
            onClick={() => handleClick(el.id)}
          >
            <span className="element-icon" style={{ color: el.color }}>{el.name}</span>
          </button>
        ))}
      </div>
      <button
        className="btn btn-primary btn-sm"
        disabled={!canConfirm}
        onClick={() => onSelect(selected)}
      >
        确认 ({selected.length}/{max})
      </button>
    </div>
  );
};

export default ElementPicker;
