import { describe, it, expect } from 'vitest';
import {
  SimpleGMessage,
  InnerGMessage,
  SimpleGMessage100,
  parseGCommand,
  extractEventKey,
  getTeamFromType,
  GMessageType,
} from '../g-message';

describe('GMessage', () => {
  describe('SimpleGMessage', () => {
    it('should create a message', () => {
      const msg = new SimpleGMessage('G0OH', 1, 2, ['3', '1']);
      expect(msg.type).toBe('G0OH');
      expect(msg.sender).toBe(1);
      expect(msg.receiver).toBe(2);
      expect(msg.args).toEqual(['3', '1']);
      expect(msg.cancelled).toBe(false);
    });

    it('should serialize to string', () => {
      const msg = new SimpleGMessage('G0OH', 1, 2, ['3', '1']);
      expect(msg.toString()).toBe('G0OH,1,2,3,1');
    });

    it('should serialize with empty args', () => {
      const msg = new SimpleGMessage('G0OH', 1, 2, []);
      expect(msg.toString()).toBe('G0OH,1,2');
    });

    it('should deserialize from string', () => {
      const msg = SimpleGMessage.fromString('G1TH,1,0,5,-3,1');
      expect(msg.type).toBe('G1TH');
      expect(msg.sender).toBe(1);
      expect(msg.receiver).toBe(0);
      expect(msg.args).toEqual(['5', '-3', '1']);
    });

    it('should clone a message', () => {
      const original = new SimpleGMessage('G0OH', 1, 2, ['3', '1']);
      original.source = 'test';
      const cloned = original.clone();

      expect(cloned.type).toBe(original.type);
      expect(cloned.sender).toBe(original.sender);
      expect(cloned.receiver).toBe(original.receiver);
      expect(cloned.args).toEqual(original.args);
      expect(cloned.source).toBe('test');
      expect(cloned).not.toBe(original);
    });

    it('should preserve string protocol format', () => {
      const msg = SimpleGMessage.fromString('G0OH,1,2,3,1');
      expect(msg.toString()).toBe('G0OH,1,2,3,1');
    });
  });

  describe('InnerGMessage', () => {
    it('should create an inner message', () => {
      const msg = new InnerGMessage('G0OH', { value: 42 });
      expect(msg.type).toBe('G0OH');
      expect(msg.data).toEqual({ value: 42 });
    });

    it('should have empty toString', () => {
      const msg = new InnerGMessage('G0OH');
      expect(msg.toString()).toBe('');
    });

    it('should clone', () => {
      const original = new InnerGMessage('G0OH', { value: 42 });
      const cloned = original.clone();
      expect(cloned.data).toEqual({ value: 42 });
      expect(cloned).not.toBe(original);
    });
  });

  describe('SimpleGMessage100', () => {
    it('should create extended message', () => {
      const msg = new SimpleGMessage100('G0OH', 1, 2, ['3'], { extra: 'data' });
      expect(msg.extra).toEqual({ extra: 'data' });
    });

    it('should serialize and deserialize', () => {
      const msg = new SimpleGMessage100('G0OH', 1, 2, ['3', '4']);
      const str = msg.toString();
      const parsed = SimpleGMessage100.fromString(str);
      expect(parsed.type).toBe('G0OH');
      expect(parsed.args).toEqual(['3', '4']);
    });
  });

  describe('Utility functions', () => {
    it('should parse G command', () => {
      const result = parseGCommand('G0OH,1,2,3,1');
      expect(result).toEqual({
        type: 'G0OH',
        sender: 1,
        receiver: 2,
        args: ['3', '1'],
      });
    });

    it('should extract event key', () => {
      expect(extractEventKey('G0OH,1,2,3')).toBe('G0OH');
      expect(extractEventKey('G1TH')).toBe('G1TH');
    });

    it('should get team from type', () => {
      expect(getTeamFromType('G0OH')).toBe(0);
      expect(getTeamFromType('G1TH')).toBe(1);
      expect(getTeamFromType('G2IN')).toBe(2);
    });
  });
});
