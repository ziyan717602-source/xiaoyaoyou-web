/**
 * InputController - Replaces OperationPanel
 *
 * Coordinates all player interactions based on the server's format string.
 * Does NOT render interaction UI itself — instead activates the appropriate
 * UI region (HandArea, PlayerInfo, DealTable, NumberPad) via callbacks.
 *
 * Design inspired by WPF's JoyStick + FormattedInputWithCancelFlag pattern:
 * - Player clicks cards/targets directly in the game area
 * - InputController tracks selections and validates against format requirements
 * - Decide button appears when all requirements are met
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { parseFormat, getSegmentTypeLabel, getCountLabel, type ParsedFormat, type InputSegment } from '../../utils/format-parser';
import type { PlayerState } from '@shared/network';
import DealTable from './DealTable';
import NumberInput from './NumberInput';
import ElementPicker from './ElementPicker';

export interface InputControllerProps {
  /** The current input request from the server */
  inputRequest: { uid: number; format: string; code: string; arg: string };
  /** Selected card instance IDs from HandArea */
  selectedCardInstanceIds: number[];
  /** Selected target UIDs from PlayerInfo */
  selectedTargets: number[];
  /** Called when a card selection changes */
  onCardSelect: (instanceId: number) => void;
  /** Called when a target selection changes */
  onTargetSelect: (uid: number) => void;
  /** Called when the player submits their input */
  onSubmit: (input: string) => void;
  /** Called when the player cancels */
  onCancel: () => void;
  /** All players in the game */
  players: PlayerState[];
  /** Name lookup for card/player names */
  nameLookup?: Record<string, string>;
  /** Current player's hand (CardInstanceState[]) */
  hand: Array<{ instanceId: number; code: string }>;
  /** Timeout in seconds */
  timeout?: number;
}

/**
 * The interaction mode that InputController communicates to GamePage.
 * GamePage uses this to activate the appropriate UI region.
 */
export type InteractionMode =
  | { type: 'none' }
  | { type: 'target'; count: number; maxCount?: number; candidateUids: number[] }
  | { type: 'card'; count: number; maxCount?: number; candidateCodes?: string[] }
  | { type: 'menu'; options: { value: string; label?: string }[]; count: number }
  | { type: 'side' }
  | { type: 'deal'; segment: InputSegment }
  | { type: 'number'; min: number; max: number }
  | { type: 'element'; segment: InputSegment }
  | { type: 'auto' };

const InputController: React.FC<InputControllerProps> = ({
  inputRequest,
  selectedCardInstanceIds,
  selectedTargets,
  onCardSelect,
  onTargetSelect,
  onSubmit,
  onCancel,
  players,
  nameLookup,
  hand,
  timeout = 30,
}) => {
  const [timeLeft, setTimeLeft] = useState(timeout);
  const [menuSelections, setMenuSelections] = useState<number[]>([]);
  const [numberSelection, setNumberSelection] = useState<number | null>(null);
  const [elementSelections, setElementSelections] = useState<number[]>([]);

  // Parse the format string
  const parsed: ParsedFormat = useMemo(() => {
    return parseFormat(inputRequest.format);
  }, [inputRequest.format]);

  // Determine the current interaction mode based on the first active segment
  const interactionMode: InteractionMode = useMemo(() => {
    for (const seg of parsed.segments) {
      if (seg.type === 'AUTO') return { type: 'auto' };
      if (seg.type === 'DESC') continue;

      if (seg.type === 'T' || seg.type === 'J') {
        return {
          type: 'target',
          count: seg.count,
          maxCount: seg.maxCount,
          // J segments have values like "T1","T2" — extract numeric part
          // T segments have values like "1","2" — parse directly
          candidateUids: seg.options.map(o => {
            const match = o.value.match(/T?(\d+)/);
            return match ? parseInt(match[1], 10) : NaN;
          }).filter(n => !isNaN(n)),
        };
      }
      if (seg.type === 'Q') {
        return {
          type: 'card',
          count: seg.count,
          maxCount: seg.maxCount,
        };
      }
      if (['C', 'Z', 'M', 'I', 'G', 'F', 'E', 'H'].includes(seg.type)) {
        return { type: 'deal', segment: seg };
      }
      if (seg.type === 'Y') {
        return {
          type: 'menu',
          options: seg.options,
          count: seg.count,
        };
      }
      if (seg.type === 'S') {
        return { type: 'side' };
      }
      if (seg.type === 'D') {
        // D segments: count=1 means single number, count=N means range
        const min = 1;
        const max = seg.maxCount || seg.count || 6;
        return { type: 'number', min, max };
      }
      if (seg.type === 'V') {
        return { type: 'element', segment: seg };
      }
    }
    return { type: 'none' };
  }, [parsed]);

  // Timer countdown
  useEffect(() => {
    setTimeLeft(timeout);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [inputRequest.format, inputRequest.code, timeout]);

  // Reset menu selections when input changes
  useEffect(() => {
    setMenuSelections([]);
  }, [inputRequest.format, inputRequest.code]);

  // DealTable state for C/Z/M/I/G/F/E/H segments
  const [dealSelections, setDealSelections] = useState<Map<number, number[]>>(new Map());
  const dealSegment = useMemo(() => {
    return parsed.segments.find(s => ['C', 'Z', 'M', 'I', 'G', 'F', 'E', 'H'].includes(s.type));
  }, [parsed]);

  // Build DealTable cards from segment options
  const dealCards = useMemo(() => {
    if (!dealSegment) return [];
    return dealSegment.options.map(opt => ({
      id: parseInt(opt.value, 10) || 0,
      code: opt.value,
      faceDown: dealSegment.type === 'C',
    }));
  }, [dealSegment]);

  const handleDealSelect = useCallback((selectedIds: number[]) => {
    if (!dealSegment) return;
    const segIndex = parsed.segments.indexOf(dealSegment);
    setDealSelections(prev => {
      const next = new Map(prev);
      next.set(segIndex, selectedIds);
      return next;
    });
  }, [dealSegment, parsed]);

  // Check if all requirements are met for submission
  const canSubmit = useMemo(() => {
    for (const seg of parsed.segments) {
      if (seg.type === 'DESC' || seg.type === 'AUTO' || seg.type === 'LITERAL') continue;

      if (seg.type === 'T' || seg.type === 'J') {
        const count = selectedTargets.length;
        if (count < seg.count && !seg.optional) return false;
        if (seg.maxCount && count > seg.maxCount) return false;
      }
      if (seg.type === 'Q') {
        const count = selectedCardInstanceIds.length;
        if (count < seg.count && !seg.optional) return false;
        if (seg.maxCount && count > seg.maxCount) return false;
      }
      if (seg.type === 'Y') {
        // Menu: Y{N} means N options available, but only 1 selection needed
        if (menuSelections.length < 1 && !seg.optional) return false;
      }
      if (['C', 'Z', 'M', 'I', 'G', 'F', 'E', 'H'].includes(seg.type)) {
        const segIndex = parsed.segments.indexOf(seg);
        const dealSel = dealSelections.get(segIndex) || [];
        if (dealSel.length < seg.count && !seg.optional) return false;
      }
      if (seg.type === 'D') {
        if (numberSelection === null && !seg.optional) return false;
      }
      if (seg.type === 'V') {
        if (elementSelections.length < seg.count && !seg.optional) return false;
      }
    }
    return true;
  }, [parsed, selectedTargets, selectedCardInstanceIds, menuSelections, dealSelections, numberSelection, elementSelections]);

  // Build the submission string
  const buildSubmitValue = useCallback((): string => {
    // Convert instance IDs to card codes for legacy compatibility
    const instanceIdsToCodes = (ids: number[]): string[] => {
      return ids.map(id => {
        const card = hand.find(c => c.instanceId === id);
        return card?.code ?? String(id);
      });
    };

    // For simple menu (Y) with single segment, return the selection index
    if (parsed.segments.length === 1 && parsed.segments[0].type === 'Y') {
      return menuSelections.join(',');
    }

    // For side selection (S)
    if (parsed.segments.length === 1 && parsed.segments[0].type === 'S') {
      return menuSelections[0]?.toString() || '1';
    }

    // For target-only (T)
    if (parsed.segments.length === 1 && parsed.segments[0].type === 'T') {
      if (selectedTargets.length === 1) return selectedTargets[0].toString();
      return selectedTargets.join(',');
    }

    // For J segments (ZW battle choice) — prepend "T" to each target UID
    if (parsed.segments.length === 1 && parsed.segments[0].type === 'J') {
      return selectedTargets.map(t => `T${t}`).join(',');
    }

    // For card-only (Q) - convert instance IDs to card codes
    if (parsed.segments.length === 1 && parsed.segments[0].type === 'Q') {
      return instanceIdsToCodes(selectedCardInstanceIds).join(',');
    }

    // For deal-only (C/Z/M/I/G/F/E/H)
    if (parsed.segments.length === 1 && ['C', 'Z', 'M', 'I', 'G', 'F', 'E', 'H'].includes(parsed.segments[0].type)) {
      const sel = dealSelections.get(0) || [];
      return sel.join(',');
    }

    // For number-only (D)
    if (parsed.segments.length === 1 && parsed.segments[0].type === 'D') {
      return numberSelection?.toString() || '';
    }

    // For element-only (V)
    if (parsed.segments.length === 1 && parsed.segments[0].type === 'V') {
      return elementSelections.join(',');
    }

    // For compound formats, build comma-separated result
    const parts: string[] = [];
    for (const seg of parsed.segments) {
      if (seg.type === 'DESC') continue;
      if (seg.type === 'AUTO') { parts.push('0'); continue; }
      if (seg.type === 'LITERAL') { parts.push(seg.options[0]?.value || ''); continue; }
      if (seg.type === 'D') { parts.push(numberSelection?.toString() || ''); continue; }
      if (seg.type === 'V') { parts.push(elementSelections.join(',')); continue; }
      if (seg.type === 'T') {
        parts.push(selectedTargets.join(','));
      } else if (seg.type === 'J') {
        // J segments need "T" prefix on each target UID
        parts.push(selectedTargets.map(t => `T${t}`).join(','));
      } else if (seg.type === 'Q') {
        // Convert instance IDs to card codes for legacy compatibility
        const codes = selectedCardInstanceIds.map(id => {
          const card = hand.find(c => c.instanceId === id);
          return card?.code ?? String(id);
        });
        parts.push(codes.join(','));
      } else if (seg.type === 'Y') {
        parts.push(menuSelections.join(','));
      } else if (seg.type === 'S') {
        parts.push(menuSelections[0]?.toString() || '1');
      } else if (['C', 'Z', 'M', 'I', 'G', 'F', 'E', 'H'].includes(seg.type)) {
        const segIdx = parsed.segments.indexOf(seg);
        const sel = dealSelections.get(segIdx) || [];
        parts.push(sel.join(','));
      }
    }
    return parts.join(',');
  }, [parsed, selectedTargets, selectedCardInstanceIds, hand, menuSelections, dealSelections, numberSelection, elementSelections]);

  const handleSubmit = useCallback(() => {
    const value = buildSubmitValue();
    onSubmit(value);
  }, [buildSubmitValue, onSubmit]);

  const handleSkip = useCallback(() => {
    onSubmit('/');
  }, [onSubmit]);

  // Handle menu option click — Y segments are always single-select
  const handleMenuClick = useCallback((value: string) => {
    const seg = parsed.segments.find(s => s.type === 'Y' || s.type === 'S');
    if (!seg) return;

    const index = parseInt(value, 10);
    setMenuSelections(prev => {
      if (seg.type === 'Y') {
        // Y (menu): single-select, toggle on/off
        if (prev.includes(index)) return [];
        return [index];
      }
      // S (side): single-select
      if (prev.includes(index)) return [];
      return [index];
    });
  }, [parsed]);

  // Handle number selection (D segment)
  const handleNumberSelect = useCallback((value: number) => {
    setNumberSelection(value);
  }, []);

  // Handle element selection (V segment)
  const handleElementSelect = useCallback((selectedIds: number[]) => {
    setElementSelections(selectedIds);
  }, []);

  // Auto-submit for AUTO and LITERAL segments
  useEffect(() => {
    if (parsed.segments.length === 1) {
      if (parsed.segments[0].type === 'AUTO') {
        onSubmit('0');
      } else if (parsed.segments[0].type === 'LITERAL') {
        onSubmit(parsed.segments[0].options[0]?.value || '');
      }
    }
  }, [parsed, onSubmit]);

  // Find the first description to show
  const description = useMemo(() => {
    for (const seg of parsed.segments) {
      if (seg.description) return seg.description;
    }
    // Check raw format for # prefix
    const descMatch = inputRequest.format.match(/^#([^,]+)/);
    return descMatch ? descMatch[1] : null;
  }, [parsed, inputRequest.format]);

  // Determine which segments need inline rendering (Y, S)
  const inlineSegments = parsed.segments.filter(s => s.type === 'Y' || s.type === 'S');
  const hasInlineMenu = inlineSegments.length > 0;

  // Determine if skip is available
  const isOptional = parsed.segments.some(s => s.optional);

  return (
    <div className="input-controller" data-testid="input-controller">
      {/* Description text */}
      {description && (
        <div className="input-controller-desc">
          {description}
          {parsed.segments.some(s => s.type !== 'DESC' && s.type !== 'AUTO') && (
            <span className="input-controller-hint">
              {getCountLabel(parsed.segments.find(s => s.type !== 'DESC' && s.type !== 'AUTO')!)}
            </span>
          )}
        </div>
      )}

      {/* Timer */}
      <div className={`input-controller-timer ${timeLeft <= 10 ? 'timer-warning' : ''}`}>
        <div className="timer-bar" style={{ width: `${(timeLeft / timeout) * 100}%` }} />
        <span className="timer-text">{timeLeft}s</span>
      </div>

      {/* Inline menu for Y/S segments */}
      {hasInlineMenu && (
        <div className="input-controller-menu">
          {inlineSegments.map((seg, _segIdx) => (
            <div key={seg.type} className="menu-options">
              {seg.options.map((opt) => (
                <button
                  key={opt.value}
                  className={`btn menu-option ${menuSelections.includes(parseInt(opt.value, 10)) ? 'selected' : ''} ${seg.type === 'S' ? 'option-side' : ''}`}
                  onClick={() => handleMenuClick(opt.value)}
                >
                  {opt.label || `选项${opt.value}`}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Action hint — tells the player what to do */}
      {!hasInlineMenu && interactionMode.type !== 'auto' && interactionMode.type !== 'none'
        && interactionMode.type !== 'number' && interactionMode.type !== 'element' && (
        <div className="input-controller-action-hint">
          {interactionMode.type === 'target' && (
            <span>👆 点击玩家头像选择目标</span>
          )}
          {interactionMode.type === 'card' && (
            <span>🃏 点击手牌区的卡牌选择</span>
          )}
          {interactionMode.type === 'deal' && (
            <span>📋 从弹出的卡牌中选择</span>
          )}
        </div>
      )}

      {/* Number input for D segments */}
      {interactionMode.type === 'number' && (
        <NumberInput
          min={interactionMode.min}
          max={interactionMode.max}
          onSelect={handleNumberSelect}
          description={description || undefined}
        />
      )}

      {/* Element picker for V segments */}
      {interactionMode.type === 'element' && (
        <ElementPicker
          count={interactionMode.segment.count}
          maxCount={interactionMode.segment.maxCount}
          onSelect={handleElementSelect}
          description={description || undefined}
        />
      )}

      {/* Selection status */}
      <div className="input-controller-status">
        {parsed.segments.map((seg, i) => {
          if (seg.type === 'DESC' || seg.type === 'AUTO') return null;
          let current = 0;
          if (seg.type === 'T' || seg.type === 'J') current = selectedTargets.length;
          else if (seg.type === 'Q') current = selectedCardInstanceIds.length;
          else if (seg.type === 'Y' || seg.type === 'S') current = menuSelections.length;
          const required = seg.count;
          const max = seg.maxCount || seg.count;
          return (
            <span key={i} className={`status-badge ${current >= required ? 'status-ok' : 'status-pending'}`}>
              {getSegmentTypeLabel(seg.type)}: {current}/{max}
            </span>
          );
        })}
      </div>

      {/* Decide / Cancel buttons */}
      <div className="input-controller-actions">
        {isOptional && (
          <button className="btn btn-skip" onClick={handleSkip}>
            跳过
          </button>
        )}
        <button
          className="btn btn-primary btn-decide"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          决定
        </button>
      </div>

      {/* DealTable popup for C/Z/M/I/G/F/E/H segments */}
      {dealSegment && (
        <DealTable
          cards={dealCards}
          segment={dealSegment}
          description={dealSegment.description}
          onSelect={handleDealSelect}
          onSkip={dealSegment.optional ? handleSkip : undefined}
          onClose={() => {}} // Can't close — must make a selection
        />
      )}
    </div>
  );
};

export default InputController;
