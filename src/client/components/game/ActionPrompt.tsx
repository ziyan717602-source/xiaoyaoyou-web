/**
 * ActionPrompt - Renders DecisionRequest prompt with action buttons
 *
 * Replaces part of InputController's functionality by rendering
 * the prompt text, selected summary, and confirm/skip buttons
 * based on a DecisionRequest.
 */

import React, { useState, useEffect } from 'react';
import type { DecisionRequest } from '@shared/network/protocol';

interface ActionPromptProps {
  /** The current decision request */
  request: DecisionRequest;
  /** Whether the current selection can be submitted */
  canSubmit: boolean;
  /** Callback when submit is clicked */
  onSubmit: () => void;
  /** Callback when skip is clicked */
  onSkip: () => void;
  /** Human-readable summary of current selection */
  selectedSummary: string;
}

const ActionPrompt: React.FC<ActionPromptProps> = ({
  request,
  canSubmit,
  onSubmit,
  onSkip,
  selectedSummary,
}) => {
  const [timeLeft, setTimeLeft] = useState(Math.floor(request.timeoutMs / 1000));
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null);

  // Timer countdown
  useEffect(() => {
    setTimeLeft(Math.floor(request.timeoutMs / 1000));
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
  }, [request.requestId, request.timeoutMs]);

  // Check if any action requires confirmation
  const requiresConfirm = request.legalActions.some(
    a => a.requiresConfirm && a.actionId !== 'PASS'
  );

  const handleSubmit = () => {
    if (requiresConfirm && !confirmingAction) {
      // Find the first action that requires confirmation
      const confirmAction = request.legalActions.find(a => a.requiresConfirm && a.actionId !== 'PASS');
      if (confirmAction) {
        setConfirmingAction(confirmAction.actionId);
        return;
      }
    }
    setConfirmingAction(null);
    onSubmit();
  };

  const handleConfirmYes = () => {
    setConfirmingAction(null);
    onSubmit();
  };

  const handleConfirmNo = () => {
    setConfirmingAction(null);
  };

  return (
    <div className="action-prompt">
      <div className="prompt-text">{request.prompt}</div>

      {selectedSummary && (
        <div className="selected-summary">{selectedSummary}</div>
      )}

      {confirmingAction && (
        <div className="confirm-dialog">
          <span>确认执行此操作？</span>
          <button onClick={handleConfirmYes} className="confirm-yes">确认</button>
          <button onClick={handleConfirmNo} className="confirm-no">取消</button>
        </div>
      )}

      <div className="prompt-actions">
        {request.optional && (
          <button onClick={onSkip} className="skip-button">
            跳过
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="submit-button"
        >
          {confirmingAction ? '再次确认' : '确认'}
        </button>
      </div>

      {request.timeoutMs > 0 && timeLeft > 0 && (
        <div className="timer-bar">
          <div
            className="timer-fill"
            style={{ width: `${(timeLeft / (request.timeoutMs / 1000)) * 100}%` }}
          />
          <span className="timer-text">{timeLeft}s</span>
        </div>
      )}
    </div>
  );
};

export default ActionPrompt;
