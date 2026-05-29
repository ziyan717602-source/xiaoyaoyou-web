import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ServerMessage } from '@shared/network';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { useRoom } from '../hooks/useRoom';
import RoomList from '../components/lobby/RoomList';
import CreateRoomDialog from '../components/lobby/CreateRoomDialog';
import JoinRoomDialog from '../components/lobby/JoinRoomDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorToast from '../components/common/ErrorToast';

const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const websocket = useWebSocketContext();
  const room = useRoom(websocket);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [error, setError] = useState('');

  // Request room list on connect
  useEffect(() => {
    if (websocket.state.isConnected) {
      room.refreshRooms();
    }
  }, [websocket.state.isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for room_created to auto-navigate
  useEffect(() => {
    const unsub = websocket.onMessage((msg: ServerMessage) => {
      if (msg.type === 'room_created') {
        navigate(`/room/${msg.payload.roomId}`);
      }
    });
    return unsub;
  }, [websocket, navigate]);

  // Listen for errors
  useEffect(() => {
    const unsub = websocket.onMessage((msg: ServerMessage) => {
      if (msg.type === 'error') {
        setError(msg.payload.message);
      }
    });
    return unsub;
  }, [websocket]);

  const handleJoinFromList = useCallback((roomId: string) => {
    setJoinRoomId(roomId);
    setShowJoinDialog(true);
  }, []);

  const handleJoinSubmit = useCallback((roomId: string, playerName: string) => {
    room.joinRoom(roomId, playerName);
    // Navigation will happen when room_joined is received
  }, [room]);

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <h1 className="lobby-title">仙剑逍遥游</h1>
        <div className="lobby-subtitle">联机对战</div>
      </div>

      <div className="lobby-connection">
        {websocket.state.isConnected ? (
          <span className="connection-status connected">已连接</span>
        ) : websocket.state.isReconnecting ? (
          <span className="connection-status reconnecting">
            重连中... ({websocket.state.reconnectAttempts})
          </span>
        ) : (
          <button className="btn btn-secondary" onClick={websocket.connect}>
            连接服务器
          </button>
        )}
      </div>

      <div className="lobby-actions">
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateDialog(true)}
          disabled={!websocket.state.isConnected}
        >
          创建房间
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            setJoinRoomId('');
            setShowJoinDialog(true);
          }}
          disabled={!websocket.state.isConnected}
        >
          加入房间
        </button>
        <button
          className="btn btn-secondary"
          onClick={room.refreshRooms}
          disabled={!websocket.state.isConnected}
        >
          刷新列表
        </button>
      </div>

      <div className="lobby-content">
        {!websocket.state.isConnected && !websocket.state.isReconnecting ? (
          <LoadingSpinner size="medium" text="连接服务器中..." />
        ) : (
          <RoomList rooms={room.rooms} onJoinRoom={handleJoinFromList} />
        )}
      </div>

      {showCreateDialog && (
        <CreateRoomDialog
          onCreate={room.createRoom}
          onClose={() => setShowCreateDialog(false)}
        />
      )}

      {showJoinDialog && (
        <JoinRoomDialog
          initialRoomId={joinRoomId}
          onJoin={handleJoinSubmit}
          onClose={() => setShowJoinDialog(false)}
        />
      )}

      {error && (
        <ErrorToast message={error} onDismiss={() => setError('')} />
      )}
    </div>
  );
};

export default LobbyPage;
