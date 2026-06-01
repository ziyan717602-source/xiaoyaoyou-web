/**
 * Registry Tests - Verify effect registration and lookup
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CardEffectRegistry,
  OperationEffectRegistry,
  NpcEffectRegistry,
  RuneEffectRegistry,
  EveEffectRegistry,
} from '../registry';
import type { EffectRegistration, OpEffectRegistration } from '../types';
import { Player } from '../../player';

describe('CardEffectRegistry', () => {
  let registry: CardEffectRegistry;

  beforeEach(() => {
    registry = new CardEffectRegistry();
  });

  it('should register and retrieve an effect', () => {
    const reg: EffectRegistration = {
      code: 'JP06',
      action: () => {},
      valid: () => true,
    };
    registry.register(reg);
    expect(registry.has('JP06')).toBe(true);
    expect(registry.get('JP06')).toBe(reg);
  });

  it('should batch register effects', () => {
    const regs: EffectRegistration[] = [
      { code: 'JP01', action: () => {} },
      { code: 'JP02', action: () => {} },
      { code: 'JP03', action: () => {} },
    ];
    registry.registerAll(regs);
    expect(registry.size).toBe(3);
    expect(registry.has('JP01')).toBe(true);
    expect(registry.has('JP02')).toBe(true);
    expect(registry.has('JP03')).toBe(true);
  });

  it('should return undefined for non-existent code', () => {
    expect(registry.get('XXXX')).toBeUndefined();
    expect(registry.has('XXXX')).toBe(false);
  });

  it('should return all registered codes', () => {
    registry.register({ code: 'JP01' });
    registry.register({ code: 'TP01' });
    registry.register({ code: 'ZP01' });
    const codes = registry.getCodes();
    expect(codes).toContain('JP01');
    expect(codes).toContain('TP01');
    expect(codes).toContain('ZP01');
    expect(codes.length).toBe(3);
  });

  it('should clear all effects', () => {
    registry.register({ code: 'JP01' });
    registry.register({ code: 'TP01' });
    expect(registry.size).toBe(2);
    registry.clear();
    expect(registry.size).toBe(0);
    expect(registry.has('JP01')).toBe(false);
  });

  it('should overwrite existing effect on duplicate registration', () => {
    const reg1: EffectRegistration = { code: 'JP06', action: () => {} };
    const reg2: EffectRegistration = { code: 'JP06', valid: () => false };
    registry.register(reg1);
    registry.register(reg2);
    expect(registry.size).toBe(1);
    expect(registry.get('JP06')).toBe(reg2);
  });

  it('should call action delegate correctly', () => {
    let called = false;
    let receivedPlayer: Player | null = null;
    const reg: EffectRegistration = {
      code: 'JP06',
      action: (player, type, fuse, argst) => {
        called = true;
        receivedPlayer = player;
      },
    };
    registry.register(reg);
    const player = new Player('test', 1, 1);
    reg.action!(player, 0, 'G1EV,1', '');
    expect(called).toBe(true);
    expect(receivedPlayer).toBe(player);
  });

  it('should call valid delegate correctly', () => {
    const reg: EffectRegistration = {
      code: 'JP06',
      valid: (player, type, fuse) => {
        return player.uid === 1;
      },
    };
    registry.register(reg);
    const player = new Player('test', 1, 1);
    expect(reg.valid!(player, 0, '')).toBe(true);
    const other = new Player('other', 2, 2);
    expect(reg.valid!(other, 0, '')).toBe(false);
  });
});

describe('OperationEffectRegistry', () => {
  let registry: OperationEffectRegistry;

  beforeEach(() => {
    registry = new OperationEffectRegistry();
  });

  it('should register and retrieve operation effects', () => {
    const reg: OpEffectRegistration = {
      code: 'CZ02',
      action: () => {},
      valid: () => true,
    };
    registry.register(reg);
    expect(registry.has('CZ02')).toBe(true);
    expect(registry.get('CZ02')).toBe(reg);
  });

  it('should batch register operation effects', () => {
    const regs: OpEffectRegistration[] = [
      { code: 'CZ01' },
      { code: 'CZ02' },
      { code: 'CZ03' },
      { code: 'CZ04' },
      { code: 'CZ05' },
    ];
    registry.registerAll(regs);
    expect(registry.size).toBe(5);
  });
});

describe('NpcEffectRegistry', () => {
  let registry: NpcEffectRegistry;

  beforeEach(() => {
    registry = new NpcEffectRegistry();
  });

  it('should register NPC effects', () => {
    registry.register({ code: 'NJ01', action: () => {} });
    registry.register({ code: 'NJ02', action: () => {} });
    expect(registry.size).toBe(2);
    expect(registry.has('NJ01')).toBe(true);
  });
});

describe('RuneEffectRegistry', () => {
  let registry: RuneEffectRegistry;

  beforeEach(() => {
    registry = new RuneEffectRegistry();
  });

  it('should register rune effects', () => {
    registry.register({ code: 'SF01', action: () => {}, valid: () => true });
    expect(registry.size).toBe(1);
    expect(registry.has('SF01')).toBe(true);
  });
});

describe('EveEffectRegistry', () => {
  let registry: EveEffectRegistry;

  beforeEach(() => {
    registry = new EveEffectRegistry();
  });

  it('should register event effects', () => {
    registry.register({ code: 'SJ101', action: () => {} });
    expect(registry.size).toBe(1);
    expect(registry.has('SJ101')).toBe(true);
  });
});
