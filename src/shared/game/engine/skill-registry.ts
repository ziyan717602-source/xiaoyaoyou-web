/**
 * SkillRegistry - Maps G-Loop events to registered skill handlers
 * Translation of C# PSDGamepkg.XI sk02 dictionary
 *
 * In the original C#, sk02 is a Dictionary<string, List<SkTriple>> mapping
 * event strings (like "G0OH") to lists of SkTriple entries sorted by priority.
 * This TS version uses EventBus for dispatch and SkillRegistry for registration.
 */

import type { Skill, Bless } from '../skill';
import type { Tux } from '../card/tux';
import { TuxType } from '@shared/types/enums';
import type { TuxEquip } from '../card/tux-equip';
import type { Monster } from '../card/monster';
import type { Npc } from '../card/npc';
import type { Evenement } from '../card/evenement';
import type { Operation } from '../operation';
import type { Rune } from '../card/rune';
import type { NCAction } from '../nc-action';
import type { LibGroup } from '../lib-group';
import { EventBus, type EventHandler } from './event-bus';

/** SKTType enum - matching C# internal enum */
export enum SKTType {
  SK = 'SK',   // Skill
  BK = 'BK',   // Bless
  TX = 'TX',   // Tux
  EQ = 'EQ',   // Equipment
  CZ = 'CZ',   // Operation (czz)
  NJ = 'NJ',   // NC Action
  PT = 'PT',   // Monster (pet)
  EV = 'EV',   // Evenement
  SF = 'SF',   // Rune
  YJ = 'YJ',   // NC Action branch
}

/**
 * SkTriple - Registration entry matching C# SkTriple class.
 * Each entry represents one skill/effect registered for a specific event type.
 */
export interface SkTriple {
  name: string;         // Code name (e.g. "JP06", "SK01")
  priorty: number;      // Execution priority (higher = later)
  owner: number;        // 0 = public (tux/skill), otherwise player UID
  inType: number;       // Index into occurs array
  type: SKTType;        // Source type
  consume: number;      // Consume type (0=sustain, 1=once, 2=background)
  lock: boolean | null; // Lock flag (true=locked, null=cannot remove, false=normal)
  isOnce: boolean;      // One-time trigger
  occur: string;        // Full occur pattern
  linkFrom: string;     // Parasitism link
  isTermini: boolean;   // Whether this terminates the event chain
}

/**
 * SKE - Skill Triple Element with trigger info.
 * Extended version of SkTriple with runtime state.
 */
export interface SKE {
  name: string;
  priorty: number;
  owner: number;
  inType: number;
  type: SKTType;
  consume: number;
  lock: boolean | null;
  isOnce: boolean;
  linkFrom: string;
  isTermini: boolean;
  fuse: string;
  tick: number;
  tg: number;
}

/**
 * RegisteredHandler - wraps a handler with its registration metadata.
 */
export interface RegisteredHandler {
  handler: EventHandler;
  skt: SkTriple;
  source: string;
  sourceType: 'skill' | 'tux' | 'monster' | 'npc' | 'evenement' | 'operation' | 'rune' | 'ncAction';
  sourceCode: string;
}

/**
 * SkillRegistry - manages all skill/effect registrations for the G-Loop.
 * Builds the sk02 mapping from LibGroup data and provides lookup for event dispatch.
 */
export class SkillRegistry {
  private eventBus: EventBus;
  private registeredHandlers = new Map<string, RegisteredHandler[]>();

  /** The sk02 dictionary: event key -> sorted list of SkTriple */
  readonly sk02 = new Map<string, SkTriple[]>();

  /** The sk03 dictionary: parasitism link lists */
  readonly sk03 = new Map<string, string[]>();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Register from a Tux object.
   * Maps tux occurs to SkTriples and registers handlers on the EventBus.
   */
  registerTux(tux: Tux, handler: EventHandler): void {
    const code = tux.code;
    for (let i = 0; i < tux.occurs.length; i++) {
      const oc = tux.occurs[i];
      if (oc === '' || oc === undefined) continue;

      const skt: SkTriple = {
        name: code,
        priorty: tux.priorities[i] ?? 0,
        owner: 0,
        inType: i,
        type: SKTType.TX,
        consume: 0,
        lock: false,
        isOnce: tux.type === TuxType.ZP, // ZP type = once
        occur: oc,
        linkFrom: '',
        isTermini: tux.isTermini[i] ?? false,
      };

      this.addToSk02(oc, skt);
      this.eventBus.on(oc, handler, skt.priorty, `tux:${code}`);

      this.addRegisteredHandler(oc, handler, skt, 'tux', code);
    }

    // Also register equipment consume branches
    if (tux.isTuxEquip()) {
      const tue = tux as TuxEquip;
      if (tue.csOccur) {
        for (let i = 0; i < tue.csOccur.length; i++) {
          if (!tue.csOccur[i]) continue;
          for (let j = 0; j < tue.csOccur[i].length; j++) {
            const oc = tue.csOccur[i][j];
            if (!oc || oc === '') continue;

            const skt: SkTriple = {
              name: code,
              priorty: tue.csPriorities?.[i]?.[j] ?? 0,
              owner: 0,
              inType: j,
              type: SKTType.EQ,
              consume: i,
              lock: tue.csLock?.[i]?.[j] ?? false,
              isOnce: tue.csOnce?.[i]?.[j] ?? false,
              occur: oc,
              linkFrom: '',
              isTermini: tue.csIsTermini?.[i]?.[j] ?? false,
            };

            this.addToSk02(oc, skt);
            this.eventBus.on(oc, handler, skt.priorty, `tux:${code}:cs${i}`);
            this.addRegisteredHandler(oc, handler, skt, 'tux', code);
          }
        }
      }
    }
  }

  /**
   * Register from a Monster object.
   */
  registerMonster(monster: Monster, handler: EventHandler): void {
    const code = monster.code;
    if (!monster.eaOccurs) return;

    for (let i = 0; i < monster.eaOccurs.length; i++) {
      if (!monster.eaOccurs[i]) continue;
      for (let j = 0; j < monster.eaOccurs[i].length; j++) {
        const oc = monster.eaOccurs[i][j];
        if (!oc || oc === '') continue;

        const skt: SkTriple = {
          name: code,
          priorty: monster.eaProperties?.[i]?.[j] ?? 0,
          owner: 0,
          inType: j,
          type: SKTType.PT,
          consume: i,
          lock: monster.eaLocks?.[i]?.[j] ?? false,
          isOnce: i === 1 || (monster.eaOnces?.[i]?.[j] ?? false),
          occur: oc,
          linkFrom: '',
          isTermini: monster.eaIsTermini?.[i]?.[j] ?? false,
        };

        this.addToSk02(oc, skt);
        this.eventBus.on(oc, handler, skt.priorty, `monster:${code}`);
        this.addRegisteredHandler(oc, handler, skt, 'monster', code);
      }
    }
  }

  /**
   * Register from an NPC object.
   */
  registerNPC(npc: Npc, handler: EventHandler): void {
    const code = npc.code;
    // NPC skills are registered through NCAction branches
    // For NPC debut effects, they are triggered directly
    for (let i = 0; i < npc.skills.length; i++) {
      const skillCode = npc.skills[i];
      // NPC skills register with a generic handler
      const skt: SkTriple = {
        name: code,
        priorty: 100,
        owner: 0,
        inType: i,
        type: SKTType.NJ,
        consume: 0,
        lock: false,
        isOnce: true,
        occur: '',
        linkFrom: '',
        isTermini: false,
      };
      this.addRegisteredHandler('', handler, skt, 'npc', code);
    }
  }

  /**
   * Register from an NCAction object (NPC action branches).
   */
  registerNCAction(nca: NCAction, handler: EventHandler): void {
    const code = nca.code;
    for (let i = 0; i < nca.branches.length; i++) {
      const skb = nca.branches[i];
      if (!skb || !skb.occur) continue;

      const skt: SkTriple = {
        name: code,
        priorty: skb.priority,
        owner: 0,
        inType: i,
        type: SKTType.YJ,
        consume: 0,
        lock: skb.lock,
        isOnce: skb.once,
        occur: skb.occur,
        linkFrom: '',
        isTermini: skb.demiurgic,
      };

      this.addToSk02(skb.occur, skt);
      this.eventBus.on(skb.occur, handler, skb.priority, `ncAction:${code}`);
      this.addRegisteredHandler(skb.occur, handler, skt, 'ncAction', code);
    }
  }

  /**
   * Register from an Evenement object.
   */
  registerEvenement(eve: Evenement, handler: EventHandler): void {
    const code = eve.code;
    for (let i = 0; i < eve.occurs.length; i++) {
      const oc = eve.occurs[i];
      if (!oc || oc === '') continue;

      const skt: SkTriple = {
        name: code,
        priorty: eve.priorties[i] ?? 0,
        owner: 0,
        inType: i,
        type: SKTType.EV,
        consume: 0,
        lock: eve.lock[i] ?? false,
        isOnce: eve.isOnce[i] ?? false,
        occur: oc,
        linkFrom: '',
        isTermini: eve.isTermini[i] ?? false,
      };

      this.addToSk02(oc, skt);
      this.eventBus.on(oc, handler, skt.priorty, `evenement:${code}`);
      this.addRegisteredHandler(oc, handler, skt, 'evenement', code);
    }
  }

  /**
   * Register from an Operation object.
   */
  registerOperation(op: Operation, handler: EventHandler): void {
    const code = op.code;
    const oc = op.occur;
    if (!oc || oc === '') return;

    const skt: SkTriple = {
      name: code,
      priorty: 0,
      owner: 0,
      inType: 0,
      type: SKTType.CZ,
      consume: 0,
      lock: false,
      isOnce: op.isOnce,
      occur: oc,
      linkFrom: '',
      isTermini: false,
    };

    this.addToSk02(oc, skt);
    this.eventBus.on(oc, handler, 0, `operation:${code}`);
    this.addRegisteredHandler(oc, handler, skt, 'operation', code);
  }

  /**
   * Register from a Rune object.
   */
  registerRune(rune: Rune, handler: EventHandler): void {
    const code = rune.code;
    const oc = rune.occur;
    if (!oc || oc === '') return;

    const skt: SkTriple = {
      name: code,
      priorty: rune.priority,
      owner: 0,
      inType: 0,
      type: SKTType.SF,
      consume: rune.isConsume ? 1 : 0,
      lock: rune.isLock,
      isOnce: rune.isOnce,
      occur: oc,
      linkFrom: '',
      isTermini: rune.isTermin,
    };

    this.addToSk02(oc, skt);
    this.eventBus.on(oc, handler, rune.priority, `rune:${code}`);
    this.addRegisteredHandler(oc, handler, skt, 'rune', code);
  }

  /**
   * Register a Skill/Bless object.
   */
  registerSkill(skill: Skill | Bless, handler: EventHandler): void {
    const code = skill.code;
    for (let i = 0; i < skill.occurs.length; i++) {
      const oc = skill.occurs[i];
      if (!oc || oc === '') continue;

      const skt: SkTriple = {
        name: code,
        priorty: skill.priorities[i] ?? 0,
        owner: 0,
        inType: i,
        type: skill.isBK ? SKTType.BK : SKTType.SK,
        consume: 0,
        lock: skill.lock[i],
        isOnce: skill.isOnce[i],
        occur: oc,
        linkFrom: '',
        isTermini: skill.isTermini[i] ?? false,
      };

      this.addToSk02(oc, skt);
      this.eventBus.on(oc, handler, skt.priorty, `skill:${code}`);
      this.addRegisteredHandler(oc, handler, skt, 'skill', code);
    }
  }

  /**
   * Build the complete skill registry from a LibGroup.
   * This is the MappingSksp equivalent.
   */
  buildFromLibGroup(libGroup: LibGroup, levelCode: number): void {
    // Register all Tux
    for (const tux of libGroup.tl.listAllTuxs(levelCode)) {
      if (tux.action) {
        this.registerTux(tux, tux.action as EventHandler);
      }
    }

    // Register all Monsters
    for (const monster of libGroup.ml.listAllMonster(levelCode)) {
      // Monster effects registered through consumeAction etc.
      // For now, register with a generic handler
    }

    // Register all NPCs (through NCAction)
    for (const nca of libGroup.nl2.firsts) {
      this.registerNCAction(nca, nca.action as EventHandler);
    }

    // Register all Evenements
    for (const eve of libGroup.el.listAllEves(levelCode)) {
      if (eve.action) {
        this.registerEvenement(eve, eve.action as EventHandler);
      }
    }

    // Register all Skills/Blesses
    for (const skill of libGroup.sl.firsts) {
      if (skill.action) {
        this.registerSkill(skill, skill.action as EventHandler);
      }
    }

    // Register all Operations
    for (const op of libGroup.zl.firsts) {
      if (op.action) {
        this.registerOperation(op, op.action as EventHandler);
      }
    }

    // Register all Runes
    for (const rune of libGroup.rl.firsts) {
      if (rune.action) {
        this.registerRune(rune, rune.action as EventHandler);
      }
    }

    // Register basic SKTs (the G0/G1/G2 event type registrations)
    this.registerBasicSKTs();
  }

  /**
   * Register basic SKTs for all G-message event types.
   * These are the default priority-100 handlers for each event type.
   */
  registerBasicSKTs(): void {
    const g0Events = [
      'IT', 'OT', 'HQ', 'QZ', 'DH', 'IH', 'OH', 'ZH', 'LV', 'LU', 'ZW', 'IY',
      'OY', 'DS', 'CC', 'CD', 'CE', 'XZ', 'ZB', 'ZC', 'ZI', 'ZS', 'ZL', 'IA', 'OA', 'IX',
      'OX', 'AX', 'IB', 'OB', 'IW', 'OW', 'WB', '9P', 'IP', 'OP', 'CZ', 'HC', 'HD', 'HH',
      'HI', 'HL', 'IC', 'OC', 'HT', 'HG', 'QR', 'HZ', 'TT', 'T7', 'JM', 'WN', 'IJ', 'OJ',
      'IE', 'OE', 'IS', 'OS', 'LA', 'IV', 'OV', 'HR', 'FI', 'ON', 'SN', 'MA', 'ZJ', 'IF',
      'OF', 'PQ', 'YM', 'YB',
    ];
    const g1Events = [
      'CH', 'DI', 'IU', 'OU', 'TH', 'CW', 'ZK', 'IZ', 'OZ', 'WP', 'SG', 'HK',
      'WJ', 'XR', 'EV', 'CK', '7F', 'YP', 'GE', 'LY', 'UE',
    ];
    const g2Events = [
      'IN', 'RN', 'CN', 'QC', 'FU', 'QU', 'CL', 'WK', 'AK', 'IL', 'OL', 'SW',
      'AS', 'SY', 'UL', 'ZZ', 'YZ',
    ];

    for (const evt of g0Events) {
      this.registerBasicSKT('G0' + evt, 100);
    }
    for (const evt of g1Events) {
      this.registerBasicSKT('G1' + evt, 100);
    }
    for (const evt of g2Events) {
      this.registerBasicSKT('G2' + evt, 100);
    }

    // Special priority registrations
    this.registerBasicSKT('G1TH', 200);
    this.registerBasicSKT('G0ZH', 200);
    this.registerBasicSKT('G0ZW', 0);
    this.registerBasicSKT('G0ZW', 200);
    this.registerBasicSKT('G0ZW', 300);
    this.registerBasicSKT('G0ZW', 400);
    this.registerBasicSKT('G0OY', 200);
    this.registerBasicSKT('G0OY', 300);
    this.registerBasicSKT('G0CC', 200);
    this.registerBasicSKT('G0CC', 300);
    this.registerBasicSKT('G0CC', 400);
    this.registerBasicSKT('G0HZ', 200);
    this.registerBasicSKT('G0HZ', 300);
    this.registerBasicSKT('G0YM', 200);
    this.registerBasicSKT('G1EV', 200);
    this.registerBasicSKT('G1WJ', 200);
  }

  /**
   * Register a basic SKT (default handler for event types).
   * These correspond to RegisterBasicSKTs in C# XI.cs.
   */
  private registerBasicSKT(name: string, priorty: number): void {
    const skt: SkTriple = {
      name: `~${priorty}`,
      priorty,
      owner: 0,
      inType: 0,
      type: SKTType.SK,
      consume: 0,
      lock: false,
      isOnce: false,
      occur: name,
      linkFrom: '',
      isTermini: false,
    };
    this.addToSk02(name, skt);
  }

  /**
   * Find handlers for a given message type and team.
   * Returns sorted list of SKE entries.
   */
  findHandlers(eventKey: string): SkTriple[] {
    const list = this.sk02.get(eventKey);
    if (!list) return [];
    // Already sorted by priority during insertion
    return [...list];
  }

  /**
   * Parse SkTriples into SKE entries for a given event key.
   */
  parseToSKEs(eventKey: string): SKE[] {
    const triples = this.findHandlers(eventKey);
    return triples.map(skt => ({
      name: skt.name,
      priorty: skt.priorty,
      owner: skt.owner,
      inType: skt.inType,
      type: skt.type,
      consume: skt.consume,
      lock: skt.lock,
      isOnce: skt.isOnce,
      linkFrom: skt.linkFrom,
      isTermini: skt.isTermini,
      fuse: '',
      tick: 0,
      tg: 0,
    }));
  }

  /**
   * Clear all registrations.
   */
  clear(): void {
    this.sk02.clear();
    this.sk03.clear();
    this.registeredHandlers.clear();
    this.eventBus.clear();
  }

  // --- Private helpers ---

  private addToSk02(occur: string, skt: SkTriple): void {
    const list = this.sk02.get(occur);
    if (list) {
      // Insert in priority order
      let inserted = false;
      for (let i = 0; i < list.length; i++) {
        if (skt.priorty < list[i].priorty) {
          list.splice(i, 0, skt);
          inserted = true;
          break;
        }
      }
      if (!inserted) list.push(skt);
    } else {
      this.sk02.set(occur, [skt]);
    }
  }

  private addRegisteredHandler(
    eventKey: string,
    handler: EventHandler,
    skt: SkTriple,
    sourceType: RegisteredHandler['sourceType'],
    sourceCode: string,
  ): void {
    const list = this.registeredHandlers.get(eventKey);
    const entry: RegisteredHandler = {
      handler,
      skt,
      source: `${sourceType}:${sourceCode}`,
      sourceType,
      sourceCode,
    };
    if (list) {
      list.push(entry);
    } else {
      this.registeredHandlers.set(eventKey, [entry]);
    }
  }
}
