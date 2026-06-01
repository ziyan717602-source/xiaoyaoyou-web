/**
 * RoomManager - Game room lifecycle management
 *
 * Manages room creation, joining, leaving, listing, and destruction.
 * Each Room tracks its players, status, and optional GameSession reference.
 */

import type { PlayerInfo, RoomInfo } from '../shared/network/protocol';
import type { GameSession } from './game-session';
import type { LibGroupData } from '../shared/game/lib-group';

export interface Room {
  id: string;
  players: Map<number, PlayerInfo>;
  playerCount: number;
  maxPlayers: number;
  packages: number[];
  status: 'waiting' | 'playing' | 'finished';
  gameSession: GameSession | null;
  createdAt: number;
  /** LibGroup data for game creation (defaults to empty) */
  libGroupData: LibGroupData;
  /** Level code for card filtering (defaults to 6 = LEVEL_RCM) */
  levelCode: number;
}

export type RoomEvent =
  | { type: 'room_created'; roomId: string }
  | { type: 'player_joined'; roomId: string; playerName: string; uid: number }
  | { type: 'player_left'; roomId: string; playerName: string }
  | { type: 'player_disconnected'; roomId: string; playerName: string }
  | { type: 'player_reconnected'; roomId: string; playerName: string }
  | { type: 'game_started'; roomId: string; playerCount: number }
  | { type: 'game_finished'; roomId: string }
  | { type: 'room_destroyed'; roomId: string };

export type RoomEventHandler = (event: RoomEvent) => void;

/** Default empty LibGroup data */
const EMPTY_LIB_GROUP_DATA: LibGroupData = {
  heroData: [],
  tuxData: [],
  monsterData: [],
  npcData: [],
  eveData: [],
  skillData: [],
  opsData: [],
  njData: [],
  runeData: [],
  exspData: [],
};

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private eventHandler: RoomEventHandler | null = null;

  /**
   * Create a new room.
   * @returns The generated room ID.
   */
  createRoom(
    playerCount: number,
    packages: number[],
    libGroupData?: LibGroupData,
    levelCode?: number,
  ): string {
    const roomId = this.generateRoomId();
    const room: Room = {
      id: roomId,
      players: new Map(),
      playerCount: 0,
      maxPlayers: playerCount,
      packages,
      status: 'waiting',
      gameSession: null,
      createdAt: Date.now(),
      libGroupData: libGroupData ?? EMPTY_LIB_GROUP_DATA,
      levelCode: levelCode ?? 6, // Default to LEVEL_RCM (packages 1, 2, 4)
    };

    this.rooms.set(roomId, room);
    this.eventHandler?.({ type: 'room_created', roomId });
    return roomId;
  }

  /**
   * Join an existing room.
   */
  joinRoom(
    roomId: string,
    playerName: string,
  ): { success: boolean; error?: string; message?: string; players?: PlayerInfo[]; uid?: number } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND', message: 'Room not found' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'GAME_STARTED', message: 'Game already started' };
    }

    if (room.playerCount >= room.maxPlayers) {
      return { success: false, error: 'ROOM_FULL', message: 'Room is full' };
    }

    // Check for duplicate player name
    for (const player of room.players.values()) {
      if (player.name === playerName) {
        return { success: false, error: 'NAME_TAKEN', message: 'Player name already taken' };
      }
    }

    // Assign player ID starting from 1
    const uid = room.playerCount + 1;
    const playerInfo: PlayerInfo = {
      uid,
      name: playerName,
      isReady: true,
      isConnected: true,
    };

    room.players.set(uid, playerInfo);
    room.playerCount++;

    this.eventHandler?.({ type: 'player_joined', roomId, playerName, uid });
    return { success: true, players: this.getPlayerList(roomId), uid };
  }

  /**
   * Leave a room.
   */
  leaveRoom(
    roomId: string,
    uid: number,
  ): { success: boolean; error?: string; playerName?: string } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND' };
    }

    const player = room.players.get(uid);
    if (!player) {
      return { success: false, error: 'PLAYER_NOT_FOUND' };
    }

    const playerName = player.name;
    room.players.delete(uid);
    room.playerCount--;

    this.eventHandler?.({ type: 'player_left', roomId, playerName });

    // Auto-destroy empty rooms
    if (room.playerCount === 0) {
      this.destroyRoom(roomId);
    }

    return { success: true, playerName };
  }

  /**
   * List all rooms with basic info.
   */
  listRooms(): RoomInfo[] {
    return Array.from(this.rooms.values()).map((room) => ({
      roomId: room.id,
      playerCount: room.playerCount,
      maxPlayers: room.maxPlayers,
      status: room.status,
    }));
  }

  /**
   * Get a room by ID.
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get the player list for a room.
   */
  getPlayerList(roomId: string): PlayerInfo[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.players.values());
  }

  /**
   * Mark a player as disconnected.
   */
  markPlayerDisconnected(roomId: string, uid: number): void {
    const room = this.rooms.get(roomId);
    if (room) {
      const player = room.players.get(uid);
      if (player) {
        player.isConnected = false;
        this.eventHandler?.({
          type: 'player_disconnected',
          roomId,
          playerName: player.name,
        });
      }
    }
  }

  /**
   * Mark a player as reconnected.
   */
  markPlayerReconnected(roomId: string, uid: number): void {
    const room = this.rooms.get(roomId);
    if (room) {
      const player = room.players.get(uid);
      if (player) {
        player.isConnected = true;
        this.eventHandler?.({
          type: 'player_reconnected',
          roomId,
          playerName: player.name,
        });
      }
    }
  }

  /**
   * Start the game in a room.
   * @returns true if the game was started successfully.
   */
  startGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting') {
      return false;
    }

    if (room.playerCount < 1) {
      return false;
    }

    // Fill empty slots with AI players
    for (let uid = room.playerCount + 1; uid <= room.maxPlayers; uid++) {
      const aiName = `AI${uid}`;
      // Avoid duplicate names
      let name = aiName;
      let suffix = 2;
      while (room.players.has(uid) || [...room.players.values()].some(p => p.name === name)) {
        name = `${aiName}_${suffix++}`;
      }
      room.players.set(uid, {
        uid,
        name,
        isReady: true,
        isConnected: false, // AI players are not connected via WebSocket
      });
      room.playerCount++;
    }

    room.status = 'playing';
    this.eventHandler?.({
      type: 'game_started',
      roomId,
      playerCount: room.playerCount,
    });
    return true;
  }

  /**
   * End the game in a room.
   */
  endGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = 'finished';
      this.eventHandler?.({ type: 'game_finished', roomId });
    }
  }

  /**
   * Destroy a room and clean up its game session.
   */
  destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      if (room.gameSession) {
        room.gameSession.stop();
      }
      this.rooms.delete(roomId);
      this.eventHandler?.({ type: 'room_destroyed', roomId });
    }
  }

  /**
   * Register an event handler.
   */
  onEvent(handler: RoomEventHandler): void {
    this.eventHandler = handler;
  }

  /**
   * Generate a 6-character uppercase alphanumeric room ID.
   */
  private generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure uniqueness
    if (this.rooms.has(id)) {
      return this.generateRoomId();
    }
    return id;
  }
}
