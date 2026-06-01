import React from 'react';
import { getCardInfo } from '../../data/card-info';

interface CardTooltipProps {
  cardCode: string;
  visible: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  WQ: '武器',
  FJ: '防具',
  XB: '行囊',
  JP: '技牌',
  TP: '战牌',
  JT: '战牌',
  JB: '战牌',
  ZP: '特殊',
  HX: '特效',
  HL: '角色',
  GS: '怪物',
  NJ: 'NPC',
  EVE: '事件',
};

const CardTooltip: React.FC<CardTooltipProps> = ({ cardCode, visible }) => {
  if (!visible) return null;

  const info = getCardInfo(cardCode);
  if (!info) return null;

  return (
    <div className="card-tooltip">
      <div className="card-tooltip-header">
        <span className="card-tooltip-name">{info.name}</span>
        <span className="card-tooltip-type">{TYPE_LABELS[info.type] || info.type}</span>
      </div>
      {info.description && (
        <div className="card-tooltip-desc">{info.description}</div>
      )}
    </div>
  );
};

export default CardTooltip;
