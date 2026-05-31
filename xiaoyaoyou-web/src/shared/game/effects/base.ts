/**
 * JNSBase - Translation of C# PSD.PSDGamepkg.JNS.JNSBase
 *
 * Provides utility methods for card effects:
 * - Harm/Cure: create damage/heal messages
 * - TargetPlayer: mark target players
 * - FormatPlayers/AOthers/ATeammates/etc: generate player lists
 * - IsMathISOS/Equal: helper checks
 */
import { FiveElement } from '@shared/types/enums';
import { Player } from '../player';
import { Board } from '../board';
import { FiveElementHelper } from '../card/five-element';
import type { LibGroup } from '../lib-group';

/**
 * Abstract base class for JNS effects.
 * TuxCottage, SkillCottage, MonsterCottage, etc. extend this.
 * OperationCottage does NOT extend JNSBase (matches C#).
 */
export abstract class JNSBase {
  protected board: Board;
  protected libGroup: LibGroup;
  protected raiseGMessage: (msg: string) => void;
  protected innerGMessage: (msg: string, prior: number) => void;
  protected asyncInput: (uid: number, format: string, code: string, arg: string) => Promise<string>;

  constructor(
    board: Board,
    libGroup: LibGroup,
    raiseGMessage: (msg: string) => void,
    innerGMessage: (msg: string, prior: number) => void,
    asyncInput: (uid: number, format: string, code: string, arg: string) => Promise<string>,
  ) {
    this.board = board;
    this.libGroup = libGroup;
    this.raiseGMessage = raiseGMessage;
    this.innerGMessage = innerGMessage;
    this.asyncInput = asyncInput;
  }

  // ─── Harm Methods ───

  /**
   * Deal damage to a single player.
   * Translates: protected void Harm(Player src, Player py, int n, ...)
   */
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

  /**
   * Deal damage to multiple players (same amount).
   * Translates: protected void Harm(Player src, IEnumerable<Player> invs, int n, ...)
   */
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

  /**
   * Deal damage to multiple players (variable amounts).
   * Translates: protected void Harm(Player src, IEnumerable<Player> invs, IEnumerable<int> ns, ...)
   */
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

  /**
   * Heal a single player.
   * Translates: protected void Cure(Player src, Player py, int n, ...)
   */
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

  /**
   * Heal multiple players (same amount).
   * Translates: protected void Cure(Player src, IEnumerable<Player> invs, int n, ...)
   */
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

  /**
   * Heal multiple players (variable amounts).
   * Translates: protected void Cure(Player src, IEnumerable<Player> invs, IEnumerable<int> ns, ...)
   */
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

  /**
   * Mark a single target player.
   * Translates: protected void TargetPlayer(ushort from, ushort to)
   */
  protected targetPlayer(from: number, to: number): void {
    if (to !== 0 && to < 1000) {
      this.raiseGMessage(`G2YS,T,${from},T,${to}`);
    }
  }

  /**
   * Mark multiple target players.
   * Translates: protected void TargetPlayer(ushort from, IEnumerable<ushort> tos)
   */
  protected targetPlayers(from: number, tos: number[]): void {
    const valid = tos.filter(p => p !== 0 && p < 1000);
    if (valid.length > 0) {
      this.raiseGMessage(`G2YS,T,${from},${valid.map(p => `T,${p}`).join(',')}`);
    }
  }

  // ─── Player Query Methods ───

  /**
   * Format players matching a condition as "(p1p2p3)".
   * Translates: protected string FormatPlayers(Func<Player, bool> condition)
   */
  protected formatPlayers(condition: (p: Player) => boolean): string {
    const mid = [...this.board.garden.values()]
      .filter(p => condition(p))
      .map(p => p.uid)
      .join('p');
    return mid === '' ? '' : `(p${mid})`;
  }

  /**
   * Affiche players matching a condition.
   * Translates: protected string AffichePlayers(...)
   */
  protected affichePlayers(
    condition: (p: Player) => boolean,
    output: (p: Player) => string,
  ): string {
    return [...this.board.garden.values()]
      .filter(p => condition(p))
      .map(p => output(p))
      .join(',');
  }

  /** All alive others */
  protected aOthers(py: Player): string {
    return this.formatPlayers(p => p.isAlive && p.uid !== py.uid);
  }

  /** All alive tared others */
  protected aOthersTared(py: Player): string {
    const mid = [...this.board.garden.values()]
      .filter(p => p.isTared && p.uid !== py.uid)
      .map(p => p.uid)
      .join('p');
    return mid === '' ? '()' : `(p${mid})`;
  }

  /** All alive players */
  protected aAlls(_py: Player | null): string {
    const mid = [...this.board.garden.values()]
      .filter(p => p.isAlive)
      .map(p => p.uid)
      .join('p');
    return mid === '' ? '()' : `(p${mid})`;
  }

  /** All tared players */
  protected aAllTareds(_py: Player | null): string {
    const mid = [...this.board.garden.values()]
      .filter(p => p.isTared)
      .map(p => p.uid)
      .join('p');
    return mid === '' ? '()' : `(p${mid})`;
  }

  /** All alive teammates */
  protected aTeammates(py: Player): string {
    return this.formatPlayers(p => p.isAlive && p.team === py.team);
  }

  /** All tared teammates */
  protected aTeammatesTared(py: Player): string {
    return this.formatPlayers(p => p.isTared && p.team === py.team);
  }

  /** All tared friends (teammates excluding self) */
  protected aFriendsTared(py: Player): string {
    return this.formatPlayers(p => p.isTared && p.team === py.team && p.uid !== py.uid);
  }

  /** All alive enemies */
  protected aEnemy(py: Player): string {
    const mid = [...this.board.garden.values()]
      .filter(p => p.isAlive && p.team === py.oppTeam)
      .map(p => p.uid)
      .join('p');
    return mid === '' ? '()' : `(p${mid})`;
  }

  /** All tared enemies */
  protected aEnemyTared(py: Player): string {
    const mid = [...this.board.garden.values()]
      .filter(p => p.isTared && p.team === py.oppTeam)
      .map(p => p.uid)
      .join('p');
    return mid === '' ? '()' : `(p${mid})`;
  }

  /** Anyone alive string: T1(p1p2...) */
  protected anyoneAliveString(): string {
    return 'T1' + this.aAlls(null);
  }

  // ─── Helper Methods ───

  /**
   * Check if player is the source of an ISOS skill.
   * Translates: protected bool IsMathISOS(string skillName, Player player, string fuse)
   */
  protected isMathISOS(skillName: string, player: Player, fuse: string): boolean {
    const parts = fuse.split(',');
    if (parts[1] === player.uid.toString()) {
      for (let i = 3; i < parts.length; i++) {
        if (parts[i] === skillName) return true;
      }
    }
    return false;
  }

  /**
   * Generic equality check.
   * Translates: protected static bool Equal(object obj1, object obj2)
   */
  protected static equal(obj1: unknown, obj2: unknown): boolean {
    if (obj1 === null && obj2 === null) return true;
    if (obj1 === null || obj2 === null) return false;
    return obj1 === obj2;
  }
}
