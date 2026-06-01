import React from 'react';
import CardImage from '../common/CardImage';

interface EquipmentPanelProps {
  weapon: number;
  armor: number;
  trove: number;
  exEquip: number;
  compact?: boolean;
}

const SLOT_LABELS: Record<string, string> = {
  weapon: '武器',
  armor: '防具',
  trove: '行囊',
  exEquip: '扩展',
};

const EquipmentPanel: React.FC<EquipmentPanelProps> = ({
  weapon,
  armor,
  trove,
  exEquip,
  compact = false,
}) => {
  const slots = [
    { key: 'weapon', id: weapon },
    { key: 'armor', id: armor },
    { key: 'trove', id: trove },
    { key: 'exEquip', id: exEquip },
  ];

  return (
    <div className={`equipment-panel ${compact ? 'equipment-panel-compact' : ''}`}>
      {slots.map((slot) => (
        <div
          key={slot.key}
          className={`equip-slot ${slot.id > 0 ? 'equip-slot-filled' : 'equip-slot-empty'}`}
        >
          <span className="equip-slot-label">{SLOT_LABELS[slot.key]}</span>
          {slot.id > 0 ? (
            <>
              <div className="equip-slot-card">
                {compact ? (
                  <span className="equip-slot-id">{slot.id}</span>
                ) : (
                  <CardImage cardId={slot.id} size="small" />
                )}
              </div>
              <div className="equip-tooltip">
                <div className="equip-tooltip-name">卡牌 #{slot.id}</div>
                <div className="equip-tooltip-stats">{SLOT_LABELS[slot.key]}</div>
              </div>
            </>
          ) : (
            <div className="equip-slot-empty-icon">-</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EquipmentPanel;
