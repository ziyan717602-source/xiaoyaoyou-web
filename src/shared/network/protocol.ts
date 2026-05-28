/**
 * Network Message Protocol
 *
 * Defines the message types for client-server communication over WebSocket.
 * Clients send ClientMessage, servers respond with ServerMessage.
 * All messages are JSON-serialized with a `type` discriminator field.
 */

// === Client -> Server Messages ===

export type ClientMessage =
  | { type: 'create_room'; payload: { playerCount: number; packages: number[] } }
  | { type: 'join_room'; payload: { roomId: string; playerName: string } }
  | { type: 'leave_room' }
  | { type: 'list_rooms' }
  | { type: 'start_game' }
  | { type: 'player_input'; payload: { input: string } }
  | { type: 'get_state' }
  | { type: 'ping'; payload: { timestamp: number } };

// === Server -> Client Messages ===

export type ServerMessage =
  | { type: 'room_created'; payload: { roomId: string } }
  | { type: 'room_joined'; payload: { roomId: string; players: PlayerInfo[] } }
  | { type: 'room_left'; payload: { roomId: string } }
  | { type: 'room_list'; payload: { rooms: RoomInfo[] } }
  | { type: 'player_joined'; payload: { playerName: string; players: PlayerInfo[] } }
  | { type: 'player_left'; payload: { playerName: string; players: PlayerInfo[] } }
  | { type: 'player_disconnected'; payload: { playerName: string } }
  | { type: 'player_reconnected'; payload: { playerName: string } }
  | { type: 'game_started'; payload: { playerCount: number } }
  | { type: 'game_state'; payload: { state: GameState } }
  | { type: 'input_request'; payload: { format: string; code: string; arg: string } }
  | { type: 'game_over'; payload: { result: GameResultPayload } }
  | { type: 'error'; payload: { code: string; message: string } }
  | { type: 'pong'; payload: { timestamp: number } };

// === Auxiliary Types ===

export interface PlayerInfo {
  uid: number;
  name: string;
  isReady: boolean;
  isConnected: boolean;
}

export interface RoomInfo {
  roomId: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
}

export interface GameState {
  players: PlayerState[];
  currentTurn: number;
  phase: string;
  board: BoardState;
}

export interface PlayerState {
  uid: number;
  name: string;
  hp: number;
  hand: number[]; // Card IDs (numeric), client resolves to display codes via LibGroup
  team: number;
}

export interface BoardState {
  tuxPileCount: number;
  monPileCount: number;
  evePileCount: number;
}

/** Game result payload sent over the network (excludes Player object reference) */
export interface GameResultPayload {
  winner: number | null; // uid of winner, null for draw
  totalRounds: number;
  akaScore: number;
  aoScore: number;
  reason: 'victory' | 'max_rounds' | 'elimination';
}

// === Message Helpers ===

/**
 * Create a typed server message.
 */
export function createMessage<T extends ServerMessage>(
  type: T['type'],
  payload: T['payload'],
): T {
  return { type, payload } as T;
}

/**
 * Parse an incoming JSON string into a ClientMessage.
 * Returns null if the string is not valid JSON or lacks a type field.
 */
export function parseMessage(data: string): ClientMessage | null {
  try {
    const msg = JSON.parse(data);
    if (msg && typeof msg.type === 'string') {
      return msg as ClientMessage;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse an incoming JSON string into a ServerMessage.
 * Used by the client to parse messages received from the server.
 * Returns null if the string is not valid JSON or lacks a type field.
 */
export function parseServerMessage(data: string): ServerMessage | null {
  try {
    const msg = JSON.parse(data);
    if (msg && typeof msg.type === 'string') {
      return msg as ServerMessage;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create an error response message.
 */
export function createErrorMessage(
  code: string,
  message: string,
): ServerMessage {
  return { type: 'error', payload: { code, message } };
}
