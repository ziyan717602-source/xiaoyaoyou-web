/**
 * CLI Game Test Runner
 *
 * Runs complete games with AI players and displays readable game flow.
 * Usage: npx tsx src/server/__tests__/run-ai-games.ts [options]
 *
 * Options:
 *   --players <n>    Number of players (2, 4, or 6, default: 2)
 *   --rounds <n>     Max rounds (default: 100)
 *   --seed <n>       Random seed (default: Date.now())
 *   --games <n>      Number of games to run (default: 1)
 *   --ai <type>      AI type: random, greedy, rule (default: greedy)
 *   --verbose        Show all G-loop messages
 */

import { Game, type GameConfig, type GameResult } from '../../shared/game/game';
import { RandomAI } from '../../shared/game/ai/random-ai';
import { GreedyAI } from '../../shared/game/ai/greedy-ai';
import { RuleAI } from '../../shared/game/ai/rule-ai';
import type { AIStrategy } from '../../shared/game/ai/types';
import type { LibGroupData } from '../../shared/game/lib-group';
import {
  loadHeroes, loadTuxes, loadMonsters, loadNPCs,
  loadEvenements, loadSkills, loadOperations, loadNCActions,
  loadRunes, loadExsps,
} from '../../shared/data';

// ====== CLI Arguments ======

const args = process.argv.slice(2);
function getArg(name: string, defaultVal: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const PLAYER_COUNT = parseInt(getArg('players', '2'), 10);
const MAX_ROUNDS = parseInt(getArg('rounds', '100'), 10);
const SEED = parseInt(getArg('seed', String(Date.now())), 10);
const GAME_COUNT = parseInt(getArg('games', '1'), 10);
const AI_TYPE = getArg('ai', 'greedy');
const VERBOSE = args.includes('--verbose');

// ====== Color Helpers ======

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function colorize(text: string, color: string): string {
  return `${color}${text}${C.reset}`;
}

// ====== G-Loop Message Decoder ======

interface MessageContext {
  libGroup: ReturnType<typeof Game.prototype.getLibGroup>;
  players: Map<number, { name: string; hp: number; team: number }>;
}

function decodeGMessage(raw: string, ctx: MessageContext): string {
  const parts = raw.split(',');
  const type = parts[0];
  const sender = parseInt(parts[1], 10);
  const receiver = parseInt(parts[2], 10);

  // Get player names
  const senderName = ctx.players.get(sender)?.name ?? `P${sender}`;
  const receiverName = ctx.players.get(receiver)?.name ?? `P${receiver}`;

  // Decode based on message type
  switch (type) {
    // === Damage & Combat ===
    case 'G0OH': {
      const [, , , element, damage, mask] = parts;
      const elements = ['物理', '火', '水', '雷', '风', '土'];
      const elemName = elements[parseInt(element, 10)] ?? `E${element}`;
      return `${senderName} 对 ${receiverName} 造成 ${damage} 点 ${elemName} 伤害`;
    }
    case 'G0IP': {
      const [, , , power] = parts;
      return `${receiverName} 战斗力变化: ${power > 0 ? '+' : ''}${power}`;
    }
    case 'G0ZH':
      return `${receiverName} 进行死亡判定`;
    case 'G0ZW':
      return `${receiverName} 被击杀`;

    // === Card Operations ===
    case 'G0IT': {
      const cardId = parts[3];
      const cardName = decodeCardName(cardId, ctx);
      return `${receiverName} 获得卡牌 [${cardName}]`;
    }
    case 'G0OT': {
      const cardId = parts[3];
      const cardName = decodeCardName(cardId, ctx);
      return `${receiverName} 失去卡牌 [${cardName}]`;
    }
    case 'G0CC': {
      const cardId = parts[3];
      const cardName = decodeCardName(cardId, ctx);
      return `${senderName} 使用卡牌 [${cardName}]`;
    }
    case 'G0CD': {
      const cardId = parts[3];
      const cardName = decodeCardName(cardId, ctx);
      return `${senderName} 弃置卡牌 [${cardName}]`;
    }

    // === Healing ===
    case 'G0IH': {
      const amount = parts[3];
      return `${receiverName} 恢复 ${amount} 点 HP`;
    }

    // === Hero Change ===
    case 'G0IY': {
      const heroId = parseInt(parts[3], 10);
      const heroName = ctx.libGroup.hl.instanceHero(heroId)?.name ?? `Hero#${heroId}`;
      return `${receiverName} 选择英雄: ${heroName}`;
    }

    // === Event ===
    case 'G1EV': {
      const eveId = parseInt(parts[3], 10);
      const eve = ctx.libGroup.el.decode(eveId);
      return `事件: ${eve?.name ?? `Event#${eveId}`}`;
    }

    // === Input Request ===
    case 'G2IN': {
      const code = parts[3];
      return `${receiverName} 需要输入 (code: ${code})`;
    }

    // === Round Info ===
    case 'G0TH': {
      const round = parts[3];
      return `=== 第 ${round} 回合 ===`;
    }

    // === Acknowledge ===
    case 'G2AS':
    case 'G0AS':
      return ''; // Skip sync messages

    // === Default ===
    default:
      return VERBOSE ? `${type}: ${parts.slice(1).join(',')}` : '';
  }
}

function decodeCardName(cardId: string, ctx: MessageContext): string {
  const numId = parseInt(cardId, 10);
  if (isNaN(numId)) return cardId;

  // Try tux cards
  const tux = ctx.libGroup.tl.decodeTux(numId);
  if (tux) return tux.name;

  // Try monsters (dbSerial)
  const mon = ctx.libGroup.ml.decode(numId);
  if (mon) return mon.name;

  // Try NPCs (index = id - 1000)
  if (numId > 1000) {
    const npc = ctx.libGroup.nl.decode(numId - 1000);
    if (npc) return npc.name;
  }

  return `Card#${cardId}`;
}

// ====== Game Runner ======

function createAI(type: string): AIStrategy {
  switch (type) {
    case 'random': return new RandomAI();
    case 'rule': return new RuleAI();
    case 'greedy':
    default: return new GreedyAI();
  }
}

function loadGameData(): LibGroupData {
  return {
    heroData: loadHeroes(),
    tuxData: loadTuxes(),
    monsterData: loadMonsters(),
    npcData: loadNPCs(),
    eveData: loadEvenements(),
    skillData: loadSkills(),
    opsData: loadOperations(),
    njData: loadNCActions(),
    runeData: loadRunes(),
    exspData: loadExsps(),
  };
}

async function runGame(gameIndex: number, seed: number, libGroupData: LibGroupData): Promise<GameResult> {
  const divider = colorize('═'.repeat(60), C.dim);
  console.log(`\n${divider}`);
  console.log(colorize(`  游戏 #${gameIndex + 1}  |  种子: ${seed}  |  ${PLAYER_COUNT}人局  |  AI: ${AI_TYPE}`, C.bold));
  console.log(divider);

  // Create AI strategies
  const aiStrategies = Array(PLAYER_COUNT).fill(null).map(() => createAI(AI_TYPE));

  const config: GameConfig = {
    playerCount: PLAYER_COUNT,
    packages: [1, 2, 4], // Standard packages
    seed,
    maxRounds: MAX_ROUNDS,
    aiStrategies,
    libGroupData,
    levelCode: 6, // LEVEL_RCM
  };

  const game = new Game(config);
  game.registerAllAIPlayers();

  // Run the game
  const startTime = Date.now();
  const result = await game.run();
  const elapsed = Date.now() - startTime;

  // Print game log
  const gameLog = game.getGameLog();
  const entries = gameLog.getEntries();
  if (entries.length > 0) {
    console.log('');
    for (const entry of entries) {
      // Highlight round headers
      if (entry.text.startsWith('\n===') || entry.text.startsWith('===') || entry.text === '') {
        console.log(colorize(entry.text, C.bold));
      } else {
        console.log(`  ${entry.text}`);
      }
    }
  }

  // Print result
  console.log(`\n${colorize('─'.repeat(60), C.dim)}`);

  const winnerText = result.winner
    ? `${result.winner.name} (阵营 ${result.winner.team === 1 ? '仙' : '剑'})`
    : '平局';

  console.log(`  结果: ${colorize(winnerText, result.winner ? C.green : C.yellow)}`);
  console.log(`  回合: ${result.totalRounds}  |  仙: ${result.akaScore}  |  剑: ${result.aoScore}`);
  const reasonText: Record<string, string> = {
    victory: '胜利', elimination: '淘汰', exhaustion: '牌堆耗尽', max_rounds: '达到上限',
  };
  console.log(`  原因: ${reasonText[result.reason] ?? result.reason}`);
  console.log(`  耗时: ${elapsed}ms`);
  console.log(colorize('═'.repeat(60), C.dim));

  return result;
}

// ====== Main ======

async function main() {
  console.log(colorize('\n🎮 逍遥游 CLI 测试', C.bold + C.cyan));
  console.log(colorize('─'.repeat(60), C.dim));

  // Load game data
  console.log('  加载游戏数据...');
  const libGroupData = loadGameData();
  console.log(`  英雄: ${libGroupData.heroData.length}  卡牌: ${libGroupData.tuxData.length}  怪物: ${libGroupData.monsterData.length}`);

  // Run games
  const results: GameResult[] = [];
  for (let i = 0; i < GAME_COUNT; i++) {
    const seed = SEED + i;
    try {
      const result = await runGame(i, seed, libGroupData);
      results.push(result);
    } catch (error) {
      console.error(colorize(`\n  ❌ 游戏 #${i + 1} 出错:`, C.red), error);
    }
  }

  // Summary
  if (GAME_COUNT > 1) {
    console.log(colorize('\n\n📊 总结', C.bold + C.cyan));
    console.log(colorize('─'.repeat(60), C.dim));

    const wins = { 仙: 0, 剑: 0, 平局: 0 };
    for (const r of results) {
      if (!r.winner) wins['平局']++;
      else if (r.winner.team === 1) wins['仙']++;
      else wins['剑']++;
    }

    console.log(`  仙阵营胜: ${wins['仙']}  |  剑阵营胜: ${wins['剑']}  |  平局: ${wins['平局']}`);
    console.log(`  平均回合: ${(results.reduce((s, r) => s + r.totalRounds, 0) / results.length).toFixed(1)}`);
  }

  console.log('');
}

main().catch(console.error);
