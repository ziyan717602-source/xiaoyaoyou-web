import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ServerMessage } from '@shared/network';
import { useWebSocket } from '../hooks/useWebSocket';
import { useRoom } from '../hooks/useRoom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorToast from '../components/common/ErrorToast';

const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const websocket = useWebSocket();
  const room = useRoom(websocket);
  const [error, setError] = React.useState('');

  // Listen for game_started to navigate to game page
  useEffect(() => {
    const unsub = websocket.onMessage((msg: ServerMessage) => {
      if (msg.type === 'game_started') {
        navigate(`/game/${roomId}`);
      }
      if (msg.type === 'room_left') {
        navigate('/');
      }
      if (msg.type === 'error') {
        setError(msg.payload.message);
      }
    });
    return unsub;
  }, [websocket, navigate, roomId]);

  // Auto-join room if we have a roomId and aren't already in one
  useEffect(() => {
    if (websocket.state.isConnected && roomId && !room.currentRoom) {
      // The page was navigated to directly; user needs to provide name
      // This will show the join dialog or auto-join
    }
  }, [websocket.state.isConnected, roomId, room.currentRoom]);

  const handleLeave = useCallback(() => {
    room.leaveRoom();
    navigate('/');
  }, [room, navigate]);

  const handleStartGame = useCallback(() => {
    room.startGame();
  }, [room]);

  if (!room.currentRoom) {
    return (
      <div className="room-page">
        <LoadingSpinner size="large" text="加载房间信息..." />
      </div>
    );
  }

  const { players } = room.currentRoom;
  const isHost = players.length > 0 && players[0].isReady === false; // First player is host by convention
  const canStart = players.length >= 2;

  return (
    <div className="room-page">
      <div className="room-header">
        <h2>房间: {roomId}</h2>
        <div className="room-header-actions">
          <button className="btn btn-secondary" onClick={handleLeave}>
            离开房间
          </button>
        </div>
      </div>

      <div className="room-content">
        <div className="room-players">
          <h3>玩家列表</h3>
          <div className="room-player-list">
            {players.map((player, index) => (
              <div
                key={player.uid}
                className={`room-player-item ${player.isConnected ? '' : 'disconnected'}`}
              >
                <span className="room-player-index">#{index + 1}</span>
                <span className="room-player-name">{player.name}</span>
                <span className="room-player-status">
                  {player.isConnected ? '已连接' : '已断开'}
                </span>
                {index === 0 && <span className="room-player-host">房主</span>}
              </div>
            ))}
            {players.length < 6 && (
              <div className="room-player-item room-player-empty">
                <span className="room-player-name">等待加入...</span>
              </div>
            )}
          </div>
        </div>

        <div className="room-info">
          <div className="room-info-item">
            <span className="room-info-label">房间号</span>
            <span className="room-info-value room-id-display">{roomId}</span>
            <button
              className="btn btn-small btn-secondary"
              onClick={() => {
                if (roomId) navigator.clipboard.writeText(roomId);
              }}
            >
              复制
            </button>
          </div>
          <div className="room-info-item">
            <span className="room-info-label">当前人数</span>
            <span className="room-info-value">{players.length} / 6</span>
          </div>
        </div>
      </div>

      <div className="room-footer">
        {isHost && canStart && (
          <button className="btn btn-primary btn-large" onClick={handleStartGame}>
            开始游戏
          </button>
        )}
        {!isHost && (
          <div className="room-waiting-text">等待房主开始游戏...</div>
        )}
        {!canStart && isHost && (
          <div className="room-waiting-text">需要至少 2 名玩家才能开始</div>
        )}
      </div>

      {error && (
        <ErrorToast message={error} onDismiss={() => setError('')} />
      )}
    </div>
  );
};

export default RoomPage;
