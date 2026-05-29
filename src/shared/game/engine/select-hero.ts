/**
 * SelectHero - Hero selection system
 * Translation of C# PSDGamepkg.XIS.cs SelectHero
 *
 * Manages the hero selection phase before the game starts.
 * Supports multiple casting modes: pick, table, public, congress.
 */

import type { Board } from '../board';
import type { Player } from '../player';
import { EventBus } from './event-bus';
import { Casting, CastingPick, CastingTable, CastingPublic, CastingCongress } from '../rules/casting';
import type { LibGroup } from '../lib-group';
import type { Hero } from '../card/hero';
import { Card } from '../card/card';

/** Selection configuration */
export interface SelectHeroConfig {
  mode: 'pick' | 'table' | 'public' | 'congress';
  playerCount: number;
  heroCount: number;
}

/**
 * SelectHero - manages hero selection flow.
 */
export class SelectHero {
  private board: Board;
  private eventBus: EventBus;
  private libGroup: LibGroup;
  private config: SelectHeroConfig;
  private casting: Casting | null = null;
  private levelCode: number;

  constructor(board: Board, eventBus: EventBus, libGroup: LibGroup, levelCode: number) {
    this.board = board;
    this.eventBus = eventBus;
    this.libGroup = libGroup;
    this.levelCode = levelCode;
    this.config = {
      mode: 'pick',
      playerCount: 2,
      heroCount: 5,
    };
  }

  /**
   * Run the hero selection process.
   */
  async run(selCode: number): Promise<void> {
    this.config.mode = this.getModeFromSelCode(selCode);
    await this.initialize();
    await this.selectLoop();
    await this.confirmSelection();
  }

  /**
   * Initialize the selection process.
   */
  private async initialize(): Promise<void> {
    const availableHeroes = this.getAvailableHeroes();
    this.casting = this.createCasting(availableHeroes);

    this.eventBus.emit('select:init', {
      casting: this.casting,
      availableHeroes,
    });
  }

  /**
   * Selection loop - each player picks their hero.
   */
  private async selectLoop(): Promise<void> {
    let round = 0;
    while (!this.isSelectionComplete()) {
      round++;

      for (const player of this.board.garden.values()) {
        if (player.isReal && !this.hasSelected(player.uid)) {
          await this.waitForPlayerSelection(player);
        }
      }

      this.eventBus.emit('select:round', { round });
    }
  }

  /**
   * Wait for a player to make their selection.
   */
  private async waitForPlayerSelection(player: Player): Promise<void> {
    return new Promise<void>((resolve) => {
      const handler = (data: unknown) => {
        const d = data as { playerId: number; heroId: number };
        if (d.playerId === player.uid) {
          this.processSelection(player.uid, d.heroId);
          resolve();
          return false;
        }
        return undefined;
      };
      this.eventBus.once('select:pick', handler);
    });
  }

  /**
   * Process a player's selection.
   */
  processSelection(playerId: number, heroId: number): boolean {
    if (!this.casting) return false;

    if (!this.isValidSelection(playerId, heroId)) {
      this.eventBus.emit('select:invalid', { playerId, heroId });
      return false;
    }

    if (this.casting instanceof CastingPick) {
      this.casting.pick(playerId, heroId);
    }

    this.eventBus.emit('select:pick', { playerId, heroId });
    return true;
  }

  /**
   * Validate a selection.
   */
  private isValidSelection(playerId: number, heroId: number): boolean {
    if (!this.casting) return false;
    if (heroId === 0) return false;

    const player = this.board.garden.get(playerId);
    if (!player || !player.isReal) return false;

    if (this.hasSelected(playerId)) return false;

    return true;
  }

  /**
   * Check if selection is complete.
   */
  private isSelectionComplete(): boolean {
    for (const player of this.board.garden.values()) {
      if (player.isReal && !this.hasSelected(player.uid)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if a player has selected.
   */
  private hasSelected(playerId: number): boolean {
    if (!this.casting) return false;
    if (this.casting instanceof CastingPick) {
      return (this.casting.ding.get(playerId) ?? 0) !== 0;
    }
    return false;
  }

  /**
   * Confirm the selection results.
   */
  private async confirmSelection(): Promise<void> {
    if (!this.casting) return;

    for (const player of this.board.garden.values()) {
      if (player.isReal) {
        let heroId = 0;
        if (this.casting instanceof CastingPick) {
          heroId = this.casting.ding.get(player.uid) ?? 0;
        }
        if (heroId !== 0) {
          player.selectHero = heroId;
        }
      }
    }

    this.eventBus.emit('select:confirm', {
      casting: this.casting,
    });
  }

  /**
   * Get available heroes for selection.
   */
  private getAvailableHeroes(): Hero[] {
    const heroLib = this.libGroup.hl;
    return heroLib.listAllSeleable(this.levelCode);
  }

  /**
   * Create the appropriate Casting instance based on mode.
   */
  private createCasting(heroes: Hero[]): Casting {
    switch (this.config.mode) {
      case 'pick': {
        const casting = new CastingPick();
        const heroCodes = this.pickRandomHeroes(heroes, this.config.heroCount);
        for (const player of this.board.garden.values()) {
          if (player.isReal) {
            casting.init(player.uid, heroCodes);
          }
        }
        return casting;
      }
      case 'table': {
        const heroCodes = this.pickRandomHeroes(heroes, 15);
        return new CastingTable(heroCodes);
      }
      case 'public': {
        const heroCodes = this.pickRandomHeroes(heroes, 15);
        return new CastingPublic(heroCodes);
      }
      case 'congress': {
        const akaHeroes = this.pickRandomHeroes(heroes, 8);
        const aoHeroes = this.pickRandomHeroes(heroes, 8);
        const secrets = this.pickRandomHeroes(heroes, 3);
        return new CastingCongress(akaHeroes, aoHeroes, secrets);
      }
      default:
        return new CastingPick();
    }
  }

  /**
   * Pick random heroes from the available pool.
   */
  private pickRandomHeroes(heroes: Hero[], count: number): number[] {
    const shuffled = [...heroes].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(h => h.avatar);
  }

  /**
   * Map selection mode code to mode string.
   */
  private getModeFromSelCode(selCode: number): SelectHeroConfig['mode'] {
    if (selCode >= 0 && selCode <= 10) return 'pick';
    if (selCode >= 11 && selCode <= 20) return 'table';
    if (selCode >= 21 && selCode <= 30) return 'public';
    if (selCode >= 31 && selCode <= 40) return 'congress';
    return 'pick';
  }

  /**
   * Get the current Casting instance.
   */
  getCasting(): Casting | null {
    return this.casting;
  }

  /**
   * Get configuration.
   */
  getConfig(): SelectHeroConfig {
    return { ...this.config };
  }

  /**
   * Set configuration.
   */
  setConfig(config: Partial<SelectHeroConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
