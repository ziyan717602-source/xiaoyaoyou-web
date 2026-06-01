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
 *   "S" -> side selection (仙/剑)
 *   "J1(pT1pT2)" -> ZW battle support/hinder
 *   "(c101c102)" -> card selection
 *   "(p1p2p3)" -> player selection
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

/** Get human-readable label for option */
function getOptionLabel(option: string, code: string): string {
  // For ZW (support/hinder), show player position
  if (code === 'ZW') {
    return `T${option}`;
  }
  // For side selection
  if (option === '1') return '仙';
  if (option === '2') return '剑';
  // Default: show the option
  return option;
}

/** Get CSS class for option type */
function getOptionClass(option: string, code: string): string {
  if (code === 'ZW') return 'option-support';
  if (option === '1') return 'option-yes';
  if (option === '2') return 'option-no';
  return 'option-default';
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
    if (selectedValue) {
      onSubmit(selectedValue);
    }
  }, [selectedValue, onSubmit]);

  const handleOptionClick = useCallback((option: string) => {
    setSelectedValue(option);
    // Auto-submit on selection for quick actions
    onSubmit(option);
  }, [onSubmit]);

  // For ZW (support/hinder), show special UI
  if (code === 'ZW') {
    return (
      <div className="operation-panel">
        <div className="operation-panel-header">
          <span className="operation-panel-title">选择支援/阻碍</span>
          <span className="operation-panel-code">ZW</span>
          {timeout > 0 && (
            <span className={`operation-panel-timer ${timeLeft <= 5 ? 'timer-warning' : ''}`}>
              {timeLeft}s
            </span>
          )}
        </div>
        <div className="operation-panel-options">
          <button
            className="btn operation-option option-support"
            onClick={() => handleOptionClick('决定')}
          >
            决定
          </button>
          {options.length > 1 && (
            <button
              className="btn operation-option option-skip"
              onClick={() => handleOptionClick('/')}
            >
              不支援
            </button>
          )}
        </div>
        <div className="operation-panel-actions">
          {onCancel && (
            <button className="btn btn-secondary" onClick={onCancel}>
              取消
            </button>
          )}
        </div>
      </div>
    );
  }

  // For EV (event), show flip/skip choice
  if (code === 'EV') {
    return (
      <div className="operation-panel">
        <div className="operation-panel-header">
          <span className="operation-panel-title">事件阶段</span>
          <span className="operation-panel-code">EV</span>
          {timeout > 0 && (
            <span className={`operation-panel-timer ${timeLeft <= 5 ? 'timer-warning' : ''}`}>
              {timeLeft}s
            </span>
          )}
        </div>
        <div className="operation-panel-options">
          <button
            className="btn operation-option option-flip"
            onClick={() => handleOptionClick('2')}
          >
            翻取事件
          </button>
          <button
            className="btn operation-option option-skip"
            onClick={() => handleOptionClick('1')}
          >
            跳过
          </button>
        </div>
      </div>
    );
  }

  // For NP (NPC encounter), show use/pass choice
  if (code === 'NP') {
    return (
      <div className="operation-panel">
        <div className="operation-panel-header">
          <span className="operation-panel-title">NPC遭遇</span>
          <span className="operation-panel-code">NP</span>
          {timeout > 0 && (
            <span className={`operation-panel-timer ${timeLeft <= 5 ? 'timer-warning' : ''}`}>
              {timeLeft}s
            </span>
          )}
        </div>
        <div className="operation-panel-options">
          <button
            className="btn operation-option option-use"
            onClick={() => handleOptionClick('1')}
          >
            使用效果
          </button>
          <button
            className="btn operation-option option-skip"
            onClick={() => handleOptionClick('2')}
          >
            跳过
          </button>
        </div>
      </div>
    );
  }

  // For ZD (battle card), show card options
  if (code === 'ZD') {
    return (
      <div className="operation-panel">
        <div className="operation-panel-header">
          <span className="operation-panel-title">出战牌</span>
          <span className="operation-panel-code">ZD</span>
          {timeout > 0 && (
            <span className={`operation-panel-timer ${timeLeft <= 5 ? 'timer-warning' : ''}`}>
              {timeLeft}s
            </span>
          )}
        </div>
        <div className="operation-panel-options">
          {options.map((option) => (
            <button
              key={option}
              className="btn operation-option option-card"
              onClick={() => handleOptionClick(option)}
            >
              {option}
            </button>
          ))}
          <button
            className="btn operation-option option-skip"
            onClick={() => handleOptionClick('/')}
          >
            不出牌
          </button>
        </div>
      </div>
    );
  }

  // Default: show choice buttons or confirm
  return (
    <div className="operation-panel">
      <div className="operation-panel-header">
        <span className="operation-panel-title">
          {isChoice ? '请选择操作' : '确认操作'}
        </span>
        <span className="operation-panel-code">{code}</span>
        {timeout > 0 && (
          <span className={`operation-panel-timer ${timeLeft <= 5 ? 'timer-warning' : ''}`}>
            {timeLeft}s
          </span>
        )}
      </div>

      {isChoice && options.length > 0 ? (
        <div className="operation-panel-options">
          {options.map((option) => (
            <button
              key={option}
              className={`btn operation-option ${getOptionClass(option, code)} ${selectedValue === option ? 'selected' : ''}`}
              onClick={() => handleOptionClick(option)}
            >
              {getOptionLabel(option, code)}
            </button>
          ))}
        </div>
      ) : (
        <div className="operation-panel-confirm">
          <button
            className="btn btn-primary btn-large"
            onClick={() => onSubmit('1')}
          >
            确认
          </button>
        </div>
      )}

      {arg && (
        <div className="operation-panel-arg">
          <span className="operation-panel-arg-label">参数:</span>
          <span className="operation-panel-arg-value">{arg}</span>
        </div>
      )}

      <div className="operation-panel-actions">
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
