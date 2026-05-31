import React, { useEffect, useState } from 'react';

interface ErrorToastProps {
  /** Error message to display */
  message: string;
  /** Auto-dismiss after this many ms (default 5000) */
  duration?: number;
  /** Callback when toast is dismissed */
  onDismiss: () => void;
}

const ErrorToast: React.FC<ErrorToastProps> = ({
  message,
  duration = 5000,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade-out animation
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!message) return null;

  return (
    <div className={`error-toast ${visible ? 'error-toast-show' : 'error-toast-hide'}`}>
      <span className="error-toast-message">{message}</span>
      <button
        className="error-toast-close"
        onClick={() => {
          setVisible(false);
          setTimeout(onDismiss, 300);
        }}
      >
        x
      </button>
    </div>
  );
};

export default ErrorToast;
