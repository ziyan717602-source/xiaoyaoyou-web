/**
 * G-Message Handlers Tests
 *
 * Tests the default G0/G1 command handlers in GLoop.simpleGMessage.
 * The handlers are now built into GLoop, so these tests verify
 * that raiseGMessage correctly mutates game state.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../player';
import { Board } from '../../board';
import { EventBus } from '../event-bus';
import { GLoop } from '../g-loop';
import { SkillRegistry } from '../skill-registry';
import { LibGroup } from '../../lib-group';
import { TuxType } from '../../../types/enums';
import type { Tux as TuxData } from '../../../types/tux';

describe('G-Message Handlers', () => {
  let board: Board;
  let eventBus: EventBus;
  let skillRegistry: SkillRegistry;
  let gLoop: GLoop;
  let messages: string[];

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    skillRegistry = new SkillRegistry(eventBus);
    messages = [];

    // Create players
    for (let i = 1; i <= 2; i++) {
      const p = new Player(`Player${i}`, i, i);
      p.isAlive = true;
      p.isTared = true;
      p.team = i % 2 === 1 ? 1 : 2;
      p.hp = 10;
      p.hpBase = 10;
      p.mSTRb = 3;
      p.mDEXb = 2;
      board.garden.set(i, p);
    }

    gLoop = new GLoop(eventBus, board, skillRegistry);
    gLoop.setMessageHandler((msg) => messages.push(msg));
  });

  describe('G0OH - Damage', () => {
    it('should deal damage to a player', async () => {
      const p1 = board.garden.get(1)!;

      // G0OH,target,source,element,damage,mask
      await gLoop.raiseGMessage('G0OH,1,2,3,3,0');

      expect(p1.hp).toBe(7);
    });

    it('should not reduce HP below 0', async () => {
      const p1 = board.garden.get(1)!;
      p1.hp = 2;

      await gLoop.raiseGMessage('G0OH,1,2,3,5,0');

      expect(p1.hp).toBe(0);
    });

    it('should apply ALIVE_HARD mask (cap at HP-1)', async () => {
      const p1 = board.garden.get(1)!;
      p1.hp = 5;

      // Mask 1 = ALIVE_HARD: damage capped so HP stays >= 1
      await gLoop.raiseGMessage('G0OH,1,2,3,10,1');

      expect(p1.hp).toBe(1);
    });
  });

  describe('G0IH - Heal', () => {
    it('should heal a player', async () => {
      const p1 = board.garden.get(1)!;
      p1.hp = 5;

      // G0IH,target,source,element,heal,mask
      await gLoop.raiseGMessage('G0IH,1,2,3,3,0');

      expect(p1.hp).toBe(8);
    });

    it('should not exceed max HP', async () => {
      const p1 = board.garden.get(1)!;
      p1.hp = 9;

      await gLoop.raiseGMessage('G0IH,1,2,3,5,0');

      expect(p1.hp).toBe(10);
    });
  });

  describe('G0IT - Gain Cards', () => {
    it('should add cards to player hand', async () => {
      const p1 = board.garden.get(1)!;
      p1.tux.push(1, 2, 3);

      await gLoop.raiseGMessage('G0IT,1,4');

      expect(p1.tux).toContain(4);
      expect(p1.tux.length).toBe(4);
    });
  });

  describe('G0OT - Lose Cards', () => {
    it('should remove cards from player hand', async () => {
      const p1 = board.garden.get(1)!;
      p1.tux.push(1, 2, 3, 4);

      await gLoop.raiseGMessage('G0OT,1,2');

      expect(p1.tux).not.toContain(2);
      expect(p1.tux.length).toBe(3);
    });
  });

  describe('G0IA - Add Stat Bonus', () => {
    it('should add STR bonus', async () => {
      const p1 = board.garden.get(1)!;
      p1.mSTRb = 3;

      await gLoop.raiseGMessage('G0IA,1,0,2');

      expect(p1.mSTRb).toBe(5);
    });

    it('should add DEX bonus', async () => {
      const p1 = board.garden.get(1)!;
      p1.mDEXb = 2;

      await gLoop.raiseGMessage('G0IA,1,1,3');

      expect(p1.mDEXb).toBe(5);
    });
  });

  describe('G0OA - Remove Stat Bonus', () => {
    it('should remove STR bonus', async () => {
      const p1 = board.garden.get(1)!;
      p1.mSTRb = 5;

      await gLoop.raiseGMessage('G0OA,1,0,2');

      expect(p1.mSTRb).toBe(3);
    });
  });

  describe('G0ZH - Death Check', () => {
    it('should mark player as dead when HP is 0', async () => {
      const p1 = board.garden.get(1)!;
      p1.hp = 0;

      await gLoop.raiseGMessage('G0ZH,1');

      expect(p1.isAlive).toBe(false);
    });

    it('should not mark player as dead when HP > 0', async () => {
      const p1 = board.garden.get(1)!;
      p1.hp = 1;

      await gLoop.raiseGMessage('G0ZH,1');

      expect(p1.isAlive).toBe(true);
    });
  });

  describe('G0IP - Combat Power', () => {
    it('should increment rounder team pool', async () => {
      board.poolEnabled = true;
      board.rounder = board.garden.get(1)!;

      await gLoop.raiseGMessage('G0IP,1,3');

      expect(board.rPool).toBe(3);
    });

    it('should increment opponent team pool', async () => {
      board.poolEnabled = true;
      board.rounder = board.garden.get(1)!;

      await gLoop.raiseGMessage('G0IP,2,2');

      expect(board.oPool).toBe(2);
    });
  });

  describe('G0QZ - Discard', () => {
    it('should remove cards from hand and add to discard', async () => {
      const p1 = board.garden.get(1)!;
      p1.tux.push(10, 20, 30);

      await gLoop.raiseGMessage('G0QZ,1,20');

      expect(p1.tux).not.toContain(20);
      expect(p1.tux.length).toBe(2);
      expect(board.tuxDises).toContain(20);
    });
  });

  describe('Message Broadcasting', () => {
    it('should broadcast messages via handler', async () => {
      await gLoop.raiseGMessage('G0OH,1,2,3,3,0');

      expect(messages).toContain('G0OH,1,2,3,3,0');
    });
  });

  describe('G0DH - Draw/Discard', () => {
    it('should draw cards from tuxPiles', async () => {
      const p1 = board.garden.get(1)!;
      board.tuxPiles.enqueue(100);
      board.tuxPiles.enqueue(101);
      board.tuxPiles.enqueue(102);

      await gLoop.raiseGMessage('G0DH,1,0,2');

      expect(p1.tux).toContain(100);
      expect(p1.tux).toContain(101);
      expect(p1.tux).not.toContain(102);
      expect(board.tuxPiles.count).toBe(1);
    });

    it('should discard first n cards from hand', async () => {
      const p1 = board.garden.get(1)!;
      p1.tux.push(10, 20, 30);

      await gLoop.raiseGMessage('G0DH,1,1,2');

      expect(p1.tux).toEqual([30]);
      expect(board.tuxDises).toContain(10);
      expect(board.tuxDises).toContain(20);
    });

    it('should discard all cards', async () => {
      const p1 = board.garden.get(1)!;
      p1.tux.push(10, 20, 30);

      await gLoop.raiseGMessage('G0DH,1,3,0');

      expect(p1.tux.length).toBe(0);
    });
  });

  describe('G0ZW - Nineteen/Kill', () => {
    it('should kill player and clear hand', async () => {
      const p1 = board.garden.get(1)!;
      p1.tux.push(10, 20);

      await gLoop.raiseGMessage('G0ZW,1');

      expect(p1.isAlive).toBe(false);
      expect(p1.hp).toBe(0);
      expect(p1.nineteen).toBe(true);
      expect(p1.tux.length).toBe(0);
    });
  });

  describe('G0CC - Card Use', () => {
    it('should move cards to pendingTux', async () => {
      const p1 = board.garden.get(1)!;
      p1.tux.push(17, 36);

      await gLoop.raiseGMessage('G0CC,1,1,TP02,17,36');

      expect(p1.tux).not.toContain(17);
      expect(p1.tux).not.toContain(36);
      expect(board.pendingTux.count).toBe(2);
    });
  });

  describe('G1TH - Harm', () => {
    it('should apply harm to player', async () => {
      const p1 = board.garden.get(1)!;
      p1.hp = 10;

      await gLoop.raiseGMessage('G1TH,1,4');

      expect(p1.hp).toBe(6);
      expect(p1.isAlive).toBe(true);
    });

    it('should kill player when harm exceeds HP', async () => {
      const p1 = board.garden.get(1)!;
      p1.hp = 3;

      await gLoop.raiseGMessage('G1TH,1,5');

      expect(p1.hp).toBe(0);
      expect(p1.isAlive).toBe(false);
    });
  });

  describe('G1IU - Insert PZone', () => {
    it('should add cards to PZone', async () => {
      await gLoop.raiseGMessage('G1IU,50,51,52');

      expect(board.pZone).toContain(50);
      expect(board.pZone).toContain(51);
      expect(board.pZone).toContain(52);
    });
  });

  describe('G0ZB - Equip Standard', () => {
    let libGroup: LibGroup;

    beforeEach(() => {
      // Create libGroup with test tux data
      libGroup = new LibGroup();
      const tuxData: TuxData[] = [
        { Name: 'TestWeapon', Code: 'WQ01', Type: TuxType.WQ, Genre: 0, Package: [], Range: [1001, 1005], Occurs: [], Description: '', Special: {} },
        { Name: 'TestArmor', Code: 'FJ01', Type: TuxType.FJ, Genre: 0, Package: [], Range: [2001, 2005], Occurs: [], Description: '', Special: {} },
        { Name: 'TestTrove', Code: 'XB01', Type: TuxType.XB, Genre: 0, Package: [], Range: [3001, 3005], Occurs: [], Description: '', Special: {} },
      ];
      libGroup.init({ tuxData, heroData: [], monsterData: [], npcData: [], eveData: [], exspData: [], skillData: [], opsData: [], njData: [], runeData: [] });

      // Re-create gLoop with libGroup
      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));
    });

    it('should equip a weapon to empty slot', async () => {
      const p1 = board.garden.get(1)!;
      p1.weapon = 0;
      p1.tux.push(1001); // weapon card ID

      await gLoop.raiseGMessage('G0ZB,0,1,0,0,0,1001');

      expect(p1.weapon).toBe(1001);
      expect(messages.some(m => m.startsWith('E0ZB,1,'))).toBe(true);
    });

    it('should equip armor to empty slot', async () => {
      const p1 = board.garden.get(1)!;
      p1.armor = 0;

      await gLoop.raiseGMessage('G0ZB,0,1,0,0,0,2001');

      expect(p1.armor).toBe(2001);
    });

    it('should discard equipment when slot is full', async () => {
      const p1 = board.garden.get(1)!;
      p1.weapon = 999; // already equipped

      await gLoop.raiseGMessage('G0ZB,0,1,0,0,0,1001');

      // Weapon slot was full, card should be discarded (not equipped)
      expect(p1.weapon).toBe(999);
    });

    it('should not equip non-equipment cards', async () => {
      const p1 = board.garden.get(1)!;
      p1.weapon = 0;

      // Card ID 1 is not in our lib, so decodeTux returns null
      await gLoop.raiseGMessage('G0ZB,0,1,0,0,0,1');

      expect(p1.weapon).toBe(0);
    });

    it('should equip to exEquip when primary slots are full', async () => {
      const p1 = board.garden.get(1)!;
      p1.weapon = 999;
      p1.exEquip = 0;

      await gLoop.raiseGMessage('G0ZB,0,1,0,0,0,1001');

      expect(p1.exEquip).toBe(1001);
    });
  });

  describe('G0ZJ - Equipment Slot Variation', () => {
    it('should increase weapon slot capacity via exMask', async () => {
      const p1 = board.garden.get(1)!;
      p1.exMask = 0;
      p1.fyMask = 0;

      await gLoop.raiseGMessage('G0ZJ,1,0,1');

      expect(p1.exMask & 0x1).toBeTruthy();
    });

    it('should clear fyMask when increasing a forced-disabled slot', async () => {
      const p1 = board.garden.get(1)!;
      p1.fyMask = 0x1; // weapon forced disabled
      p1.exMask = 0;

      await gLoop.raiseGMessage('G0ZJ,1,0,1');

      expect(p1.fyMask & 0x1).toBe(0);
    });

    it('should decrease weapon slot (remove exMask)', async () => {
      const p1 = board.garden.get(1)!;
      p1.exMask = 0x1; // had extra weapon slot
      p1.weapon = 0;
      p1.exEquip = 0;

      await gLoop.raiseGMessage('G0ZJ,1,0,0');

      expect(p1.exMask & 0x1).toBe(0);
    });

    it('should add fyMask when decreasing a non-extra slot', async () => {
      const p1 = board.garden.get(1)!;
      p1.exMask = 0;
      p1.fyMask = 0;

      await gLoop.raiseGMessage('G0ZJ,1,0,0');

      expect(p1.fyMask & 0x1).toBeTruthy();
    });

    it('should handle armor slot variation', async () => {
      const p1 = board.garden.get(1)!;
      p1.exMask = 0;

      await gLoop.raiseGMessage('G0ZJ,1,1,1');

      expect(p1.exMask & 0x2).toBeTruthy();
    });
  });
});
