/**
 * LibGroup - Translation of C# PSD.Base.LibGroup
 * Aggregates all Lib instances
 */
import { HeroLib } from './lib/hero-lib';
import { TuxLib } from './lib/tux-lib';
import { MonsterLib } from './lib/monster-lib';
import { NpcLib } from './lib/npc-lib';
import { EvenementLib } from './lib/evenement-lib';
import { SkillLib } from './lib/skill-lib';
import { OperationLib } from './lib/operation-lib';
import { NCActionLib } from './lib/nc-action-lib';
import { RuneLib } from './lib/rune-lib';
import { ExspLib } from './lib/exsp-lib';

export interface LibGroupData {
  heroData: unknown[];
  tuxData: unknown[];
  monsterData: unknown[];
  npcData: unknown[];
  eveData: unknown[];
  skillData: unknown[];
  opsData: unknown[];
  njData: unknown[];
  runeData: unknown[];
  exspData: unknown[];
}

export class LibGroup {
  readonly hl: HeroLib;
  readonly tl: TuxLib;
  readonly nl: NpcLib;
  readonly ml: MonsterLib;
  readonly el: EvenementLib;
  readonly sl: SkillLib;
  readonly zl: OperationLib;
  readonly nl2: NCActionLib;
  readonly rl: RuneLib;
  readonly esl: ExspLib;

  private initialized = false;

  constructor() {
    this.hl = new HeroLib([]);
    this.tl = new TuxLib([]);
    this.nl = new NpcLib([]);
    this.ml = new MonsterLib([]);
    this.el = new EvenementLib([]);
    this.sl = new SkillLib([]);
    this.zl = new OperationLib([]);
    this.nl2 = new NCActionLib([]);
    this.rl = new RuneLib([]);
    this.esl = new ExspLib([]);
  }

  init(data: LibGroupData): void {
    (this as { hl: HeroLib }).hl = new HeroLib(data.heroData as import('@shared/types/hero').Hero[]);
    (this as { tl: TuxLib }).tl = new TuxLib(data.tuxData as import('@shared/types/tux').Tux[]);
    (this as { ml: MonsterLib }).ml = new MonsterLib(data.monsterData as import('@shared/types/monster').Monster[]);
    (this as { nl: NpcLib }).nl = new NpcLib(data.npcData as import('@shared/types/npc').NPC[]);
    (this as { el: EvenementLib }).el = new EvenementLib(data.eveData as import('@shared/types/evenement').Evenement[]);
    (this as { sl: SkillLib }).sl = new SkillLib(data.skillData as import('@shared/types/skill').Skill[]);
    (this as { zl: OperationLib }).zl = new OperationLib(data.opsData as import('@shared/types/operation').Operation[]);
    (this as { nl2: NCActionLib }).nl2 = new NCActionLib(data.njData as import('@shared/types/nc-action').NCAction[]);
    (this as { rl: RuneLib }).rl = new RuneLib(data.runeData as import('@shared/types/rune').Rune[]);
    (this as { esl: ExspLib }).esl = new ExspLib(data.exspData as import('@shared/types/exsp').Exsp[]);
    this.initialized = true;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }
}
