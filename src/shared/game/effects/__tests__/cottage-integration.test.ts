/**
 * Cottage Integration Tests - Verify all cottages can be registered
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../player';
import { Board } from '../../board';
import { LibGroup } from '../../lib-group';
import {
  CardEffectRegistry,
  OperationEffectRegistry,
  NpcEffectRegistry,
  RuneEffectRegistry,
  EveEffectRegistry,
} from '../registry';
import { TuxCottage } from '../tux-cottage';
import { OperationCottage } from '../operation-cottage';
import { SkillCottage } from '../skill-cottage';
import { NpcCottage } from '../npc-cottage';
import { RuneCottage } from '../rune-cottage';
import { EveCottage } from '../eve-cottage';

describe('Cottage Integration', () => {
  let board: Board;
  let messages: string[];
  let innerMessages: Array<{ msg: string; prior: number }>;
  let asyncInputResults: string[];

  beforeEach(() => {
    board = new Board();
    messages = [];
    innerMessages = [];
    asyncInputResults = [];

    const p1 = new Player('Alice', 1, 1);
    p1.isAlive = true;
    p1.isTared = true;
    p1.team = 1;
    const p2 = new Player('Bob', 2, 2);
    p2.isAlive = true;
    p2.isTared = true;
    p2.team = 2;
    board.garden.set(1, p1);
    board.garden.set(2, p2);
    board.rounder = p1;
  });

  const raiseGMessage = (msg: string) => messages.push(msg);
  const innerGMessage = (msg: string, prior: number) => innerMessages.push({ msg, prior });
  const asyncInput = (uid: number, format: string, code: string, arg: string) => {
    if (asyncInputResults.length > 0) return asyncInputResults.shift()!;
    return '/';
  };

  it('should register all TuxCottage effects', () => {
    const cottage = new TuxCottage(board, new LibGroup(), raiseGMessage, innerGMessage, asyncInput);
    const regs = cottage.registerAll();
    const registry = new CardEffectRegistry();
    registry.registerAll(regs);
    expect(registry.size).toBeGreaterThan(0);
    // Verify some key codes exist
    expect(registry.has('JP01')).toBe(true);
    expect(registry.has('JP06')).toBe(true);
    expect(registry.has('TP01')).toBe(true);
    expect(registry.has('TP02')).toBe(true);
    expect(registry.has('TP03')).toBe(true);
    expect(registry.has('ZP01')).toBe(true);
    expect(registry.has('FJ01')).toBe(true);
    expect(registry.has('WQ02')).toBe(true);
  });

  it('should register all OperationCottage effects', () => {
    const cottage = new OperationCottage(board, raiseGMessage, asyncInput);
    const regs = cottage.registerAll();
    const registry = new OperationEffectRegistry();
    registry.registerAll(regs);
    expect(registry.size).toBe(5);
    expect(registry.has('CZ01')).toBe(true);
    expect(registry.has('CZ02')).toBe(true);
    expect(registry.has('CZ03')).toBe(true);
    expect(registry.has('CZ04')).toBe(true);
    expect(registry.has('CZ05')).toBe(true);
  });

  it('should register all SkillCottage effects', () => {
    const cottage = new SkillCottage(board, new LibGroup(), raiseGMessage, innerGMessage, asyncInput);
    const regs = cottage.registerAll();
    const registry = new CardEffectRegistry();
    registry.registerAll(regs);
    expect(registry.size).toBeGreaterThan(0);
    // Verify hero skill codes exist
    expect(registry.has('JNH0101')).toBe(true);
    expect(registry.has('JNH0102')).toBe(true);
    expect(registry.has('JN10101')).toBe(true);
    expect(registry.has('JN10201')).toBe(true);
    expect(registry.has('JN10501')).toBe(true);
    expect(registry.has('JN20101')).toBe(true);
    expect(registry.has('JN20301')).toBe(true);
    expect(registry.has('JN20302')).toBe(true);
    expect(registry.has('JN20601')).toBe(true);
    expect(registry.has('JN20602')).toBe(true);
  });

  it('should register all NpcCottage effects', () => {
    const cottage = new NpcCottage(board, new LibGroup(), raiseGMessage, innerGMessage, asyncInput);
    const regs = cottage.registerAll();
    const registry = new NpcEffectRegistry();
    registry.registerAll(regs);
    expect(registry.size).toBeGreaterThan(0);
    expect(registry.has('NJ01')).toBe(true);
    expect(registry.has('NJ02')).toBe(true);
    expect(registry.has('NJ06')).toBe(true);
  });

  it('should register all RuneCottage effects', () => {
    const cottage = new RuneCottage(board, new LibGroup(), raiseGMessage, innerGMessage, asyncInput);
    const regs = cottage.registerAll();
    const registry = new RuneEffectRegistry();
    registry.registerAll(regs);
    expect(registry.size).toBe(7);
    expect(registry.has('SF01')).toBe(true);
    expect(registry.has('SF02')).toBe(true);
    expect(registry.has('SF03')).toBe(true);
    expect(registry.has('SF07')).toBe(true);
  });

  it('should register all EveCottage effects', () => {
    const cottage = new EveCottage(board, new LibGroup(), raiseGMessage, innerGMessage, asyncInput);
    const regs = cottage.registerAll();
    const registry = new EveEffectRegistry();
    registry.registerAll(regs);
    expect(registry.size).toBeGreaterThan(0);
    expect(registry.has('SJ101')).toBe(true);
    expect(registry.has('SJ102')).toBe(true);
    expect(registry.has('SJ201')).toBe(true);
    expect(registry.has('SJ301')).toBe(true);
  });

  it('should have non-overlapping codes across registries', () => {
    const tuxCottage = new TuxCottage(board, new LibGroup(), raiseGMessage, innerGMessage, asyncInput);
    const skillCottage = new SkillCottage(board, new LibGroup(), raiseGMessage, innerGMessage, asyncInput);

    const tuxRegs = tuxCottage.registerAll();
    const skillRegs = skillCottage.registerAll();

    const tuxCodes = new Set(tuxRegs.map(r => r.code));
    const skillCodes = new Set(skillRegs.map(r => r.code));

    // Check no overlap
    for (const code of tuxCodes) {
      expect(skillCodes.has(code)).toBe(false);
    }
  });
});
