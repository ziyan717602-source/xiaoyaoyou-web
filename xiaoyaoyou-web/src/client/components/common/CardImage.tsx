import React, { useState } from 'react';

interface CardImageProps {
  /** Card code like 'JP06', 'HL001', 'GS001' */
  cardCode?: string;
  /** Numeric card ID (alternative to cardCode, uses tux_{id}.png) */
  cardId?: number;
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
  cardId,
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

    // Hero: XJ101, X3W01, HL001, EX116, TR001 etc.
    if (/^(XJ|X3W|HL|EX|TR|SP)/.test(upper)) {
      return `/images/hero_${upper}.png`;
    }

    // Hand cards / Equipment: JP, TP, ZP, WQ, FJ, XB
    if (/^(JP|TP|ZP|WQ|FJ|XB|JT|JB)/.test(upper)) {
      return `/images/tux_${upper}.png`;
    }

    // Monster: GS, GH, GL, GF, GT (standard 20)
    if (/^(GS|GH|GL|GF|GT)/.test(upper)) {
      return `/images/mon_${upper}.png`;
    }

    // NPC: NC prefix
    if (upper.startsWith('NC')) {
      return `/images/npc_${upper}.png`;
    }

    // Event: SJ, EVE prefix
    if (/^(SJ|EVE)/.test(upper)) {
      return `/images/eve_${upper}.png`;
    }

    // Default: try tux
    return `/images/tux_${upper}.png`;
  };

  // Determine image URL: cardId takes precedence for numeric IDs
  const imageUrl = cardId ? `/images/tux_${cardId}.png` : getImagePath(cardCode || '');
  const displayCode = cardCode || (cardId ? `Card#${cardId}` : '???');
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
        title={tooltip || displayCode}
      >
        <div className="card-placeholder">
          <span>{displayCode}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ width, height }}
      onClick={clickable ? onClick : undefined}
      title={tooltip || displayCode}
    >
      {isLoading && <div className="card-loading" />}
      <img
        src={imageUrl}
        alt={displayCode}
        width={width}
        height={height}
        onLoad={() => setIsLoading(false)}
        onError={() => setImageError(true)}
        style={{ display: isLoading ? 'none' : 'block' }}
        draggable={false}
      />
    </div>
  );
};

export default CardImage;
