/**
 * Hero Selection Protocol Tests
 *
 * Tests the hero selection message types:
 * - hero_select_request (server -> client)
 * - hero_select_response (server -> client)
 * - hero_select (client -> server)
 */
import { describe, it, expect } from 'vitest';
import {
  createMessage,
  parseMessage,
  type ServerMessage,
} from '../protocol';

describe('Hero Selection Protocol', () => {
  describe('hero_select_request message', () => {
    it('should create a hero_select_request message', () => {
      const heroes = [
        { avatar: 101, name: 'Hero1', group: 1, hp: 8, str: 4, dex: 3, gender: 'M' },
        { avatar: 201, name: 'Hero2', group: 2, hp: 6, str: 3, dex: 5, gender: 'F' },
      ];
      const msg = createMessage<ServerMessage>('hero_select_request', {
        uid: 1,
        availableHeroes: heroes,
      });
      expect(msg.type).toBe('hero_select_request');
      const payload = msg.payload as { uid: number; availableHeroes: unknown[] };
      expect(payload.uid).toBe(1);
      expect(payload.availableHeroes).toHaveLength(2);
    });

    it('should parse a hero_select_request message', () => {
      const raw = JSON.stringify({
        type: 'hero_select_request',
        payload: {
          uid: 1,
          availableHeroes: [{ avatar: 101, name: 'H1', group: 1, hp: 8, str: 4, dex: 3, gender: 'M' }],
        },
      });
      const msg = parseMessage(raw);
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('hero_select_request');
    });
  });

  describe('hero_select_response message', () => {
    it('should create a hero_select_response message', () => {
      const msg = createMessage<ServerMessage>('hero_select_response', {
        uid: 1,
        heroId: 101,
        success: true,
      });
      expect(msg.type).toBe('hero_select_response');
      expect(msg.payload).toEqual({
        uid: 1,
        heroId: 101,
        success: true,
      });
    });

    it('should parse a hero_select_response message', () => {
      const raw = JSON.stringify({
        type: 'hero_select_response',
        payload: { uid: 2, heroId: 201, success: true },
      });
      const msg = parseMessage(raw);
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('hero_select_response');
    });
  });

  describe('hero_select client message', () => {
    it('should parse a hero_select message', () => {
      const raw = JSON.stringify({
        type: 'hero_select',
        payload: { heroId: 201 },
      });
      const msg = parseMessage(raw);
      expect(msg).not.toBeNull();
      expect(msg!.type).toBe('hero_select');
    });
  });
});
