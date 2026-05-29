import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomInfo, PlayerInfo } from '@shared/network';
import type { UseWebSocketReturn } from './useWebSocket';

export interface RoomManager {
  rooms: RoomInfo[];
  currentRoom: { roomId: string; players: PlayerInfo[] } | null;
  myUid: number | null;
  playerName: string | null;
  createRoom: (playerCount: number, packages: number[]) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  refreshRooms: () => void;
}

export function useRoom(websocket: UseWebSocketReturn): RoomManager {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<{ roomId: string; players: PlayerInfo[] } | null>(null);
  const [myUid, setMyUid] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const currentRoomRef = useRef(currentRoom);
  currentRoomRef.current = currentRoom;
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;

  useEffect(() => {
    const unsubscribe = websocket.onMessage((message) => {
      switch (message.type) {
        case 'room_list':
          setRooms(message.payload.rooms);
          break;
        case 'room_created':
          setCurrentRoom({
            roomId: message.payload.roomId,
            players: message.payload.players,
          });
          setMyUid(message.payload.myUid);
          break;
        case 'room_joined':
          setCurrentRoom({
            roomId: message.payload.roomId,
            players: message.payload.players,
          });
          setMyUid(message.payload.myUid);
          break;
        case 'room_left':
          setCurrentRoom(null);
          setMyUid(null);
          setPlayerName(null);
          break;
        case 'player_joined':
        case 'player_left':
        case 'player_reconnected':
        case 'player_disconnected':
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

  // Auto-reconnect: when WebSocket reconnects and we were in a room, send reconnect message
  useEffect(() => {
    if (websocket.state.isConnected && currentRoomRef.current && playerNameRef.current) {
      websocket.send({
        type: 'reconnect',
        payload: {
          roomId: currentRoomRef.current.roomId,
          playerName: playerNameRef.current,
        },
      });
    }
  }, [websocket.state.isConnected, websocket]);

  const createRoom = useCallback((playerCount: number, packages: number[]) => {
    websocket.send({
      type: 'create_room',
      payload: { playerCount, packages },
    });
  }, [websocket]);

  const joinRoom = useCallback((roomId: string, name: string) => {
    setPlayerName(name);
    websocket.send({
      type: 'join_room',
      payload: { roomId, playerName: name },
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
    myUid,
    playerName,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    refreshRooms,
  };
}
