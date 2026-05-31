/**
 * NumberInput - Numeric input for D format segments
 *
 * Renders a row of clickable numbers for dice/number selection.
 * Based on WPF's DealTable dice display.
 */

import React, { useState, useCallback } from 'react';

interface NumberInputProps {
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Called when a number is selected */
  onSelect: (value: number) => void;
  /** Description text */
  description?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  min,
  max,
  onSelect,
  description,
}) => {
  const [selected, setSelected] = useState<number | null>(null);

  const numbers = [];
  for (let i = min; i <= max; i++) {
    numbers.push(i);
  }

  const handleClick = useCallback((n: number) => {
    setSelected(n);
    onSelect(n);
  }, [onSelect]);

  return (
    <div className="number-input">
      {description && (
        <div className="number-input-desc">{description}</div>
      )}
      <div className="number-input-options">
        {numbers.map(n => (
          <button
            key={n}
            className={`btn number-input-btn ${selected === n ? 'selected' : ''}`}
            onClick={() => handleClick(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NumberInput;
