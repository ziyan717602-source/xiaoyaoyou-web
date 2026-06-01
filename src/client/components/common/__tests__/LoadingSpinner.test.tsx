import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render with default medium size', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.loading-spinner') as HTMLElement;
    expect(spinner).toBeDefined();
    expect(spinner.style.width).toBe('40px');
    expect(spinner.style.height).toBe('40px');
  });

  it('should render with custom text', () => {
    render(<LoadingSpinner text="Loading cards..." />);
    expect(screen.getByText('Loading cards...')).toBeDefined();
  });

  it('should not render text when text prop is omitted', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.loading-spinner-text')).toBeNull();
  });

  it('should render small size', () => {
    const { container } = render(<LoadingSpinner size="small" />);
    const spinner = container.querySelector('.loading-spinner') as HTMLElement;
    expect(spinner.style.width).toBe('24px');
    expect(spinner.style.height).toBe('24px');
  });

  it('should render large size', () => {
    const { container } = render(<LoadingSpinner size="large" />);
    const spinner = container.querySelector('.loading-spinner') as HTMLElement;
    expect(spinner.style.width).toBe('60px');
    expect(spinner.style.height).toBe('60px');
  });

  it('should have loading-spinner-container wrapper', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.loading-spinner-container')).toBeDefined();
  });
});
