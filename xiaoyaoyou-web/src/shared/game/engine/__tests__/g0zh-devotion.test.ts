/**
 * G0ZH Death Check with Devotion (倾慕) Tests
 *
 * Tests the full death check process:
 * 1. Devotion (P100): spouse saves dying player by losing 1 HP each
 * 2. Kill (P200): if still HP 0, raise G0ZW to kill
 * 3. Special spouse codes (!5=female, !6=male, etc.)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../../player';
import { Board } from '../../board';
import { EventBus } from '../event-bus';
import { GLoop } from '../g-loop';
import { SkillRegistry } from '../skill-registry';
import { LibGroup } from '../../lib-group';
import { Hero } from '../../card/hero';
import type { Tux } from '../../card/tux';
import { TuxEquip } from '../../card/tux-equip';
import { TuxType } from '@shared/types/enums';

function makeHero(avatar: number, name: string, spouses: string[] = [], bio = ''): Hero {
  const h = new Hero(name, avatar, 1, 0, 'M', 10, 3, 2, spouses, [], 0, 0, []);
  h.bio = bio;
  return h;
}

function makeLibGroup(heroes: Hero[], opts?: { monsterCode?: string; monsterId?: number; tuxCode?: string; tuxId?: number }): LibGroup {
  const lg = new LibGroup();
  // Inject heroes into the HeroLib's internal map
  const hl = (lg as { hl: { dicts: Map<number, Hero> } }).hl;
  for (const h of heroes) {
    hl.dicts.set(h.avatar, h);
  }
  // Inject monster if needed
  if (opts?.monsterCode && opts?.monsterId) {
    const ml = (lg as { ml: { dicts: Map<number, { code: string }> } }).ml;
    ml.dicts.set(opts.monsterId, { code: opts.monsterCode });
  }
  // Inject tux if needed (into firsts for encodeTuxCode, into dicts for decodeTux)
  if (opts?.tuxCode && opts?.tuxId) {
    const tl = (lg as { tl: { firsts: Tux[]; dicts: Map<number, Tux> } }).tl;
    const equip = new TuxEquip(opts.tuxCode, opts.tuxCode, 0, TuxType.WQ, '', {}, '');
    equip.singleEntry = opts.tuxId;
    tl.firsts.push(equip as unknown as Tux);
    tl.dicts.set(opts.tuxId, equip as unknown as Tux);
  }
  return lg;
}

describe('G0ZH - Death Check with Devotion', () => {
  let board: Board;
  let eventBus: EventBus;
  let skillRegistry: SkillRegistry;
  let gLoop: GLoop;
  let libGroup: LibGroup;
  let messages: string[];

  beforeEach(() => {
    board = new Board();
    eventBus = new EventBus();
    skillRegistry = new SkillRegistry(eventBus);
    messages = [];

    // Create 4 players: P1 & P3 = team 1, P2 & P4 = team 2
    for (let i = 1; i <= 4; i++) {
      const p = new Player(`Player${i}`, i * 1000, i);
      p.isAlive = true;
      p.isTared = true;
      p.team = i % 2 === 1 ? 1 : 2;
      p.hp = 10;
      p.hpBase = 10;
      p.selectHero = i * 1000;
      board.garden.set(i, p);
    }
    board.rounder = board.garden.get(1)!;

    // Default: no heroes with spouses
    libGroup = makeLibGroup([]);

    gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
    gLoop.setMessageHandler((msg) => messages.push(msg));
  });

  describe('Basic death check (no devotion)', () => {
    it('should kill player with HP 0 when no spouse exists', async () => {
      const p1 = board.garden.get(1)!;
      p1.hp = 0;

      await gLoop.raiseGMessage('G0ZH,0');

      expect(p1.isAlive).toBe(false);
      // Should have raised G0ZW
      expect(messages.some(m => m.startsWith('G0ZW,'))).toBe(true);
    });

    it('should not kill player with HP > 0', async () => {
      const p1 = board.garden.get(1)!;
      p1.hp = 1;

      await gLoop.raiseGMessage('G0ZH,0');

      expect(p1.isAlive).toBe(true);
      expect(messages.some(m => m.startsWith('G0ZW,'))).toBe(false);
    });

    it('should kill multiple dying players at once', async () => {
      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p1.hp = 0;
      p2.hp = 0;

      await gLoop.raiseGMessage('G0ZH,0');

      expect(p1.isAlive).toBe(false);
      expect(p2.isAlive).toBe(false);
    });
  });

  describe('Devotion - direct spouse', () => {
    it('should save dying player if spouse is on the board', async () => {
      // P1 has spouse = hero avatar 2000 (which is P2's selectHero)
      const hero1 = makeHero(1000, 'Hero1', ['2000']);
      libGroup = makeLibGroup([hero1]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p1.hp = 0;
      p2.hp = 10;

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 should be saved: gains 1 HP (from 1 spouse)
      expect(p1.hp).toBe(1);
      expect(p1.isAlive).toBe(true);
      // P2 (the spouse) should lose 1 HP
      expect(p2.hp).toBe(9);
      // Loved flag should be set
      expect(p1.loved).toBe(true);
      // No G0ZW should be raised (player saved)
      expect(messages.some(m => m.startsWith('G0ZW,'))).toBe(false);
    });

    it('should not save if spouse is dead', async () => {
      const hero1 = makeHero(1000, 'Hero1', ['2000']);
      libGroup = makeLibGroup([hero1]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p1.hp = 0;
      p2.hp = 0; // Spouse is also dead

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 should die - spouse is dead too
      expect(p1.isAlive).toBe(false);
    });

    it('should not save again if already loved', async () => {
      const hero1 = makeHero(1000, 'Hero1', ['2000']);
      libGroup = makeLibGroup([hero1]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p1.hp = 0;
      p1.loved = true; // Already loved
      p2.hp = 10;

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 should die - already used devotion
      expect(p1.isAlive).toBe(false);
      // P2 should not lose HP
      expect(p2.hp).toBe(10);
    });

    it('should save with multiple spouses (each loses 1 HP)', async () => {
      // P1 has spouses: hero 2000 (P2) and hero 4000 (P4)
      const hero1 = makeHero(1000, 'Hero1', ['2000', '4000']);
      libGroup = makeLibGroup([hero1]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      const p4 = board.garden.get(4)!;
      p1.hp = 0;
      p2.hp = 10;
      p4.hp = 10;

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 gains 2 HP (from 2 spouses)
      expect(p1.hp).toBe(2);
      expect(p1.isAlive).toBe(true);
      // Each spouse loses 1 HP
      expect(p2.hp).toBe(9);
      expect(p4.hp).toBe(9);
    });

    it('should not let spouse HP go below 0', async () => {
      const hero1 = makeHero(1000, 'Hero1', ['2000']);
      libGroup = makeLibGroup([hero1]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p1.hp = 0;
      p2.hp = 1; // Spouse only has 1 HP

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 saved with 1 HP, spouse at 0 HP
      expect(p1.hp).toBe(1);
      expect(p1.isAlive).toBe(true);
      expect(p2.hp).toBe(0);
    });

    it('should not exceed target max HP', async () => {
      // 3 spouses give +3, but hpBase is only 2 → cap at 2
      const hero1 = makeHero(1000, 'Hero1', ['2000', '3000', '4000']);
      libGroup = makeLibGroup([hero1]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      const p3 = board.garden.get(3)!;
      const p4 = board.garden.get(4)!;
      p1.hp = 0; // Dying
      p1.hpBase = 2; // Low max HP
      p2.hp = 10;
      p3.hp = 10;
      p4.hp = 10;

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 gains 3 from spouses but capped at hpBase=2
      expect(p1.hp).toBe(2);
      expect(p1.isAlive).toBe(true);
    });
  });

  describe('Devotion - ExSpouses', () => {
    it('should use ExSpouses in addition to hero Spouses', async () => {
      const hero1 = makeHero(1000, 'Hero1', []); // No built-in spouses
      libGroup = makeLibGroup([hero1]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p1.hp = 0;
      p1.exSpouses.push('2000'); // Dynamically added spouse
      p2.hp = 10;

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 should be saved via ExSpouse
      expect(p1.hp).toBe(1);
      expect(p1.isAlive).toBe(true);
      expect(p2.hp).toBe(9);
    });
  });

  describe('Devotion - special spouse codes', () => {
    it('should handle !5 (any female player) spouse', async () => {
      const hero1 = makeHero(1000, 'Hero1', ['!5']);
      libGroup = makeLibGroup([hero1]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      const p4 = board.garden.get(4)!;
      p1.hp = 0;
      p2.gender = 'F';
      p4.gender = 'F';
      p2.hp = 10;
      p4.hp = 10;

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 gains HP from all female players (2 females)
      expect(p1.hp).toBe(2);
      expect(p1.isAlive).toBe(true);
      expect(p2.hp).toBe(9);
      expect(p4.hp).toBe(9);
    });

    it('should handle !6 (any male player other than self)', async () => {
      const hero1 = makeHero(1000, 'Hero1', ['!6']);
      libGroup = makeLibGroup([hero1]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      const p3 = board.garden.get(3)!;
      const p4 = board.garden.get(4)!;
      p1.hp = 0;
      p1.gender = 'M';
      p2.gender = 'M';
      p3.gender = 'M';
      p4.gender = 'F'; // Only P2 and P3 are male
      p2.hp = 10;
      p3.hp = 10;

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 gains HP from male players excluding self (P2, P3)
      expect(p1.hp).toBe(2);
      expect(p1.isAlive).toBe(true);
    });

    it('should not include self in !6 spouse check', async () => {
      const hero1 = makeHero(1000, 'Hero1', ['!6']);
      libGroup = makeLibGroup([hero1]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      p1.hp = 0;
      p1.gender = 'M';
      // No other male players
      board.garden.get(2)!.gender = 'F';
      board.garden.get(3)!.gender = 'F';
      board.garden.get(4)!.gender = 'F';

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 should die - no other male players
      expect(p1.isAlive).toBe(false);
    });

    it('should handle !2 (水魔兽 GS04 on board) spouse', async () => {
      const hero1 = makeHero(1000, 'Hero1', ['!2']);
      // GS04 = monster ID 20400
      libGroup = makeLibGroup([hero1], { monsterCode: 'GS04', monsterId: 20400 });

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      p1.hp = 0;
      board.monster1 = 20400; // GS04 on board

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 saved: gains 1 HP from entity existence
      expect(p1.hp).toBe(1);
      expect(p1.isAlive).toBe(true);
      expect(p1.loved).toBe(true);
      // No player should lose HP
      expect(board.garden.get(2)!.hp).toBe(10);
    });

    it('should not trigger !2 when GS04 not present', async () => {
      const hero1 = makeHero(1000, 'Hero1', ['!2']);
      libGroup = makeLibGroup([hero1], { monsterCode: 'GS04', monsterId: 20400 });

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      p1.hp = 0;
      // No GS04 on board or anywhere

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 should die - GS04 not found
      expect(p1.isAlive).toBe(false);
    });

    it('should handle !2 with GS04 in player pets', async () => {
      const hero1 = makeHero(1000, 'Hero1', ['!2']);
      libGroup = makeLibGroup([hero1], { monsterCode: 'GS04', monsterId: 20400 });

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      p1.hp = 0;
      // GS04 in P2's pets (element slot 0)
      board.garden.get(2)!.pets[0] = 20400;

      await gLoop.raiseGMessage('G0ZH,0');

      expect(p1.hp).toBe(1);
      expect(p1.isAlive).toBe(true);
    });

    it('should handle !3 (Bio contains "A") spouse', async () => {
      const hero1 = makeHero(1000, 'Hero1', ['!3']);
      const hero2 = makeHero(2000, 'Hero2', [], 'A'); // Bio contains "A"
      const hero3 = makeHero(3000, 'Hero3', [], 'B'); // Bio does NOT contain "A"
      libGroup = makeLibGroup([hero1, hero2, hero3]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      p1.hp = 0;
      board.garden.get(2)!.hp = 10;
      board.garden.get(3)!.hp = 10;

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 saved by P2 (Bio "A"), P3 (Bio "B") doesn't match
      expect(p1.hp).toBe(1);
      expect(p1.isAlive).toBe(true);
      expect(board.garden.get(2)!.hp).toBe(9); // P2 loses 1 HP
      expect(board.garden.get(3)!.hp).toBe(10); // P3 unaffected
    });

    it('should handle !4 (Bio contains "B") spouse', async () => {
      const hero1 = makeHero(1000, 'Hero1', ['!4']);
      const hero2 = makeHero(2000, 'Hero2', [], 'BK'); // Bio contains "B"
      const hero3 = makeHero(3000, 'Hero3', [], 'A'); // Bio does NOT contain "B"
      libGroup = makeLibGroup([hero1, hero2, hero3]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      p1.hp = 0;

      await gLoop.raiseGMessage('G0ZH,0');

      expect(p1.hp).toBe(1);
      expect(p1.isAlive).toBe(true);
      expect(board.garden.get(2)!.hp).toBe(9); // P2 loses 1 HP
      expect(board.garden.get(3)!.hp).toBe(10); // P3 unaffected
    });

    it('should handle !7 (Bio contains "D") spouse', async () => {
      const hero1 = makeHero(1000, 'Hero1', ['!7']);
      const hero2 = makeHero(2000, 'Hero2', [], 'D'); // Bio contains "D"
      libGroup = makeLibGroup([hero1, hero2]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      p1.hp = 0;

      await gLoop.raiseGMessage('G0ZH,0');

      expect(p1.hp).toBe(1);
      expect(p1.isAlive).toBe(true);
      expect(board.garden.get(2)!.hp).toBe(9);
    });

    it('should handle !8 (魔剑 WQ04 equipped) spouse', async () => {
      const hero1 = makeHero(1000, 'Hero1', ['!8']);
      // WQ04 tux code, singleEntry = 50400 (the actual card ID)
      libGroup = makeLibGroup([hero1], { tuxCode: 'WQ04', tuxId: 50400 });

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      p1.hp = 0;
      // P2 has WQ04 equipped as weapon
      board.garden.get(2)!.weapon = 50400;

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 saved by weapon existence
      expect(p1.hp).toBe(1);
      expect(p1.isAlive).toBe(true);
      expect(p1.loved).toBe(true);
      // No player should lose HP
      expect(board.garden.get(2)!.hp).toBe(10);
    });

    it('should handle !9 (TR金翅凤凰 GFT2 on board) spouse', async () => {
      const hero1 = makeHero(1000, 'Hero1', ['!9']);
      libGroup = makeLibGroup([hero1], { monsterCode: 'GFT2', monsterId: 20600 });

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      p1.hp = 0;
      board.monster2 = 20600; // GFT2 on board

      await gLoop.raiseGMessage('G0ZH,0');

      expect(p1.hp).toBe(1);
      expect(p1.isAlive).toBe(true);
      expect(p1.loved).toBe(true);
    });

    it('should combine entity existence with player spouses', async () => {
      // P1 has both !2 (monster) and direct spouse 2000
      const hero1 = makeHero(1000, 'Hero1', ['!2', '2000']);
      libGroup = makeLibGroup([hero1], { monsterCode: 'GS04', monsterId: 20400 });

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p1.hp = 0;
      p2.hp = 10;
      board.monster1 = 20400; // GS04 on board

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 gains 1 from entity + 1 from spouse = 2 HP
      expect(p1.hp).toBe(2);
      expect(p1.isAlive).toBe(true);
      // P2 (spouse) loses 1 HP
      expect(p2.hp).toBe(9);
    });
  });

  describe('Chain reaction', () => {
    it('devotion HP loss is applied but chain reactions go through G-Loop', async () => {
      // P1 spouse = P2, P2 has no spouse
      // P1 dies → P2 saves (P2 HP 1→0) → P2 now dying but has no spouse → P2 dies
      const hero1 = makeHero(1000, 'Hero1', ['2000']);
      libGroup = makeLibGroup([hero1]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p1.hp = 0;
      p2.hp = 1; // Only 1 HP - will reach 0 after saving P1

      await gLoop.raiseGMessage('G0ZH,0');

      // P1 saved (1 HP from P2)
      expect(p1.hp).toBe(1);
      expect(p1.isAlive).toBe(true);
      // P2 lost 1 HP saving P1 (→0), no spouse to save P2 → P2 dies via G0ZW
      expect(p2.hp).toBe(0);
      expect(p2.isAlive).toBe(false);
    });
  });

  describe('Death after failed devotion', () => {
    it('should raise G0ZW when devotion fails to save', async () => {
      const hero1 = makeHero(1000, 'Hero1', []); // No spouses
      libGroup = makeLibGroup([hero1]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      p1.hp = 0;

      await gLoop.raiseGMessage('G0ZH,0');

      expect(p1.isAlive).toBe(false);
      expect(messages.some(m => m.startsWith('G0ZW,'))).toBe(true);
    });

    it('should kill player when all spouses are at 1 HP and cannot save', async () => {
      // Actually, spouses CAN save even at 1 HP (they go to 0)
      // But if spouse is dead, they can't help
      const hero1 = makeHero(1000, 'Hero1', ['2000']);
      libGroup = makeLibGroup([hero1]);

      gLoop = new GLoop(eventBus, board, skillRegistry, libGroup);
      gLoop.setMessageHandler((msg) => messages.push(msg));

      const p1 = board.garden.get(1)!;
      const p2 = board.garden.get(2)!;
      p1.hp = 0;
      p2.hp = 0; // Dead spouse can't save

      await gLoop.raiseGMessage('G0ZH,0');

      expect(p1.isAlive).toBe(false);
    });
  });
});
