import React from 'react';

interface LoadingSpinnerProps {
  /** Spinner size */
  size?: 'small' | 'medium' | 'large';
  /** Optional text below spinner */
  text?: string;
}

const SIZE_MAP = {
  small: 24,
  medium: 40,
  large: 60,
} as const;

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  text,
}) => {
  const px = SIZE_MAP[size];

  return (
    <div className="loading-spinner-container">
      <div
        className="loading-spinner"
        style={{ width: px, height: px }}
      />
      {text && <div className="loading-spinner-text">{text}</div>}
    </div>
  );
};

export default LoadingSpinner;
