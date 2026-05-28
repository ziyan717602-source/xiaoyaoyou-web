import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomInfo, PlayerInfo } from '@shared/network';
import type { UseWebSocketReturn } from './useWebSocket';

export interface RoomManager {
  rooms: RoomInfo[];
  currentRoom: { roomId: string; players: PlayerInfo[] } | null;
  createRoom: (playerCount: number, packages: number[]) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  refreshRooms: () => void;
}

export function useRoom(websocket: UseWebSocketReturn): RoomManager {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<{ roomId: string; players: PlayerInfo[] } | null>(null);
  const currentRoomRef = useRef(currentRoom);
  currentRoomRef.current = currentRoom;

  useEffect(() => {
    const unsubscribe = websocket.onMessage((message) => {
      switch (message.type) {
        case 'room_list':
          setRooms(message.payload.rooms);
          break;
        case 'room_created':
          // Room created, will join after
          break;
        case 'room_joined':
          setCurrentRoom({
            roomId: message.payload.roomId,
            players: message.payload.players,
          });
          break;
        case 'room_left':
          setCurrentRoom(null);
          break;
        case 'player_joined':
        case 'player_left':
          if (currentRoomRef.current) {
            setCurrentRoom(prev => prev ? {
              ...prev,
              players: message.payload.players,
            } : null);
          }
          break;
        case 'game_started':
          // Navigation handled by pages
          break;
      }
    });

    return unsubscribe;
  }, [websocket]);

  const createRoom = useCallback((playerCount: number, packages: number[]) => {
    websocket.send({
      type: 'create_room',
      payload: { playerCount, packages },
    });
  }, [websocket]);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    websocket.send({
      type: 'join_room',
      payload: { roomId, playerName },
    });
  }, [websocket]);

  const leaveRoom = useCallback(() => {
    websocket.send({ type: 'leave_room' });
    setCurrentRoom(null);
  }, [websocket]);

  const startGame = useCallback(() => {
    websocket.send({ type: 'start_game' });
  }, [websocket]);

  const refreshRooms = useCallback(() => {
    websocket.send({ type: 'list_rooms' });
  }, [websocket]);

  return {
    rooms,
    currentRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    refreshRooms,
  };
}
