import React, { useState } from 'react';
import type { HeroInfo } from '@shared/network/protocol';

interface HeroSelectDialogProps {
  availableHeroes: HeroInfo[];
  onSelect: (heroId: number) => void;
}

const HeroSelectDialog: React.FC<HeroSelectDialogProps> = ({ availableHeroes, onSelect }) => {
  const [selectedHero, setSelectedHero] = useState<number | null>(null);

  const handleConfirm = () => {
    if (selectedHero !== null) {
      onSelect(selectedHero);
    }
  };

  const getGroupLabel = (group: number): string => {
    const groups: Record<number, string> = {
      1: '仙剑一',
      2: '仙剑二',
      3: '仙剑三',
      4: '仙剑三外传',
      5: '仙剑四',
      6: '仙剑五',
      7: '凤鸣玉誓',
    };
    return groups[group] || `系列${group}`;
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog hero-select-dialog">
        <div className="dialog-header">
          <h2>选择英雄</h2>
        </div>
        <div className="dialog-body">
          <div className="hero-grid">
            {availableHeroes.map(hero => (
              <div
                key={hero.avatar}
                className={`hero-card ${selectedHero === hero.avatar ? 'selected' : ''}`}
                onClick={() => setSelectedHero(hero.avatar)}
              >
                <div className="hero-avatar">{hero.name.charAt(0)}</div>
                <div className="hero-name">{hero.name}</div>
                <div className="hero-info">
                  <span className="hero-group">{getGroupLabel(hero.group)}</span>
                  <span className="hero-gender">{hero.gender === 'M' ? '男' : '女'}</span>
                </div>
                <div className="hero-stats">
                  <span>HP: {hero.hp}</span>
                  <span>力: {hero.str}</span>
                  <span>速: {hero.dex}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="dialog-footer">
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={selectedHero === null}
          >
            确认选择
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroSelectDialog;
