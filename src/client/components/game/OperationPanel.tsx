import React, { useCallback, useEffect, useState } from 'react';

interface OperationPanelProps {
  /** Input format string from server */
  format: string;
  /** Card/effect code */
  code: string;
  /** Additional argument */
  arg: string;
  /** Handler when user submits input */
  onSubmit: (input: string) => void;
  /** Optional cancel handler */
  onCancel?: () => void;
  /** Timeout in seconds */
  timeout?: number;
}

/**
 * Parses the format string to extract selectable options.
 * Format examples:
 *   "(a1p2p3)" -> options: [1, 2, 3] with 'a' prefix
 *   "(a1a2a3)" -> options: [1, 2, 3]
 *   "a" -> text input
 *   "(p1p2p3)" -> player selection [1, 2, 3]
 */
function parseFormatOptions(format: string): string[] {
  const match = format.match(/\(([^)]+)\)/);
  if (match) {
    return match[1].split(/[a-z]/).filter(s => s.length > 0);
  }
  return [];
}

function isChoiceFormat(format: string): boolean {
  return format.includes('(') && format.includes(')');
}

const OperationPanel: React.FC<OperationPanelProps> = ({
  format,
  code,
  arg,
  onSubmit,
  onCancel,
  timeout = 30,
}) => {
  const [selectedValue, setSelectedValue] = useState('');
  const [textInput, setTextInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(timeout);

  // Timer countdown
  useEffect(() => {
    if (timeout <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeout]);

  const options = parseFormatOptions(format);
  const isChoice = isChoiceFormat(format);

  const handleSubmit = useCallback(() => {
    if (isChoice) {
      if (selectedValue) {
        onSubmit(selectedValue);
      }
    } else {
      if (textInput.trim()) {
        onSubmit(textInput.trim());
      }
    }
  }, [isChoice, selectedValue, textInput, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="operation-panel">
      <div className="operation-panel-header">
        <span className="operation-panel-title">
          {isChoice ? '请选择操作' : '请输入操作'}
        </span>
        <span className="operation-panel-code">{code}</span>
        {timeout > 0 && (
          <span className={`operation-panel-timer ${timeLeft <= 5 ? 'timer-warning' : ''}`}>
            {timeLeft}s
          </span>
        )}
      </div>

      {isChoice ? (
        <div className="operation-panel-options">
          {options.map((option) => (
            <button
              key={option}
              className={`btn operation-option ${selectedValue === option ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedValue(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <div className="operation-panel-input">
          <input
            type="text"
            className="form-input"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入操作..."
            autoFocus
          />
        </div>
      )}

      {arg && (
        <div className="operation-panel-arg">
          <span className="operation-panel-arg-label">参数:</span>
          <span className="operation-panel-arg-value">{arg}</span>
        </div>
      )}

      <div className="operation-panel-actions">
        <button
          className="btn btn-primary"
          disabled={isChoice ? !selectedValue : !textInput.trim()}
          onClick={handleSubmit}
        >
          确认
        </button>
        {onCancel && (
          <button className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
        )}
      </div>
    </div>
  );
};

export default OperationPanel;
