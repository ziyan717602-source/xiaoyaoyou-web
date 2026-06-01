/**
 * Network Message Protocol
 *
 * Defines the message types for client-server communication over WebSocket.
 * Clients send ClientMessage, servers respond with ServerMessage.
 * All messages are JSON-serialized with a `type` discriminator field.
 */

// === Decision Protocol (M2) ===

export interface Candidate {
  id: string;
  kind: 'player' | 'card' | 'side' | 'option';
  label: string;
  uid?: number;
  cardInstanceId?: number;
  value?: string;
  disabledReason?: string;
}

export interface LegalAction {
  actionId: string;
  type: 'PLAY_CARD' | 'USE_SKILL' | 'SELECT_TARGET' | 'CHOOSE_OPTION' | 'PASS' | 'CONFIRM';
  actorUid: number;
  cardInstanceIds?: number[];
  skillCodes?: string[];
  targetUids?: number[];
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  requiresConfirm?: boolean;
  disabledReason?: string;
}

export interface DecisionRequest {
  requestId: string;
  phaseId: string;
  phase: string;
  code: string;
  prompt: string;
  recipients: number[];
  policy: 'single-actor' | 'first-valid' | 'all-pass' | 'captain';
  min: number;
  max: number;
  optional: boolean;
  timeoutMs: number;
  legalActions: LegalAction[];
  candidates?: Candidate[];
  sourceFormat?: string; // legacy 兼容：原始 format 字符串
}

export interface DecisionResponse {
  requestId: string;
  phaseId: string;
  uid: number;
  actionId: string;
  payload: {
    cardInstanceIds?: number[];
    targetUids?: number[];
    optionValues?: string[];
    skillCode?: string;
  };
}

export interface SubmitResult {
  accepted: boolean;
  reason?: string;
}

// === Client -> Server Messages ===

export type ClientMessage =
  | { type: 'create_room'; payload: { playerCount: number; packages: number[]; playerName?: string } }
  | { type: 'join_room'; payload: { roomId: string; playerName: string } }
  | { type: 'reconnect'; payload: { roomId: string; playerName: string } }
  | { type: 'leave_room' }
  | { type: 'list_rooms' }
  | { type: 'start_game' }
  | { type: 'player_ready' }
  | { type: 'hero_select'; payload: { heroId: number } }
  | { type: 'player_input'; payload: { input: string } }
  | { type: 'decision_response'; payload: DecisionResponse }
  | { type: 'get_state'; payload: { requestUid: number; roomId?: string; playerName?: string } }
  | { type: 'get_room'; payload: { roomId: string } }
  | { type: 'add_ai' }
  | { type: 'ping'; payload: { timestamp: number } };

// === Server -> Client Messages ===

export type ServerMessage =
  | { type: 'room_created'; payload: { roomId: string; players: PlayerInfo[]; myUid: number; maxPlayers: number } }
  | { type: 'room_joined'; payload: { roomId: string; players: PlayerInfo[]; myUid: number; maxPlayers: number } }
  | { type: 'room_left'; payload: { roomId: string } }
  | { type: 'room_list'; payload: { rooms: RoomInfo[] } }
  | { type: 'player_joined'; payload: { playerName: string; players: PlayerInfo[] } }
  | { type: 'player_left'; payload: { playerName: string; players: PlayerInfo[] } }
  | { type: 'player_disconnected'; payload: { playerName: string; players: PlayerInfo[] } }
  | { type: 'player_reconnected'; payload: { playerName: string; players: PlayerInfo[] } }
  | { type: 'game_started'; payload: { playerCount: number } }
  | { type: 'hero_select_request'; payload: { uid: number; availableHeroes: HeroInfo[] } }
  | { type: 'hero_select_response'; payload: { uid: number; heroId: number; success: boolean } }
  | { type: 'game_state'; payload: { state: GameState } }
  | { type: 'input_request'; payload: { uid: number; format: string; code: string; arg: string } }
  | { type: 'decision_request'; payload: DecisionRequest }
  | { type: 'decision_result'; payload: { requestId: string; accepted: boolean; reason?: string } }
  | { type: 'game_over'; payload: { result: GameResultPayload } }
  | { type: 'game_error'; payload: { message: string } }
  | { type: 'room_info'; payload: { roomId: string; players: PlayerInfo[]; myUid: number; maxPlayers: number } }
  | { type: 'g_message'; payload: { msg: string; targetUid?: number } }
  | { type: 'error'; payload: { code: string; message: string } }
  | { type: 'pong'; payload: { timestamp: number } };

// === Auxiliary Types ===

export interface PlayerInfo {
  uid: number;
  name: string;
  isReady: boolean;
  isConnected: boolean;
}

export interface HeroInfo {
  avatar: number;
  name: string;
  group: number;
  gender: string;
  hp: number;
  str: number;
  dex: number;
}

export interface RoomInfo {
  roomId: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
}

export interface NameLookup {
  cards: Record<number, string>;
  heroes: Record<number, string>;
  monsters: Record<number, string>;
  skills: Record<string, string>;
  events: Record<number, string>;
}

// === Card Instance State (M3) ===

export interface CardInstanceState {
  instanceId: number;
  code: string;
  name: string;
  type: string;
  zone: 'hand' | 'weapon' | 'armor' | 'trove' | 'exEquip' | 'discard' | 'deck' | 'battle';
  visible: boolean;
  selectable?: boolean;
  disabledReason?: string;
}

export interface GameState {
  players: PlayerState[];
  currentTurn: number;
  phase: string;
  board: BoardState;
  heroSelectRequest?: {
    uid: number;
    availableHeroes: HeroInfo[];
  } | null;
  nameLookup?: NameLookup;
}

export interface PlayerState {
  uid: number;
  name: string;
  heroAvatar: number; // Hero avatar ID for image lookup (e.g., 10101)
  hp: number;
  hpBase: number;
  hand: CardInstanceState[]; // Only populated for the requesting player; empty for others
  handCount: number; // Visible to all players
  team: number;
  weapon: number;
  armor: number;
  trove: number;
  exEquip: number;
  str: number;
  dex: number;
  pets: number[];
  petCodes: string[]; // Card codes for pet images (e.g., 'GS001', 'GH002')
  skills: string[]; // Skill codes for skill panel (e.g., 'JN101', 'JN102')
  blesses: string[]; // Bless/BK skill codes from other players
  status: string[];
}

export interface ActiveMonster {
  code: string;
  name: string;
  str: number;
  agl: number;
  element: number;
  level: number;
}

export interface ActiveEvent {
  code: string;
  name: string;
  description: string;
}

export interface BoardState {
  tuxPileCount: number;
  monPileCount: number;
  evePileCount: number;
  activeMonster: ActiveMonster | null;
  activeEvent: ActiveEvent | null;
  tuxDises: number[];
  monDises: number[];
  eveDises: number[];
}

/** Game result payload sent over the network (excludes Player object reference) */
export interface GameResultPayload {
  winner: number | null; // uid of winner, null for draw
  totalRounds: number;
  akaScore: number;
  aoScore: number;
  reason: 'victory' | 'max_rounds' | 'elimination' | 'exhaustion';
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
