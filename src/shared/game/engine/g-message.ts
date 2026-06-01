/**
 * G-Loop Message Types
 * Translation of C# PSDGamepkg.XI message protocol
 *
 * The G-Loop uses a string command protocol (e.g. "G0OH,1,2,3,1") for game events.
 * This module provides typed message classes that serialize/deserialize from this format.
 *
 * Message format: "{type},{sender},{receiver},{args...}"
 * - type: G0OH, G1TH, G2IN, etc. (team 0=all, 1=red, 2=blue; OH=effect, TH=threat, etc.)
 * - sender: player UID (0 = system)
 * - receiver: target player UID (0 = all)
 * - args: additional comma-separated parameters
 */

/** Message type enum covering all G-Loop message types */
export enum GMessageType {
  // Team 0 (all) messages
  G0OH = 'G0OH',
  G0OT = 'G0OT',
  G0OP = 'G0OP',
  G0OO = 'G0OO',
  G0ZH = 'G0ZH',
  G0ZW = 'G0ZW',
  G0HQ = 'G0HQ',
  G0DH = 'G0DH',
  G0CC = 'G0CC',
  G0CD = 'G0CD',
  G0CE = 'G0CE',
  G0CH = 'G0CH',
  G0DS = 'G0DS',
  G0IS = 'G0IS',
  G0OS = 'G0OS',
  G0TH = 'G0TH',
  G0IY = 'G0IY',
  G0OY = 'G0OY',
  G0WN = 'G0WN',
  G0IT = 'G0IT',
  G0IV = 'G0IV',
  G0OV = 'G0OV',
  G0MA = 'G0MA',
  G0QM = 'G0QM',
  G0OF = 'G0OF',
  G0QR = 'G0QR',
  G0CZ = 'G0CZ',
  G0HC = 'G0HC',
  G0HD = 'G0HD',
  G0HH = 'G0HH',
  G0HZ = 'G0HZ',
  G0HG = 'G0HG',
  G0TT = 'G0TT',
  G0QZ = 'G0QZ',
  G0AS = 'G0AS',
  G0SN = 'G0SN',
  G0MA_CMD = 'G0MA',

  // Team 1 (red) messages
  G1OH = 'G1OH',
  G1TH = 'G1TH',
  G1EV = 'G1EV',
  G1SG = 'G1SG',
  G1WJ = 'G1WJ',
  G1CH = 'G1CH',
  G1DI = 'G1DI',
  G1CK = 'G1CK',
  G1YP = 'G1YP',
  G1GE = 'G1GE',
  G1LY = 'G1LY',
  G1UE = 'G1UE',

  // Team 2 (blue) messages
  G2OH = 'G2OH',
  G2AS = 'G2AS',
  G2IN = 'G2IN',
  G2RN = 'G2RN',
  G2CN = 'G2CN',
  G2OL = 'G2OL',
  G2UL = 'G2UL',
  G2ZZ = 'G2ZZ',
  G2YZ = 'G2YZ',
  G2SY = 'G2SY',
}

/** GMessage interface - base type for all G-Loop messages */
export interface GMessage {
  type: string;
  sender: number;
  receiver: number;
  args: string[];
  timestamp: number;
  cancelled: boolean;
  source: string;

  toString(): string;
  clone(): GMessage;
}

/**
 * SimpleGMessage: network-serializable message using string protocol.
 * Format: "G0OH,sender,receiver,arg1,arg2,..."
 */
export class SimpleGMessage implements GMessage {
  type: string;
  sender: number;
  receiver: number;
  args: string[];
  timestamp: number;
  cancelled: boolean;
  source: string;

  constructor(type: string, sender: number, receiver: number, args: string[]) {
    this.type = type;
    this.sender = sender;
    this.receiver = receiver;
    this.args = args;
    this.timestamp = Date.now();
    this.cancelled = false;
    this.source = '';
  }

  /**
   * Serialize to string protocol format.
   * Example: "G0OH,1,2,3,1"
   */
  toString(): string {
    if (this.args.length > 0) {
      return `${this.type},${this.sender},${this.receiver},${this.args.join(',')}`;
    }
    return `${this.type},${this.sender},${this.receiver}`;
  }

  /**
   * Parse from string protocol format.
   * Example: "G1TH,1,0,5,-3,1" -> SimpleGMessage(G1TH, 1, 0, ["5","-3","1"])
   */
  static fromString(str: string): SimpleGMessage {
    const parts = str.split(',');
    return new SimpleGMessage(
      parts[0],
      parseInt(parts[1]) || 0,
      parseInt(parts[2]) || 0,
      parts.slice(3),
    );
  }

  /**
   * Clone this message.
   */
  clone(): SimpleGMessage {
    const msg = new SimpleGMessage(this.type, this.sender, this.receiver, [...this.args]);
    msg.source = this.source;
    msg.timestamp = this.timestamp;
    return msg;
  }
}

/**
 * InnerGMessage: internal message using object format (no network serialization).
 * Used for internal game logic that doesn't need to be transmitted.
 */
export class InnerGMessage implements GMessage {
  type: string;
  sender: number;
  receiver: number;
  args: string[];
  timestamp: number;
  cancelled: boolean;
  source: string;
  data: Record<string, unknown>;

  constructor(type: string, data: Record<string, unknown> = {}) {
    this.type = type;
    this.sender = 0;
    this.receiver = 0;
    this.args = [];
    this.timestamp = Date.now();
    this.cancelled = false;
    this.source = '';
    this.data = data;
  }

  toString(): string {
    return '';
  }

  clone(): InnerGMessage {
    return new InnerGMessage(this.type, { ...this.data });
  }
}

/**
 * SimpleGMessage100: extended message with additional parameters.
 * Used for messages that carry richer data (e.g. harm calculations).
 */
export class SimpleGMessage100 implements GMessage {
  type: string;
  sender: number;
  receiver: number;
  args: string[];
  timestamp: number;
  cancelled: boolean;
  source: string;
  extra: Record<string, unknown>;

  constructor(
    type: string,
    sender: number,
    receiver: number,
    args: string[],
    extra: Record<string, unknown> = {},
  ) {
    this.type = type;
    this.sender = sender;
    this.receiver = receiver;
    this.args = args;
    this.timestamp = Date.now();
    this.cancelled = false;
    this.source = '';
    this.extra = extra;
  }

  toString(): string {
    if (this.args.length > 0) {
      return `${this.type},${this.sender},${this.receiver},${this.args.join(',')}`;
    }
    return `${this.type},${this.sender},${this.receiver}`;
  }

  static fromString(str: string, extra: Record<string, unknown> = {}): SimpleGMessage100 {
    const parts = str.split(',');
    return new SimpleGMessage100(
      parts[0],
      parseInt(parts[1]) || 0,
      parseInt(parts[2]) || 0,
      parts.slice(3),
      extra,
    );
  }

  clone(): SimpleGMessage100 {
    const msg = new SimpleGMessage100(
      this.type,
      this.sender,
      this.receiver,
      [...this.args],
      { ...this.extra },
    );
    msg.source = this.source;
    msg.timestamp = this.timestamp;
    return msg;
  }
}

/**
 * EventMessage interface - used for EventBus dispatch.
 * Simplified version of GMessage for the event system.
 */
export interface EventMessage {
  type: string;
  sender: number;
  receiver: number;
  args: string[];
  timestamp: number;
  cancelled: boolean;
}

/**
 * EventContext - context passed to event handlers during G-Loop dispatch.
 */
export interface EventContext {
  message: EventMessage;
  board: import('../board').Board;
  sender: import('../player').Player | null;
  receiver: import('../player').Player | null;
}

/**
 * Parse a raw G-Loop command string into its components.
 * "G0OH,1,2,3,1" -> { type: "G0OH", sender: 1, receiver: 2, args: ["3","1"] }
 */
export function parseGCommand(cmd: string): { type: string; sender: number; receiver: number; args: string[] } {
  const parts = cmd.split(',');
  return {
    type: parts[0],
    sender: parseInt(parts[1]) || 0,
    receiver: parseInt(parts[2]) || 0,
    args: parts.slice(3),
  };
}

/**
 * Extract the event key from a G-message type for sk02 lookup.
 * "G0OH,1,2,3" -> "G0OH" (everything before first comma)
 */
export function extractEventKey(cmd: string): string {
  const idx = cmd.indexOf(',');
  return idx === -1 ? cmd : cmd.substring(0, idx);
}

/**
 * Get the team number from a message type.
 * G0xx -> 0, G1xx -> 1, G2xx -> 2
 */
export function getTeamFromType(type: string): number {
  if (type.length >= 2 && type[0] === 'G') {
    return parseInt(type[1]) || 0;
  }
  return 0;
}
