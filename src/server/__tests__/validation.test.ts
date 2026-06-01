import { describe, it, expect } from 'vitest';
import { validateMessage, RateLimiter } from '../validation';

describe('validateMessage', () => {
  it('should reject non-object messages', () => {
    expect(validateMessage(null)).toMatchObject({ valid: false, code: 'INVALID_FORMAT' });
    expect(validateMessage('string')).toMatchObject({ valid: false, code: 'INVALID_FORMAT' });
    expect(validateMessage(42)).toMatchObject({ valid: false, code: 'INVALID_FORMAT' });
  });

  it('should reject messages without string type', () => {
    expect(validateMessage({ type: 123, payload: {} })).toMatchObject({ valid: false, code: 'INVALID_FORMAT' });
  });

  it('should accept messages without payload (fall through to default handler)', () => {
    expect(validateMessage({ type: 'ping' })).toEqual({ valid: true });
  });

  it('should reject unknown message types', () => {
    expect(validateMessage({ type: 'unknown', payload: {} })).toMatchObject({ valid: false, code: 'UNKNOWN_TYPE' });
  });

  it('should accept safe message types', () => {
    expect(validateMessage({ type: 'ping', payload: { timestamp: 1 } })).toEqual({ valid: true });
    expect(validateMessage({ type: 'list_rooms', payload: {} })).toEqual({ valid: true });
    expect(validateMessage({ type: 'start_game', payload: {} })).toEqual({ valid: true });
    expect(validateMessage({ type: 'player_ready', payload: {} })).toEqual({ valid: true });
  });

  describe('create_room', () => {
    it('should accept valid create_room', () => {
      expect(validateMessage({
        type: 'create_room',
        payload: { playerCount: 4, playerName: '玩家1' },
      })).toEqual({ valid: true });
    });

    it('should reject invalid playerCount', () => {
      expect(validateMessage({
        type: 'create_room',
        payload: { playerCount: 1, playerName: '玩家' },
      })).toMatchObject({ valid: false, code: 'INVALID_PLAYER_COUNT' });

      expect(validateMessage({
        type: 'create_room',
        payload: { playerCount: 7, playerName: '玩家' },
      })).toMatchObject({ valid: false, code: 'INVALID_PLAYER_COUNT' });

      expect(validateMessage({
        type: 'create_room',
        payload: { playerCount: '4', playerName: '玩家' },
      })).toMatchObject({ valid: false, code: 'INVALID_PLAYER_COUNT' });
    });

    it('should accept all valid player counts', () => {
      for (const count of [2, 3, 4, 5, 6]) {
        expect(validateMessage({
          type: 'create_room',
          payload: { playerCount: count, playerName: '测试' },
        })).toEqual({ valid: true });
      }
    });

    it('should reject empty player name', () => {
      expect(validateMessage({
        type: 'create_room',
        payload: { playerCount: 4, playerName: '' },
      })).toMatchObject({ valid: false, code: 'EMPTY_PLAYER_NAME' });
    });

    it('should reject player name too long', () => {
      expect(validateMessage({
        type: 'create_room',
        payload: { playerCount: 4, playerName: '这是一个超过十二个字符的名字' },
      })).toMatchObject({ valid: false, code: 'PLAYER_NAME_TOO_LONG' });
    });
  });

  describe('join_room', () => {
    it('should accept valid join_room', () => {
      expect(validateMessage({
        type: 'join_room',
        payload: { roomId: 'ABCD', playerName: '玩家' },
      })).toEqual({ valid: true });
    });

    it('should reject invalid roomId format', () => {
      expect(validateMessage({
        type: 'join_room',
        payload: { roomId: 'abc', playerName: '玩家' },
      })).toMatchObject({ valid: false, code: 'INVALID_ROOM_ID' });

      expect(validateMessage({
        type: 'join_room',
        payload: { roomId: 'A', playerName: '玩家' },
      })).toMatchObject({ valid: false, code: 'INVALID_ROOM_ID' });

      expect(validateMessage({
        type: 'join_room',
        payload: { roomId: 'ABCDEFGHIJ', playerName: '玩家' },
      })).toMatchObject({ valid: false, code: 'INVALID_ROOM_ID' });
    });

    it('should reject non-string roomId', () => {
      expect(validateMessage({
        type: 'join_room',
        payload: { roomId: 1234, playerName: '玩家' },
      })).toMatchObject({ valid: false, code: 'INVALID_ROOM_ID' });
    });
  });

  describe('hero_select', () => {
    it('should accept valid hero_select', () => {
      expect(validateMessage({
        type: 'hero_select',
        payload: { heroId: 42 },
      })).toEqual({ valid: true });
    });

    it('should reject non-integer heroId', () => {
      expect(validateMessage({
        type: 'hero_select',
        payload: { heroId: 3.5 },
      })).toMatchObject({ valid: false, code: 'INVALID_HERO_ID' });
    });

    it('should reject negative heroId', () => {
      expect(validateMessage({
        type: 'hero_select',
        payload: { heroId: -1 },
      })).toMatchObject({ valid: false, code: 'INVALID_HERO_ID' });
    });
  });

  describe('player_input', () => {
    it('should accept valid input', () => {
      expect(validateMessage({
        type: 'player_input',
        payload: { input: '2' },
      })).toEqual({ valid: true });
    });

    it('should reject empty input', () => {
      expect(validateMessage({
        type: 'player_input',
        payload: { input: '' },
      })).toMatchObject({ valid: false, code: 'EMPTY_INPUT' });
    });

    it('should reject non-string input', () => {
      expect(validateMessage({
        type: 'player_input',
        payload: { input: 42 },
      })).toMatchObject({ valid: false, code: 'INVALID_INPUT' });
    });

    it('should reject input too long', () => {
      expect(validateMessage({
        type: 'player_input',
        payload: { input: 'x'.repeat(101) },
      })).toMatchObject({ valid: false, code: 'INPUT_TOO_LONG' });
    });

    it('should accept input at max length', () => {
      expect(validateMessage({
        type: 'player_input',
        payload: { input: 'x'.repeat(100) },
      })).toEqual({ valid: true });
    });
  });
});

describe('RateLimiter', () => {
  it('should not rate limit within threshold', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 20; i++) {
      expect(limiter.isRateLimited('conn1')).toBe(false);
    }
  });

  it('should rate limit after threshold', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 20; i++) {
      limiter.isRateLimited('conn1');
    }
    expect(limiter.isRateLimited('conn1')).toBe(true);
  });

  it('should track different connections separately', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 20; i++) {
      limiter.isRateLimited('conn1');
    }
    expect(limiter.isRateLimited('conn1')).toBe(true);
    expect(limiter.isRateLimited('conn2')).toBe(false);
  });

  it('should clean up on disconnect', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 20; i++) {
      limiter.isRateLimited('conn1');
    }
    expect(limiter.isRateLimited('conn1')).toBe(true);
    limiter.cleanup('conn1');
    expect(limiter.isRateLimited('conn1')).toBe(false);
  });

  it('should return correct count', () => {
    const limiter = new RateLimiter();
    expect(limiter.getCount('conn1')).toBe(0);
    limiter.isRateLimited('conn1');
    limiter.isRateLimited('conn1');
    expect(limiter.getCount('conn1')).toBe(2);
  });
});
