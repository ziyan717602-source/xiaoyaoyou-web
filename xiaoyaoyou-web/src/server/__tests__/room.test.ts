/**
 * RoomManager Tests
 *
 * Tests room creation, joining, leaving, listing, state management,
 * game start/end, and room destruction.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomManager, type RoomEvent } from '../room';

let roomManager: RoomManager;

beforeEach(() => {
  roomManager = new RoomManager();
});

describe('RoomManager', () => {
  describe('Room Creation', () => {
    it('should create a room and return a room ID', () => {
      const roomId = roomManager.createRoom(4, [1]);
      expect(roomId).toBeDefined();
      expect(typeof roomId).toBe('string');
      expect(roomId.length).toBe(6);
    });

    it('should generate unique room IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        ids.add(roomManager.createRoom(2, [1]));
      }
      expect(ids.size).toBe(50);
    });

    it('should initialize room with waiting status', () => {
      const roomId = roomManager.createRoom(4, [1]);
      const room = roomManager.getRoom(roomId);
      expect(room).toBeDefined();
      expect(room!.status).toBe('waiting');
      expect(room!.playerCount).toBe(0);
      expect(room!.maxPlayers).toBe(4);
    });

    it('should fire room_created event', () => {
      const handler = vi.fn();
      roomManager.onEvent(handler);

      const roomId = roomManager.createRoom(2, [1]);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        type: 'room_created',
        roomId,
      });
    });
  });

  describe('Room Joining', () => {
    it('should join a room successfully', () => {
      const roomId = roomManager.createRoom(4, [1]);
      const result = roomManager.joinRoom(roomId, 'Alice');

      expect(result.success).toBe(true);
      expect(result.players).toBeDefined();
      expect(result.players!.length).toBe(1);
      expect(result.players![0].name).toBe('Alice');
      expect(result.players![0].uid).toBe(1);
    });

    it('should assign sequential UIDs', () => {
      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');
      const result = roomManager.joinRoom(roomId, 'Bob');

      expect(result.success).toBe(true);
      expect(result.players!.length).toBe(2);
      expect(result.players![0].uid).toBe(1);
      expect(result.players![1].uid).toBe(2);
    });

    it('should reject join when room is full', () => {
      const roomId = roomManager.createRoom(2, [1]);
      roomManager.joinRoom(roomId, 'Alice');
      roomManager.joinRoom(roomId, 'Bob');

      const result = roomManager.joinRoom(roomId, 'Charlie');
      expect(result.success).toBe(false);
      expect(result.error).toBe('ROOM_FULL');
    });

    it('should reject join when room does not exist', () => {
      const result = roomManager.joinRoom('NONEXIST', 'Alice');
      expect(result.success).toBe(false);
      expect(result.error).toBe('ROOM_NOT_FOUND');
    });

    it('should reject join when game already started', () => {
      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');
      roomManager.joinRoom(roomId, 'Bob');
      roomManager.startGame(roomId);

      const result = roomManager.joinRoom(roomId, 'Charlie');
      expect(result.success).toBe(false);
      expect(result.error).toBe('GAME_STARTED');
    });

    it('should reject join when player name is taken', () => {
      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');

      const result = roomManager.joinRoom(roomId, 'Alice');
      expect(result.success).toBe(false);
      expect(result.error).toBe('NAME_TAKEN');
    });

    it('should fire player_joined event', () => {
      const handler = vi.fn();
      roomManager.onEvent(handler);

      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');

      expect(handler).toHaveBeenCalledWith({
        type: 'player_joined',
        roomId,
        playerName: 'Alice',
        uid: 1,
      });
    });
  });

  describe('Room Leaving', () => {
    it('should leave a room successfully', () => {
      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');

      const result = roomManager.leaveRoom(roomId, 1);
      expect(result.success).toBe(true);
      expect(result.playerName).toBe('Alice');
    });

    it('should auto-destroy empty room on last player leave', () => {
      const handler = vi.fn();
      roomManager.onEvent(handler);

      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');
      roomManager.leaveRoom(roomId, 1);

      // Room should be destroyed
      expect(roomManager.getRoom(roomId)).toBeUndefined();
      expect(handler).toHaveBeenCalledWith({
        type: 'room_destroyed',
        roomId,
      });
    });

    it('should not destroy room when players remain', () => {
      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');
      roomManager.joinRoom(roomId, 'Bob');
      roomManager.leaveRoom(roomId, 1);

      expect(roomManager.getRoom(roomId)).toBeDefined();
    });

    it('should return error for non-existent room', () => {
      const result = roomManager.leaveRoom('NONEXIST', 1);
      expect(result.success).toBe(false);
      expect(result.error).toBe('ROOM_NOT_FOUND');
    });

    it('should return error for non-existent player', () => {
      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');

      const result = roomManager.leaveRoom(roomId, 999);
      expect(result.success).toBe(false);
      expect(result.error).toBe('PLAYER_NOT_FOUND');
    });

    it('should fire player_left event', () => {
      const handler = vi.fn();
      roomManager.onEvent(handler);

      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');
      handler.mockClear(); // Clear the join event

      roomManager.leaveRoom(roomId, 1);
      expect(handler).toHaveBeenCalledWith({
        type: 'player_left',
        roomId,
        playerName: 'Alice',
      });
    });
  });

  describe('Room Listing', () => {
    it('should list all rooms', () => {
      roomManager.createRoom(2, [1]);
      roomManager.createRoom(4, [1, 2]);
      roomManager.createRoom(6, [1, 2, 3]);

      const rooms = roomManager.listRooms();
      expect(rooms.length).toBe(3);
    });

    it('should return room info with correct fields', () => {
      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');

      const rooms = roomManager.listRooms();
      expect(rooms.length).toBe(1);
      expect(rooms[0].roomId).toBe(roomId);
      expect(rooms[0].playerCount).toBe(1);
      expect(rooms[0].maxPlayers).toBe(4);
      expect(rooms[0].status).toBe('waiting');
    });

    it('should return empty array when no rooms exist', () => {
      expect(roomManager.listRooms()).toEqual([]);
    });
  });

  describe('Room State Management', () => {
    it('should mark player as disconnected', () => {
      const handler = vi.fn();
      roomManager.onEvent(handler);

      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');
      handler.mockClear();

      roomManager.markPlayerDisconnected(roomId, 1);
      const players = roomManager.getPlayerList(roomId);
      expect(players[0].isConnected).toBe(false);
      expect(handler).toHaveBeenCalledWith({
        type: 'player_disconnected',
        roomId,
        playerName: 'Alice',
      });
    });

    it('should mark player as reconnected', () => {
      const handler = vi.fn();
      roomManager.onEvent(handler);

      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');
      roomManager.markPlayerDisconnected(roomId, 1);
      handler.mockClear();

      roomManager.markPlayerReconnected(roomId, 1);
      const players = roomManager.getPlayerList(roomId);
      expect(players[0].isConnected).toBe(true);
      expect(handler).toHaveBeenCalledWith({
        type: 'player_reconnected',
        roomId,
        playerName: 'Alice',
      });
    });

    it('should return empty player list for non-existent room', () => {
      expect(roomManager.getPlayerList('NONEXIST')).toEqual([]);
    });
  });

  describe('Game Start/End', () => {
    it('should start a game with enough players', () => {
      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');
      roomManager.joinRoom(roomId, 'Bob');

      const started = roomManager.startGame(roomId);
      expect(started).toBe(true);

      const room = roomManager.getRoom(roomId);
      expect(room!.status).toBe('playing');
    });

    it('should not start with 0 players', () => {
      const roomId = roomManager.createRoom(4, [1]);

      const started = roomManager.startGame(roomId);
      expect(started).toBe(false);
    });

    it('should not start twice', () => {
      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');
      roomManager.joinRoom(roomId, 'Bob');
      roomManager.startGame(roomId);

      const started = roomManager.startGame(roomId);
      expect(started).toBe(false);
    });

    it('should not start for non-existent room', () => {
      const started = roomManager.startGame('NONEXIST');
      expect(started).toBe(false);
    });

    it('should fire game_started event', () => {
      const handler = vi.fn();
      roomManager.onEvent(handler);

      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');
      roomManager.joinRoom(roomId, 'Bob');
      handler.mockClear();

      roomManager.startGame(roomId);
      expect(handler).toHaveBeenCalledWith({
        type: 'game_started',
        roomId,
        playerCount: 4, // AI players fill remaining slots
      });
    });

    it('should end a game', () => {
      const roomId = roomManager.createRoom(4, [1]);
      roomManager.joinRoom(roomId, 'Alice');
      roomManager.joinRoom(roomId, 'Bob');
      roomManager.startGame(roomId);

      roomManager.endGame(roomId);
      const room = roomManager.getRoom(roomId);
      expect(room!.status).toBe('finished');
    });
  });

  describe('Room Destruction', () => {
    it('should destroy a room', () => {
      const handler = vi.fn();
      roomManager.onEvent(handler);

      const roomId = roomManager.createRoom(4, [1]);
      roomManager.destroyRoom(roomId);

      expect(roomManager.getRoom(roomId)).toBeUndefined();
      expect(handler).toHaveBeenCalledWith({
        type: 'room_destroyed',
        roomId,
      });
    });

    it('should handle destroying non-existent room gracefully', () => {
      // Should not throw
      roomManager.destroyRoom('NONEXIST');
    });
  });
});
