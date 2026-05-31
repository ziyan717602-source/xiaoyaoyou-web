import React from 'react';
import type { RoomInfo } from '@shared/network';

interface RoomListProps {
  rooms: RoomInfo[];
  onJoinRoom: (roomId: string) => void;
}

const STATUS_LABELS: Record<RoomInfo['status'], string> = {
  waiting: '等待中',
  playing: '游戏中',
  finished: '已结束',
};

const RoomList: React.FC<RoomListProps> = ({ rooms, onJoinRoom }) => {
  if (rooms.length === 0) {
    return (
      <div className="room-list room-list-empty">
        <div className="room-list-empty-text">暂无房间</div>
        <div className="room-list-empty-hint">点击"创建房间"开始游戏</div>
      </div>
    );
  }

  return (
    <div className="room-list">
      <div className="room-list-header">
        <span className="room-list-col-id">房间号</span>
        <span className="room-list-col-players">玩家</span>
        <span className="room-list-col-status">状态</span>
        <span className="room-list-col-action">操作</span>
      </div>
      {rooms.map((room) => (
        <div key={room.roomId} className="room-list-row">
          <span className="room-list-col-id">{room.roomId}</span>
          <span className="room-list-col-players">
            {room.playerCount} / {room.maxPlayers}
          </span>
          <span className="room-list-col-status">
            {STATUS_LABELS[room.status]}
          </span>
          <span className="room-list-col-action">
            {room.status === 'waiting' && room.playerCount < room.maxPlayers && (
              <button
                className="btn btn-primary btn-small"
                onClick={() => onJoinRoom(room.roomId)}
              >
                加入
              </button>
            )}
            {room.status === 'waiting' && room.playerCount >= room.maxPlayers && (
              <span className="text-muted">已满</span>
            )}
            {room.status === 'playing' && (
              <span className="text-muted">观战中</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
};

export default RoomList;
