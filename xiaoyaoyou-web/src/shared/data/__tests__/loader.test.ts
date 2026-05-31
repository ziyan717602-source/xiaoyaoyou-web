/**
 * 数据加载器测试
 */

import { describe, it, expect } from 'vitest';
import {
  loadHeroes,
  loadTuxes,
  loadMonsters,
  loadNPCs,
  loadSkills,
  loadEvenements,
  loadRunes,
  loadExsps,
  loadOperations,
  loadNCActions,
} from '../loader';

describe('Data Loaders', () => {
  describe('loadHeroes', () => {
    it('should load hero data', () => {
      const heroes = loadHeroes();
      expect(heroes).toBeDefined();
      expect(Array.isArray(heroes)).toBe(true);
      expect(heroes.length).toBeGreaterThan(0);
    });

    it('should have correct hero structure', () => {
      const heroes = loadHeroes();
      const hero = heroes[0];
      expect(hero).toHaveProperty('Name');
      expect(hero).toHaveProperty('Avatar');
      expect(hero).toHaveProperty('Group');
      expect(hero).toHaveProperty('Genre');
      expect(hero).toHaveProperty('Gender');
      expect(hero).toHaveProperty('HP');
      expect(hero).toHaveProperty('STR');
      expect(hero).toHaveProperty('DEX');
      expect(hero).toHaveProperty('Skills');
      expect(hero).toHaveProperty('RelatedSkills');
      expect(hero).toHaveProperty('Spouses');
      expect(hero).toHaveProperty('Isomorphic');
      expect(hero).toHaveProperty('Archetype');
      expect(hero).toHaveProperty('Antecessor');
      expect(hero).toHaveProperty('Pioneer');
      expect(hero).toHaveProperty('Ofcode');
      expect(hero).toHaveProperty('TokenAlias');
      expect(hero).toHaveProperty('PeopleAlias');
      expect(hero).toHaveProperty('PlayerTarAlias');
      expect(hero).toHaveProperty('ExCardsAlias');
      expect(hero).toHaveProperty('AwakeAlias');
      expect(hero).toHaveProperty('FolderAlias');
      expect(hero).toHaveProperty('GuestAlias');
    });

    it('should have hero with correct types', () => {
      const heroes = loadHeroes();
      const hero = heroes[0];
      expect(typeof hero.Name).toBe('string');
      expect(typeof hero.Avatar).toBe('number');
      expect(typeof hero.HP).toBe('number');
      expect(Array.isArray(hero.Skills)).toBe(true);
      expect(Array.isArray(hero.Spouses)).toBe(true);
      expect(Array.isArray(hero.Isomorphic)).toBe(true);
    });
  });

  describe('loadTuxes', () => {
    it('should load tux data', () => {
      const tuxes = loadTuxes();
      expect(tuxes).toBeDefined();
      expect(Array.isArray(tuxes)).toBe(true);
      expect(tuxes.length).toBeGreaterThan(0);
    });

    it('should have correct tux structure', () => {
      const tuxes = loadTuxes();
      const tux = tuxes[0];
      expect(tux).toHaveProperty('Name');
      expect(tux).toHaveProperty('Code');
      expect(tux).toHaveProperty('Type');
      expect(tux).toHaveProperty('Genre');
      expect(tux).toHaveProperty('Package');
      expect(tux).toHaveProperty('Range');
      expect(tux).toHaveProperty('Description');
      expect(tux).toHaveProperty('Special');
      expect(tux).toHaveProperty('Priorities');
      expect(tux).toHaveProperty('Occurs');
      expect(tux).toHaveProperty('Parasitism');
      expect(tux).toHaveProperty('Targets');
      expect(tux).toHaveProperty('IsTermini');
    });
  });

  describe('loadMonsters', () => {
    it('should load monster data', () => {
      const monsters = loadMonsters();
      expect(monsters).toBeDefined();
      expect(Array.isArray(monsters)).toBe(true);
      expect(monsters.length).toBeGreaterThan(0);
    });

    it('should have correct monster structure', () => {
      const monsters = loadMonsters();
      const monster = monsters[0];
      expect(monster).toHaveProperty('Name');
      expect(monster).toHaveProperty('Code');
      expect(monster).toHaveProperty('Group');
      expect(monster).toHaveProperty('Genre');
      expect(monster).toHaveProperty('Element');
      expect(monster).toHaveProperty('Level');
      expect(monster).toHaveProperty('STRb');
      expect(monster).toHaveProperty('AGLb');
      expect(monster).toHaveProperty('DBSerial');
      expect(monster).toHaveProperty('DebutText');
      expect(monster).toHaveProperty('PetText');
      expect(monster).toHaveProperty('WinText');
      expect(monster).toHaveProperty('LoseText');
      expect(monster).toHaveProperty('EAOccurs');
      expect(monster).toHaveProperty('EAProperties');
      expect(monster).toHaveProperty('EALocks');
      expect(monster).toHaveProperty('EAOnces');
      expect(monster).toHaveProperty('EAIsTermini');
      expect(monster).toHaveProperty('EAHinds');
    });
  });

  describe('loadNPCs', () => {
    it('should load NPC data', () => {
      const npcs = loadNPCs();
      expect(npcs).toBeDefined();
      expect(Array.isArray(npcs)).toBe(true);
      expect(npcs.length).toBeGreaterThan(0);
    });

    it('should have correct NPC structure', () => {
      const npcs = loadNPCs();
      const npc = npcs[0];
      expect(npc).toHaveProperty('Name');
      expect(npc).toHaveProperty('Code');
      expect(npc).toHaveProperty('Group');
      expect(npc).toHaveProperty('Gender');
      expect(npc).toHaveProperty('Genre');
      expect(npc).toHaveProperty('STRb');
      expect(npc).toHaveProperty('Skills');
      expect(npc).toHaveProperty('Hero');
      expect(npc).toHaveProperty('DebutText');
    });
  });

  describe('loadSkills', () => {
    it('should load skill data', () => {
      const skills = loadSkills();
      expect(skills).toBeDefined();
      expect(Array.isArray(skills)).toBe(true);
      expect(skills.length).toBeGreaterThan(0);
    });

    it('should have correct skill structure', () => {
      const skills = loadSkills();
      const skill = skills[0];
      expect(skill).toHaveProperty('Name');
      expect(skill).toHaveProperty('Code');
      expect(skill).toHaveProperty('Occurs');
      expect(skill).toHaveProperty('Priorities');
      expect(skill).toHaveProperty('IsOnce');
      expect(skill).toHaveProperty('IsTermini');
      expect(skill).toHaveProperty('Lock');
      expect(skill).toHaveProperty('IsHind');
      expect(skill).toHaveProperty('IsChange');
      expect(skill).toHaveProperty('IsRestrict');
      expect(skill).toHaveProperty('Parasitism');
      expect(skill).toHaveProperty('Descripe');
    });
  });

  describe('loadEvenements', () => {
    it('should load evenement data', () => {
      const eves = loadEvenements();
      expect(eves).toBeDefined();
      expect(Array.isArray(eves)).toBe(true);
      expect(eves.length).toBeGreaterThan(0);
    });

    it('should have correct evenement structure', () => {
      const eves = loadEvenements();
      const eve = eves[0];
      expect(eve).toHaveProperty('Name');
      expect(eve).toHaveProperty('Code');
      expect(eve).toHaveProperty('Group');
      expect(eve).toHaveProperty('Genre');
      expect(eve).toHaveProperty('Priorities');
      expect(eve).toHaveProperty('Occurs');
      expect(eve).toHaveProperty('Parasitism');
      expect(eve).toHaveProperty('IsOnce');
      expect(eve).toHaveProperty('IsTermini');
      expect(eve).toHaveProperty('Lock');
      expect(eve).toHaveProperty('IsHind');
      expect(eve).toHaveProperty('Descripe');
      expect(eve).toHaveProperty('Special');
      expect(eve).toHaveProperty('Ofcode');
    });
  });

  describe('loadRunes', () => {
    it('should load rune data', () => {
      const runes = loadRunes();
      expect(runes).toBeDefined();
      expect(Array.isArray(runes)).toBe(true);
      expect(runes.length).toBeGreaterThan(0);
    });

    it('should have correct rune structure', () => {
      const runes = loadRunes();
      const rune = runes[0];
      expect(rune).toHaveProperty('Name');
      expect(rune).toHaveProperty('Code');
      expect(rune).toHaveProperty('Group');
      expect(rune).toHaveProperty('Genre');
      expect(rune).toHaveProperty('Priorities');
      expect(rune).toHaveProperty('Occurs');
      expect(rune).toHaveProperty('Parasitism');
      expect(rune).toHaveProperty('IsOnce');
      expect(rune).toHaveProperty('IsTermini');
      expect(rune).toHaveProperty('Lock');
      expect(rune).toHaveProperty('IsHind');
      expect(rune).toHaveProperty('Descripe');
      expect(rune).toHaveProperty('Special');
    });
  });

  describe('loadExsps', () => {
    it('should load exsp data', () => {
      const exsps = loadExsps();
      expect(exsps).toBeDefined();
      expect(Array.isArray(exsps)).toBe(true);
      expect(exsps.length).toBeGreaterThan(0);
    });

    it('should have correct exsp structure', () => {
      const exsps = loadExsps();
      const exsp = exsps[0];
      expect(exsp).toHaveProperty('Name');
      expect(exsp).toHaveProperty('Code');
      expect(exsp).toHaveProperty('Type');
      expect(exsp).toHaveProperty('Hero');
      expect(exsp).toHaveProperty('Skills');
      expect(exsp).toHaveProperty('Description');
    });
  });

  describe('loadOperations', () => {
    it('should load operation data', () => {
      const ops = loadOperations();
      expect(ops).toBeDefined();
      expect(Array.isArray(ops)).toBe(true);
      expect(ops.length).toBeGreaterThan(0);
    });

    it('should have correct operation structure', () => {
      const ops = loadOperations();
      const op = ops[0];
      expect(op).toHaveProperty('Name');
      expect(op).toHaveProperty('Code');
      expect(op).toHaveProperty('Group');
      expect(op).toHaveProperty('Genre');
      expect(op).toHaveProperty('Priorities');
      expect(op).toHaveProperty('Occurs');
      expect(op).toHaveProperty('Parasitism');
      expect(op).toHaveProperty('IsOnce');
      expect(op).toHaveProperty('IsTermini');
      expect(op).toHaveProperty('Lock');
      expect(op).toHaveProperty('IsHind');
      expect(op).toHaveProperty('Descripe');
    });
  });

  describe('loadNCActions', () => {
    it('should load NCAction data', () => {
      const njs = loadNCActions();
      expect(njs).toBeDefined();
      expect(Array.isArray(njs)).toBe(true);
      expect(njs.length).toBeGreaterThan(0);
    });

    it('should have correct NCAction structure', () => {
      const njs = loadNCActions();
      const nj = njs[0];
      expect(nj).toHaveProperty('Name');
      expect(nj).toHaveProperty('Code');
      expect(nj).toHaveProperty('Group');
      expect(nj).toHaveProperty('Genre');
      expect(nj).toHaveProperty('Priorities');
      expect(nj).toHaveProperty('Occurs');
      expect(nj).toHaveProperty('Parasitism');
      expect(nj).toHaveProperty('IsOnce');
      expect(nj).toHaveProperty('IsTermini');
      expect(nj).toHaveProperty('Lock');
      expect(nj).toHaveProperty('IsHind');
      expect(nj).toHaveProperty('Descripe');
    });
  });

  describe('Data Integrity', () => {
    it('should have unique hero avatars', () => {
      const heroes = loadHeroes();
      const avatars = heroes.map(h => h.Avatar);
      const uniqueAvatars = new Set(avatars);
      expect(uniqueAvatars.size).toBe(avatars.length);
    });

    it('should have unique tux codes', () => {
      const tuxes = loadTuxes();
      const codes = tuxes.map(t => t.Code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should have unique monster codes', () => {
      const monsters = loadMonsters();
      const codes = monsters.map(m => m.Code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should have unique NPC codes', () => {
      const npcs = loadNPCs();
      const codes = npcs.map(n => n.Code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should have unique skill codes', () => {
      const skills = loadSkills();
      const codes = skills.map(s => s.Code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should have valid five element values', () => {
      const monsters = loadMonsters();
      const validElements = ['A', 'AQUA', 'AGNI', 'THUNDER', 'AERO', 'SATURN', 'YINN', 'SOLARIS'];
      for (const monster of monsters) {
        expect(validElements).toContain(monster.Element);
      }
    });

    it('should have valid monster level values', () => {
      const monsters = loadMonsters();
      const validLevels = ['WOODEN', 'WEAK', 'STRONG', 'BOSS'];
      for (const monster of monsters) {
        expect(validLevels).toContain(monster.Level);
      }
    });

    it('should have valid tux type values', () => {
      const tuxes = loadTuxes();
      const validTypes = ['HX', 'JP', 'ZP', 'TP', 'WQ', 'FJ', 'XB'];
      for (const tux of tuxes) {
        expect(validTypes).toContain(tux.Type);
      }
    });
  });
});
