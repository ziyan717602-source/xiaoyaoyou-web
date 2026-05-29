/**
 * RoundManager - Round state machine
 * Translation of C# PSDGamepkg.XIR.cs
 *
 * The round state machine manages the flow of a single round.
 * Each round follows the pattern: 00 -> OC -> ST -> EP -> EV -> EE -> GS -> GR -> GE ->
 *   Z0 -> ZW -> (ZU ->) ZM -> (NP -> ZM | Z1 -> Z8 -> CC -> PD -> ZC -> ZD ->) ZF -> ZZ -> BC -> QR -> TM -> IC -> ED
 *
 * The string-based stage codes (e.g. "R100", "R1OC", "R1ST") are preserved
 * to maintain compatibility with the original C# protocol.
 */

import { EventBus } from './event-bus';
import type { Board } from '../board';
import type { Player } from '../player';
import type { LibGroup } from '../lib-group';
import { NMBLib } from '../card/nmb';

/** Round phase stages matching C# XIR.cs cases */
export enum RoundPhase {
  /** Round initialization (00) */
  INIT = '00',
  /** OC stage - opening */
  OC = 'OC',
  /** ST stage - start */
  ST = 'ST',
  /** EP stage - event preparation */
  EP = 'EP',
  /** EV stage - event view */
  EV = 'EV',
  /** EE stage - event execute */
  EE = 'EE',
  /** GS stage - gift start */
  GS = 'GS',
  /** GR stage - gift receive */
  GR = 'GR',
  /** GE stage - gift end */
  GE = 'GE',
  /** Z0 stage - battle preparation */
  Z0 = 'Z0',
  /** ZW stage - team assignment */
  ZW = 'ZW',
  /** ZU stage - support/hinder update */
  ZU = 'ZU',
  /** ZM stage - monster reveal */
  ZM = 'ZM',
  /** NP stage - NPC encounter */
  NP = 'NP',
  /** Z1 stage - monster silence/campaign */
  Z1 = 'Z1',
  /** Z8 stage - pre-battle */
  Z8 = 'Z8',
  /** CC stage - curtain call (monster debut) */
  CC = 'CC',
  /** PD stage - pet debut */
  PD = 'PD',
  /** ZC stage - player pool */
  ZC = 'ZC',
  /** ZD stage - main battle */
  ZD = 'ZD',
  /** ZF stage - fight cleanup */
  ZF = 'ZF',
  /** ZE stage - monster defeated */
  ZE = 'ZE',
  /** ZZ stage - post-fight */
  ZZ = 'ZZ',
  /** BC stage - battle cards */
  BC = 'BC',
  /** QR stage - quarter reset */
  QR = 'QR',
  /** TM stage - turn move */
  TM = 'TM',
  /** IC stage - intermission close */
  IC = 'IC',
  /** ED stage - end */
  ED = 'ED',
}

/** Allowed transitions from each phase */
export const PHASE_TRANSITIONS: Record<string, string[]> = {
  [RoundPhase.INIT]: [RoundPhase.OC],
  [RoundPhase.OC]: [RoundPhase.ST],
  [RoundPhase.ST]: [RoundPhase.EP],
  [RoundPhase.EP]: [RoundPhase.EV],
  [RoundPhase.EV]: [RoundPhase.EE],
  [RoundPhase.EE]: [RoundPhase.GS],
  [RoundPhase.GS]: [RoundPhase.GR],
  [RoundPhase.GR]: [RoundPhase.GE],
  [RoundPhase.GE]: [RoundPhase.Z0],
  [RoundPhase.Z0]: [RoundPhase.ZW],
  [RoundPhase.ZW]: [RoundPhase.ZU, RoundPhase.ZF],
  [RoundPhase.ZU]: [RoundPhase.ZM],
  [RoundPhase.ZM]: [RoundPhase.NP, RoundPhase.Z1, RoundPhase.ED],
  [RoundPhase.NP]: [RoundPhase.ZM, RoundPhase.ZF],
  [RoundPhase.Z1]: [RoundPhase.Z8],
  [RoundPhase.Z8]: [RoundPhase.CC],
  [RoundPhase.CC]: [RoundPhase.PD],
  [RoundPhase.PD]: [RoundPhase.ZC],
  [RoundPhase.ZC]: [RoundPhase.ZD],
  [RoundPhase.ZD]: [RoundPhase.ZF],
  [RoundPhase.ZF]: [RoundPhase.ZZ, RoundPhase.ED],
  [RoundPhase.ZZ]: [RoundPhase.BC],
  [RoundPhase.BC]: [RoundPhase.QR],
  [RoundPhase.QR]: [RoundPhase.TM],
  [RoundPhase.TM]: [RoundPhase.IC],
  [RoundPhase.IC]: [RoundPhase.ED],
  [RoundPhase.ZE]: [RoundPhase.ED],
  [RoundPhase.ED]: [],
};

/**
 * Round state information.
 */
export interface RoundState {
  phase: RoundPhase;
  roundNumber: number;
  rounderUid: number;
  previousPhase: RoundPhase | null;
  stageCode: string;
  phaseData: Record<string, unknown>;
  /** Whether the rounder chose to fight during ZW */
  isFight: boolean;
  /** Whether an NPC was encountered but not taken (loop back to ZM) */
  monsterEncountered: boolean;
}

/**
 * RoundManager - manages the round state machine.
 */
export class RoundManager {
  private board: Board;
  private eventBus: EventBus;
  private libGroup: LibGroup;
  private state: RoundState;
  private phaseHandlers = new Map<RoundPhase, (state: RoundState) => Promise<void> | void>();

  constructor(board: Board, eventBus: EventBus, libGroup: LibGroup) {
    this.board = board;
    this.eventBus = eventBus;
    this.libGroup = libGroup;
    this.state = {
      phase: RoundPhase.INIT,
      roundNumber: 0,
      rounderUid: 0,
      previousPhase: null,
      stageCode: '',
      phaseData: {},
      isFight: false,
      monsterEncountered: false,
    };
    this.registerPhaseHandlers();
  }

  /**
   * Register default phase handlers.
   */
  private registerPhaseHandlers(): void {
    this.phaseHandlers.set(RoundPhase.INIT, this.onRoundInit.bind(this));
    this.phaseHandlers.set(RoundPhase.OC, this.onOC.bind(this));
    this.phaseHandlers.set(RoundPhase.ST, this.onST.bind(this));
    this.phaseHandlers.set(RoundPhase.EP, this.onEP.bind(this));
    this.phaseHandlers.set(RoundPhase.EV, this.onEV.bind(this));
    this.phaseHandlers.set(RoundPhase.EE, this.onEE.bind(this));
    this.phaseHandlers.set(RoundPhase.GS, this.onGS.bind(this));
    this.phaseHandlers.set(RoundPhase.GR, this.onGR.bind(this));
    this.phaseHandlers.set(RoundPhase.GE, this.onGE.bind(this));
    this.phaseHandlers.set(RoundPhase.Z0, this.onZ0.bind(this));
    this.phaseHandlers.set(RoundPhase.ZW, this.onZW.bind(this));
    this.phaseHandlers.set(RoundPhase.ZU, this.onZU.bind(this));
    this.phaseHandlers.set(RoundPhase.ZM, this.onZM.bind(this));
    this.phaseHandlers.set(RoundPhase.NP, this.onNP.bind(this));
    this.phaseHandlers.set(RoundPhase.Z1, this.onZ1.bind(this));
    this.phaseHandlers.set(RoundPhase.Z8, this.onZ8.bind(this));
    this.phaseHandlers.set(RoundPhase.CC, this.onCC.bind(this));
    this.phaseHandlers.set(RoundPhase.PD, this.onPD.bind(this));
    this.phaseHandlers.set(RoundPhase.ZC, this.onZC.bind(this));
    this.phaseHandlers.set(RoundPhase.ZD, this.onZD.bind(this));
    this.phaseHandlers.set(RoundPhase.ZF, this.onZF.bind(this));
    this.phaseHandlers.set(RoundPhase.ZZ, this.onZZ.bind(this));
    this.phaseHandlers.set(RoundPhase.BC, this.onBC.bind(this));
    this.phaseHandlers.set(RoundPhase.QR, this.onQR.bind(this));
    this.phaseHandlers.set(RoundPhase.TM, this.onTM.bind(this));
    this.phaseHandlers.set(RoundPhase.IC, this.onIC.bind(this));
    this.phaseHandlers.set(RoundPhase.ED, this.onED.bind(this));
  }

  /**
   * Set a custom handler for a specific phase.
   */
  setPhaseHandler(phase: RoundPhase, handler: (state: RoundState) => Promise<void> | void): void {
    this.phaseHandlers.set(phase, handler);
  }

  /**
   * Transition to the next phase.
   */
  async transition(nextPhase: RoundPhase): Promise<void> {
    if (!this.canTransition(nextPhase)) {
      throw new Error(`Invalid transition: ${this.state.phase} -> ${nextPhase}`);
    }

    this.eventBus.emit('phase:before', {
      from: this.state.phase,
      to: nextPhase,
      state: this.state,
    });

    this.state.previousPhase = this.state.phase;

    const handler = this.phaseHandlers.get(nextPhase);
    if (handler) {
      await handler(this.state);
    }

    this.state.phase = nextPhase;
    this.state.stageCode = this.buildStageCode(nextPhase);

    this.eventBus.emit('phase:after', {
      from: this.state.previousPhase,
      to: nextPhase,
      state: this.state,
    });
  }

  /**
   * Check if a transition is valid.
   */
  canTransition(nextPhase: RoundPhase): boolean {
    const allowed = PHASE_TRANSITIONS[this.state.phase];
    if (!allowed) return false;
    return allowed.includes(nextPhase);
  }

  /**
   * Run a complete round from INIT to ED.
   * Uses dynamic phase routing matching the C# RunRound pattern.
   */
  async runRound(): Promise<void> {
    const rounder = this.board.rounder;
    this.state.rounderUid = rounder.uid;
    this.state.roundNumber++;

    // Reset phase to INIT for the new round (skip transition check)
    this.state.phase = RoundPhase.INIT;
    this.state.previousPhase = null;

    // Reset battle state flags
    this.state.isFight = false;
    this.state.monsterEncountered = false;

    const roundCode = `R${rounder.uid}`;

    // Run INIT handler directly (no transition validation -- INIT is the initial state)
    this.state.stageCode = roundCode + RoundPhase.INIT;
    const initHandler = this.phaseHandlers.get(RoundPhase.INIT);
    if (initHandler) {
      await initHandler(this.state);
    }

    // Dynamic stage loop matching C# RunRound pattern
    let rstage: RoundPhase = RoundPhase.OC;

    while (rstage !== RoundPhase.ED) {
      this.state.stageCode = roundCode + rstage;
      await this.transition(rstage);
      rstage = this.getNextPhase(rstage);
    }

    // Final ED phase
    this.state.stageCode = roundCode + RoundPhase.ED;
    await this.transition(RoundPhase.ED);
  }

  /**
   * Determine the next phase based on the current phase and board state.
   * Mirrors the C# switch-case routing in RunRound.
   */
  private getNextPhase(current: RoundPhase): RoundPhase {
    switch (current) {
      // Pre-battle phases
      case RoundPhase.OC: return RoundPhase.ST;
      case RoundPhase.ST: return RoundPhase.EP;
      case RoundPhase.EP: return RoundPhase.EV;
      case RoundPhase.EV: return RoundPhase.EE;
      case RoundPhase.EE: return RoundPhase.GS;
      case RoundPhase.GS: return RoundPhase.GR;
      case RoundPhase.GR: return RoundPhase.GE;
      case RoundPhase.GE: return RoundPhase.Z0;
      case RoundPhase.Z0: return RoundPhase.ZW;

      // Fight decision: supporter/hinder chose to fight -> ZU, else -> ZF
      case RoundPhase.ZW: return this.state.isFight ? RoundPhase.ZU : RoundPhase.ZF;

      // Support/hinder update -> monster reveal
      case RoundPhase.ZU: return RoundPhase.ZM;

      // Monster reveal: branch based on monster type
      case RoundPhase.ZM: return this.getPostZMPhase();

      // NPC encounter: not taken -> ZM (draw again), taken -> ZF
      case RoundPhase.NP: return this.state.monsterEncountered ? RoundPhase.ZM : RoundPhase.ZF;

      // Battle phases
      case RoundPhase.Z1: return RoundPhase.Z8;
      case RoundPhase.Z8: return RoundPhase.CC;
      case RoundPhase.CC: return RoundPhase.PD;
      case RoundPhase.PD: return RoundPhase.ZC;
      case RoundPhase.ZC: return RoundPhase.ZD;
      case RoundPhase.ZD: return RoundPhase.ZF;

      // Post-battle phases
      case RoundPhase.ZF: return RoundPhase.ZZ;
      case RoundPhase.ZZ: return RoundPhase.BC;
      case RoundPhase.BC: return RoundPhase.QR;
      case RoundPhase.QR: return RoundPhase.TM;
      case RoundPhase.TM: return RoundPhase.IC;
      case RoundPhase.IC: return RoundPhase.ED;

      default: return RoundPhase.ED;
    }
  }

  /**
   * Determine the phase after ZM based on the revealed monster type.
   * NPC -> NP, Monster -> Z1, else -> ED (game over / no encounter).
   */
  private getPostZMPhase(): RoundPhase {
    const monsterId = this.board.monster1;
    if (NMBLib.isNPC(monsterId)) {
      return RoundPhase.NP;
    } else if (NMBLib.isMonster(monsterId)) {
      return RoundPhase.Z1;
    }
    // Neither NPC nor monster - no encounter, go to cleanup
    return RoundPhase.ED;
  }

  /**
   * Recycle monster cards to the discard pile and reset board monster state.
   * Mirrors C# RecycleMonster().
   */
  private recycleMonster(): void {
    if (this.board.monster1 !== 0) {
      this.board.monDises.push(this.board.monster1);
      this.board.monster1 = 0;
    }
    if (this.board.monster2 !== 0) {
      this.board.monDises.push(this.board.monster2);
      this.board.monster2 = 0;
    }
    this.board.mon1From = 0;
  }

  /**
   * Build the stage code string (e.g. "R100", "R1OC").
   */
  private buildStageCode(phase: RoundPhase): string {
    return `R${this.state.rounderUid}${phase}`;
  }

  // --- Phase handlers ---

  private async onRoundInit(state: RoundState): Promise<void> {
    this.eventBus.emit('round:init', { roundNumber: state.roundNumber, rounderUid: state.rounderUid });
  }

  private async onOC(state: RoundState): Promise<void> {
    this.eventBus.emit('round:oc', { state });
  }

  private async onST(state: RoundState): Promise<void> {
    this.eventBus.emit('round:st', { state });
  }

  private async onEP(state: RoundState): Promise<void> {
    this.eventBus.emit('round:ep', { state });
  }

  private async onEV(state: RoundState): Promise<void> {
    this.eventBus.emit('round:ev', { state });
  }

  private async onEE(state: RoundState): Promise<void> {
    this.eventBus.emit('round:ee', { state });
  }

  private async onGS(state: RoundState): Promise<void> {
    this.eventBus.emit('round:gs', { state });
  }

  private async onGR(state: RoundState): Promise<void> {
    this.eventBus.emit('round:gr', { state });
  }

  private async onGE(state: RoundState): Promise<void> {
    this.eventBus.emit('round:ge', { state });
  }

  private async onZ0(state: RoundState): Promise<void> {
    // Reset battle state
    this.board.monster1 = 0;
    this.board.monster2 = 0;
    this.board.rPool = 0;
    this.board.oPool = 0;
    this.board.rPoolGain.clear();
    this.board.oPoolGain.clear();
    this.board.battler = null;
    this.eventBus.emit('round:z0', { state });
  }

  private async onZW(state: RoundState): Promise<void> {
    // Set up support/hinder positions
    const rounder = this.board.rounder;
    const hMember = [...this.board.garden.values()]
      .filter(p => p.isAlive && p.team === rounder.oppTeam)
      .map(p => p.uid);
    const sMember = [...this.board.garden.values()]
      .filter(p => p.isAlive && p.team === rounder.team)
      .map(p => p.uid);

    this.board.posHinders.length = 0;
    this.board.posHinders.push(...hMember.map(p => `T${p}`));
    this.board.posSupporters.length = 0;
    this.board.posSupporters.push(...sMember.map(p => `T${p}`));
    this.board.allowNoSupport = true;
    this.board.allowNoHinder = true;

    // Default: assume player wants to fight (custom handlers can override via setPhaseHandler)
    state.isFight = true;

    this.eventBus.emit('round:zw', { state, hinders: hMember, supporters: sMember });
  }

  private async onZU(state: RoundState): Promise<void> {
    // Support/hinder update - skill triggers
    this.eventBus.emit('round:zu', { state });
  }

  private async onZM(state: RoundState): Promise<void> {
    // Monster reveal: dequeue from monPiles if not already set
    if (this.board.mon1From === 0 && this.board.monster1 === 0) {
      if (this.board.monPiles.count > 0) {
        const mons = this.board.monPiles.dequeue() as number;
        this.board.monster1 = mons;
        this.eventBus.emit('g2in', { zone: 1, count: 1 });
      }
    }

    // Reset Monster2 if present
    if (this.board.monster2 !== 0) {
      this.eventBus.emit('imperial:left', { zone: 'M2', isReset: true });
    }

    // Announce monster1 reveal
    this.eventBus.emit('imperial:left', {
      zone: 'M1',
      trigger: this.board.rounder.uid,
      source: this.board.mon1From,
      card: this.board.monster1,
    });

    // Decode battler from monster1
    this.board.battler = NMBLib.decode(
      this.board.monster1,
      this.libGroup.ml,
      this.libGroup.nl,
    );

    this.eventBus.emit('round:zm', { state });
  }

  private async onNP(state: RoundState): Promise<void> {
    // NPC encounter: emit event for G-Loop to handle NPC effect and player decision
    this.eventBus.emit('round:np', {
      state,
      npcId: this.board.monster1,
      rounderUid: this.board.rounder.uid,
    });
  }

  private async onZ1(state: RoundState): Promise<void> {
    // Battle start: set campaign flags, check monster silence
    const battler = this.board.battler;
    if (battler && 'isSilence' in battler && typeof battler.isSilence === 'function') {
      if ((battler as { isSilence(): boolean }).isSilence()) {
        this.board.silence.add(battler.code);
      }
    }

    this.board.inCampaign = true;
    this.board.poolEnabled = true;
    this.board.fightTangled = false;

    this.eventBus.emit('round:z1', { state });
    this.eventBus.emit('pond:refresh', { checkHit: true });
    this.eventBus.emit('g0cz', { value: 2 });
  }

  private async onZ8(state: RoundState): Promise<void> {
    // Pre-battle trigger
    this.eventBus.emit('round:z8', { state });
  }

  private async onCC(state: RoundState): Promise<void> {
    // Curtain call / monster debut
    const battler = this.board.battler;
    if (battler && 'debutText' in battler) {
      const monster = battler as unknown as { debutText: string; debut(): void };
      if (monster.debutText && monster.debutText.length > 0) {
        this.board.isMonsterDebut = true;
      }
    }

    if (this.board.isMonsterDebut) {
      // Call monster debut delegate
      const monster = this.libGroup.ml.decode(
        NMBLib.originalMonster(this.board.monster1),
      );
      if (monster && 'debut' in monster) {
        (monster as { debut(): void }).debut();
      }
    }

    this.eventBus.emit('round:cc', { state });
  }

  private async onPD(state: RoundState): Promise<void> {
    // Pet debut
    this.eventBus.emit('round:pd', { state });
  }

  private async onZC(state: RoundState): Promise<void> {
    // Combat config: enable player pool, awake ABC values
    this.board.playerPoolEnabled = true;

    this.eventBus.emit('round:zc', { state });
    this.eventBus.emit('pond:refresh', { checkHit: true });
  }

  private async onZD(state: RoundState): Promise<void> {
    // Main battle phase
    this.board.poolEnabled = true;
    this.board.playerPoolEnabled = true;
    this.eventBus.emit('round:zd', { state });
  }

  private async onZF(state: RoundState): Promise<void> {
    // Fight cleanup: clear pools, recycle monster, clean battler
    this.board.poolEnabled = false;
    this.board.rPool = 0;
    this.board.oPool = 0;
    this.board.rPoolGain.clear();
    this.board.oPoolGain.clear();

    this.recycleMonster();

    // Remove silence if battler was silenced
    const battler = this.board.battler;
    if (battler && 'isSilence' in battler && typeof battler.isSilence === 'function') {
      if ((battler as { isSilence(): boolean }).isSilence()) {
        this.board.silence.delete(battler.code);
      }
    }

    // Notify all players
    for (const player of this.board.garden.values()) {
      this.eventBus.emit('g0ax', { uid: player.uid });
    }

    this.board.cleanBattler();
    this.board.inCampaign = false;

    this.eventBus.emit('g1zk', { value: 1 });
    this.eventBus.emit('g1hk', { value: 1 });
    this.eventBus.emit('round:zf', { state });
  }

  private async onZZ(state: RoundState): Promise<void> {
    // Post-fight: coaching DONE sign
    this.eventBus.emit('coaching:sign', {
      role: 'DONE',
      coach: this.board.rounder.uid,
    });

    this.eventBus.emit('round:zz', { state });
  }

  private async onBC(state: RoundState): Promise<void> {
    // Battle cards: draw cards based on battler
    const tuxCount = this.board.battler != null ? 2 : 1;
    this.eventBus.emit('g0ht', {
      uid: this.board.rounder.uid,
      count: tuxCount,
    });

    this.eventBus.emit('round:bc', { state });
  }

  private async onQR(state: RoundState): Promise<void> {
    // Quarter reset: emit G0QR for round-end player reset
    this.eventBus.emit('g0qr', { uid: this.board.rounder.uid });
    this.eventBus.emit('round:qr', { state });
  }

  private async onTM(state: RoundState): Promise<void> {
    // Turn move: advance rounder to next player
    const nextUid = this.board.getNextPlayer(this.board.rounder.uid);
    if (nextUid !== 0) {
      const nextPlayer = this.board.garden.get(nextUid);
      if (nextPlayer) {
        this.board.rounder = nextPlayer;
        this.state.rounderUid = nextPlayer.uid;
      }
    }

    this.eventBus.emit('round:tm', { state });
  }

  private async onIC(state: RoundState): Promise<void> {
    // Intermission close
    this.eventBus.emit('round:ic', { state });
  }

  private async onED(state: RoundState): Promise<void> {
    // End of round - clean up
    this.board.cleanBattler();
    this.board.poolEnabled = false;
    this.board.playerPoolEnabled = false;
    this.board.isMonsterDebut = false;
    this.board.isBattleWin = false;
    this.board.inCampaign = false;
    this.board.fightTangled = false;

    this.eventBus.emit('round:ed', {
      roundNumber: state.roundNumber,
      rounderUid: state.rounderUid,
    });
  }

  // --- Getters ---

  getState(): RoundState {
    return { ...this.state, phaseData: { ...this.state.phaseData } };
  }

  get phase(): RoundPhase {
    return this.state.phase;
  }

  get currentPhase(): RoundPhase {
    return this.state.phase;
  }

  get currentPlayer(): Player {
    return this.board.garden.get(this.state.rounderUid) ?? this.board.ghost;
  }

  get roundNumber(): number {
    return this.state.roundNumber;
  }

  get stageCode(): string {
    return this.state.stageCode;
  }
}
