/**
 * 数据加载器
 * 从 JSON 文件加载游戏数据
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Hero } from '../types/hero';
import type { Tux } from '../types/tux';
import type { Monster } from '../types/monster';
import type { NPC } from '../types/npc';
import type { Skill } from '../types/skill';
import type { Evenement } from '../types/evenement';
import type { Rune } from '../types/rune';
import type { Exsp } from '../types/exsp';
import type { Operation } from '../types/operation';
import type { NCAction } from '../types/nc-action';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 通用 JSON 文件加载函数
 */
function loadJsonFile<T>(filename: string): T[] {
  const filePath = path.join(__dirname, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T[];
}

/**
 * 加载英雄数据
 */
export function loadHeroes(): Hero[] {
  return loadJsonFile<Hero>('hero.json');
}

/**
 * 加载装备牌数据
 */
export function loadTuxes(): Tux[] {
  return loadJsonFile<Tux>('tux.json');
}

/**
 * 加载怪物数据
 */
export function loadMonsters(): Monster[] {
  return loadJsonFile<Monster>('monster.json');
}

/**
 * 加载 NPC 数据
 */
export function loadNPCs(): NPC[] {
  return loadJsonFile<NPC>('npc.json');
}

/**
 * 加载技能数据
 */
export function loadSkills(): Skill[] {
  return loadJsonFile<Skill>('skill.json');
}

/**
 * 加载事件数据
 */
export function loadEvenements(): Evenement[] {
  return loadJsonFile<Evenement>('eve.json');
}

/**
 * 加载符文数据
 */
export function loadRunes(): Rune[] {
  return loadJsonFile<Rune>('rune.json');
}

/**
 * 加载特殊牌数据
 */
export function loadExsps(): Exsp[] {
  return loadJsonFile<Exsp>('exsp.json');
}

/**
 * 加载操作数据
 */
export function loadOperations(): Operation[] {
  return loadJsonFile<Operation>('ops.json');
}

/**
 * 加载 NPC 行动数据
 */
export function loadNCActions(): NCAction[] {
  return loadJsonFile<NCAction>('nj.json');
}
