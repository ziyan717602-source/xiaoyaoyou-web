import React from 'react';

interface PlayerSelection {
  uid: number;
  name: string;
  heroName: string | null;
}

interface SelectionStatusProps {
  players: PlayerSelection[];
}

const SelectionStatus: React.FC<SelectionStatusProps> = ({ players }) => {
  return (
    <div className="selection-status">
      <h3>选择状态</h3>
      <div className="selection-status-list">
        {players.map((player) => (
          <div
            key={player.uid}
            className={`selection-status-item ${player.heroName ? 'selection-status-done' : 'selection-status-waiting'}`}
          >
            <span className="selection-status-name">{player.name}</span>
            <span className="selection-status-hero">
              {player.heroName || '等待选择...'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectionStatus;
