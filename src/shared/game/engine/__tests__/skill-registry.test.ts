import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../event-bus';
import { SkillRegistry, SKTType } from '../skill-registry';
import { Skill } from '../../skill';
import { Tux } from '../../card/tux';
import { Evenement } from '../../card/evenement';
import { TuxType } from '@shared/types/enums';
import { Rune } from '../../card/rune';
import { Operation } from '../../operation';

function makeTux(code: string, occurs: string[], priorities: number[]): Tux {
  const tux = new Tux(code, code, 1, TuxType.ZP, 'test', {});
  tux.occurs = occurs;
  tux.priorities = priorities;
  tux.isTermini = new Array(occurs.length).fill(false);
  return tux;
}

function makeSkill(code: string, occurs: string[], priorities: number[]): Skill {
  return new Skill(
    code,
    code,
    occurs.join(','),
    priorities.join(','),
    new Array(occurs.length).fill('0').join(','),
    '',
    '',
    '',
  );
}

function makeEvenement(code: string, occurs: string[], priorities: number[]): Evenement {
  const eve = new Evenement(code, code, '', 1, 1, '', '', '');
  eve.occurs = occurs;
  eve.priorties = priorities;
  eve.isOnce = new Array(occurs.length).fill(false);
  eve.isTermini = new Array(occurs.length).fill(false);
  eve.lock = new Array(occurs.length).fill(false);
  return eve;
}

function makeRune(code: string, occur: string, priority: number): Rune {
  return new Rune(code, code, occur, priority, false, false, false, false, '');
}

function makeOperation(code: string, occur: string): Operation {
  return new Operation(code, code, occur, false);
}

describe('SkillRegistry', () => {
  let eventBus: EventBus;
  let registry: SkillRegistry;

  beforeEach(() => {
    eventBus = new EventBus();
    registry = new SkillRegistry(eventBus);
  });

  it('should construct', () => {
    expect(registry.sk02.size).toBe(0);
  });

  it('should register a Tux', () => {
    const tux = makeTux('JP06', ['G0OH'], [100]);
    const handler = vi.fn();
    registry.registerTux(tux, handler);

    expect(registry.sk02.has('G0OH')).toBe(true);
    const entries = registry.sk02.get('G0OH')!;
    expect(entries.length).toBe(1);
    expect(entries[0].name).toBe('JP06');
    expect(entries[0].type).toBe(SKTType.TX);
  });

  it('should register a Skill', () => {
    const skill = makeSkill('SK01', ['G1TH'], [150]);
    const handler = vi.fn();
    registry.registerSkill(skill, handler);

    expect(registry.sk02.has('G1TH')).toBe(true);
    const entries = registry.sk02.get('G1TH')!;
    expect(entries[0].name).toBe('SK01');
    expect(entries[0].priorty).toBe(150);
  });

  it('should register an Evenement', () => {
    const eve = makeEvenement('EV01', ['G0CC'], [200]);
    const handler = vi.fn();
    registry.registerEvenement(eve, handler);

    expect(registry.sk02.has('G0CC')).toBe(true);
    const entries = registry.sk02.get('G0CC')!;
    expect(entries[0].name).toBe('EV01');
  });

  it('should register a Rune', () => {
    const rune = makeRune('SF01', 'G0OH', 110);
    const handler = vi.fn();
    registry.registerRune(rune, handler);

    expect(registry.sk02.has('G0OH')).toBe(true);
    const entries = registry.sk02.get('G0OH')!;
    expect(entries[0].name).toBe('SF01');
  });

  it('should register an Operation', () => {
    const op = makeOperation('CZ01', 'G0OH');
    const handler = vi.fn();
    registry.registerOperation(op, handler);

    expect(registry.sk02.has('G0OH')).toBe(true);
    const entries = registry.sk02.get('G0OH')!;
    expect(entries[0].name).toBe('CZ01');
  });

  it('should sort entries by priority', () => {
    const tux1 = makeTux('JP01', ['G0OH'], [200]);
    const tux2 = makeTux('JP02', ['G0OH'], [100]);
    registry.registerTux(tux1, vi.fn());
    registry.registerTux(tux2, vi.fn());

    const entries = registry.sk02.get('G0OH')!;
    expect(entries[0].priorty).toBe(100);
    expect(entries[1].priorty).toBe(200);
  });

  it('should register basic SKTs', () => {
    registry.registerBasicSKTs();

    expect(registry.sk02.has('G0OH')).toBe(true);
    expect(registry.sk02.has('G1TH')).toBe(true);
    expect(registry.sk02.has('G2IN')).toBe(true);
  });

  it('should find handlers by event key', () => {
    const tux = makeTux('JP06', ['G0OH'], [100]);
    registry.registerTux(tux, vi.fn());

    const handlers = registry.findHandlers('G0OH');
    expect(handlers.length).toBe(1);
    expect(handlers[0].name).toBe('JP06');
  });

  it('should return empty for unknown event key', () => {
    const handlers = registry.findHandlers('G0XX');
    expect(handlers.length).toBe(0);
  });

  it('should parse to SKEs', () => {
    const tux = makeTux('JP06', ['G0OH'], [100]);
    registry.registerTux(tux, vi.fn());

    const skes = registry.parseToSKEs('G0OH');
    expect(skes.length).toBe(1);
    expect(skes[0].name).toBe('JP06');
    expect(skes[0].priorty).toBe(100);
  });

  it('should clear all registrations', () => {
    const tux = makeTux('JP06', ['G0OH'], [100]);
    registry.registerTux(tux, vi.fn());

    registry.clear();
    expect(registry.sk02.size).toBe(0);
  });

  it('should handle Tux with multiple occurs', () => {
    const tux = makeTux('JP06', ['G0OH', 'G1TH'], [100, 150]);
    registry.registerTux(tux, vi.fn());

    expect(registry.sk02.has('G0OH')).toBe(true);
    expect(registry.sk02.has('G1TH')).toBe(true);
  });
});
