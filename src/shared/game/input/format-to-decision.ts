/**
 * FormatToDecision - Legacy format string to DecisionRequest converter
 *
 * Converts the old format strings (T1, J1, Q, Y, S, //, !) into
 * structured DecisionRequest objects. This allows the new DecisionRequest
 * system to work with the existing format-string-based input system.
 *
 * Format types:
 * - T{uid}          → SELECT_TARGET with specific target
 * - T1(p1p2p3)      → SELECT_TARGET with candidate list
 * - J1(p1p2p3)      → SELECT_TARGET (joint selection)
 * - Q{count}(...)   → PLAY_CARD with card candidates
 * - Y{options}      → CHOOSE_OPTION
 * - S               → CHOOSE_OPTION (side: aka/ao)
 * - //              → CONFIRM
 * - !               → CONFIRM (auto-submit)
 */

import type { DecisionRequest, DecisionResponse, Candidate, LegalAction } from '../../network/protocol';

let requestCounter = 0;

/**
 * Generate a unique request ID.
 */
function generateRequestId(): string {
  return `legacy-${Date.now()}-${++requestCounter}`;
}

/**
 * Convert a legacy format string to a DecisionRequest.
 *
 * @param uid Player UID receiving this request
 * @param format Format string (e.g., "T1(p1p2p3)", "Q2(c1c2c3c4)")
 * @param code Effect code (e.g., "ZW", "SK")
 * @param phaseId Current phase ID (e.g., "R1ZW")
 * @returns DecisionRequest object
 */
export function formatToDecision(
  uid: number,
  format: string,
  code: string,
  phaseId: string = '',
): DecisionRequest {
  // Parse the format string
  const parsed = parseFormat(format);

  return {
    requestId: generateRequestId(),
    phaseId,
    phase: code,
    code,
    prompt: parsed.prompt,
    recipients: [uid],
    policy: 'single-actor',
    min: parsed.min,
    max: parsed.max,
    optional: parsed.optional,
    timeoutMs: 30000,
    legalActions: parsed.legalActions,
    candidates: parsed.candidates,
    sourceFormat: format,
  };
}

/**
 * Convert a DecisionResponse back to a legacy input string.
 * Used by the old input system to process new-style responses.
 */
export function decisionToLegacyInput(response: DecisionResponse): string {
  if (response.actionId === 'PASS') {
    return '/';
  }

  if (response.payload.targetUids && response.payload.targetUids.length > 0) {
    return `T${response.payload.targetUids[0]}`;
  }

  if (response.payload.cardInstanceIds && response.payload.cardInstanceIds.length > 0) {
    return String(response.payload.cardInstanceIds[0]);
  }

  if (response.payload.optionValues && response.payload.optionValues.length > 0) {
    return response.payload.optionValues[0];
  }

  if (response.payload.skillCode) {
    return response.payload.skillCode;
  }

  return response.actionId;
}

// ─── Internal Parsing ───

interface ParsedFormat {
  prompt: string;
  min: number;
  max: number;
  optional: boolean;
  candidates: Candidate[];
  legalActions: LegalAction[];
}

function parseFormat(format: string): ParsedFormat {
  const result: ParsedFormat = {
    prompt: '',
    min: 1,
    max: 1,
    optional: false,
    candidates: [],
    legalActions: [],
  };

  if (!format) return result;

  // Extract prompt from # prefix
  let remaining = format;
  if (remaining.startsWith('#')) {
    // Find the end of the prompt (before / or first segment character)
    let promptEnd = -1;
    for (let i = 1; i < remaining.length; i++) {
      const ch = remaining[i];
      if (ch === '/' || ch === 'T' || ch === 'J' || ch === 'Q' || ch === 'Y' || ch === 'S' || ch === '!' || ch === ',') {
        promptEnd = i;
        break;
      }
    }
    if (promptEnd === -1) {
      result.prompt = remaining.substring(1);
      return result;
    }
    result.prompt = remaining.substring(1, promptEnd);
    remaining = remaining.substring(promptEnd);
  }

  // Check for optional (/ prefix) - but not // which is confirm
  if (remaining.startsWith('/') && !remaining.startsWith('//')) {
    result.optional = true;
    remaining = remaining.substring(1);
  }

  // Parse segments - handle T1(p...) as a special case before splitting by comma
  // because T1(p2p3) contains no commas but needs special parsing
  const segments = remaining.split(',');
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;

    // T1(p...) segment: target list (check first since it contains parentheses)
    // Format: T1(p2p3p4) where p separates target UIDs
    if (trimmed.startsWith('T1(') && trimmed.includes(')')) {
      const closeIdx = trimmed.indexOf(')');
      const inner = trimmed.substring(3, closeIdx);
      // Split by 'p' separator - each part is a UID number
      const targets = inner.split('p').filter(Boolean);
      for (const t of targets) {
        const uid = parseInt(t, 10);
        if (!isNaN(uid) && uid > 0) {
          result.candidates.push({
            id: String(uid),
            kind: 'player',
            label: `P${uid}`,
            uid,
          });
          result.legalActions.push({
            actionId: `target-${uid}`,
            type: 'SELECT_TARGET',
            actorUid: 0,
            targetUids: [uid],
          });
        }
      }
      result.min = 0;
      result.max = 1;
      continue;
    }

    // T segment: single target selection
    if (trimmed.startsWith('T') && !trimmed.startsWith('T1(')) {
      const uid = parseInt(trimmed.substring(1), 10);
      if (!isNaN(uid) && uid > 0) {
        result.candidates.push({
          id: String(uid),
          kind: 'player',
          label: `P${uid}`,
          uid,
        });
        result.legalActions.push({
          actionId: `target-${uid}`,
          type: 'SELECT_TARGET',
          actorUid: 0,
          targetUids: [uid],
        });
      }
      continue;
    }

    // Q segment: card selection
    if (trimmed.startsWith('Q')) {
      const countMatch = trimmed.match(/^Q(\d+)/);
      if (countMatch) {
        result.max = parseInt(countMatch[1], 10);
      }
      result.legalActions.push({
        actionId: 'play-card',
        type: 'PLAY_CARD',
        actorUid: 0,
      });
      continue;
    }

    // Y segment: option selection
    if (trimmed.startsWith('Y')) {
      const optionCount = parseInt(trimmed.substring(1), 10);
      if (!isNaN(optionCount)) {
        result.max = optionCount;
        result.legalActions.push({
          actionId: 'choose-option',
          type: 'CHOOSE_OPTION',
          actorUid: 0,
        });
      }
      continue;
    }

    // S segment: side selection (aka/ao)
    if (trimmed === 'S') {
      result.candidates.push(
        { id: 'aka', kind: 'side', label: '我方', value: 'aka' },
        { id: 'ao', kind: 'side', label: '敌方', value: 'ao' },
      );
      result.legalActions.push({
        actionId: 'choose-side',
        type: 'CHOOSE_OPTION',
        actorUid: 0,
        options: [
          { value: 'aka', label: '我方' },
          { value: 'ao', label: '敌方' },
        ],
      });
      continue;
    }

    // // segment: confirm
    if (trimmed === '//') {
      result.legalActions.push({
        actionId: 'confirm',
        type: 'CONFIRM',
        actorUid: 0,
      });
      continue;
    }

    // ! segment: auto-confirm
    if (trimmed === '!') {
      result.legalActions.push({
        actionId: 'auto-confirm',
        type: 'CONFIRM',
        actorUid: 0,
      });
      continue;
    }
  }

  // Add PASS action if optional
  if (result.optional) {
    result.legalActions.push({
      actionId: 'PASS',
      type: 'PASS',
      actorUid: 0,
    });
  }

  return result;
}
