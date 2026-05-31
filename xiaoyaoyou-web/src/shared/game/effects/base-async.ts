/**
 * JNSBaseAsync - Async version of JNSBase for network games
 *
 * This base class supports async input for network players.
 * The asyncInput callback returns Promise<string> instead of string.
 *
 * Usage:
 * - Extend this class for cottages that need async input
 * - Use the existing JNSBase for cottages that only use sync input (AI games)
 */

import { FiveElement } from '@shared/types/enums';
import { Player } from '../player';
import { Board } from '../board';
import { FiveElementHelper } from '../card/five-element';

/**
 * Abstract base class for JNS effects with async input support.
 */
export abstract class JNSBaseAsync {
  protected board: Board;
  protected raiseGMessage: (msg: string) => void;
  protected innerGMessage: (msg: string, prior: number) => void;
  protected asyncInput: (uid: number, format: string, code: string, arg: string) => Promise<string>;

  constructor(
    board: Board,
    raiseGMessage: (msg: string) => void,
    innerGMessage: (msg: string, prior: number) => void,
    asyncInput: (uid: number, format: string, code: string, arg: string) => Promise<string>,
  ) {
    this.board = board;
    this.raiseGMessage = raiseGMessage;
    this.innerGMessage = innerGMessage;
    this.asyncInput = asyncInput;
  }

  // ─── Harm Methods ───

  protected harm(
    src: Player | null, py: Player, n: number,
    five: FiveElement = FiveElement.A, mask: number = 0,
  ): void {
    if (src !== null) {
      this.targetPlayer(src.uid, py.uid);
    }
    const srcUid = src === null ? 0 : src.uid;
    this.raiseGMessage(
      `G0OH,${py.uid},${srcUid},${FiveElementHelper.elem2Int(five)},${n},${mask}`,
    );
  }

  protected harmMultiple(
    src: Player | null, invs: Player[], n: number,
    five: FiveElement = FiveElement.A, mask: number = 0,
  ): void {
    if (invs.length === 0) return;
    if (src !== null) {
      this.targetPlayers(src.uid, invs.map(p => p.uid));
    }
    const srcUid = src === null ? 0 : src.uid;
    const parts = invs.map(p =>
      `${p.uid},${srcUid},${FiveElementHelper.elem2Int(five)},${n},${mask}`,
    );
    this.raiseGMessage('G0OH,' + parts.join(';'));
  }

  protected harmVariable(
    src: Player | null, invs: Player[], ns: number[],
    five: FiveElement = FiveElement.A, mask: number = 0,
  ): void {
    if (invs.length === 0) return;
    if (src !== null) {
      this.targetPlayers(src.uid, invs.map(p => p.uid));
    }
    const srcUid = src === null ? 0 : src.uid;
    const sz = Math.min(invs.length, ns.length);
    const parts: string[] = [];
    for (let i = 0; i < sz; i++) {
      parts.push(`${invs[i].uid},${srcUid},${FiveElementHelper.elem2Int(five)},${ns[i]},${mask}`);
    }
    if (parts.length > 0) {
      this.raiseGMessage('G0OH,' + parts.join(';'));
    }
  }

  // ─── Cure Methods ───

  protected cure(
    src: Player | null, py: Player, n: number,
    five: FiveElement = FiveElement.A, mask: number = 0,
  ): void {
    if (src !== null) {
      this.targetPlayer(src.uid, py.uid);
    }
    const srcUid = src === null ? 0 : src.uid;
    this.raiseGMessage(
      `G0IH,${py.uid},${srcUid},${FiveElementHelper.elem2Int(five)},${n},${mask}`,
    );
  }

  protected cureMultiple(
    src: Player | null, invs: Player[], n: number,
    five: FiveElement = FiveElement.A, mask: number = 0,
  ): void {
    if (invs.length === 0) return;
    if (src !== null) {
      this.targetPlayers(src.uid, invs.map(p => p.uid));
    }
    const srcUid = src === null ? 0 : src.uid;
    const parts = invs.map(p =>
      `${p.uid},${srcUid},${FiveElementHelper.elem2Int(five)},${n},${mask}`,
    );
    this.raiseGMessage('G0IH,' + parts.join(';'));
  }

  protected cureVariable(
    src: Player | null, invs: Player[], ns: number[],
    five: FiveElement = FiveElement.A, mask: number = 0,
  ): void {
    if (invs.length === 0) return;
    if (src !== null) {
      this.targetPlayers(src.uid, invs.map(p => p.uid));
    }
    const srcUid = src === null ? 0 : src.uid;
    const sz = Math.min(invs.length, ns.length);
    const parts: string[] = [];
    for (let i = 0; i < sz; i++) {
      parts.push(`${invs[i].uid},${srcUid},${FiveElementHelper.elem2Int(five)},${ns[i]},${mask}`);
    }
    if (parts.length > 0) {
      this.raiseGMessage('G0IH,' + parts.join(';'));
    }
  }

  // ─── Target Methods ───

  protected targetPlayer(from: number, to: number): void {
    if (to !== 0 && to < 1000) {
      this.raiseGMessage(`G2YS,T,${from},T,${to}`);
    }
  }

  protected targetPlayers(from: number, tos: number[]): void {
    const valid = tos.filter(p => p !== 0 && p < 1000);
    if (valid.length > 0) {
      this.raiseGMessage(`G2YS,T,${from},${valid.map(p => `T,${p}`).join(',')}`);
    }
  }

  // ─── Player Query Methods ───

  protected formatPlayers(condition: (p: Player) => boolean): string {
    const mid = [...this.board.garden.values()]
      .filter(p => condition(p))
      .map(p => p.uid)
      .join('p');
    return mid === '' ? '' : `(p${mid})`;
  }

  protected affichePlayers(
    condition: (p: Player) => boolean,
    output: (p: Player) => string,
  ): string {
    return [...this.board.garden.values()]
      .filter(p => condition(p))
      .map(p => output(p))
      .join(',');
  }

  protected aOthers(py: Player): string {
    return this.formatPlayers(p => p.isAlive && p.uid !== py.uid);
  }

  protected aOthersTared(py: Player): string {
    const mid = [...this.board.garden.values()]
      .filter(p => p.isTared && p.uid !== py.uid)
      .map(p => p.uid)
      .join('p');
    return mid === '' ? '()' : `(p${mid})`;
  }

  protected aAlls(_py: Player | null): string {
    const mid = [...this.board.garden.values()]
      .filter(p => p.isAlive)
      .map(p => p.uid)
      .join('p');
    return mid === '' ? '()' : `(p${mid})`;
  }

  protected aAllTareds(_py: Player | null): string {
    const mid = [...this.board.garden.values()]
      .filter(p => p.isTared)
      .map(p => p.uid)
      .join('p');
    return mid === '' ? '()' : `(p${mid})`;
  }

  protected aTeammates(py: Player): string {
    return this.formatPlayers(p => p.isAlive && p.team === py.team);
  }

  protected aTeammatesTared(py: Player): string {
    return this.formatPlayers(p => p.isTared && p.team === py.team);
  }

  protected aFriendsTared(py: Player): string {
    return this.formatPlayers(p => p.isTared && p.team === py.team && p.uid !== py.uid);
  }

  protected aEnemy(py: Player): string {
    const mid = [...this.board.garden.values()]
      .filter(p => p.isAlive && p.team === py.oppTeam)
      .map(p => p.uid)
      .join('p');
    return mid === '' ? '()' : `(p${mid})`;
  }

  protected aEnemyTared(py: Player): string {
    const mid = [...this.board.garden.values()]
      .filter(p => p.isTared && p.team === py.oppTeam)
      .map(p => p.uid)
      .join('p');
    return mid === '' ? '()' : `(p${mid})`;
  }

  protected anyoneAliveString(): string {
    return 'T1' + this.aAlls(null);
  }

  // ─── Helper Methods ───

  protected isMathISOS(skillName: string, player: Player, fuse: string): boolean {
    const parts = fuse.split(',');
    if (parts[1] === player.uid.toString()) {
      for (let i = 3; i < parts.length; i++) {
        if (parts[i] === skillName) return true;
      }
    }
    return false;
  }

  protected static equal(obj1: unknown, obj2: unknown): boolean {
    if (obj1 === null && obj2 === null) return true;
    if (obj1 === null || obj2 === null) return false;
    return obj1 === obj2;
  }
}
