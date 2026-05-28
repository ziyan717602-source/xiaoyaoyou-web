/**
 * GameSession Tests
 *
 * Tests GameSession creation, game startup, input handling, state retrieval,
 * and cleanup.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { GameSession } from '../game-session';
import { RoomManager } from '../room';
import { ConnectionManager } from '../connection';
import type { LibGroupData } from '@shared/game/lib-group';

/** Create empty LibGroup data for testing */
function makeEmptyLibGroupData(): LibGroupData {
  return {
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
}

let roomManager: RoomManager;
let connectionManager: ConnectionManager;

beforeEach(() => {
  roomManager = new RoomManager();
  connectionManager = new ConnectionManager();
});

afterEach(() => {
  connectionManager.stop();
});

function createTestRoom(playerCount = 2): string {
  const roomId = roomManager.createRoom(playerCount, [1], makeEmptyLibGroupData(), 0);
  for (let i = 0; i < playerCount; i++) {
    roomManager.joinRoom(roomId, `Player${i + 1}`);
  }
  return roomId;
}

describe('GameSession', () => {
  describe('Construction', () => {
    it('should create a GameSession with a room', () => {
      const roomId = createTestRoom(2);
      const room = roomManager.getRoom(roomId)!;
      const session = new GameSession(room, roomManager, connectionManager);

      expect(session).toBeDefined();
      expect(room.gameSession).toBe(session);
    });

    it('should have a Game instance', () => {
      const roomId = createTestRoom(2);
      const room = roomManager.getRoom(roomId)!;
      const session = new GameSession(room, roomManager, connectionManager);

      expect(session.getGame()).toBeDefined();
    });

    it('should not be stopped initially', () => {
      const roomId = createTestRoom(2);
      const room = roomManager.getRoom(roomId)!;
      const session = new GameSession(room, roomManager, connectionManager);

      expect(session.isStopped()).toBe(false);
    });
  });

  describe('Game Startup', () => {
    it('should start and complete a game with empty data', async () => {
      const roomId = createTestRoom(2);
      const room = roomManager.getRoom(roomId)!;
      const session = new GameSession(room, roomManager, connectionManager);

      const result = await session.start();

      expect(result).toBeDefined();
      expect(typeof result.totalRounds).toBe('number');
      expect(typeof result.akaScore).toBe('number');
      expect(typeof result.aoScore).toBe('number');
      expect(['victory', 'max_rounds', 'elimination']).toContain(result.reason);
    }, 15000);

    it('should end the game in room manager after completion', async () => {
      const roomId = createTestRoom(2);
      const room = roomManager.getRoom(roomId)!;
      const session = new GameSession(room, roomManager, connectionManager);

      await session.start();

      expect(room.status).toBe('finished');
    }, 15000);
  });

  describe('Input Handling', () => {
    it('should handle player input for a pending request', () => {
      const roomId = createTestRoom(2);
      const room = roomManager.getRoom(roomId)!;
      const session = new GameSession(room, roomManager, connectionManager);

      // Start a wait for input (without running the full game)
      const promise = session.waitForInput(1, 'select', 'T01', '1,2,3');

      // Handle the input
      const consumed = session.handlePlayerInput(1, '1');
      expect(consumed).toBe(true);

      return expect(presolvesTo(promise, '1')).resolves.toBe(true);
    });

    it('should return false when no pending request exists', () => {
      const roomId = createTestRoom(2);
      const room = roomManager.getRoom(roomId)!;
      const session = new GameSession(room, roomManager, connectionManager);

      const consumed = session.handlePlayerInput(1, '1');
      expect(consumed).toBe(false);
    });

    it('should handle multiple concurrent input requests', async () => {
      const roomId = createTestRoom(4);
      const room = roomManager.getRoom(roomId)!;
      const session = new GameSession(room, roomManager, connectionManager);

      const p1 = session.waitForInput(1, 'select', 'T01', '1,2');
      const p2 = session.waitForInput(2, 'select', 'T02', '3,4');

      session.handlePlayerInput(2, '3');
      session.handlePlayerInput(1, '1');

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe('1');
      expect(r2).toBe('3');
    });
  });

  describe('State Retrieval', () => {
    it('should get game state before game starts (room-based)', () => {
      const roomId = createTestRoom(2);
      const room = roomManager.getRoom(roomId)!;
      const session = new GameSession(room, roomManager, connectionManager);

      const state = session.getState();
      expect(state).toBeDefined();
      expect(state.players).toBeDefined();
      // Before game runs, returns room player list
      expect(state.players.length).toBe(2);
      expect(state.board).toBeDefined();
      expect(state.phase).toBe('waiting');
    });

    it('should include player details in state before game starts', () => {
      const roomId = createTestRoom(2);
      const room = roomManager.getRoom(roomId)!;
      const session = new GameSession(room, roomManager, connectionManager);

      const state = session.getState();
      expect(state.players[0].uid).toBe(1);
      expect(state.players[0].name).toBe('Player1');
      expect(state.players[1].uid).toBe(2);
      expect(state.players[1].name).toBe('Player2');
    });
  });

  describe('Stop', () => {
    it('should stop the session', () => {
      const roomId = createTestRoom(2);
      const room = roomManager.getRoom(roomId)!;
      const session = new GameSession(room, roomManager, connectionManager);

      session.stop();
      expect(session.isStopped()).toBe(true);
    });

    it('should clear input resolvers on stop', () => {
      const roomId = createTestRoom(2);
      const room = roomManager.getRoom(roomId)!;
      const session = new GameSession(room, roomManager, connectionManager);

      session.waitForInput(1, 'select', 'T01', '1,2');
      session.stop();

      // After stop, pending requests should not be resolvable
      const consumed = session.handlePlayerInput(1, '1');
      expect(consumed).toBe(false);
    });
  });
});

/**
 * Helper: returns a promise that resolves to true if the given promise
 * resolves with the expected value within a timeout.
 */
function presolvesTo<T>(promise: Promise<T>, expected: T): Promise<boolean> {
  return Promise.race([
    promise.then((val) => val === expected),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 100)),
  ]);
}
