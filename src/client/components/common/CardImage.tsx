import React, { useState } from 'react';

interface CardImageProps {
  /** Card code like 'JP06', 'HL001', 'GS001' */
  cardCode: string;
  /** Image size preset */
  size?: 'small' | 'medium' | 'large';
  /** Click handler */
  onClick?: () => void;
  /** Whether card is selected */
  selected?: boolean;
  /** Whether card is disabled */
  disabled?: boolean;
  /** Optional tooltip text */
  tooltip?: string;
}

const SIZE_MAP = {
  small: { width: 60, height: 84 },
  medium: { width: 100, height: 140 },
  large: { width: 150, height: 210 },
} as const;

/**
 * CardImage - Displays a card's PNG image.
 * Images are served from /images/ directory in public/.
 * Card code maps to image filename via convention:
 * - Hero: hero_{code}.png  (e.g., hero_HL001.png)
 * - Tux: tux_{code}.png    (e.g., tux_JP06.png)
 * - Monster: mon_{code}.png (e.g., mon_GS001.png)
 * - NPC: npc_{code}.png
 * - Event: eve_{code}.png
 *
 * Falls back to card code text if image not found.
 */
const CardImage: React.FC<CardImageProps> = ({
  cardCode,
  size = 'medium',
  onClick,
  selected = false,
  disabled = false,
  tooltip,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { width, height } = SIZE_MAP[size];

  // Determine image path from card code
  const getImagePath = (code: string): string => {
    const upper = code.toUpperCase();
    if (upper.startsWith('HL') || upper.startsWith('EX')) {
      return `/images/hero_${upper}.png`;
    }
    if (upper.startsWith('JP') || upper.startsWith('TP') || upper.startsWith('JT') || upper.startsWith('JB') || upper.startsWith('XB')) {
      return `/images/tux_${upper}.png`;
    }
    if (upper.startsWith('GS') || upper.startsWith('GM')) {
      return `/images/mon_${upper}.png`;
    }
    if (upper.startsWith('NJ') || upper.startsWith('NPC')) {
      return `/images/npc_${upper}.png`;
    }
    if (upper.startsWith('EVE') || upper.startsWith('SJ')) {
      return `/images/eve_${upper}.png`;
    }
    // Default: try tux
    return `/images/tux_${upper}.png`;
  };

  const imageUrl = getImagePath(cardCode);
  const clickable = !disabled && onClick;

  const className = [
    'card-image',
    selected ? 'card-selected' : '',
    disabled ? 'card-disabled' : '',
    clickable ? 'card-clickable' : '',
  ].filter(Boolean).join(' ');

  if (imageError) {
    return (
      <div
        className={className}
        style={{ width, height }}
        onClick={clickable ? onClick : undefined}
        title={tooltip || cardCode}
      >
        <div className="card-placeholder">
          <span>{cardCode}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ width, height }}
      onClick={clickable ? onClick : undefined}
      title={tooltip || cardCode}
    >
      {isLoading && <div className="card-loading" />}
      <img
        src={imageUrl}
        alt={cardCode}
        width={width}
        height={height}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => setImageError(true)}
        style={{ display: isLoading ? 'none' : 'block' }}
        draggable={false}
      />
    </div>
  );
};

export default CardImage;
