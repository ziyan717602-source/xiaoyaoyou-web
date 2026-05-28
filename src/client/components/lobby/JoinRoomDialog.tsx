import React, { useState } from 'react';

interface JoinRoomDialogProps {
  /** Pre-filled room ID if joining from room list */
  initialRoomId?: string;
  onJoin: (roomId: string, playerName: string) => void;
  onClose: () => void;
}

const JoinRoomDialog: React.FC<JoinRoomDialogProps> = ({
  initialRoomId = '',
  onJoin,
  onClose,
}) => {
  const [roomId, setRoomId] = useState(initialRoomId);
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmedId = roomId.trim();
    const trimmedName = playerName.trim();

    if (!trimmedId) {
      setError('请输入房间号');
      return;
    }
    if (!trimmedName) {
      setError('请输入玩家名称');
      return;
    }
    if (trimmedName.length > 12) {
      setError('玩家名称不能超过 12 个字符');
      return;
    }

    setError('');
    onJoin(trimmedId, trimmedName);
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>加入房间</h2>
          <button className="dialog-close" onClick={onClose}>x</button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label htmlFor="room-id">房间号</label>
            <input
              id="room-id"
              type="text"
              className="form-input"
              placeholder="输入房间号"
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              disabled={!!initialRoomId}
            />
          </div>
          <div className="form-group">
            <label htmlFor="player-name">玩家名称</label>
            <input
              id="player-name"
              type="text"
              className="form-input"
              placeholder="输入你的名称"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={12}
            />
          </div>
          {error && <div className="form-error">{error}</div>}
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit}>加入</button>
        </div>
      </div>
    </div>
  );
};

export default JoinRoomDialog;
