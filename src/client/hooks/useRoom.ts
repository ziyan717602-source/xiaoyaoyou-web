import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomInfo, PlayerInfo } from '@shared/network';
import type { UseWebSocketReturn } from './useWebSocket';

export interface RoomManager {
  rooms: RoomInfo[];
  currentRoom: { roomId: string; players: PlayerInfo[]; maxPlayers: number } | null;
  myUid: number | null;
  playerName: string | null;
  createRoom: (playerCount: number, packages: number[], name?: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  addAI: () => void;
  refreshRooms: () => void;
}

export function useRoom(websocket: UseWebSocketReturn): RoomManager {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<{ roomId: string; players: PlayerInfo[]; maxPlayers: number } | null>(() => {
    const saved = localStorage.getItem('xyy_room');
    return saved ? JSON.parse(saved) : null;
  });
  const [myUid, setMyUid] = useState<number | null>(() => {
    const saved = localStorage.getItem('xyy_myUid');
    return saved ? Number(saved) : null;
  });
  const [playerName, setPlayerName] = useState<string | null>(() => {
    return localStorage.getItem('xyy_playerName');
  });
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
        case 'room_created': {
          const me = message.payload.players.find(p => p.uid === message.payload.myUid);
          const name = me?.name ?? '房主';
          const roomData = {
            roomId: message.payload.roomId,
            players: message.payload.players,
            maxPlayers: message.payload.maxPlayers,
          };
          setCurrentRoom(roomData);
          setMyUid(message.payload.myUid);
          setPlayerName(name);
          localStorage.setItem('xyy_room', JSON.stringify(roomData));
          localStorage.setItem('xyy_myUid', String(message.payload.myUid));
          localStorage.setItem('xyy_playerName', name);
          break;
        }
        case 'room_joined':
        case 'room_info': {
          const roomData = {
            roomId: message.payload.roomId,
            players: message.payload.players,
            maxPlayers: message.payload.maxPlayers,
          };
          setCurrentRoom(roomData);
          setMyUid(message.payload.myUid);
          if (playerNameRef.current) {
            localStorage.setItem('xyy_room', JSON.stringify(roomData));
            localStorage.setItem('xyy_myUid', String(message.payload.myUid));
            localStorage.setItem('xyy_playerName', playerNameRef.current);
          }
          break;
        }
        case 'room_left':
          setCurrentRoom(null);
          setMyUid(null);
          setPlayerName(null);
          localStorage.removeItem('xyy_room');
          localStorage.removeItem('xyy_myUid');
          localStorage.removeItem('xyy_playerName');
          break;
        case 'player_joined':
        case 'player_left':
        case 'player_reconnected':
        case 'player_disconnected':
          if (currentRoomRef.current) {
            const updated = { ...currentRoomRef.current, players: message.payload.players };
            setCurrentRoom(updated);
            localStorage.setItem('xyy_room', JSON.stringify(updated));
          }
          break;
        case 'game_started':
          // Navigation handled by pages
          break;
      }
    });

    return unsubscribe;
  }, [websocket]);

  // Auto-reconnect: when WebSocket connects/reconnects and we were in a room, send reconnect message
  // This covers both initial mount (if already connected) and reconnection after disconnect
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
  }, [websocket.state.isConnected]);

  const createRoom = useCallback((playerCount: number, packages: number[], name?: string) => {
    const playerName = name || '房主';
    setPlayerName(playerName);
    localStorage.setItem('xyy_playerName', playerName);
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

  const addAI = useCallback(() => {
    websocket.send({ type: 'add_ai' });
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
    addAI,
    refreshRooms,
  };
}
