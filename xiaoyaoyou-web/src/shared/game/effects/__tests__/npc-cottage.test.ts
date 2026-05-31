/**
 * NpcCottage Tests - Verify NPC action effects and debut delegates
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NpcCottage } from '../npc-cottage';
import { Player } from '../../player';
import { Board } from '../../board';
import { LibGroup } from '../../lib-group';
import { NpcLib } from '../../lib/npc-lib';
import type { NPC as NpcData } from '@shared/types/npc';

function makeNpcData(code: string): NpcData {
  return {
    Code: code,
    Group: 1,
    Genre: 0,
    Name: code,
    STRb: 2,
    Skills: [],
    Hero: 0,
    Gender: 'M',
    DebutText: '',
  };
}

function makeLibGroupWithNpcs(codes: string[]): LibGroup {
  const lg = new LibGroup();
  const npcs = codes.map(makeNpcData);
  (lg as unknown as { nl: NpcLib }).nl = new NpcLib(npcs);
  return lg;
}

function makePlayer(uid: number, team: number): Player {
  const p = new Player(`p${uid}`, uid * 1000, uid);
  p.team = team;
  p.isAlive = true;
  return p;
}

describe('NpcCottage', () => {
  let cottage: NpcCottage;
  let board: Board;
  let messages: string[];
  let innerMessages: Array<{ msg: string; prior: number }>;
  let asyncInputResults: string[];

  beforeEach(() => {
    board = new Board();
    messages = [];
    innerMessages = [];
    asyncInputResults = [];

    const libGroup = makeLibGroupWithNpcs(['NCT27', 'NJ01']);
    cottage = new NpcCottage(
      board,
      libGroup,
      (msg: string) => messages.push(msg),
      (msg: string, prior: number) => innerMessages.push({ msg, prior }),
      (_uid: number, _format: string, _code: string, _arg: string) => {
        if (asyncInputResults.length > 0) {
          return Promise.resolve(asyncInputResults.shift()!);
        }
        return Promise.resolve('/');
      },
    );

    const p1 = makePlayer(1, 1);
    const p2 = makePlayer(2, 2);
    board.garden.set(1, p1);
    board.garden.set(2, p2);
    board.rounder = p1;
  });

  describe('registerAll', () => {
    it('should register all NPC effects', () => {
      const effects = cottage.registerAll();
      expect(effects.length).toBeGreaterThanOrEqual(20);
      const codes = effects.map(e => e.code);
      expect(codes).toContain('NJ01');
      expect(codes).toContain('NJ09');
    });
  });

  describe('NJ02 - Heal 1 HP', () => {
    it('should cure target for 1', async () => {
      const effects = cottage.registerAll();
      const nj02 = effects.find(e => e.code === 'NJ02')!;
      const p1 = board.garden.get(1)!;
      p1.hp = 3;
      await nj02.action!(p1, '', '1');
      expect(messages.some(m => m.startsWith('G0IH,1,'))).toBe(true);
    });
  });

  describe('NJ05 - Target harm 1', () => {
    it('should harm target for 1', async () => {
      const effects = cottage.registerAll();
      const nj05 = effects.find(e => e.code === 'NJ05')!;
      const p1 = board.garden.get(1)!;
      await nj05.action!(p1, '', '2');
      expect(messages.some(m => m.startsWith('G0OH') && m.includes(',1,'))).toBe(true);
    });
  });

  describe('NJ08 - Discard target hand', () => {
    it('should be valid when players have cards', () => {
      const effects = cottage.registerAll();
      const nj08 = effects.find(e => e.code === 'NJ08')!;
      const p1 = board.garden.get(1)!;
      p1.tux.push(101);
      expect(nj08.valid!(p1, '')).toBe(true);
    });

    it('should not be valid when no players have cards', () => {
      const effects = cottage.registerAll();
      const nj08 = effects.find(e => e.code === 'NJ08')!;
      const p1 = board.garden.get(1)!;
      expect(nj08.valid!(p1, '')).toBe(false);
    });
  });

  describe('NJ09 - Put into escue', () => {
    it('should have escue action that discards and raises G0IP', async () => {
      const effects = cottage.registerAll();
      const nj09 = effects.find(e => e.code === 'NJ09')!;
      const p1 = board.garden.get(1)!;
      p1.escue.push(5001);
      await nj09.escueAction!(p1, 5001, 0, '', '1');
      expect(p1.escue).not.toContain(5001);
      expect(messages).toContain('G0IP,1,1');
    });
  });

  describe('NCT27 Debut - Replace self with NPC from discard', () => {
    it('should wire debut delegate onto Npc', () => {
      const lib = new NpcLib([makeNpcData('NCT27')]);
      cottage.registerNpcDelegates(lib);
      const npc = lib.first[0];
      expect(npc.debut).toBeDefined();
      expect(typeof npc.debut).toBe('function');
    });

    it('should do nothing if no NPC in discard', async () => {
      const lib = new NpcLib([makeNpcData('NCT27')]);
      cottage.registerNpcDelegates(lib);
      const npc = lib.first[0];
      const p1 = board.garden.get(1)!;
      await npc.debut(p1);
      // No messages because monDises is empty
      expect(messages.length).toBe(0);
    });

    it('should allow replacing if NPCs in discard', async () => {
      const lib = new NpcLib([makeNpcData('NCT27'), makeNpcData('NJ01')]);
      cottage.registerNpcDelegates(lib);
      const npc = lib.first[0];
      // Put the NPC serial codes from the lib into monDises
      const nj01Code = lib.encode('NJ01');
      board.monDises.push(nj01Code);
      asyncInputResults.push(String(nj01Code));
      const p1 = board.garden.get(1)!;
      await npc.debut(p1);
      expect(messages).toContain('G2CN,1,1');
      expect(board.monDises).toContain(nj01Code);
    });
  });

  describe('NCT32 Debut - Campaign RestZP', () => {
    it('should increment rounder restZP during campaign', () => {
      const lib = new NpcLib([makeNpcData('NCT32')]);
      cottage.registerNpcDelegates(lib);
      const npc = lib.first[0];
      const p1 = board.garden.get(1)!;
      board.inCampaign = true;
      p1.restZP = 0;
      npc.debut(p1);
      expect(p1.restZP).toBe(1);
    });

    it('should not increment if not in campaign', () => {
      const lib = new NpcLib([makeNpcData('NCT32')]);
      cottage.registerNpcDelegates(lib);
      const npc = lib.first[0];
      const p1 = board.garden.get(1)!;
      board.inCampaign = false;
      p1.restZP = 0;
      npc.debut(p1);
      expect(p1.restZP).toBe(0);
    });
  });

  describe('NCT33 Debut - Draw to 5', () => {
    it('should raise G0IB when rounder has < 5 cards', () => {
      const lib = new NpcLib([makeNpcData('NCT33')]);
      cottage.registerNpcDelegates(lib);
      const npc = lib.first[0];
      const p1 = board.garden.get(1)!;
      p1.tux.push(101, 102);
      npc.debut(p1);
      expect(messages).toContain('G0IB,0,3');
    });

    it('should not raise G0IB when rounder has >= 5 cards', () => {
      const lib = new NpcLib([makeNpcData('NCT33')]);
      cottage.registerNpcDelegates(lib);
      const npc = lib.first[0];
      const p1 = board.garden.get(1)!;
      p1.tux.push(101, 102, 103, 104, 105);
      npc.debut(p1);
      expect(messages.some(m => m.startsWith('G0IB'))).toBe(false);
    });
  });

  describe('NCT42 Debut - Draw by enemy max', () => {
    it('should raise G0IB based on max enemy hand', () => {
      const lib = new NpcLib([makeNpcData('NCT42')]);
      cottage.registerNpcDelegates(lib);
      const npc = lib.first[0];
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p2.tux.push(201, 202, 203, 204);
      npc.debut(p1);
      expect(messages).toContain('G0IB,0,3');
    });
  });

  describe('NCH05 Debut - Discard non-3', () => {
    it('should make all players with != 3 cards discard 1', () => {
      const lib = new NpcLib([makeNpcData('NCH05')]);
      cottage.registerNpcDelegates(lib);
      const npc = lib.first[0];
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p1.tux.push(101, 102, 103, 104); // 4 cards -> discard
      p2.tux.push(201, 202, 203);       // 3 cards -> no discard
      npc.debut(p1);
      expect(messages).toContain('G0DS,1,0,1');
      expect(messages.some(m => m === 'G0DS,2,0,1')).toBe(false);
    });
  });

  describe('NCH07 Debut - Add cards to monster pile', () => {
    it('should move cards from rest piles to monPiles', () => {
      const lib = new NpcLib([makeNpcData('NCH07')]);
      cottage.registerNpcDelegates(lib);
      const npc = lib.first[0];
      board.restNpcPiles.enqueue(6001);
      board.restNpcPiles.enqueue(6002);
      board.restMonPiles.enqueue(7001);
      board.restMonPiles.enqueue(7002);
      const initialCount = board.monPiles.count;
      npc.debut(board.rounder);
      expect(board.monPiles.count).toBe(initialCount + 4);
      expect(messages).toContain('G2CN,1,1');
    });
  });

  describe('NCH10 Debut - Burst weapon', () => {
    it('should wire debut delegate', () => {
      const lib = new NpcLib([makeNpcData('NCH10')]);
      cottage.registerNpcDelegates(lib);
      const npc = lib.first[0];
      expect(npc.debut).toBeDefined();
    });
  });
});
