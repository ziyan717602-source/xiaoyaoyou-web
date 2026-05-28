/**
 * RoundManager - Round state machine
 * Translation of C# PSDGamepkg.XIR.cs
 *
 * The round state machine manages the flow of a single round.
 * Each round follows the pattern: 00 -> OC -> ST -> EP -> EV -> EE -> GS -> GR -> GE ->
 *   Z0 -> ZW -> ZU -> ZM -> Z1 -> Z8 -> CC -> PD -> ZC -> ZD -> (battle) -> ZF -> ED
 *
 * The string-based stage codes (e.g. "R100", "R1OC", "R1ST") are preserved
 * to maintain compatibility with the original C# protocol.
 */

import { EventBus } from './event-bus';
import type { Board } from '../board';
import type { Player } from '../player';

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
  /** ZF stage - fight result */
  ZF = 'ZF',
  /** ZE stage - monster defeated */
  ZE = 'ZE',
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
  [RoundPhase.ZM]: [RoundPhase.NP, RoundPhase.Z1],
  [RoundPhase.NP]: [RoundPhase.ZM, RoundPhase.ZF],
  [RoundPhase.Z1]: [RoundPhase.Z8],
  [RoundPhase.Z8]: [RoundPhase.CC],
  [RoundPhase.CC]: [RoundPhase.PD],
  [RoundPhase.PD]: [RoundPhase.ZC],
  [RoundPhase.ZC]: [RoundPhase.ZD],
  [RoundPhase.ZD]: [RoundPhase.ZF],
  [RoundPhase.ZF]: [RoundPhase.ZE, RoundPhase.ED],
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
}

/**
 * RoundManager - manages the round state machine.
 */
export class RoundManager {
  private board: Board;
  private eventBus: EventBus;
  private state: RoundState;
  private phaseHandlers = new Map<RoundPhase, (state: RoundState) => Promise<void> | void>();

  constructor(board: Board, eventBus: EventBus) {
    this.board = board;
    this.eventBus = eventBus;
    this.state = {
      phase: RoundPhase.INIT,
      roundNumber: 0,
      rounderUid: 0,
      previousPhase: null,
      stageCode: '',
      phaseData: {},
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
    this.phaseHandlers.set(RoundPhase.ZD, this.onZD.bind(this));
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
   * Run a complete round from INIT to ZM.
   * Resets state to INIT at the start of each round.
   */
  async runRound(): Promise<void> {
    const rounder = this.board.rounder;
    this.state.rounderUid = rounder.uid;
    this.state.roundNumber++;

    // Reset phase to INIT for the new round (skip transition check)
    this.state.phase = RoundPhase.INIT;
    this.state.previousPhase = null;

    const roundCode = `R${rounder.uid}`;

    // Run through the stage machine
    const stageOrder: RoundPhase[] = [
      RoundPhase.OC,
      RoundPhase.ST,
      RoundPhase.EP,
      RoundPhase.EV,
      RoundPhase.EE,
      RoundPhase.GS,
      RoundPhase.GR,
      RoundPhase.GE,
      RoundPhase.Z0,
      RoundPhase.ZW,
      RoundPhase.ZU,
      RoundPhase.ZM,
    ];

    for (const phase of stageOrder) {
      this.state.stageCode = roundCode + phase;
      await this.transition(phase);
    }
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

    this.eventBus.emit('round:zw', { state, hinders: hMember, supporters: sMember });
  }

  private async onZD(state: RoundState): Promise<void> {
    // Main battle phase
    this.board.poolEnabled = true;
    this.board.playerPoolEnabled = true;
    this.eventBus.emit('round:zd', { state });
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
