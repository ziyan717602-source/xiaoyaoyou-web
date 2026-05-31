import React from 'react';
import type { ActiveMonster } from '@shared/network';
import CardImage from '../common/CardImage';

interface MonsterAreaProps {
  monster: ActiveMonster | null;
}

const ELEMENT_LABELS: Record<number, string> = {
  0: '无',
  1: '水',
  2: '火',
  3: '雷',
  4: '风',
  5: '土',
  6: '阴',
  7: '阳',
};

const ELEMENT_COLORS: Record<number, string> = {
  0: '#9e9e9e',
  1: '#2196f3', // 水-蓝
  2: '#f44336', // 火-红
  3: '#9c27b0', // 雷-紫
  4: '#4caf50', // 风-绿
  5: '#ff9800', // 土-黄
  6: '#673ab7', // 阴-深紫
  7: '#ffc107', // 阳-金
};

const LEVEL_LABELS: Record<number, string> = {
  1: '弱',
  2: '强',
  3: 'BOSS',
};

const MonsterArea: React.FC<MonsterAreaProps> = ({ monster }) => {
  if (!monster) return null;

  const elementLabel = ELEMENT_LABELS[monster.element] || '未知';
  const elementColor = ELEMENT_COLORS[monster.element] || '#9e9e9e';
  const levelLabel = LEVEL_LABELS[monster.level] || String(monster.level);

  return (
    <div className="monster-area">
      <div className="monster-area-card">
        <CardImage cardCode={monster.code} size="large" tooltip={monster.name} />
      </div>
      <div className="monster-area-info">
        <div className="monster-name">{monster.name}</div>
        <div className="monster-attrs">
          <span className="monster-attr">
            <span className="attr-icon">⚔️</span>
            <span className="attr-value">{monster.str}</span>
          </span>
          <span className="monster-attr">
            <span className="attr-icon">🎯</span>
            <span className="attr-value">{monster.agl}</span>
          </span>
          <span
            className="monster-element-badge"
            style={{ backgroundColor: elementColor }}
          >
            {elementLabel}
          </span>
        </div>
        <div className="monster-level-badge">{levelLabel}</div>
      </div>
    </div>
  );
};

export default MonsterArea;
