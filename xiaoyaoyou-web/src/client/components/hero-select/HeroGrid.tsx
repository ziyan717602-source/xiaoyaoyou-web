import React from 'react';
import type { HeroInfo } from '@shared/network';

interface HeroGridProps {
  heroes: HeroInfo[];
  selectedHeroIds: Set<number>; // heroIds already picked by other players
  mySelection: number | null;
  onSelect: (heroId: number) => void;
}

const HeroGrid: React.FC<HeroGridProps> = ({ heroes, selectedHeroIds, mySelection, onSelect }) => {
  return (
    <div className="hero-grid">
      {heroes.map((hero) => {
        const isTaken = selectedHeroIds.has(hero.avatar);
        const isSelected = mySelection === hero.avatar;
        const classNames = [
          'hero-card',
          isTaken && !isSelected ? 'hero-card-unavailable' : '',
          isSelected ? 'hero-card-selected' : '',
        ].filter(Boolean).join(' ');

        return (
          <button
            key={hero.avatar}
            className={classNames}
            onClick={() => !isTaken && onSelect(hero.avatar)}
            disabled={isTaken && !isSelected}
          >
            <div className="hero-card-image">
              <img
                src={`/images/hero_${hero.avatar}.png`}
                alt={hero.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="hero-card-info">
              <div className="hero-card-name">{hero.name}</div>
              <div className="hero-card-stats">
                <span className="stat-hp">HP {hero.hp}</span>
                <span className="stat-str">STR {hero.str}</span>
                <span className="stat-dex">DEX {hero.dex}</span>
              </div>
              <div className="hero-card-gender">{hero.gender === 'M' ? '男' : '女'}</div>
            </div>
            {isTaken && !isSelected && <div className="hero-card-overlay">已选择</div>}
            {isSelected && <div className="hero-card-overlay hero-card-selected-overlay">已选</div>}
          </button>
        );
      })}
    </div>
  );
};

export default HeroGrid;
