import React from 'react';
import type { ActiveMonster } from '@shared/network';

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

const MonsterArea: React.FC<MonsterAreaProps> = ({ monster }) => {
  if (!monster) return null;

  const elementLabel = ELEMENT_LABELS[monster.element] || '未知';

  return (
    <div className="monster-area">
      <div className="monster-area-header">
        <span className="monster-area-title">当前怪物</span>
      </div>
      <div className="monster-area-info">
        <div className="monster-info-row">
          <span className="monster-info-label">名称</span>
          <span className="monster-info-value">{monster.name}</span>
        </div>
        <div className="monster-info-row">
          <span className="monster-info-label">属性</span>
          <span className="monster-info-value">{elementLabel}</span>
        </div>
        <div className="monster-info-row">
          <span className="monster-info-label">等级</span>
          <span className="monster-info-value">{monster.level}</span>
        </div>
        <div className="monster-info-row">
          <span className="monster-info-label">攻击</span>
          <span className="monster-info-value">{monster.str}</span>
        </div>
        <div className="monster-info-row">
          <span className="monster-info-label">敏捷</span>
          <span className="monster-info-value">{monster.agl}</span>
        </div>
      </div>
    </div>
  );
};

export default MonsterArea;
