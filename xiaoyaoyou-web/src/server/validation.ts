/**
 * Server-side input validation and rate limiting.
 */

import type { ClientMessage } from '../shared/network/protocol';

// --- Input Validation ---

const MAX_PLAYER_NAME_LENGTH = 12;
const MIN_PLAYER_NAME_LENGTH = 1;
const MAX_INPUT_LENGTH = 100;
const VALID_ROOM_ID_PATTERN = /^[A-Z0-9]{4,8}$/;
const VALID_PLAYER_COUNT = [2, 3, 4, 5, 6];

export interface ValidationError {
  valid: false;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: true;
}

export type ValidationResponse = ValidationError | ValidationResult;

export function validateMessage(message: unknown): ValidationResponse {
  if (!message || typeof message !== 'object') {
    return { valid: false, code: 'INVALID_FORMAT', message: 'Message must be an object' };
  }

  const msg = message as Record<string, unknown>;

  if (typeof msg.type !== 'string') {
    return { valid: false, code: 'INVALID_FORMAT', message: 'Message must have a string type' };
  }

  if (!msg.payload || typeof msg.payload !== 'object') {
    // Messages without payload: allow unknown type to fall through to default handler
    return { valid: true };
  }

  const payload = msg.payload as Record<string, unknown>;

  switch (msg.type) {
    case 'create_room':
      return validateCreateRoom(payload);
    case 'join_room':
      return validateJoinRoom(payload);
    case 'reconnect':
      return validateJoinRoom(payload); // Same validation
    case 'hero_select':
      return validateHeroSelect(payload);
    case 'player_input':
      return validatePlayerInput(payload);
    case 'get_state':
    case 'get_room':
    case 'leave_room':
    case 'start_game':
    case 'player_ready':
    case 'list_rooms':
    case 'ping':
      // These are safe or have minimal params
      return { valid: true };
    default:
      return { valid: false, code: 'UNKNOWN_TYPE', message: `Unknown message type: ${msg.type}` };
  }
}

function validateCreateRoom(payload: Record<string, unknown>): ValidationResponse {
  const { playerCount, playerName } = payload;

  if (typeof playerCount !== 'number' || !VALID_PLAYER_COUNT.includes(playerCount)) {
    return { valid: false, code: 'INVALID_PLAYER_COUNT', message: `Player count must be one of: ${VALID_PLAYER_COUNT.join(', ')}` };
  }

  // playerName is optional (defaults to '房主' in server)
  if (playerName !== undefined && playerName !== null) {
    const nameResult = validatePlayerName(playerName);
    if (!nameResult.valid) return nameResult;
  }

  return { valid: true };
}

function validateJoinRoom(payload: Record<string, unknown>): ValidationResponse {
  const { roomId, playerName } = payload;

  if (typeof roomId !== 'string' || !VALID_ROOM_ID_PATTERN.test(roomId)) {
    return { valid: false, code: 'INVALID_ROOM_ID', message: 'Room ID must be 4-8 alphanumeric characters' };
  }

  const nameResult = validatePlayerName(playerName);
  if (!nameResult.valid) return nameResult;

  return { valid: true };
}

function validateHeroSelect(payload: Record<string, unknown>): ValidationResponse {
  const { heroId } = payload;

  if (typeof heroId !== 'number' || !Number.isInteger(heroId) || heroId < 0) {
    return { valid: false, code: 'INVALID_HERO_ID', message: 'Hero ID must be a non-negative integer' };
  }

  return { valid: true };
}

function validatePlayerInput(payload: Record<string, unknown>): ValidationResponse {
  const { input } = payload;

  if (typeof input !== 'string') {
    return { valid: false, code: 'INVALID_INPUT', message: 'Input must be a string' };
  }

  if (input.length === 0) {
    return { valid: false, code: 'EMPTY_INPUT', message: 'Input cannot be empty' };
  }

  if (input.length > MAX_INPUT_LENGTH) {
    return { valid: false, code: 'INPUT_TOO_LONG', message: `Input must be at most ${MAX_INPUT_LENGTH} characters` };
  }

  return { valid: true };
}

function validatePlayerName(playerName: unknown): ValidationResponse {
  if (typeof playerName !== 'string') {
    return { valid: false, code: 'INVALID_PLAYER_NAME', message: 'Player name must be a string' };
  }

  const trimmed = playerName.trim();
  if (trimmed.length < MIN_PLAYER_NAME_LENGTH) {
    return { valid: false, code: 'EMPTY_PLAYER_NAME', message: 'Player name cannot be empty' };
  }

  if (trimmed.length > MAX_PLAYER_NAME_LENGTH) {
    return { valid: false, code: 'PLAYER_NAME_TOO_LONG', message: `Player name must be at most ${MAX_PLAYER_NAME_LENGTH} characters` };
  }

  return { valid: true };
}

// --- Rate Limiting ---

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const RATE_LIMIT_WINDOW_MS = 1000; // 1 second window
const RATE_LIMIT_MAX_MESSAGES = 20; // Max 20 messages per second

export class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();

  /**
   * Check if a connection is rate-limited.
   * Returns true if the message should be blocked.
   */
  isRateLimited(connectionId: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(connectionId);

    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      // New window
      this.limits.set(connectionId, { count: 1, windowStart: now });
      return false;
    }

    entry.count++;
    return entry.count > RATE_LIMIT_MAX_MESSAGES;
  }

  /**
   * Clean up entries for disconnected connections.
   */
  cleanup(connectionId: string): void {
    this.limits.delete(connectionId);
  }

  /**
   * Get the current count for a connection (for testing).
   */
  getCount(connectionId: string): number {
    return this.limits.get(connectionId)?.count ?? 0;
  }
}
