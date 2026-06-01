import React, { useState } from 'react';

interface CreateRoomDialogProps {
  onCreate: (playerCount: number, packages: number[], name?: string) => void;
  onClose: () => void;
}

const CreateRoomDialog: React.FC<CreateRoomDialogProps> = ({ onCreate, onClose }) => {
  const [playerName, setPlayerName] = useState('');
  const [playerCount, setPlayerCount] = useState(4);
  const [selectedPackages, setSelectedPackages] = useState<number[]>([1]);

  const togglePackage = (pkg: number) => {
    setSelectedPackages(prev =>
      prev.includes(pkg)
        ? prev.filter(p => p !== pkg)
        : [...prev, pkg]
    );
  };

  const handleSubmit = () => {
    if (selectedPackages.length === 0) return;
    onCreate(playerCount, selectedPackages, playerName || undefined);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>创建房间</h2>
          <button className="dialog-close" onClick={onClose}>x</button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>你的名字</label>
            <input
              type="text"
              className="form-input"
              placeholder="留空默认为房主"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={12}
            />
          </div>
          <div className="form-group">
            <label>玩家数量</label>
            <div className="radio-group">
              {[2, 4, 6].map(count => (
                <label key={count} className="radio-label">
                  <input
                    type="radio"
                    name="playerCount"
                    value={count}
                    checked={playerCount === count}
                    onChange={() => setPlayerCount(count)}
                  />
                  <span>{count} 人</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>卡牌包组</label>
            <div className="checkbox-group">
              {[1, 2, 3, 4, 5].map(pkg => (
                <label key={pkg} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedPackages.includes(pkg)}
                    onChange={() => togglePackage(pkg)}
                  />
                  <span>标准包 {pkg}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={selectedPackages.length === 0}
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateRoomDialog;
