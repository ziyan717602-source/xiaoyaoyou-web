/**
 * GreedyAI - Greedy decision strategy
 *
 * Prioritizes aggressive actions: deals damage when possible,
 * targets lowest-HP enemies, and selects high-HP heroes.
 */

import type { AIStrategy } from './types';
import type { Board } from '../board';
import type { Player } from '../player';
import type { Hero } from '../card/hero';

export class GreedyAI implements AIStrategy {
  readonly name = 'greedy';

  selectHero(availableHeroes: Hero[]): number {
    if (availableHeroes.length === 0) return 0;
    // Select hero with highest HP
    let bestHero = availableHeroes[0];
    for (const hero of availableHeroes) {
      if (hero.hp > bestHero.hp) {
        bestHero = hero;
      }
    }
    return bestHero.avatar;
  }

  makeMainPhaseDecision(
    _player: Player,
    _board: Board,
    validActions: string[],
  ): string {
    if (validActions.length === 0) return 'skip';

    // Prioritize: play card > use skill > other actions
    const cardActions = validActions.filter(a => a.startsWith('play:'));
    if (cardActions.length > 0) return cardActions[0];

    const skillActions = validActions.filter(a => a.startsWith('skill:'));
    if (skillActions.length > 0) return skillActions[0];

    return validActions[0];
  }

  makeBattleDecision(
    _player: Player,
    board: Board,
    validTargets: number[],
  ): number {
    if (validTargets.length === 0) return 0;

    // Target the player with lowest HP
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
      // Battle card play
      case 'ZD':
        return this.handleZD(player, board, format);
      // Event card: always flip (greedy)
      case 'EV':
        return '2';
      // NPC effects
      case 'NP':
        return '1'; // Always use NPC effect
      case 'NJ01':
      case 'NJ06':
      case 'NJ08':
        return this.handleGeneric(player, board, format);
      case 'NJ02':
      case 'NJ03':
      case 'NJ05':
      case 'NJH3':
      case 'NJH4':
      case 'NJH5':
      case 'NJH6':
      case 'NJT2':
        return this.handleNPCTarget(player, board, format, code);
      case 'NJT1':
        return '1'; // Always keep monster
      // Skill cards
      case 'JP01':
      case 'JP03':
      case 'JP04':
      case 'JP05':
        return this.handleGeneric(player, board, format);
      case 'JP06':
        return this.handleGeneric(player, board, format);
      // Battle cards: always use
      case 'TP01':
        return '1'; // Always escape (preserve HP)
      case 'TP02':
      case 'TP03':
      case 'TP04':
        return '1';
      // Side selection
      case 'ZP04':
      case 'ZPT1':
      case 'CZ03':
      case 'CZ05':
        return player.team.toString();
      case 'ZPT2':
      case 'ZPT3':
        return this.handleMenuSelection(player, board, format);
      // Operations
      case 'CZ01':
        return this.handleGeneric(player, board, format);
      case 'CZ02':
        return '2'; // Always发动 melee
      // Event effects
      case 'SJ101':
      case 'SJ103':
      case 'SJ104':
      case 'SJ202':
      case 'SJH01':
        return this.handleGeneric(player, board, format);
      case 'SJH02':
        return '1'; // Always show hand
      // Hero skills (JN*)
      case 'JN10102':
      case 'JN50203':
      case 'JN40302':
      case 'JNH0403':
      case 'JNH0206':
        return this.handleGeneric(player, board, format);
      case 'JN20201':
        return '2'; // SuMei: always reroll monster
      case 'JN30501':
        return this.findLowestHPAlly(player, board, this.parseOptions(format));
      case 'JN50502':
        return this.findLowestHPAlly(player, board, this.parseOptions(format));
      case 'JN40102':
        return this.handleGeneric(player, board, format);
      case 'JN10602':
        return '2'; // Jiujianxian: always do second battle
      // Equipment consume
      case 'WQ02':
      case 'FJ02':
      case 'FJT1':
        return this.handleGeneric(player, board, format);
      // Death/revival
      case 'G0ZW':
        return this.handleDeathLegacy(player, board, format);
      case 'GF04':
        return this.handleGF04Revive(player, board, format);
      // Operations
      case 'CZ04':
        return this.handleGeneric(player, board, format);
      default:
        return this.handleGeneric(player, board, format);
    }
  }

  // ─── ZW: Support/Obstruction (Greedy: always fight) ───

  private handleZW(player: Player, board: Board, format: string): string {
    const options = this.parseOptions(format);
    if (options.length === 1 && options[0] === '/') return '/';
    if (options.length > 0) {
      // Greedy: pick first available supporter/hinderer
      return options[0];
    }
    return '/';
  }

  // ─── ZD: Battle Card Play (Greedy: play first card) ───

  private handleZD(_player: Player, _board: Board, format: string): string {
    const options = this.parseOptions(format);
    const cards = options.filter(o => o !== '/');
    if (cards.length > 0) return cards[0];
    return '/';
  }

  // ─── NPC Target Selection ───

  private handleNPCTarget(player: Player, board: Board, format: string, code: string): string {
    const options = this.parseOptions(format);
    if (options.length === 0) return '';

    // Heal NPCs: target ally with lowest HP
    if (code === 'NJ02') {
      return this.findLowestHPAlly(player, board, options);
    }

    // Harm NPCs: target enemy with lowest HP
    if (code === 'NJ05' || code === 'NJH3') {
      return this.findLowestHPEnemy(player, board, options);
    }

    return options[0];
  }

  // ─── Menu Selection ───

  private handleMenuSelection(_player: Player, _board: Board, format: string): string {
    const options = this.parseOptions(format);
    return options.length > 0 ? options[0] : '1';
  }

  // ─── Generic Handler ───

  private handleGeneric(_player: Player, _board: Board, format: string): string {
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
    for (const opt of options) {
      const uid = parseInt(opt.replace('T', ''), 10);
      const target = board.garden.get(uid);
      if (target && target.team === player.team && target.hp <= 0) {
        return opt;
      }
    }
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

  /**
   * Parse the format string to extract selectable options.
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
      const afterSlash = format.substring(1);
      const slashOptions = this.parseOptions(afterSlash);
      if (slashOptions.length > 0) {
        return [...slashOptions, '/'];
      }
      return ['/'];
    }

    if (format.includes('/')) {
      return ['/'];
    }

    return [];
  }
}
