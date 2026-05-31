/**
 * GameLog - Records game events as readable text
 *
 * Captures key game moments and stores them as human-readable log entries.
 * Used by CLI test runner to display game flow without UI interaction.
 */

export interface LogEntry {
  round: number;
  text: string;
}

export class GameLog {
  private entries: LogEntry[] = [];
  private currentRound = 0;

  setRound(round: number): void {
    this.currentRound = round;
  }

  log(text: string): void {
    this.entries.push({ round: this.currentRound, text });
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
    this.currentRound = 0;
  }

  get length(): number {
    return this.entries.length;
  }
}
