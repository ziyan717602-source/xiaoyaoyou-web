/**
 * Artiad Parser - Parse G-loop command strings into typed objects
 * Translation of C# PSDGamepkg.Artiad namespace
 *
 * The Artiad parsers convert string commands like "G0OH,1,2,3,1" into
 * strongly-typed objects for easier manipulation in TypeScript.
 */

import { SimpleGMessage, type GMessage } from '../g-message';
import { Card, Genre } from '../../card/card';

/** Parsed action result */
export interface ParsedAction {
  type: string;
  sender: number;
  receiver: number;
  args: string[];
  raw: string;
}

/** Harm entry parsed from G0OH command */
export interface HarmEntry {
  who: number;
  source: number;
  element: number;
  n: number;
  mask: number;
}

/** Cure entry parsed from G0IH command */
export interface CureEntry {
  who: number;
  source: number;
  element: number;
  n: number;
  mask: number;
}

/** Customs unit parsed from G0ON command */
export interface CustomsUnit {
  source: number;
  cards: number[];
}

/** Coaching sign unit */
export interface CoachingSignUnit {
  role: string;
  coach: number;
}

/** Imperial left zone type */
export enum ImperialZone {
  M1 = 'M1',
  M2 = 'M2',
}

/**
 * Parser - static utility for parsing G-loop commands.
 */
export class Parser {
  /**
   * Parse a raw command string into a ParsedAction.
   */
  static parse(input: string): ParsedAction {
    const parts = input.split(',');
    return {
      type: parts[0],
      sender: parseInt(parts[1]) || 0,
      receiver: parseInt(parts[2]) || 0,
      args: parts.slice(3),
      raw: input,
    };
  }

  /**
   * Parse to a GMessage object.
   */
  static parseToMessage(input: string): GMessage {
    const action = this.parse(input);
    return new SimpleGMessage(
      action.type,
      action.sender,
      action.receiver,
      action.args,
    );
  }

  /**
   * Validate a command string format.
   */
  static validate(input: string): boolean {
    const parts = input.split(',');
    if (parts.length < 2) return false;

    const type = parts[0];
    if (!type.match(/^G[012][A-Z]{2,}$/)) return false;

    const sender = parseInt(parts[1]);
    if (isNaN(sender) || sender < 0) return false;

    if (parts.length > 2) {
      const receiver = parseInt(parts[2]);
      if (isNaN(receiver) || receiver < 0) return false;
    }

    return true;
  }

  /**
   * Extract arguments from a command string.
   */
  static extractArgs(input: string): string[] {
    const parts = input.split(',');
    return parts.slice(3);
  }

  /**
   * Extract the message type from a command string.
   */
  static extractType(input: string): string {
    return input.split(',')[0];
  }

  /**
   * Extract the sender from a command string.
   */
  static extractSender(input: string): number {
    return parseInt(input.split(',')[1]) || 0;
  }

  /**
   * Extract the receiver from a command string.
   */
  static extractReceiver(input: string): number {
    return parseInt(input.split(',')[2]) || 0;
  }

  // --- Specific parsers ---

  /**
   * Parse harm entries from G0OH command.
   * Format: "G0OH,who,source,element,n,mask,who,source,element,n,mask,..."
   */
  static parseHarm(line: string): HarmEntry[] {
    const blocks = line.split(',');
    const list: HarmEntry[] = [];
    // Skip first element (the type "G0OH")
    for (let i = 1; i < blocks.length; i += 5) {
      if (i + 4 < blocks.length) {
        list.push({
          who: parseInt(blocks[i]) || 0,
          source: parseInt(blocks[i + 1]) || 0,
          element: parseInt(blocks[i + 2]) || 0,
          n: parseInt(blocks[i + 3]) || 0,
          mask: parseInt(blocks[i + 4]) || 0,
        });
      }
    }
    return list;
  }

  /**
   * Parse cure entries from G0IH command.
   */
  static parseCure(line: string): CureEntry[] {
    const blocks = line.split(',');
    const list: CureEntry[] = [];
    for (let i = 1; i < blocks.length; i += 5) {
      if (i + 4 < blocks.length) {
        list.push({
          who: parseInt(blocks[i]) || 0,
          source: parseInt(blocks[i + 1]) || 0,
          element: parseInt(blocks[i + 2]) || 0,
          n: parseInt(blocks[i + 3]) || 0,
          mask: parseInt(blocks[i + 4]) || 0,
        });
      }
    }
    return list;
  }

  /**
   * Parse customs units from G0ON command.
   * Format: "G0ON,genre,zone,source,count,cards,...,source,count,cards,..."
   */
  static parseCustomsUnits(line: string): CustomsUnit[] {
    const parts = line.split(',');
    const units: CustomsUnit[] = [];
    let idx = 3; // Skip type, genre, zone
    while (idx < parts.length) {
      const source = parseInt(parts[idx]) || 0;
      idx++;
      // Read cards until next source or end
      const cards: number[] = [];
      while (idx < parts.length && !isNaN(parseInt(parts[idx]))) {
        cards.push(parseInt(parts[idx]));
        idx++;
      }
      units.push({ source, cards });
    }
    return units;
  }

  /**
   * Parse coaching sign units from G17F command.
   */
  static parseCoachingSign(line: string): CoachingSignUnit[] {
    const parts = line.split(',');
    const units: CoachingSignUnit[] = [];
    for (let i = 1; i < parts.length; i += 2) {
      if (i + 1 < parts.length) {
        units.push({
          role: parts[i],
          coach: parseInt(parts[i + 1]) || 0,
        });
      }
    }
    return units;
  }

  /**
   * Get the team from a message type string.
   */
  static getTeam(type: string): number {
    if (type.length >= 2 && type[0] === 'G') {
      return parseInt(type[1]) || 0;
    }
    return 0;
  }

  /**
   * Get the event code from a message type string.
   */
  static getEventCode(type: string): string {
    return type.substring(2);
  }
}
