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
  /** SK stage - skill card phase (技牌阶段) */
  SK = 'SK',
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
  /** ZN stage - battle result calculation */
  ZN = 'ZN',
  /** VS stage - win/lose effects */
  VS = 'VS',
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
  [RoundPhase.GE]: [RoundPhase.SK],
  [RoundPhase.SK]: [RoundPhase.Z0],
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
  [RoundPhase.ZD]: [RoundPhase.ZN],
  [RoundPhase.ZN]: [RoundPhase.VS],
  [RoundPhase.VS]: [RoundPhase.ZF],
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
  /** Whether the rounder is exhausted (横置) - skip to discard phase */
  skipToDiscard: boolean;
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
  private inputCallback: ((uid: number, format: string, code: string, arg: string) => Promise<string>) | null = null;
  private messageHandler: ((msg: string) => void) | null = null;

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
      skipToDiscard: false,
    };
    this.registerPhaseHandlers();
  }

  /**
   * Set the input callback for getting player input.
   */
  setInputCallback(callback: (uid: number, format: string, code: string, arg: string) => Promise<string>): void {
    this.inputCallback = callback;
  }

  setMessageHandler(handler: (msg: string) => void): void {
    this.messageHandler = handler;
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
    this.phaseHandlers.set(RoundPhase.SK, this.onSK.bind(this));
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
    this.phaseHandlers.set(RoundPhase.ZN, this.onZN.bind(this));
    this.phaseHandlers.set(RoundPhase.VS, this.onVS.bind(this));
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
   * Set the battle choice during ZW phase.
   * Called by game controller after getting player input.
   */
  setBattleChoice(isFight: boolean, supporterUid?: number, hinderUid?: number): void {
    this.state.isFight = isFight;
    if (supporterUid && supporterUid > 0) {
      const supporter = this.board.garden.get(supporterUid);
      if (supporter) {
        this.board.supporter = supporter;
      }
    }
    if (hinderUid && hinderUid > 0) {
      const hinder = this.board.garden.get(hinderUid);
      if (hinder) {
        this.board.hinder = hinder;
      }
    }
  }

  /**
   * Transition to the next phase.
   */
  async transition(nextPhase: RoundPhase): Promise<void> {
    if (!this.canTransition(nextPhase)) {
      throw new Error(`Invalid transition: ${this.state.phase} -> ${nextPhase}`);
    }

    console.log(`[Round] Phase: ${this.state.phase} -> ${nextPhase} (rounder: ${this.state.rounderUid})`);

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
    this.state.skipToDiscard = false;

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
    // If skipToDiscard is set (exhausted rounder), jump to QR then ED
    if (this.state.skipToDiscard) {
      if (current === RoundPhase.INIT) return RoundPhase.QR;
      if (current === RoundPhase.QR) return RoundPhase.ED;
      return RoundPhase.ED;
    }

    switch (current) {
      // Pre-battle phases
      case RoundPhase.OC: return RoundPhase.ST;
      case RoundPhase.ST: return RoundPhase.EP;
      case RoundPhase.EP: return RoundPhase.EV;
      case RoundPhase.EV: return RoundPhase.EE;
      case RoundPhase.EE: return RoundPhase.GS;
      case RoundPhase.GS: return RoundPhase.GR;
      case RoundPhase.GR: return RoundPhase.GE;
      case RoundPhase.GE: return RoundPhase.SK;
      case RoundPhase.SK: return RoundPhase.Z0;
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
      case RoundPhase.ZD: return RoundPhase.ZN;
      case RoundPhase.ZN: return RoundPhase.VS;
      case RoundPhase.VS: return RoundPhase.ZF;

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
    // Check if rounder is exhausted (横置) - skip entire turn
    const rounder = this.board.garden.get(state.rounderUid);
    if (rounder && rounder.immobilized) {
      state.skipToDiscard = true;
      // Force discard check and clear exhaustion
      this.eventBus.emit('raise:gmessage', { cmd: `G0QR,${state.rounderUid}` });
      this.eventBus.emit('raise:gmessage', { cmd: `G0DS,${state.rounderUid},1` });
    }

    this.eventBus.emit('round:init', { roundNumber: state.roundNumber, rounderUid: state.rounderUid });
  }

  private async onOC(state: RoundState): Promise<void> {
    this.eventBus.emit('round:oc', { state });
  }

  private async onST(state: RoundState): Promise<void> {
    console.log(`[Round:onST] rounder=${state.rounderUid}`);
    this.eventBus.emit('round:st', { state });

    const rounder = this.board.rounder;
    const stageCode = `R${rounder.uid}ST`;
    console.log(`[Round:onST] emitting run:stage ${stageCode}`);

    this.eventBus.emit('run:stage', { stageCode });
  }

  private async onEP(state: RoundState): Promise<void> {
    // Reset all player RAM (per-player state for this round)
    for (const player of this.board.garden.values()) {
      player.isTPOpt = false;
    }
    this.eventBus.emit('round:ep', { state });
  }

  private async onEV(state: RoundState): Promise<void> {
    console.log(`[Round:onEV] rounder=${state.rounderUid}, inputCallback=${!!this.inputCallback}`);
    const rounder = this.board.rounder;
    const roundCode = `R${rounder.uid}`;

    // Broadcast event phase start
    if (this.messageHandler) {
      this.messageHandler(`${roundCode}EV1,0`);
    }

    // Ask rounder: flip event card or skip?
    // Event name is NOT shown to the player — it's a surprise when flipped.
    if (this.inputCallback) {
      const fmt = '#是否翻取事件牌？##翻取##跳过,Y2';
      const decision = await this.inputCallback(rounder.uid, fmt, 'EV', '');

      if (decision === '2') {
        // Flip event card: raise G1EV which dequeues and executes
        this.eventBus.emit('raise:gmessage', { cmd: `G1EV,${rounder.uid},0` });
      } else {
        // Skip event
        if (this.messageHandler) {
          this.messageHandler(`${roundCode}EV2,0`);
        }
      }
    } else {
      // No input callback (AI mode): flip automatically
      this.eventBus.emit('raise:gmessage', { cmd: `G1EV,${rounder.uid},0` });
    }

    this.eventBus.emit('round:ev', { state });
  }

  private async onEE(state: RoundState): Promise<void> {
    this.eventBus.emit('round:ee', { state });
  }

  private async onGS(state: RoundState): Promise<void> {
    this.eventBus.emit('round:gs', { state });
    const rounder = this.board.rounder;
    const stageCode = `R${rounder.uid}GS`;
    this.eventBus.emit('run:stage', { stageCode });
  }

  private async onGR(state: RoundState): Promise<void> {
    this.eventBus.emit('round:gr', { state });
    const rounder = this.board.rounder;
    const stageCode = `R${rounder.uid}GR`;
    this.eventBus.emit('run:stage', { stageCode });
  }

  private async onGE(state: RoundState): Promise<void> {
    this.eventBus.emit('round:ge', { state });
    const rounder = this.board.rounder;
    const stageCode = `R${rounder.uid}GE`;
    this.eventBus.emit('run:stage', { stageCode });
  }

  private async onSK(state: RoundState): Promise<void> {
    // 技牌阶段: ask rounder to play skill/equip cards, or skip
    const rounder = this.board.rounder;
    console.log(`[Round:onSK] rounder=${rounder.uid}, inputCallback=${!!this.inputCallback}`);

    if (this.inputCallback && rounder.isAlive) {
      // Build list of playable cards: 技牌(green) + 装备(blue) in hand
      const playableCards: number[] = [];
      for (const cardId of rounder.tux) {
        const tux = this.libGroup.tl.decodeTux(cardId);
        if (!tux) continue;
        if (tux.code.startsWith('JP') || tux.code.startsWith('WQ') ||
            tux.code.startsWith('FJ') || tux.code.startsWith('XB')) {
          playableCards.push(cardId);
        }
      }

      if (playableCards.length > 0) {
        // Build card display list
        const cardCodes = playableCards.map(id => `c${id}`).join('');

        // /Q segment: optional=true (player can select 0 or more cards, then click 决定)
        // Submitting empty = skip. Without /, player must select exactly count cards.
        // Format: #description/Qcount(options) — the / makes it optional.
        const format = `#技牌阶段:点击手牌使用装备或技能牌(跳过则不使用)/${playableCards.length}(${cardCodes})`;

        const cardChoice = await this.inputCallback(rounder.uid, format, 'SK', '');

        // Parse comma-separated card codes (client sends "JP03,JP02" or "JP03")
        if (cardChoice && cardChoice !== '/' && cardChoice !== '0' && cardChoice !== '') {
          const codes = cardChoice.split(',').map(s => s.trim()).filter(Boolean);

          for (const code of codes) {
            // Find card in hand by code
            const cardId = rounder.tux.find(id => {
              const tux = this.libGroup.tl.decodeTux(id);
              return tux && tux.code === code;
            });

            if (cardId === undefined) {
              console.warn(`[Round:onSK] Card ${code} not found in hand, skipping`);
              continue;
            }

            // Remove from hand
            const idx = rounder.tux.indexOf(cardId);
            rounder.tux.splice(idx, 1);
            this.board.tuxDises.push(cardId);

            // Broadcast card use via G-Loop
            this.eventBus.emit('raise:gmessage', { cmd: `G0CC,${rounder.uid},${cardId},0` });

            const tux = this.libGroup.tl.decodeTux(cardId);
            if (tux) {
              console.log(`[Round:onSK] Played card: ${tux.name} (${tux.code})`);
            }
          }
        }
      }
    }

    // Emit stage events for skill triggers
    const stageCode = `R${rounder.uid}SK`;
    this.eventBus.emit('run:stage', { stageCode });
    console.log(`[Round:onSK] Completed, stage=${stageCode}`);
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
    console.log(`[Round:onZW] rounder=${state.rounderUid}, inputCallback=${!!this.inputCallback}`);
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

    // Get battle choice from player via input callback
    if (this.inputCallback) {
      const supportableMembers = sMember.filter(uid => uid !== rounder.uid);

      // Format: #为支援者(决定),-{uid}:{name}则不支援,/{options}
      const rounderHero = this.libGroup.hl.instanceHero(rounder.selectHero);
      const rounderName = rounderHero?.name ?? `P${rounder.uid}`;

      let format = `#为支援者(决定),—${rounder.uid}:${rounderName}则不支援,`;
      if (supportableMembers.length > 0) {
        format += `J1(p${supportableMembers.map(p => `T${p}`).join('p')})`;
      } else {
        format += '/';
      }

      const decision = await this.inputCallback(rounder.uid, format, 'ZW', '');

      let isFight = false;
      let sprUid = 0;

      if (decision.startsWith('T')) {
        // Select a team member as supporter
        const who = parseInt(decision.substring(1), 10);
        sprUid = who !== rounder.uid ? who : 0;
        isFight = true;
      } else if (decision.startsWith('/')) {
        // Skip - no fight
        isFight = false;
        sprUid = 0;
      } else {
        // Default to fight
        isFight = true;
      }

      // Ask enemy team for hinderer
      // Find an alive opponent from the enemy team to make the hinderer selection.
      // The opponent should NOT be the rounder — pick the first alive enemy.
      let hndUid = 0;
      if (isFight && hMember.length > 0) {
        const opponentPlayer = hMember
          .map(uid => this.board.garden.get(uid))
          .find(p => p && p.isAlive);

        if (opponentPlayer) {
          let hinderFormat = `#妨碍者(决定),`;
          if (hMember.length > 0) {
            hinderFormat += `J1(p${hMember.map(p => `T${p}`).join('p')})`;
          } else {
            hinderFormat += '/';
          }

          const hinderDecision = await this.inputCallback(opponentPlayer.uid, hinderFormat, 'ZW', '');

          if (hinderDecision.startsWith('T')) {
            hndUid = parseInt(hinderDecision.substring(1), 10);
          }
        }
      }

      // Update state and board
      this.setBattleChoice(isFight, sprUid, hndUid);
    } else {
      // No input callback: default to fight
      state.isFight = true;
    }

    // Raise G1SG: decision point before monster reveal
    // Allows TP04 (洞冥宝镜) and similar cards to trigger
    if (state.isFight) {
      this.eventBus.emit('raise:gmessage', { cmd: 'G1SG,0' });
    }

    this.eventBus.emit('round:zw', { state, hinders: hMember, supporters: sMember });
  }

  private async onZU(state: RoundState): Promise<void> {
    // Support/hinder update - skill triggers
    this.eventBus.emit('round:zu', { state });
  }

  private async onZM(state: RoundState): Promise<void> {
    console.log(`[Round:onZM] revealing monster, monPiles=${this.board.monPiles.count}`);
    // Monster reveal: dequeue from monPiles if not already set
    if (this.board.mon1From === 0 && this.board.monster1 === 0) {
      if (this.board.monPiles.count > 0) {
        const mons = this.board.monPiles.dequeue() as number;
        this.board.monster1 = mons;
        this.eventBus.emit('g2in', { zone: 1, count: 1 });
      } else {
        // Monster pile is empty - trigger game over by exhaustion
        this.eventBus.emit('raise:gmessage', { cmd: 'G1WJ,0' });
        return;
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

    // AwakeABCValue(false): set STRa=STRb, DEXa=DEXb for all players
    for (const player of this.board.garden.values()) {
      if (player.isAlive) {
        player.sdASet = true;
        player.strA = player.strB;
        player.dexA = player.dexB;
      }
    }

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

    // AwakeABCValue: update computed stats from aura layer
    for (const player of this.board.garden.values()) {
      if (player.isAlive) {
        if (player.sdCSet) {
          player.strC = player.strA;
          player.dexC = player.dexA;
        }
        if (player.sdASet) {
          player.strA = player.strB;
          player.dexA = player.dexB;
        }
      }
    }

    // Run skill dispatch for ZC stage (C# uses RunQuadMixedStage with priorities -100, 100)
    const rounder = this.board.rounder;
    const stageCode = `R${rounder.uid}ZC`;
    this.eventBus.emit('run:stage', { stageCode });

    this.eventBus.emit('round:zc', { state });
    this.eventBus.emit('pond:refresh', { checkHit: true });
  }

  private async onZD(state: RoundState): Promise<void> {
    console.log(`[Round:onZD] battle card phase, rounder=${state.rounderUid}`);
    // Battle card phase: priority-based dispatch using runStage()
    // C# equivalent: RunSeperateStage(rstage, 1, delegate(bd) { return bd.IsRounderBattleWin(); })
    // Players can play battle cards (TP), use skills, etc.
    this.board.poolEnabled = true;
    this.board.playerPoolEnabled = true;

    // Initialize RestZP to 1 for all alive players
    for (const player of this.board.garden.values()) {
      if (player.isAlive) {
        player.restZP = 1;
      }
    }

    // Broadcast battle start
    const rounder = this.board.rounder;
    const stageCode = `R${rounder.uid}ZD`;

    // Use runStage for priority-based skill/card dispatch
    this.eventBus.emit('run:stage', { stageCode });
  }

  /**
   * Apply ZP card effect based on card code.
   * ZP cards modify battle pools via G0IP or G0IA.
   */
  private applyZPEffect(code: string, player: Player): void {
    switch (code) {
      case 'ZP01':
        // Skip to post-battle: set a flag to skip remaining battle
        // For now, just log - full implementation needs board state
        break;
      case 'ZP02':
        // Add player's STR to their team's pool
        this.eventBus.emit('raise:gmessage', {
          cmd: `G0IP,${player.team},${player.str}`,
        });
        break;
      case 'ZP03':
        // Add +3 flat to team pool
        this.eventBus.emit('raise:gmessage', {
          cmd: `G0IP,${player.team},3`,
        });
        break;
      case 'ZP04':
      case 'ZPT1':
        // Direct pool modification via G0IP
        // Actual value depends on card data - use +2 as default
        this.eventBus.emit('raise:gmessage', {
          cmd: `G0IP,${player.team},2`,
        });
        break;
      default:
        // Unknown ZP card - no effect
        break;
    }
  }

  private async onZN(state: RoundState): Promise<void> {
    // Battle result calculation
    this.board.isBattleWin = this.board.isRounderBattleWin();
    this.board.poolDelta = this.board.calculateRPool() - this.board.calculateOPool();

    // Broadcast result: 0 = win, 1 = lose
    this.eventBus.emit('round:zn', {
      state,
      isBattleWin: this.board.isBattleWin,
      poolDelta: this.board.poolDelta,
    });

    // Disable pools
    this.board.poolEnabled = false;
    this.board.playerPoolEnabled = false;
  }

  private async onVS(state: RoundState): Promise<void> {
    // Win/lose effects: raise G1GE for each monster
    this.board.mon1Catchable = true;
    this.board.mon2Catchable = true;

    if (this.board.isBattleWin) {
      // Win: raise G1GE,W for each monster, then HarvestPet
      if (this.board.monster1 !== 0) {
        this.eventBus.emit('raise:gmessage', { cmd: `G1GE,W,${this.board.monster1}` });
      }
      const hasMonster2 = this.board.monster2 !== 0 && NMBLib.isMonster(this.board.monster2);
      if (hasMonster2) {
        this.eventBus.emit('raise:gmessage', { cmd: `G1GE,W,${this.board.monster2}` });
      }
      // HarvestPet: capture monsters as pets (mask: Trophy|Reposit|Plow = 0x4|0x8|0x10 = 0x1C)
      const mask = 0x1C;
      if (this.board.monster1 !== 0 && this.board.mon1Catchable) {
        this.eventBus.emit('raise:gmessage', { cmd: `G0HC,0,${state.rounderUid},${this.board.mon1From},${mask},${this.board.monster1}` });
      }
      if (hasMonster2 && this.board.mon2Catchable) {
        this.eventBus.emit('raise:gmessage', { cmd: `G0HC,0,${state.rounderUid},0,${mask},${this.board.monster2}` });
      }
    } else {
      // Lose: raise G1GE,L for each monster
      if (this.board.monster1 !== 0) {
        this.eventBus.emit('raise:gmessage', { cmd: `G1GE,L,${this.board.monster1}` });
      }
      if (this.board.monster2 !== 0 && NMBLib.isMonster(this.board.monster2)) {
        this.eventBus.emit('raise:gmessage', { cmd: `G1GE,L,${this.board.monster2}` });
      }
    }

    this.eventBus.emit('round:vs', {
      state,
      isBattleWin: this.board.isBattleWin,
    });
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
    // C# equivalent: RaiseGMessage("G0HT," + Board.Rounder.Uid + "," + tuxCount)
    const tuxCount = this.board.battler != null ? 2 : 1;
    this.eventBus.emit('raise:gmessage', {
      cmd: `G0HT,${this.board.rounder.uid},${tuxCount}`,
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
