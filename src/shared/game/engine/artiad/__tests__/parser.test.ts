import { describe, it, expect } from 'vitest';
import { Parser, ImperialZone } from '../parser';

describe('Parser', () => {
  it('should parse a command string', () => {
    const result = Parser.parse('G0OH,1,2,3,1');
    expect(result).toEqual({
      type: 'G0OH',
      sender: 1,
      receiver: 2,
      args: ['3', '1'],
      raw: 'G0OH,1,2,3,1',
    });
  });

  it('should parse to GMessage', () => {
    const msg = Parser.parseToMessage('G1TH,1,0,5,-3,1');
    expect(msg.type).toBe('G1TH');
    expect(msg.sender).toBe(1);
    expect(msg.receiver).toBe(0);
    expect(msg.args).toEqual(['5', '-3', '1']);
  });

  it('should validate correct format', () => {
    expect(Parser.validate('G0OH,1,2')).toBe(true);
    expect(Parser.validate('G1TH,1,0,5')).toBe(true);
    expect(Parser.validate('G2IN,1,1')).toBe(true);
  });

  it('should reject invalid format', () => {
    expect(Parser.validate('X0OH,1,2')).toBe(false);
    expect(Parser.validate('G')).toBe(false);
    expect(Parser.validate('G0OH')).toBe(false);
    expect(Parser.validate('')).toBe(false);
  });

  it('should extract args', () => {
    const args = Parser.extractArgs('G0OH,1,2,3,1');
    expect(args).toEqual(['3', '1']);
  });

  it('should extract type', () => {
    expect(Parser.extractType('G0OH,1,2,3')).toBe('G0OH');
  });

  it('should extract sender', () => {
    expect(Parser.extractSender('G0OH,5,2,3')).toBe(5);
  });

  it('should extract receiver', () => {
    expect(Parser.extractReceiver('G0OH,1,7,3')).toBe(7);
  });

  it('should parse harm entries', () => {
    const harms = Parser.parseHarm('G0OH,1,0,1,3,0,2,0,2,5,0');
    expect(harms.length).toBe(2);
    expect(harms[0]).toEqual({ who: 1, source: 0, element: 1, n: 3, mask: 0 });
    expect(harms[1]).toEqual({ who: 2, source: 0, element: 2, n: 5, mask: 0 });
  });

  it('should parse cure entries', () => {
    const cures = Parser.parseCure('G0IH,1,0,1,3,0');
    expect(cures.length).toBe(1);
    expect(cures[0]).toEqual({ who: 1, source: 0, element: 1, n: 3, mask: 0 });
  });

  it('should get team from type', () => {
    expect(Parser.getTeam('G0OH')).toBe(0);
    expect(Parser.getTeam('G1TH')).toBe(1);
    expect(Parser.getTeam('G2IN')).toBe(2);
  });

  it('should get event code', () => {
    expect(Parser.getEventCode('G0OH')).toBe('OH');
    expect(Parser.getEventCode('G1TH')).toBe('TH');
  });
});
