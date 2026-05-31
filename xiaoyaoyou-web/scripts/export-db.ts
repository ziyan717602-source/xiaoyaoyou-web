/**
 * 数据库导出脚本
 * 使用 better-sqlite3 读取 psd.db3，导出为 JSON 文件到 src/shared/data/
 *
 * 运行方式: npx tsx scripts/export-db.ts
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库路径
const DB_PATH = path.resolve(__dirname, '../../psd48-master/~ex-lib/psd.db3');
// 输出目录
const OUTPUT_DIR = path.resolve(__dirname, '../src/shared/data');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 解析 ISO 字符串（同形、原型、前辈）
 */
function parseISO(isoStr: string): {
  isomorphic: number[];
  archetype: number;
  antecessor: number;
} {
  const isomorphic: number[] = [];
  let archetype = 0;
  let antecessor = 0;

  if (!isoStr) return { isomorphic, archetype, antecessor };

  for (const part of isoStr.split(',')) {
    if (part.startsWith('@')) {
      archetype = parseInt(part.substring(1), 10);
    } else if (part.startsWith('^')) {
      antecessor = parseInt(part.substring(1), 10);
    } else if (part !== '') {
      isomorphic.push(parseInt(part, 10));
    }
  }

  return { isomorphic, archetype, antecessor };
}

/**
 * 解析技能字符串（包含普通技能和关联技能）
 */
function parseSkills(skillStr: string): {
  skills: string[];
  relatedSkills: string[];
} {
  if (!skillStr) return { skills: [], relatedSkills: [] };

  const pipeIdx = skillStr.indexOf('|');
  if (pipeIdx < 0) {
    return {
      skills: skillStr.split(','),
      relatedSkills: [],
    };
  }

  return {
    skills: skillStr.substring(0, pipeIdx).split(','),
    relatedSkills: skillStr.substring(pipeIdx + 1).split(','),
  };
}

/**
 * 解析别名字符串（K=TokenAlias, C=PeopleAlias, T=PlayerTarAlias,
 * E=ExCardsAlias, A=AwakeAlias, F=FolderAlias, V=GuestAlias）
 */
function parseAlias(aliasStr: string | null): {
  TokenAlias: string;
  PeopleAlias: string;
  PlayerTarAlias: string;
  ExCardsAlias: string;
  AwakeAlias: string;
  FolderAlias: string;
  GuestAlias: string;
} {
  const result = {
    TokenAlias: '',
    PeopleAlias: '',
    PlayerTarAlias: '',
    ExCardsAlias: '',
    AwakeAlias: '',
    FolderAlias: '',
    GuestAlias: '',
  };

  if (!aliasStr) return result;

  const parts = aliasStr.split(',');
  for (let i = 0; i < parts.length; i += 2) {
    if (i + 1 >= parts.length) break;
    switch (parts[i]) {
      case 'K': result.TokenAlias = parts[i + 1]; break;
      case 'C': result.PeopleAlias = parts[i + 1]; break;
      case 'T': result.PlayerTarAlias = parts[i + 1]; break;
      case 'E': result.ExCardsAlias = parts[i + 1]; break;
      case 'A': result.AwakeAlias = parts[i + 1]; break;
      case 'F': result.FolderAlias = parts[i + 1]; break;
      case 'V': result.GuestAlias = parts[i + 1]; break;
    }
  }

  return result;
}

/**
 * 导出 Hero 数据
 */
function exportHero(db: Database.Database): void {
  const stmt = db.prepare(`
    SELECT ID, GENRE, VALID, OFCODE, NAME, HP, STR, DEX,
           GENDER, SPOUSE, ISO, SKILL, ALIAS, BIO
    FROM Hero
  `);
  const rows = stmt.all();

  const heroes = rows.map((row: any) => {
    const group = parseInt(row.VALID, 10);
    const { isomorphic, archetype, antecessor } = parseISO(row.ISO ?? '');
    const { skills, relatedSkills } = parseSkills(row.SKILL ?? '');
    const aliases = parseAlias(row.ALIAS);

    return {
      Name: row.NAME ?? '',
      Avatar: row.ID,
      Group: group,
      Genre: row.GENRE ?? 0,
      Gender: row.GENDER ?? 'M',
      HP: row.HP ?? 0,
      STR: row.STR ?? 0,
      DEX: row.DEX ?? 0,
      Skills: skills,
      RelatedSkills: relatedSkills,
      Spouses: row.SPOUSE ? row.SPOUSE.split(',') : [],
      Isomorphic: isomorphic,
      Archetype: archetype,
      Antecessor: antecessor,
      Pioneer: 0, // 将在后续计算中设置
      Ofcode: row.OFCODE ?? '',
      Bio: row.BIO ?? '',
      ...aliases,
    };
  });

  // 设置 Pioneer 字段
  const avatarToHero = new Map<number, typeof heroes[0]>();
  for (const hero of heroes) {
    avatarToHero.set(hero.Avatar, hero);
  }
  for (const hero of heroes) {
    if (hero.Antecessor !== 0 && avatarToHero.has(hero.Antecessor)) {
      avatarToHero.get(hero.Antecessor)!.Pioneer = hero.Avatar;
    }
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'hero.json'),
    JSON.stringify(heroes, null, 2)
  );
  console.log(`Exported ${heroes.length} heroes`);
}

/**
 * 从 Tux CODE 推导 TuxType
 */
function codeToTuxType(code: string): string {
  const prefix = code.substring(0, 2);
  switch (prefix) {
    case 'JP': return 'JP';
    case 'ZP': return 'ZP';
    case 'TP': return 'TP';
    case 'WQ': return 'WQ';
    case 'FJ': return 'FJ';
    case 'XB': return 'XB';
    default: return 'HX';
  }
}

/**
 * 解析 COUNT 字符串为 Package 和 Range
 */
function parseCount(countStr: string): {
  Package: number[];
  Range: number[];
} {
  if (!countStr) return { Package: [], Range: [] };

  const counts = countStr.split(',');
  const pkgLen = Math.floor(counts.length / 3);
  const Package: number[] = [];
  const Range: number[] = [];

  for (let i = 0; i < counts.length; i += 3) {
    Package.push(parseInt(counts[i], 10));
    Range.push(parseInt(counts[i + 1], 10));
    Range.push(parseInt(counts[i + 2], 10));
  }

  return { Package, Range };
}

/**
 * 解析 SPECIAL 字符串（格式：|key1|value1|key2|value2...）
 */
function parseSpecial(specialStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!specialStr) return result;

  const parts = specialStr.split('|');
  for (let i = 1; i < parts.length; i += 2) {
    if (i + 1 < parts.length) {
      result[parts[i]] = parts[i + 1];
    }
  }
  return result;
}

/**
 * 导出 Tux 数据
 */
function exportTux(db: Database.Database): void {
  const stmt = db.prepare(`
    SELECT ID, CODE, NAME, COUNT, OCCURS, PRIORS, PARASITISM,
           DESCRIPTION, SPECIAL, TARGET, GROWUP, TERMHIND, GENRE
    FROM Tux
  `);
  const rows = stmt.all();

  const tuxes = rows.map((row: any) => {
    const type = codeToTuxType(row.CODE);
    const { Package, Range } = parseCount(row.COUNT ?? '');
    const special = parseSpecial(row.SPECIAL ?? '');

    // 解析 OCCURS（可能包含分号用于 TuxEquip）
    const occurStr = row.OCCURS ?? '';
    const occurParts = occurStr.split(';');
    const occurs = occurParts[0] !== '' && occurParts[0] !== '^'
      ? occurParts[0].split(',')
      : [];

    // 解析 PRIORS
    const priorStr = row.PRIORS ?? '';
    const priorParts = priorStr.split(';');
    const priorities = priorParts[0] !== '' && priorParts[0] !== '^'
      ? priorParts[0].split(',').map((p: string) => parseInt(p.replace('!', ''), 10))
      : [];

    // 解析 PARASITISM
    const parasitism = row.PARASITISM && row.PARASITISM !== '^'
      ? row.PARASITISM.split('&')
      : [];

    // 解析 TARGET
    const targets = row.TARGET ? row.TARGET.split(',') : [];

    // 解析 TERMHIND（可能包含分号）
    const tmhdStr = row.TERMHIND ?? '';
    const tmhdParts = tmhdStr.split(';');
    const isTermini = tmhdParts[0] !== '' && tmhdParts[0] !== '^'
      ? tmhdParts[0].split(',').map((t: string) => t[0] === '1')
      : [];

    // 检查是否为 TuxEquip 类型
    const isEquip = type === 'WQ' || type === 'FJ' || type === 'XB';
    const growup = row.GROWUP ?? '';

    if (isEquip) {
      // 解析 GROWUP 获取 STR/DEX 增量
      const getValue = (ch: string): number => {
        const idx = growup.indexOf(ch);
        if (idx < 0) return 0;
        const next = growup[idx + 1];
        if (next === '-') {
          return parseInt(growup.substring(idx + 1, idx + 3), 10);
        }
        return parseInt(growup.substring(idx + 1, idx + 2), 10);
      };

      const IncrOfSTR = getValue('A');
      const IncrOfDEX = getValue('X');

      // 解析消耗相关的数组
      const csOccur: string[][] = [];
      const csPriorities: number[][] = [];
      const csLock: boolean[][] = [];
      const csOnce: boolean[][] = [];
      const csIsTermini: boolean[][] = [];
      const csHind: boolean[][] = [];

      for (let i = 1; i < occurParts.length; i++) {
        if (occurParts[i] !== '' && occurParts[i] !== '^') {
          const ods = occurParts[i].split(',');
          const occurArr: string[] = [];
          const lockArr: boolean[] = [];
          for (const od of ods) {
            if (od.startsWith('!')) {
              occurArr.push(od.substring(1));
              lockArr.push(true);
            } else {
              occurArr.push(od);
              lockArr.push(false);
            }
          }
          csOccur.push(occurArr);
          csLock.push(lockArr);
        } else {
          csOccur.push([]);
          csLock.push([]);
        }
      }

      for (let i = 1; i < priorParts.length; i++) {
        if (priorParts[i] !== '' && priorParts[i] !== '^') {
          const prs = priorParts[i].split(',');
          const priorArr: number[] = [];
          const onceArr: boolean[] = [];
          for (const pr of prs) {
            if (pr.startsWith('!')) {
              priorArr.push(parseInt(pr.substring(1), 10));
              onceArr.push(true);
            } else {
              priorArr.push(parseInt(pr, 10));
              onceArr.push(false);
            }
          }
          csPriorities.push(priorArr);
          csOnce.push(onceArr);
        } else {
          csPriorities.push([]);
          csOnce.push([]);
        }
      }

      for (let i = 1; i < tmhdParts.length; i++) {
        if (tmhdParts[i] !== '' && tmhdParts[i] !== '^') {
          const trs = tmhdParts[i].split(',');
          const terminiArr: boolean[] = [];
          const hindArr: boolean[] = [];
          for (const tr of trs) {
            const val = parseInt(tr, 10);
            terminiArr.push((val & 1) !== 0);
            hindArr.push((val & 2) !== 0);
          }
          csIsTermini.push(terminiArr);
          csHind.push(hindArr);
        } else {
          csIsTermini.push([]);
          csHind.push([]);
        }
      }

      // 检查是否为 Luggage 或 Illusion
      if (type === 'XB' && growup.includes('L')) {
        return {
          Name: row.NAME ?? '',
          Code: row.CODE,
          Type: type,
          Genre: row.GENRE ?? 0,
          Package,
          Range,
          Description: row.DESCRIPTION ?? '',
          Special: special,
          Priorities: priorities,
          Occurs: occurs,
          Parasitism: parasitism,
          Targets: targets,
          IsTermini: isTermini,
          IncrOfSTR,
          IncrOfDEX,
          SingleEntry: Range[0] ?? 0,
          CsPriorites: csPriorities,
          CsOccur: csOccur,
          CsLock: csLock,
          CsOnce: csOnce,
          CsIsTermini: csIsTermini,
          CsHind: csHind,
          Capacities: [],
          Pull: false,
          ILAS: null,
          _type: 'luggage',
        };
      } else if (type === 'XB' && growup.includes('I')) {
        return {
          Name: row.NAME ?? '',
          Code: row.CODE,
          Type: type,
          Genre: row.GENRE ?? 0,
          Package,
          Range,
          Description: row.DESCRIPTION ?? '',
          Special: special,
          Priorities: priorities,
          Occurs: occurs,
          Parasitism: parasitism,
          Targets: targets,
          IsTermini: isTermini,
          IncrOfSTR,
          IncrOfDEX,
          SingleEntry: Range[0] ?? 0,
          CsPriorites: csPriorities,
          CsOccur: csOccur,
          CsLock: csLock,
          CsOnce: csOnce,
          CsIsTermini: csIsTermini,
          CsHind: csHind,
          ILAS: null,
          _type: 'illusion',
        };
      } else {
        return {
          Name: row.NAME ?? '',
          Code: row.CODE,
          Type: type,
          Genre: row.GENRE ?? 0,
          Package,
          Range,
          Description: row.DESCRIPTION ?? '',
          Special: special,
          Priorities: priorities,
          Occurs: occurs,
          Parasitism: parasitism,
          Targets: targets,
          IsTermini: isTermini,
          IncrOfSTR,
          IncrOfDEX,
          SingleEntry: Range[0] ?? 0,
          CsPriorites: csPriorities,
          CsOccur: csOccur,
          CsLock: csLock,
          CsOnce: csOnce,
          CsIsTermini: csIsTermini,
          CsHind: csHind,
          _type: 'equip',
        };
      }
    }

    return {
      Name: row.NAME ?? '',
      Code: row.CODE,
      Type: type,
      Genre: row.GENRE ?? 0,
      Package,
      Range,
      Description: row.DESCRIPTION ?? '',
      Special: special,
      Priorities: priorities,
      Occurs: occurs,
      Parasitism: parasitism,
      Targets: targets,
      IsTermini: isTermini,
    };
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'tux.json'),
    JSON.stringify(tuxes, null, 2)
  );
  console.log(`Exported ${tuxes.length} tuxes`);
}

/**
 * 从 Monster CODE 推导 FiveElement
 */
function codeToFiveElement(code: string): string {
  const prefix = code.substring(0, 2);
  switch (prefix) {
    case 'GS': return 'AQUA';
    case 'GH': return 'AGNI';
    case 'GL': return 'THUNDER';
    case 'GF': return 'AERO';
    case 'GT': return 'SATURN';
    case 'GI': return 'YINN';
    case 'GY': return 'SOLARIS';
    default: return 'A';
  }
}

/**
 * 从 LEVEL 值推导 MonsterLevel
 */
function levelToMonsterLevel(level: number): string {
  switch (level) {
    case 1: return 'WEAK';
    case 2: return 'STRONG';
    case 3: return 'BOSS';
    default: return 'WOODEN';
  }
}

/**
 * 解析 Monster 的事件数组（格式：occur1;occur2，每段内逗号分隔）
 */
function parseMonsterEventArrays(
  occurStr: string,
  priorStr: string,
  terminiStr: string
): {
  EAOccurs: (string[] | null)[];
  EAProperties: (number[] | null)[];
  EALocks: (boolean[] | null)[];
  EAOnces: (boolean[] | null)[];
  EAIsTermini: (boolean[] | null)[];
  EAHinds: (boolean[] | null)[];
} {
  const occurs = occurStr.split(';');
  const propss = priorStr.split(';');
  const eatermis = terminiStr.split(';');

  const EAOccurs: (string[] | null)[] = [];
  const EAProperties: (number[] | null)[] = [];
  const EALocks: (boolean[] | null)[] = [];
  const EAOnces: (boolean[] | null)[] = [];
  const EAIsTermini: (boolean[] | null)[] = [];
  const EAHinds: (boolean[] | null)[] = [];

  for (let i = 0; i < occurs.length; i++) {
    if (occurs[i] === '^') {
      EAOccurs.push(null);
      EAProperties.push(null);
      EALocks.push(null);
      EAOnces.push(null);
      EAIsTermini.push(null);
      EAHinds.push(null);
    } else {
      const ods = occurs[i].split(',');
      const opss = (propss[i] ?? '').split(',');
      const omin = (eatermis[i] ?? '').split(',');

      const occurArr: string[] = [];
      const propArr: number[] = [];
      const lockArr: boolean[] = [];
      const onceArr: boolean[] = [];
      const terminiArr: boolean[] = [];
      const hindArr: boolean[] = [];

      for (let j = 0; j < ods.length; j++) {
        if (ods[j].startsWith('!')) {
          occurArr.push(ods[j].substring(1));
          lockArr.push(true);
        } else {
          occurArr.push(ods[j]);
          lockArr.push(false);
        }

        if (opss[j] && opss[j].startsWith('!')) {
          propArr.push(parseInt(opss[j].substring(1), 10));
          onceArr.push(false);
        } else {
          propArr.push(parseInt(opss[j] ?? '0', 10));
          onceArr.push(true);
        }

        if (omin[j] && omin[j].startsWith('!')) {
          terminiArr.push(omin[j][1] === '1');
          hindArr.push(true);
        } else {
          terminiArr.push(omin[j] ? omin[j][0] === '1' : false);
          hindArr.push(false);
        }
      }

      EAOccurs.push(occurArr);
      EAProperties.push(propArr);
      EALocks.push(lockArr);
      EAOnces.push(onceArr);
      EAIsTermini.push(terminiArr);
      EAHinds.push(hindArr);
    }
  }

  return { EAOccurs, EAProperties, EALocks, EAOnces, EAIsTermini, EAHinds };
}

/**
 * 导出 Monster 数据
 */
function exportMonster(db: Database.Database): void {
  const stmt = db.prepare(`
    SELECT ID, CODE, NAME, VALID, STR, AGL, LEVEL, OCCURS, PRIORS,
           DEBUTTEXT, PETTEXT, WINTEXT, LOSETEXT, TERMINI, SPI, GENRE
    FROM Monster
  `);
  const rows = stmt.all();

  const monsters = rows.map((row: any) => {
    const element = codeToFiveElement(row.CODE);
    const level = levelToMonsterLevel(row.LEVEL ?? 0);
    const { EAOccurs, EAProperties, EALocks, EAOnces, EAIsTermini, EAHinds } =
      parseMonsterEventArrays(row.OCCURS ?? '', row.PRIORS ?? '', row.TERMINI ?? '');

    return {
      Name: row.NAME ?? '',
      Code: row.CODE,
      Group: Math.abs(row.VALID ?? 0),
      Genre: row.GENRE ?? 0,
      Element: element,
      Level: level,
      STRb: row.STR ?? 0,
      AGLb: row.AGL ?? 0,
      DBSerial: row.ID,
      DebutText: row.DEBUTTEXT ?? '',
      PetText: row.PETTEXT ?? '',
      WinText: row.WINTEXT ?? '',
      LoseText: row.LOSETEXT ?? '',
      EAOccurs,
      EAProperties,
      EALocks,
      EAOnces,
      EAIsTermini,
      EAHinds,
    };
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'monster.json'),
    JSON.stringify(monsters, null, 2)
  );
  console.log(`Exported ${monsters.length} monsters`);
}

/**
 * 导出 NPC 数据
 */
function exportNPC(db: Database.Database): void {
  const stmt = db.prepare(`
    SELECT ID, Code, VALID, NAME, STR, ACTION, ORG, GENDER, DEBUTTEXT, GENRE
    FROM Npc
  `);
  const rows = stmt.all();

  const npcs = rows.map((row: any) => ({
    Name: row.NAME ?? '',
    Code: row.Code,
    Group: row.VALID ?? 0,
    Gender: row.GENDER ?? 'M',
    Genre: row.GENRE ?? 0,
    STRb: row.STR ?? 0,
    Skills: row.ACTION ? row.ACTION.split(',') : [],
    Hero: row.ORG ?? 0,
    DebutText: row.DEBUTTEXT ?? '',
  }));

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'npc.json'),
    JSON.stringify(npcs, null, 2)
  );
  console.log(`Exported ${npcs.length} NPCs`);
}

/**
 * 解析 Skill 的 Occurs 字符串（处理 ! 和 ? 前缀）
 */
function parseSkillOccurs(occurStr: string): {
  occurs: string[];
  lock: (boolean | null)[];
} {
  if (!occurStr) return { occurs: [], lock: [] };

  const parts = occurStr.split(',');
  const occurs: string[] = [];
  const lock: (boolean | null)[] = [];

  for (const part of parts) {
    if (part.startsWith('!')) {
      occurs.push(part.substring(1));
      lock.push(true);
    } else if (part.startsWith('?')) {
      occurs.push(part.substring(1));
      lock.push(null);
    } else {
      occurs.push(part);
      lock.push(false);
    }
  }

  return { occurs, lock };
}

/**
 * 导出 Skill 数据
 */
function exportSkill(db: Database.Database): void {
  const stmt = db.prepare(`
    SELECT CODE, TYPE, NAME, OCCURS, PRIORS, ONCE, PARASITISM,
           DESCRIPE, HIND, TERMINI
    FROM Skill
  `);
  const rows = stmt.all();

  const skills = rows.filter((row: any) => {
    const type = row.TYPE ?? '';
    return type !== '^' && !type.includes('X');
  }).map((row: any) => {
    const type = row.TYPE ?? '';
    const { occurs, lock } = parseSkillOccurs(row.OCCURS ?? '');
    const priorities = row.PRIORS
      ? row.PRIORS.split(',').map((p: string) => parseInt(p, 10))
      : [];
    const isOnce = row.ONCE
      ? row.ONCE.split(',').map((o: string) => o === '1')
      : [];
    const isTermini = row.TERMINI
      ? row.TERMINI.split(',').map((t: string) => t === '1')
      : [];
    const parasitism = row.PARASITISM && row.PARASITISM !== '^'
      ? row.PARASITISM.split('&')
      : [];
    const isHind = row.HIND
      ? row.HIND.split(',').map((h: string) => h === '1')
      : new Array(occurs.length).fill(false);

    return {
      Name: row.NAME ?? '',
      Code: row.CODE,
      Occurs: occurs,
      Priorities: priorities,
      IsOnce: isOnce,
      IsTermini: isTermini,
      Lock: lock,
      IsHind: isHind,
      IsChange: type.includes('C'),
      IsRestrict: type.includes('R'),
      Parasitism: parasitism,
      Descripe: row.DESCSIPE ?? row.DESCRIPE ?? '',
      _isBless: type.includes('B'),
    };
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'skill.json'),
    JSON.stringify(skills, null, 2)
  );
  console.log(`Exported ${skills.length} skills`);
}

/**
 * 导出 Evenement 数据
 */
function exportEvenement(db: Database.Database): void {
  const stmt = db.prepare(`
    SELECT CODE, VALID, NAME, RANGE, BACKGROUND, EFFECT, SPI, GENRE
    FROM Eve
  `);
  const rows = stmt.all();

  const eves = rows.filter((row: any) => (row.VALID ?? 0) > 0).map((row: any) => {
    const range = row.RANGE
      ? row.RANGE.split(',').map((r: string) => parseInt(r, 10))
      : [];

    // SPI 字符串解析（H=伤害, T=手牌, T#=手牌(自身), S=沉默）
    const spi = row.SPI ?? '';
    let mSpi = 0;
    for (let i = 0; i < spi.length; i++) {
      if (spi[i] === 'H') mSpi |= 0x1;
      else if (spi[i] === 'T') {
        if (i + 1 < spi.length && spi[i + 1] === '#') {
          mSpi |= 0x4;
          i++;
        } else {
          mSpi |= 0x2;
        }
      } else if (spi[i] === 'S') mSpi |= 0x8;
    }

    // 构建事件属性（基于 SPI 标志）
    const isHarm = (mSpi & 0x1) !== 0;
    const isTux = (mSpi & 0x2) !== 0 || (mSpi & 0x4) !== 0;
    const isSilent = (mSpi & 0x8) !== 0;

    return {
      Name: row.NAME ?? '',
      Code: row.CODE,
      Group: row.VALID ?? 0,
      Genre: row.GENRE ?? 0,
      Priorities: [], // 事件在数据库中没有优先级字段，运行时设置
      Occurs: [],     // 事件在数据库中没有触发条件，运行时设置
      Parasitism: [], // 事件在数据库中没有寄生条件，运行时设置
      IsOnce: [],     // 事件在数据库中没有单次标记，运行时设置
      IsTermini: [],  // 事件在数据库中没有终止标记，运行时设置
      Lock: [],       // 事件在数据库中没有锁定标记，运行时设置
      IsHind: [],     // 事件在数据库中没有阻碍标记，运行时设置
      Descripe: row.EFFECT ?? '',
      Special: {
        Background: row.BACKGROUND ?? '',
        IsHarm: String(isHarm),
        IsTux: String(isTux),
        IsSilence: String(isSilent),
      },
      Ofcode: row.CODE,
    };
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'eve.json'),
    JSON.stringify(eves, null, 2)
  );
  console.log(`Exported ${eves.length} evenements`);
}

/**
 * 导出 Rune 数据
 */
function exportRune(db: Database.Database): void {
  const stmt = db.prepare(`
    SELECT CODE, NAME, OCCURS, PRIORS, ONCES, TERMINS, CONSUME, DESC
    FROM Rune
  `);
  const rows = stmt.all();

  const runes = rows.map((row: any) => {
    let occur = row.OCCURS ?? '';
    let lock: boolean | null = false;
    if (occur.startsWith('!')) {
      lock = true;
      occur = occur.substring(1);
    } else if (occur.startsWith('?')) {
      lock = null;
      occur = occur.substring(1);
    }

    return {
      Name: row.NAME ?? '',
      Code: row.CODE,
      Group: 0, // 符文没有包组字段
      Genre: 0, // 符文没有类型字段
      Priorities: [parseInt(row.PRIORS ?? '0', 10)],
      Occurs: [occur],
      Parasitism: [],
      IsOnce: [(row.ONCES ?? 0) === 1],
      IsTermini: [(row.TERMINS ?? 0) === 1],
      Lock: [lock],
      IsHind: [false],
      Descripe: row.DESC ?? '',
      Special: {
        IsConsume: String((row.CONSUME ?? 0) === 1),
      },
    };
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'rune.json'),
    JSON.stringify(runes, null, 2)
  );
  console.log(`Exported ${runes.length} runes`);
}

/**
 * 导出 Exsp 数据
 */
function exportExsp(db: Database.Database): void {
  const stmt = db.prepare(`
    SELECT SID, TYPE, NAME, HERO, CODE, SKILL, DESC
    FROM Exsp
  `);
  const rows = stmt.all();

  const exsps = rows.map((row: any) => {
    const skills = row.SKILL ? row.SKILL.split(',') : [];
    const descStr = row.DESC ?? '';
    const description: Record<string, string> = {};
    const descParts = descStr.split('|');
    for (let i = 1; i < descParts.length; i += 2) {
      if (i + 1 < descParts.length) {
        description[descParts[i]] = descParts[i + 1];
      }
    }

    return {
      Name: row.NAME ?? '',
      Code: row.CODE,
      Type: row.TYPE ?? 0,
      Hero: row.HERO ?? 0,
      Skills: skills,
      Description: description,
    };
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'exsp.json'),
    JSON.stringify(exsps, null, 2)
  );
  console.log(`Exported ${exsps.length} exsps`);
}

/**
 * 导出 Operation 数据
 */
function exportOperation(db: Database.Database): void {
  const stmt = db.prepare(`
    SELECT CODE, NAME, OCCUR, ISONCE
    FROM Ops
  `);
  const rows = stmt.all();

  const ops = rows.map((row: any) => ({
    Name: row.NAME ?? '',
    Code: row.CODE,
    Group: 0, // 操作没有包组字段
    Genre: 0, // 操作没有类型字段
    Priorities: [],
    Occurs: row.OCCUR ? [row.OCCUR] : [],
    Parasitism: [],
    IsOnce: [(row.ISONCE ?? 0) === 1],
    IsTermini: [],
    Lock: [false],
    IsHind: [],
    Descripe: '',
  }));

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'ops.json'),
    JSON.stringify(ops, null, 2)
  );
  console.log(`Exported ${ops.length} operations`);
}

/**
 * 导出 NCAction 数据
 */
function exportNCAction(db: Database.Database): void {
  const stmt = db.prepare(`
    SELECT Code, Name, INTRO, ESCUE
    FROM NJ
  `);
  const rows = stmt.all();

  const njs = rows.map((row: any) => ({
    Name: row.Name ?? '',
    Code: row.Code,
    Group: 0, // NJ 没有包组字段
    Genre: 0, // NJ 没有类型字段
    Priorities: [],
    Occurs: [],
    Parasitism: [],
    IsOnce: [],
    IsTermini: [],
    Lock: [],
    IsHind: [],
    Descripe: row.INTRO ?? '',
  }));

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'nj.json'),
    JSON.stringify(njs, null, 2)
  );
  console.log(`Exported ${njs.length} NCActions`);
}

// 主函数
function main(): void {
  console.log(`Reading database from: ${DB_PATH}`);

  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });

  try {
    exportHero(db);
    exportTux(db);
    exportMonster(db);
    exportNPC(db);
    exportSkill(db);
    exportEvenement(db);
    exportRune(db);
    exportExsp(db);
    exportOperation(db);
    exportNCAction(db);
    console.log('\nAll exports completed successfully!');
  } finally {
    db.close();
  }
}

main();
