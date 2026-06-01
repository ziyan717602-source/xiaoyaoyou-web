/**
 * useDecisionInput - Hook for managing DecisionRequest-based interactions
 *
 * Manages card selection, target selection, and option values for
 * the new DecisionRequest system. Provides submit/skip actions
 * and selectability checks for UI components.
 */

import { useState, useCallback, useMemo } from 'react';
import type { DecisionRequest, DecisionResponse } from '@shared/network/protocol';

export interface UseDecisionInputReturn {
  /** Currently selected card instance IDs */
  selectedCardInstanceIds: number[];
  /** Toggle card selection */
  toggleCardSelection: (instanceId: number) => void;
  /** Check if a card is selectable */
  isCardSelectable: (instanceId: number) => boolean;

  /** Currently selected target UIDs */
  selectedTargetUids: number[];
  /** Toggle target selection */
  toggleTargetSelection: (uid: number) => void;
  /** Check if a target is selectable */
  isTargetSelectable: (uid: number) => boolean;

  /** Current option values */
  optionValues: string[];
  /** Set option values */
  setOptionValues: (values: string[]) => void;

  /** Submit the decision */
  submit: () => void;
  /** Skip/Pass the decision */
  skip: () => void;
  /** Whether the current selection can be submitted */
  canSubmit: boolean;

  /** Human-readable summary of current selection */
  selectedSummary: string;
}

export function useDecisionInput(
  decisionRequest: DecisionRequest | null,
  sendResponse: (response: DecisionResponse) => void,
): UseDecisionInputReturn {
  const [selectedCardInstanceIds, setSelectedCardInstanceIds] = useState<number[]>([]);
  const [selectedTargetUids, setSelectedTargetUids] = useState<number[]>([]);
  const [optionValues, setOptionValues] = useState<string[]>([]);

  // Determine which action ID to use based on selections
  const determineActionId = useCallback((
    request: DecisionRequest,
    cardIds: number[],
    targetUids: number[],
    options: string[],
  ): string => {
    // Check if there's a matching legal action
    for (const action of request.legalActions) {
      if (action.type === 'PLAY_CARD' && cardIds.length > 0) {
        // Check if the selected cards match this action
        if (action.cardInstanceIds?.some(id => cardIds.includes(id))) {
          return action.actionId;
        }
      }
      if (action.type === 'SELECT_TARGET' && targetUids.length > 0) {
        if (action.targetUids?.some(uid => targetUids.includes(uid))) {
          return action.actionId;
        }
      }
      if (action.type === 'CHOOSE_OPTION' && options.length > 0) {
        return action.actionId;
      }
      if (action.type === 'USE_SKILL') {
        return action.actionId;
      }
    }

    // Fallback: use first legal action or PASS
    const passAction = request.legalActions.find(a => a.type === 'PASS');
    return passAction?.actionId ?? request.legalActions[0]?.actionId ?? 'PASS';
  }, []);

  // Check if a card is selectable
  const isCardSelectable = useCallback((instanceId: number): boolean => {
    if (!decisionRequest) return false;

    // Find a PLAY_CARD action that includes this card
    for (const action of decisionRequest.legalActions) {
      if (action.type === 'PLAY_CARD' && action.cardInstanceIds?.includes(instanceId)) {
        return true;
      }
    }
    return false;
  }, [decisionRequest]);

  // Check if a target is selectable
  const isTargetSelectable = useCallback((uid: number): boolean => {
    if (!decisionRequest) return false;

    // Find a SELECT_TARGET action that includes this target
    for (const action of decisionRequest.legalActions) {
      if (action.type === 'SELECT_TARGET' && action.targetUids?.includes(uid)) {
        return true;
      }
    }
    return false;
  }, [decisionRequest]);

  // Toggle card selection
  const toggleCardSelection = useCallback((instanceId: number) => {
    if (!isCardSelectable(instanceId)) return;

    setSelectedCardInstanceIds(prev =>
      prev.includes(instanceId)
        ? prev.filter(id => id !== instanceId)
        : [...prev, instanceId]
    );
  }, [isCardSelectable]);

  // Toggle target selection
  const toggleTargetSelection = useCallback((uid: number) => {
    if (!isTargetSelectable(uid)) return;

    setSelectedTargetUids(prev =>
      prev.includes(uid)
        ? prev.filter(u => u !== uid)
        : [...prev, uid]
    );
  }, [isTargetSelectable]);

  // Check if current selection can be submitted
  const canSubmit = useMemo(() => {
    if (!decisionRequest) return false;

    // Check if any required selections are missing
    for (const action of decisionRequest.legalActions) {
      if (action.type === 'PLAY_CARD' && selectedCardInstanceIds.length === 0) {
        continue; // Card selection needed
      }
      if (action.type === 'SELECT_TARGET' && selectedTargetUids.length === 0) {
        continue; // Target selection needed
      }
      if (action.type === 'CHOOSE_OPTION' && optionValues.length === 0) {
        continue; // Option selection needed
      }
    }

    // If there are cards selected, check if they match any action
    if (selectedCardInstanceIds.length > 0) {
      const hasMatchingAction = decisionRequest.legalActions.some(
        a => a.type === 'PLAY_CARD' && a.cardInstanceIds?.some(id => selectedCardInstanceIds.includes(id))
      );
      if (!hasMatchingAction) return false;
    }

    // If there are targets selected, check if they match any action
    if (selectedTargetUids.length > 0) {
      const hasMatchingAction = decisionRequest.legalActions.some(
        a => a.type === 'SELECT_TARGET' && a.targetUids?.some(uid => selectedTargetUids.includes(uid))
      );
      if (!hasMatchingAction) return false;
    }

    return true;
  }, [decisionRequest, selectedCardInstanceIds, selectedTargetUids, optionValues]);

  // Submit the decision
  const submit = useCallback(() => {
    if (!decisionRequest || !canSubmit) return;

    const actionId = determineActionId(
      decisionRequest,
      selectedCardInstanceIds,
      selectedTargetUids,
      optionValues,
    );

    sendResponse({
      requestId: decisionRequest.requestId,
      phaseId: decisionRequest.phaseId,
      uid: 0, // Will be filled by WebSocket layer
      actionId,
      payload: {
        cardInstanceIds: selectedCardInstanceIds.length > 0 ? selectedCardInstanceIds : undefined,
        targetUids: selectedTargetUids.length > 0 ? selectedTargetUids : undefined,
        optionValues: optionValues.length > 0 ? optionValues : undefined,
      },
    });

    // Clear selections
    setSelectedCardInstanceIds([]);
    setSelectedTargetUids([]);
    setOptionValues([]);
  }, [decisionRequest, canSubmit, selectedCardInstanceIds, selectedTargetUids, optionValues, sendResponse, determineActionId]);

  // Skip/Pass the decision
  const skip = useCallback(() => {
    if (!decisionRequest) return;

    const passAction = decisionRequest.legalActions.find(a => a.type === 'PASS');
    if (!passAction) return;

    sendResponse({
      requestId: decisionRequest.requestId,
      phaseId: decisionRequest.phaseId,
      uid: 0,
      actionId: passAction.actionId,
      payload: {},
    });

    // Clear selections
    setSelectedCardInstanceIds([]);
    setSelectedTargetUids([]);
    setOptionValues([]);
  }, [decisionRequest, sendResponse]);

  // Human-readable summary
  const selectedSummary = useMemo(() => {
    const parts: string[] = [];
    if (selectedCardInstanceIds.length > 0) {
      parts.push(`已选 ${selectedCardInstanceIds.length} 张牌`);
    }
    if (selectedTargetUids.length > 0) {
      parts.push(`目标: ${selectedTargetUids.map(u => `P${u}`).join(', ')}`);
    }
    if (optionValues.length > 0) {
      parts.push(`选项: ${optionValues.join(', ')}`);
    }
    return parts.join(' | ');
  }, [selectedCardInstanceIds, selectedTargetUids, optionValues]);

  return {
    selectedCardInstanceIds,
    toggleCardSelection,
    isCardSelectable,
    selectedTargetUids,
    toggleTargetSelection,
    isTargetSelectable,
    optionValues,
    setOptionValues,
    submit,
    skip,
    canSubmit,
    selectedSummary,
  };
}
