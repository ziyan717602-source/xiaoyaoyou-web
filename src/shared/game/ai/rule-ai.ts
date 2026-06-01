/**
 * RuleAI - Enhanced rule-based decision strategy
 *
 * Follows basic game rules: heals when low HP, attacks when enemies are weak,
 * selects heroes with balanced stats, supports teammates, uses hand cards.
 */

import type { AIStrategy } from './types';
import type { Board } from '../board';
import type { Player } from '../player';
import type { Hero } from '../card/hero';

export class RuleAI implements AIStrategy {
  readonly name = 'rule';

  selectHero(availableHeroes: Hero[]): number {
    if (availableHeroes.length === 0) return 0;

    let bestHero = availableHeroes[0];
    let bestScore = -1;

    for (const hero of availableHeroes) {
      let score = hero.hp;
      // Bonus for healing skills
      if (hero.skills.some(s => s.includes('heal') || s.includes('cure') || s.includes('IH'))) {
        score += 10;
      }
      // Bonus for attack skills
      if (hero.skills.some(s => s.includes('attack') || s.includes('harm') || s.includes('OH'))) {
        score += 5;
      }
      // Bonus for balanced stats
      score += hero.str + hero.dex;

      if (score > bestScore) {
        bestScore = score;
        bestHero = hero;
      }
    }

    return bestHero.avatar;
  }

  makeMainPhaseDecision(
    player: Player,
    board: Board,
    validActions: string[],
  ): string {
    if (validActions.length === 0) return 'skip';

    const healActions = validActions.filter(a => this.isHealAction(a));
    const attackActions = validActions.filter(a => this.isAttackAction(a));

    // Heal if HP is below 50%
    if (player.hp < player.hpBase * 0.5 && healActions.length > 0) {
      return healActions[0];
    }

    // Attack if enemy HP is below 30%
    const opponent = board.getOpponent(player);
    if (opponent && opponent.uid !== 0 && opponent.hp < opponent.hpBase * 0.3 && attackActions.length > 0) {
      return attackActions[0];
    }

    // Default: first available action
    return validActions[0];
  }

  makeBattleDecision(
    _player: Player,
    board: Board,
    validTargets: number[],
  ): number {
    if (validTargets.length === 0) return 0;

    // Target lowest HP enemy
    let bestTarget = validTargets[0];
    let minHp = Infinity;

    for (const targetId of validTargets) {
      const target = board.garden.get(targetId);
      if (target && target.hp < minHp) {
        minHp = target.hp;
        bestTarget = targetId;
      }
    }

    return bestTarget;
  }

  makeInputDecision(
    player: Player,
    board: Board,
    format: string,
    code: string,
    _arg: string,
  ): string {
    // Code-based dispatch for known input types
    switch (code) {
      // Battle support/obstruction
      case 'ZW':
        return this.handleZW(player, board, format);
      // Battle card play (ZP cards in combat)
      case 'ZD':
        return this.handleZD(player, board, format);
      // Event card flip decision
      case 'EV':
        return this.handleEV(player, board, format);
      // NPC effects
      case 'NP':
        return this.handleMenuSelection(player, board, format);
      case 'NJ01':
        return this.handleNJ01(player, board, format);
      case 'NJ02':
      case 'NJ03':
      case 'NJ05':
      case 'NJH3':
      case 'NJH4':
      case 'NJH5':
      case 'NJH6':
      case 'NJT2':
        return this.handleNPCTarget(player, board, format, code);
      case 'NJ06':
        return this.handleNJ06(player, board, format);
      case 'NJ08':
        return this.handleNJ08(player, board, format);
      case 'NJT1':
        return this.handleNJT1(player, board, format);
      // Skill cards (JP)
      case 'JP01':
        return this.handleJP01(player, board, format);
      case 'JP03':
      case 'JP04':
        return this.handleJPTargetEnemy(player, board, format);
      case 'JP05':
        return this.handleJPTargetAny(player, board, format);
      case 'JP06':
        return this.handleJP06(player, board, format);
      // Battle cards (TP)
      case 'TP01':
        return this.handleTP01(player, board, format);
      case 'TP02':
        return this.handleTP02(player, board, format);
      case 'TP03':
        return this.handleTP03(player, board, format);
      case 'TP04':
        return this.handleTP04(player, board, format);
      // Special cards side selection
      case 'ZP04':
      case 'ZPT1':
      case 'CZ03':
      case 'CZ05':
        return this.handleSideSelection(player, board);
      case 'ZPT2':
      case 'ZPT3':
        return this.handleMenuSelection(player, board, format);
      // Operations
      case 'CZ01':
        return this.handleCZ01(player, board, format);
      case 'CZ02':
        return this.handleCZ02(player, board, format);
      case 'CZ04':
        return this.handleCZ04(player, board, format);
      // Event effects (SJ*)
      case 'SJ101':
      case 'SJ103':
      case 'SJ104':
      case 'SJ202':
        return this.handleSJTarget(player, board, format);
      case 'SJH01':
        return this.handleSJH01(player, board, format);
      case 'SJH02':
        return '1'; // Always show hand
      // Hero skills (JN*)
      case 'JN10102':
        return this.handleJN10102(player, board, format);
      case 'JN20201':
        return '2'; // SuMei: always reroll monster (greedy)
      case 'JN30501':
        return this.findLowestHPAlly(player, board, this.parseOptions(format));
      case 'JN50203':
        return this.handleJN50203(player, board, format);
      case 'JN50502':
        return this.handleJN50502(player, board, format);
      case 'JN40102':
        return this.handleGeneric(player, board, format);
      case 'JN40302':
        return this.handleJN40302(player, board, format);
      case 'JN10602':
        return '2'; // Jiujianxian: always do second battle
      case 'JNH0403':
        return this.handleGeneric(player, board, format);
      case 'JNH0206':
        return this.handleGeneric(player, board, format);
      // Equipment consume
      case 'WQ02':
        return this.handleGeneric(player, board, format);
      case 'FJ02':
        return this.handleFJ02(player, board, format);
      case 'FJT1':
        return this.handleFJT1(player, board, format);
      // Death/revival
      case 'G0ZW':
        return this.handleDeathLegacy(player, board, format);
      case 'GF04':
        return this.handleGF04Revive(player, board, format);
      default:
        return this.handleGeneric(player, board, format);
    }
  }

  // ─── ZW: Support/Obstruction ───

  private handleZW(player: Player, board: Board, format: string): string {
    // Parse available support/hinder targets
    const options = this.parseOptions(format);

    // If only "/" option, skip
    if (options.length === 1 && options[0] === '/') return '/';

    // For supporter selection: always pick a teammate (not self)
    // For hinderer selection: pick first enemy
    if (options.length > 0) {
      // Find best teammate to support (highest HP)
      let bestOption = options[0];
      let bestHp = -1;
      for (const opt of options) {
        if (opt.startsWith('T')) {
          const uid = parseInt(opt.substring(1), 10);
          const target = board.garden.get(uid);
          if (target && target.isAlive && target.hp > bestHp) {
            bestHp = target.hp;
            bestOption = opt;
          }
        }
      }
      return bestOption;
    }

    return '/';
  }

  // ─── ZD: Battle Card Play ───

  private handleZD(player: Player, board: Board, format: string): string {
    // Parse available ZP cards
    const options = this.parseOptions(format);
    if (options.length === 0 || (options.length === 1 && options[0] === '/')) return '/';

    // Filter out "/" from playable options
    const cards = options.filter(o => o !== '/');
    if (cards.length === 0) return '/';

    // Calculate power difference (positive = we're winning)
    const powerDiff = this.calculatePowerDiff(player, board);

    // Strategy based on power difference:
    // - Large deficit (-5 or worse): use TP01 金蝉脱壳 to escape
    // - Small deficit (-1 to -4): use TP02 金蚕王 for +3 power boost
    // - Even or advantage (0+): use TP03 天玄五音 or TP04 天罡战气

    // Try to find optimal card based on situation
    for (const card of cards) {
      const cardId = card.replace(/[^A-Z0-9]/g, '');

      // Escape card: use when in big trouble
      if (cardId.startsWith('ZP01') && powerDiff <= -5) {
        return card;
      }

      // Power boost card: use when slightly behind
      if (cardId.startsWith('ZP02') && powerDiff >= -4 && powerDiff <= -1) {
        return card;
      }

      // Side boost card: use when even or ahead
      if (cardId.startsWith('ZP03') && powerDiff >= 0) {
        return card;
      }

      // Double power card: use when ahead
      if (cardId.startsWith('ZP04') && powerDiff >= 2) {
        return card;
      }
    }

    // If no optimal card found, play first available
    return cards[0];
  }

  private calculatePowerDiff(player: Player, board: Board): number {
    // Get all players in battle
    const allies = Array.from(board.garden.values()).filter(
      p => p && p.isAlive && p.team === player.team
    );
    const enemies = Array.from(board.garden.values()).filter(
      p => p && p.isAlive && p.team !== player.team
    );

    // Use str + dex as basic power calculation
    const allyPower = allies.reduce((sum, p) => sum + (p?.str || 0) + (p?.dex || 0), 0);
    const enemyPower = enemies.reduce((sum, p) => sum + (p?.str || 0) + (p?.dex || 0), 0);

    return allyPower - enemyPower;
  }

  // ─── NPC Target Selection ───

  private handleNPCTarget(player: Player, board: Board, format: string, code: string): string {
    const options = this.parseOptions(format);
    if (options.length === 0) return '';

    // Heal-type NPCs (NJ02): target ally with lowest HP
    if (code === 'NJ02') {
      return this.findLowestHPAlly(player, board, options);
    }

    // Harm-type NPCs (NJ05, NJH3): target enemy with lowest HP
    if (code === 'NJ05' || code === 'NJH3') {
      return this.findLowestHPEnemy(player, board, options);
    }

    // Trade/transfer NPCs (NJ06): pick first option
    return options[0];
  }

  private handleNJ01(player: Player, board: Board, format: string): string {
    // NPC Join: select teammate to discard hand, then select teammate to become hero
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    // Pick the teammate with the most hand cards (more HP from join)
    let bestOption = options[0];
    let maxCards = -1;
    for (const opt of options) {
      const uid = parseInt(opt, 10);
      const target = board.garden.get(uid);
      if (target && target.tux.length > maxCards) {
        maxCards = target.tux.length;
        bestOption = opt;
      }
    }
    return bestOption;
  }

  private handleNJ06(player: Player, board: Board, format: string): string {
    // NPC Trade: select player who has cards to give
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    // Pick the player with the most hand cards
    let bestOption = options[0];
    let maxCards = -1;
    for (const opt of options) {
      const uid = parseInt(opt, 10);
      const target = board.garden.get(uid);
      if (target && target.tux.length > maxCards) {
        maxCards = target.tux.length;
        bestOption = opt;
      }
    }
    return bestOption;
  }

  private handleNJ08(_player: Player, _board: Board, format: string): string {
    // NPC Discard: select target to discard from
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    return options[0];
  }

  private handleNJT1(_player: Player, _board: Board, _format: string): string {
    // NPC Trial: always keep ("是" = option 1)
    return '1';
  }

  // ─── EV: Event Card Flip ───

  private handleEV(player: Player, _board: Board, _format: string): string {
    // Flip event card if team avg HP > 50%, else skip
    const avgHp = player.hp / player.hpBase;
    return avgHp > 0.5 ? '2' : '1'; // 2=flip, 1=skip
  }

  // ─── JP: Skill Card Handlers ───

  private handleJP01(player: Player, board: Board, format: string): string {
    // JP01 鼠儿果: give 2 cards to ally — target lowest HP ally
    return this.findLowestHPAlly(player, board, this.parseOptions(format));
  }

  private handleJPTargetEnemy(player: Player, board: Board, format: string): string {
    // JP03 偷盗 / JP04 铜钱镖: target enemy
    return this.findLowestHPEnemy(player, board, this.parseOptions(format));
  }

  private handleJPTargetAny(player: Player, board: Board, format: string): string {
    // JP05 天雷破: target any player — pick enemy with lowest HP
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    // Try to find enemy first
    const enemyTarget = this.findLowestHPEnemy(player, board, options);
    if (enemyTarget) return enemyTarget;
    return options[0];
  }

  private handleJP06(player: Player, board: Board, format: string): string {
    // JP06 五气朝元: heal all allies, may discard for extra — pick first card or skip
    const options = this.parseOptions(format);
    if (options.length === 0 || (options.length === 1 && options[0] === '/')) return '/';
    return options[0];
  }

  // ─── TP: Battle Card Handlers ───

  private handleTP01(player: Player, _board: Board, _format: string): string {
    // TP01 金蝉脱壳: escape battle — use when HP is low
    return player.hp <= 3 ? '1' : '/';
  }

  private handleTP02(player: Player, _board: Board, format: string): string {
    // TP02 金蚕王: +3 power to self or ally
    const options = this.parseOptions(format);
    if (options.length === 0 || (options.length === 1 && options[0] === '/')) return '/';
    // Pick self or lowest HP ally
    for (const opt of options) {
      if (opt === String(player.uid)) return opt;
    }
    return options[0];
  }

  private handleTP03(player: Player, _board: Board, format: string): string {
    // TP03 天玄五音: +2 power to a side — pick own side
    return player.team.toString();
  }

  private handleTP04(_player: Player, _board: Board, _format: string): string {
    // TP04 天罡战气: double equipment/pet/skill power — always use
    return '1';
  }

  // ─── CZ: Operation Handlers ───

  private handleCZ01(player: Player, _board: Board, format: string): string {
    // CZ01: discard a card — pick lowest value
    const options = this.parseOptions(format);
    if (options.length === 0) return '';

    // Card value ranking (lower = less valuable, discard first)
    const cardValue: Record<string, number> = {
      // Basic cards (lowest value)
      '101': 1, '102': 1, '103': 1, '104': 1, '105': 1,
      // Skill cards (medium value)
      '201': 3, '202': 3, '203': 3, '204': 3, '205': 3, '206': 3,
      // Battle cards (higher value)
      '301': 4, '302': 4, '303': 4, '304': 4,
      // Special cards (highest value)
      '401': 5, '402': 5, '403': 5, '404': 5,
    };

    // Find card with lowest value
    let bestCard = options[0];
    let bestValue = Infinity;

    for (const opt of options) {
      const cardId = opt.replace(/[^0-9]/g, '');
      const value = cardValue[cardId] || 2; // Default medium value
      if (value < bestValue) {
        bestValue = value;
        bestCard = opt;
      }
    }

    return bestCard;
  }

  private handleCZ02(_player: Player, _board: Board, _format: string): string {
    // CZ02: melee (混战) — always发动 for more action
    return '2'; // 2=发动
  }

  // ─── SJ: Event Effect Handlers ───

  private handleSJTarget(player: Player, board: Board, format: string): string {
    // Generic event target: pick ally for beneficial, enemy for harmful
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    // If format mentions "敌方" or enemy, target enemy; else target ally
    if (format.includes('敌') || format.includes('攻击') || format.includes('伤害')) {
      return this.findLowestHPEnemy(player, board, options);
    }
    return this.findLowestHPAlly(player, board, options);
  }

  private handleSJH01(player: Player, board: Board, format: string): string {
    // SJH01 大军围蜀山: pick cards from display or pick player
    const options = this.parseOptions(format);
    if (options.length === 0 || (options.length === 1 && options[0] === '/')) return '/';
    return options[0];
  }

  // ─── Side/Menu Selection ───

  private handleSideSelection(player: Player, _board: Board): string {
    // Side selection: choose team 1 (仙) or 2 (剑)
    // Return own team number to benefit self
    return player.team.toString();
  }

  private handleMenuSelection(_player: Player, _board: Board, format: string): string {
    // Menu selection: parse options from format and pick the most beneficial
    const options = this.parseOptions(format);
    if (options.length === 0) return '1';
    // Default to first option
    return options[0];
  }

  // ─── Generic Handler ───

  private handleGeneric(player: Player, board: Board, format: string): string {
    const options = this.parseOptions(format);
    if (options.length === 0) return '';

    // If only "/" option, skip
    if (options.length === 1 && options[0] === '/') return '/';

    // For player targets, prefer allies for buffs and enemies for debuffs
    // Default: pick first option
    return options[0];
  }

  // ─── Hero Skill Handlers ───

  private handleJN10102(_player: Player, _board: Board, format: string): string {
    // JN10102 李逍遥偷取阻碍: two-step input, pick first option
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    if (options.length === 1 && options[0] === '/') return '/';
    return options[0];
  }

  private handleJN50203(_player: Player, _board: Board, format: string): string {
    // JN50203 韩菱纱从死亡角色偷取: dynamic card+target loop, pick first option
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    if (options.length === 1 && options[0] === '/') return '/';
    return options[0];
  }

  private handleJN50502(player: Player, board: Board, format: string): string {
    // JN50502 玄霄羁绊: pick ally to bond with — lowest HP ally
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    return this.findLowestHPAlly(player, board, options);
  }

  private handleJN40302(_player: Player, _board: Board, format: string): string {
    // JN40302 星璇重分配手牌: dynamic card+target loop, pick first option
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    if (options.length === 1 && options[0] === '/') return '/';
    return options[0];
  }

  // ─── Equipment Consume Handlers ───

  private handleFJ02(_player: Player, _board: Board, format: string): string {
    // FJ02 龙魂战铠弃牌防伤: pick first card to discard
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    if (options.length === 1 && options[0] === '/') return '/';
    return options[0];
  }

  private handleFJT1(_player: Player, _board: Board, format: string): string {
    // FJT1 转移伤害: two-step input (pick card, then enemy target)
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    if (options.length === 1 && options[0] === '/') return '/';
    return options[0];
  }

  // ─── Death/Revival Handlers ───

  private handleDeathLegacy(player: Player, board: Board, format: string): string {
    // G0ZW P300: pick teammate for legacy cards — highest HP ally
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    let bestTarget = options[0];
    let maxHp = -1;
    for (const opt of options) {
      const uid = parseInt(opt.replace('T', ''), 10);
      const target = board.garden.get(uid);
      if (target && target.isAlive && target.team === player.team && target.hp > maxHp) {
        maxHp = target.hp;
        bestTarget = opt;
      }
    }
    return bestTarget;
  }

  private handleGF04Revive(player: Player, board: Board, format: string): string {
    // GF04 蝶精复活: pick 0-HP ally to revive
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    // Find dead ally (HP <= 0)
    for (const opt of options) {
      const uid = parseInt(opt.replace('T', ''), 10);
      const target = board.garden.get(uid);
      if (target && target.team === player.team && target.hp <= 0) {
        return opt;
      }
    }
    // Fallback: first option
    return options[0];
  }

  // ─── Additional Operation Handlers ───

  private handleCZ04(_player: Player, _board: Board, format: string): string {
    // CZ04 化象: pick trove to use
    const options = this.parseOptions(format);
    if (options.length === 0) return '';
    if (options.length === 1 && options[0] === '/') return '/';
    return options[0];
  }

  // ─── Helper Methods ───

  private findLowestHPAlly(player: Player, board: Board, options: string[]): string {
    let bestTarget = options[0];
    let minHp = Infinity;
    for (const opt of options) {
      const uid = parseInt(opt.replace('T', ''), 10);
      const target = board.garden.get(uid);
      if (target && target.isAlive && target.team === player.team && target.hp < minHp) {
        minHp = target.hp;
        bestTarget = opt;
      }
    }
    // If no ally found, fall back to first option
    return bestTarget;
  }

  private findLowestHPEnemy(player: Player, board: Board, options: string[]): string {
    let bestTarget = options[0];
    let minHp = Infinity;
    for (const opt of options) {
      const uid = parseInt(opt.replace('T', ''), 10);
      const target = board.garden.get(uid);
      if (target && target.isAlive && target.team !== player.team && target.hp < minHp) {
        minHp = target.hp;
        bestTarget = opt;
      }
    }
    return bestTarget;
  }

  private isHealAction(action: string): boolean {
    return action.includes('heal') || action.includes('cure') ||
      action.includes('IH') || action.includes('TP02');
  }

  private isAttackAction(action: string): boolean {
    return action.includes('attack') || action.includes('harm') ||
      action.includes('OH') || action.includes('JP');
  }

  /**
   * Parse the format string to extract selectable options.
   * Handles multiple format types:
   *   J1(pT1pT2)     -> ["T1", "T2"] (ZW battle choice)
   *   (p1p2p3)       -> ["1", "2", "3"] (player selection)
   *   (c101c102)     -> ["101", "102"] (card selection)
   *   (X1X2X3)       -> ["1", "2", "3"] (generic letter prefix)
   *   S              -> ["1", "2"] (side selection)
   *   #...##opt1##opt2,Y2 -> ["1", "2"] (yes/no menu)
   *   /              -> ["/"] (skip)
   */
  private parseOptions(format: string): string[] {
    // Side selection format: bare "S"
    if (format.trim() === 'S') {
      return ['1', '2'];
    }

    // Yes/No menu format: #描述##选项1##选项2,Y{count}
    const menuMatch = format.match(/##(.+),Y(\d+)/);
    if (menuMatch) {
      const optionsStr = menuMatch[1];
      const allOptions = optionsStr.split('##').filter(s => s !== '');
      return allOptions.map((_, i) => String(i + 1));
    }

    // ZW battle choice format: J1(pT1pT2...)
    const zwMatch = format.match(/J1\(p(T\d+(?:pT\d+)*)\)/);
    if (zwMatch) {
      return zwMatch[1].split('p');
    }

    // Player format: (p1p2p3)
    const playerMatch = format.match(/\(p(\d+(?:p\d+)*)\)/);
    if (playerMatch) {
      return playerMatch[1].split('p');
    }

    // Card format: (c101c102)
    const cardMatch = format.match(/\(c(\d+(?:c\d+)*)\)/);
    if (cardMatch) {
      return cardMatch[1].split('c');
    }

    // Generic format: (X1X2X3) where X is any letter
    const genericMatch = format.match(/\(([a-zA-Z])(\d+(?:\1\d+)*)\)/);
    if (genericMatch) {
      return genericMatch[2].split(genericMatch[1]);
    }

    // Leading "/" option (skippable)
    if (format.startsWith('/')) {
      // Check if there are other options after "/"
      const afterSlash = format.substring(1);
      const slashOptions = this.parseOptions(afterSlash);
      if (slashOptions.length > 0) {
        return [...slashOptions, '/'];
      }
      return ['/'];
    }

    // If no options found but format contains "/" (skip option), return "/" as valid choice
    if (format.includes('/')) {
      return ['/'];
    }

    return [];
  }
}
