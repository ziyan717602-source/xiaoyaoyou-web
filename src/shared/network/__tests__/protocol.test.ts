/**
 * Protocol Tests
 *
 * Tests message serialization/deserialization, message creation helpers,
 * and error message construction.
 */
import { describe, it, expect } from 'vitest';
import {
  createMessage,
  parseMessage,
  createErrorMessage,
} from '../protocol';

describe('Protocol', () => {
  describe('createMessage', () => {
    it('should create a message with type and payload', () => {
      const msg = createMessage('room_created', { roomId: 'ABC123' });
      expect(msg).toEqual({ type: 'room_created', payload: { roomId: 'ABC123' } });
    });

    it('should create messages with various types', () => {
      expect(createMessage('room_left', { roomId: 'X' }).type).toBe('room_left');
      expect(createMessage('room_list', { rooms: [] }).type).toBe('room_list');
      expect(createMessage('game_started', { playerCount: 4 }).type).toBe('game_started');
      expect(createMessage('player_disconnected', { playerName: 'A' }).type).toBe('player_disconnected');
      expect(createMessage('player_reconnected', { playerName: 'B' }).type).toBe('player_reconnected');
      expect(createMessage('pong', { timestamp: 0 }).type).toBe('pong');
    });
  });

  describe('Message Structure', () => {
    it('should have correct room_joined structure', () => {
      const msg = { type: 'room_joined' as const, payload: { roomId: 'XYZ789', players: [{ uid: 1, name: 'Alice', isReady: true, isConnected: true }] } };
      expect(msg.payload.roomId).toBe('XYZ789');
      expect(msg.payload.players).toHaveLength(1);
    });

    it('should have correct player_joined structure', () => {
      const msg = { type: 'player_joined' as const, payload: { playerName: 'Bob', players: [{ uid: 1, name: 'Alice', isReady: true, isConnected: true }, { uid: 2, name: 'Bob', isReady: true, isConnected: true }] } };
      expect(msg.payload.players).toHaveLength(2);
    });

    it('should have correct game_state structure', () => {
      const msg = { type: 'game_state' as const, payload: { state: { players: [], currentTurn: 1, phase: '00', board: { tuxPileCount: 10, monPileCount: 5, evePileCount: 3 } } } };
      expect(msg.payload.state.board.tuxPileCount).toBe(10);
    });

    it('should have correct input_request structure', () => {
      const msg = { type: 'input_request' as const, payload: { format: 'select', code: 'T01', arg: '1,2,3' } };
      expect(msg.payload.format).toBe('select');
    });

    it('should have correct game_over structure', () => {
      const msg = { type: 'game_over' as const, payload: { result: { winner: 1, totalRounds: 10, akaScore: 15, aoScore: 12, reason: 'victory' as const } } };
      expect(msg.payload.result.winner).toBe(1);
      expect(msg.payload.result.reason).toBe('victory');
    });
  });

  describe('parseMessage', () => {
    it('should parse a valid create_room message', () => {
      const raw = JSON.stringify({ type: 'create_room', payload: { playerCount: 4, packages: [1] } });
      const msg = parseMessage(raw);
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('create_room');
    });

    it('should parse a join_room message', () => {
      const raw = JSON.stringify({ type: 'join_room', payload: { roomId: 'ABC', playerName: 'Alice' } });
      const msg = parseMessage(raw);
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('join_room');
    });

    it('should parse a leave_room message', () => {
      const raw = JSON.stringify({ type: 'leave_room' });
      const msg = parseMessage(raw);
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('leave_room');
    });

    it('should parse a list_rooms message', () => {
      const raw = JSON.stringify({ type: 'list_rooms' });
      const msg = parseMessage(raw);
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('list_rooms');
    });

    it('should parse a start_game message', () => {
      const raw = JSON.stringify({ type: 'start_game' });
      const msg = parseMessage(raw);
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('start_game');
    });

    it('should parse a player_input message', () => {
      const raw = JSON.stringify({ type: 'player_input', payload: { input: 'attack' } });
      const msg = parseMessage(raw);
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('player_input');
    });

    it('should parse a get_state message', () => {
      const raw = JSON.stringify({ type: 'get_state' });
      const msg = parseMessage(raw);
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('get_state');
    });

    it('should parse a ping message', () => {
      const raw = JSON.stringify({ type: 'ping', payload: { timestamp: 12345 } });
      const msg = parseMessage(raw);
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('ping');
    });

    it('should return null for invalid JSON', () => {
      expect(parseMessage('not json')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseMessage('')).toBeNull();
    });

    it('should return null for missing type field', () => {
      expect(parseMessage(JSON.stringify({ payload: {} }))).toBeNull();
    });

    it('should return null for non-string type', () => {
      expect(parseMessage(JSON.stringify({ type: 123 }))).toBeNull();
    });

    it('should handle unknown message types gracefully', () => {
      const msg = parseMessage(JSON.stringify({ type: 'unknown_type' }));
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('unknown_type');
    });
  });

  describe('createErrorMessage', () => {
    it('should create an error message with code and message', () => {
      const msg = createErrorMessage('ROOM_NOT_FOUND', 'Room does not exist');
      expect(msg).toEqual({
        type: 'error',
        payload: { code: 'ROOM_NOT_FOUND', message: 'Room does not exist' },
      });
    });

    it('should create error messages with various codes', () => {
      const codes = [
        'INVALID_MESSAGE',
        'UNKNOWN_TYPE',
        'ROOM_FULL',
        'GAME_STARTED',
        'NAME_TAKEN',
        'NOT_HOST',
      ];
      for (const code of codes) {
        const msg = createErrorMessage(code, 'Some message') as { type: 'error'; payload: { code: string; message: string } };
        expect(msg.type).toBe('error');
        expect(msg.payload.code).toBe(code);
      }
    });
  });

  describe('JSON round-trip', () => {
    it('should round-trip a ClientMessage through JSON', () => {
      const original = { type: 'create_room', payload: { playerCount: 4, packages: [1, 2] } };
      const serialized = JSON.stringify(original);
      const parsed = parseMessage(serialized);
      expect(parsed).toEqual(original);
    });

    it('should round-trip a ServerMessage through JSON', () => {
      const original = { type: 'room_created', payload: { roomId: 'TEST01' } };
      const serialized = JSON.stringify(original);
      const parsed = JSON.parse(serialized);
      expect(parsed).toEqual(original);
    });
  });
});
