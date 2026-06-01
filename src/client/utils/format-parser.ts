/**
 * Format String Parser
 *
 * Parses the server's input format strings into structured segments.
 * Based on WPF's FormattedInputWithCancelFlag (XIVisi.cs:486-1319)
 * and AI's parseOptions (random-ai.ts:69-124).
 *
 * Format grammar:
 *   format = segment ("," segment)*
 *   segment = ["/"]["+"] selector | "#" text "," | "//"
 *   selector = type [count ["~" maxCount]] ["(" options ")"]
 *   type = T|Q|C|Z|M|I|Y|D|X|S|G|J|F|E|H|V
 *   options = (prefix value)+  e.g. "p1p2p3" or "c101c102"
 *
 * Special formats:
 *   S                        → side selection, options = ["1","2"]
 *   #desc##opt1##opt2,Y{N}   → menu selection, options = ["1","2",...]
 *   //                       → auto-confirm, value = "0"
 *   #description,            → description text (not a selector)
 */

/** A single selectable option within a segment */
export interface OptionItem {
  /** Raw value to send back to server (e.g. "1", "101", "T3", "/") */
  value: string;
  /** Display label (player name, card name, etc.) */
  label?: string;
  /** Original prefix for context (e.g. "p" for player, "c" for card) */
  prefix?: string;
}

/** One segment of a parsed format string */
export interface InputSegment {
  /** Segment type (T/Q/C/Z/M/I/Y/D/X/S/G/J/F/E/H/V or special) */
  type: string;
  /** Minimum number of selections required */
  count: number;
  /** Maximum number of selections (for range: T1~3) */
  maxCount?: number;
  /** Whether this segment can be skipped (prefix /) */
  optional: boolean;
  /** Whether zero selections are allowed (prefix +) */
  plus: boolean;
  /** Description text from # prefix */
  description?: string;
  /** Available options for this segment */
  options: OptionItem[];
  /** The raw format substring for this segment */
  raw: string;
}

/** Result of parsing a complete format string */
export interface ParsedFormat {
  /** All segments in order */
  segments: InputSegment[];
  /** Whether this is a compound format (multiple segments) */
  isCompound: boolean;
}

/**
 * Parse a format string into structured segments.
 *
 * @param format The raw format string from the server
 * @returns Parsed format with segments
 */
export function parseFormat(format: string): ParsedFormat {
  const trimmed = format.trim();
  if (!trimmed) {
    return { segments: [], isCompound: false };
  }

  // Handle auto-confirm "//"
  if (trimmed === '//') {
    return {
      segments: [{
        type: 'AUTO',
        count: 0,
        optional: false,
        plus: false,
        options: [{ value: '0' }],
        raw: '//',
      }],
      isCompound: false,
    };
  }

  const segments = splitSegments(trimmed);
  const parsed = segments.map(parseSegment).filter((s): s is InputSegment => s !== null);

  // Merge DESC segments with the following selector segment
  // e.g. [DESC("弃置的"), Q(...)] → [Q(..., description="弃置的")]
  const merged: InputSegment[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const seg = parsed[i];
    if (seg.type === 'DESC' && i + 1 < parsed.length && parsed[i + 1].type !== 'DESC') {
      // Merge description into next segment
      const next = parsed[i + 1];
      merged.push({
        ...next,
        description: seg.description || next.description,
      });
      i++; // Skip the next segment (already merged)
    } else if (seg.type !== 'DESC') {
      merged.push(seg);
    } else {
      // Standalone DESC (no following selector)
      merged.push(seg);
    }
  }

  return {
    segments: merged,
    isCompound: merged.length > 1,
  };
}

/**
 * Split a format string into raw segment strings, respecting parentheses.
 * Commas inside (...) are NOT split.
 *
 * Special handling for menu format: #desc##opt1##opt2,Y{N}
 * The comma before Y{N} is part of the menu segment, not a segment separator.
 */
function splitSegments(format: string): string[] {
  const segments: string[] = [];
  let current = '';
  let depth = 0;
  let i = 0;

  while (i < format.length) {
    const ch = format[i];

    if (ch === '(') {
      depth++;
      current += ch;
      i++;
    } else if (ch === ')') {
      depth--;
      current += ch;
      i++;
    } else if (ch === '#' && depth === 0 && (i === 0 || format[i - 1] === ',' || current.trim() === '' || current.trim() === '/')) {
      // Potential description or menu format starting with #
      // Flush current if it has content (like "/")
      const prefix = current.trim();
      current = '';

      // Read from # to find the structure
      let j = i + 1;
      let text = '';

      // Check if this is a menu format: #desc##opt1##opt2,Y{N}
      // Read until we see ",Y" (end of menu) or "," (end of simple description)
      while (j < format.length) {
        if (format[j] === ',') {
          // Check if this comma is followed by Y{N} (menu count)
          const afterComma = format.substring(j + 1);
          if (/^Y\d+/.test(afterComma)) {
            // This is a menu format — include everything up to and including Y{N}
            text += ',';
            j++;
            // Read Y and digits
            while (j < format.length && /[Y\d]/.test(format[j])) {
              text += format[j];
              j++;
            }
            break;
          } else {
            // Simple description — comma ends it
            text += ',';
            j++;
            break;
          }
        } else {
          text += format[j];
          j++;
        }
      }

      // Emit the segment
      const seg = prefix ? prefix + '#' + text : '#' + text;
      if (seg.trim()) {
        segments.push(seg.trim());
      }
      i = j;
    } else if (ch === ',' && depth === 0) {
      // This comma separates segments
      if (current.trim()) {
        segments.push(current.trim());
      }
      current = '';
      i++;
    } else {
      current += ch;
      i++;
    }
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

/**
 * Parse a single raw segment string into an InputSegment.
 */
function parseSegment(raw: string): InputSegment | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Check for literal value passthrough (!value)
  if (trimmed.startsWith('!')) {
    const literalValue = trimmed.substring(1);
    return {
      type: 'LITERAL',
      count: 0,
      optional: false,
      plus: false,
      options: [{ value: literalValue }],
      raw: trimmed,
    };
  }

  // Check if it's a description-only segment (#text,)
  if (trimmed.startsWith('#') && !trimmed.includes('(') && !trimmed.includes('Y')) {
    // Pure description — check if it ends with comma (already stripped by splitSegments)
    const desc = trimmed.replace(/^#/, '').replace(/,$/, '');
    // Return as a description-only segment, will be merged into the next segment
    return {
      type: 'DESC',
      count: 0,
      optional: false,
      plus: false,
      description: desc,
      options: [],
      raw: trimmed,
    };
  }

  // Check for side selection (bare S or #desc,S)
  if (trimmed === 'S' || trimmed.endsWith(',S') || trimmed.endsWith('#,S')) {
    const desc = extractLeadingDescription(trimmed);
    return {
      type: 'S',
      count: 1,
      optional: false,
      plus: false,
      description: desc,
      options: [
        { value: '1', label: '仙' },
        { value: '2', label: '剑' },
      ],
      raw: trimmed,
    };
  }

  // Check for menu format: #desc##opt1##opt2,Y{count}
  const menuResult = parseMenuSegment(trimmed);
  if (menuResult) return menuResult;

  // Check for optional prefix /
  let optional = false;
  let plus = false;
  let rest = trimmed;

  if (rest.startsWith('/')) {
    optional = true;
    rest = rest.substring(1);
  }
  if (rest.startsWith('+')) {
    plus = true;
    rest = rest.substring(1);
  }

  // Extract leading description #text,
  const desc = extractLeadingDescription(rest);
  if (desc) {
    // Remove the description portion
    const descEnd = rest.indexOf(',');
    if (descEnd >= 0) {
      rest = rest.substring(descEnd + 1);
    }
  }

  // Now parse the selector: TYPE[count[~max]][(options)]
  const selectorMatch = rest.match(/^([A-Z])(\d+(?:~\d+)?)?(?:\(([^)]*)\))?$/);
  if (!selectorMatch) {
    // Try to extract just the type letter
    const typeMatch = rest.match(/^([A-Z])/);
    if (typeMatch) {
      return {
        type: typeMatch[1],
        count: 1,
        optional,
        plus,
        description: desc || undefined,
        options: [],
        raw: trimmed,
      };
    }
    // Fallback: treat as raw text
    return {
      type: 'RAW',
      count: 0,
      optional,
      plus,
      description: desc || trimmed,
      options: [],
      raw: trimmed,
    };
  }

  const type = selectorMatch[1];
  const countStr = selectorMatch[2];
  const optionsStr = selectorMatch[3];

  // Parse count and maxCount
  let count = 1;
  let maxCount: number | undefined;
  if (countStr) {
    const tildeIdx = countStr.indexOf('~');
    if (tildeIdx >= 0) {
      count = parseInt(countStr.substring(0, tildeIdx), 10) || 1;
      maxCount = parseInt(countStr.substring(tildeIdx + 1), 10) || undefined;
    } else {
      count = parseInt(countStr, 10) || 1;
    }
  }

  // Parse options
  const options = optionsStr ? parseOptions(optionsStr, type) : [];

  return {
    type,
    count,
    maxCount,
    optional,
    plus,
    description: desc || undefined,
    options,
    raw: trimmed,
  };
}

/**
 * Parse a menu segment: #desc##opt1##opt2,Y{count}
 */
function parseMenuSegment(raw: string): InputSegment | null {
  // Remove leading / if present
  let trimmed = raw;
  let optional = false;
  if (trimmed.startsWith('/')) {
    optional = true;
    trimmed = trimmed.substring(1);
  }

  const menuMatch = trimmed.match(/#(.+?)##(.+),Y(\d+)/);
  if (!menuMatch) return null;

  const description = menuMatch[1];
  const optionsStr = menuMatch[2];
  const count = parseInt(menuMatch[3], 10) || 1;

  const optionLabels = optionsStr.split('##').filter(s => s !== '');
  const options: OptionItem[] = optionLabels.map((label, i) => ({
    value: String(i + 1),
    label: label.trim(),
  }));

  return {
    type: 'Y',
    count,
    optional,
    plus: false,
    description,
    options,
    raw,
  };
}

/**
 * Extract leading #description, from a segment string.
 */
function extractLeadingDescription(s: string): string | undefined {
  if (!s.startsWith('#')) return undefined;
  const commaIdx = s.indexOf(',');
  if (commaIdx < 0) return undefined;
  return s.substring(1, commaIdx);
}

/**
 * Parse the options string inside parentheses.
 * e.g. "p1p2p3" → [{value:"1"}, {value:"2"}, {value:"3"}]
 * e.g. "c101c102" → [{value:"101"}, {value:"102"}]
 * e.g. "pT1pT2" → [{value:"T1"}, {value:"T2"}]
 */
function parseOptions(optionsStr: string, type: string): OptionItem[] {
  if (!optionsStr) return [];

  const options: OptionItem[] = [];

  // Match patterns like p1, p2, c101, pT1, etc.
  // The prefix is one letter, followed by the value (digits or T+digits)
  const re = /([a-zA-Z])(\d+|T\d+)/g;
  let match;
  while ((match = re.exec(optionsStr)) !== null) {
    const prefix = match[1];
    const value = match[2];
    options.push({ value, prefix });
  }

  // If no matches found, try splitting by a common prefix
  if (options.length === 0) {
    // Try splitting by the first letter
    const firstLetter = optionsStr.charAt(0);
    if (/[a-zA-Z]/.test(firstLetter)) {
      const parts = optionsStr.split(firstLetter).filter(s => s);
      for (const part of parts) {
        options.push({ value: part, prefix: firstLetter });
      }
    }
  }

  return options;
}

/**
 * Get a human-readable description for a segment type.
 */
export function getSegmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    T: '选择目标',
    Q: '选择手牌',
    C: '选择卡牌',
    Z: '选择卡牌',
    M: '选择怪物',
    I: '选择特殊卡',
    Y: '选择选项',
    D: '输入数字',
    X: '排列顺序',
    S: '选择阵营',
    G: '选择卡组',
    J: '选择判定目标',
    F: '选择符文',
    E: '选择事件',
    H: '选择英雄',
    V: '选择属性',
    AUTO: '确认',
    DESC: '提示',
    RAW: '操作',
  };
  return labels[type] || type;
}

/**
 * Get the expected selection count label for a segment.
 */
export function getCountLabel(segment: InputSegment): string {
  if (segment.maxCount !== undefined) {
    return `选择${segment.count}至${segment.maxCount}项`;
  }
  if (segment.count === 0) return '';
  if (segment.count === 1) return '选择1项';
  return `选择${segment.count}项`;
}

/**
 * Format a selection result as the string to send back to the server.
 * For compound formats, segments are joined with commas.
 */
export function formatSelectionResult(
  segments: InputSegment[],
  selections: Map<number, string[]>,
): string {
  const parts: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const selected = selections.get(i) || [];

    if (seg.type === 'DESC') continue; // Skip description segments
    if (seg.type === 'AUTO') {
      parts.push('0');
      continue;
    }

    if (selected.length === 0 && seg.optional) {
      parts.push('/');
    } else if (selected.length > 0) {
      parts.push(selected.join(','));
    } else {
      parts.push('');
    }
  }

  return parts.join(',');
}
