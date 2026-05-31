import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorToast from '../ErrorToast';

describe('ErrorToast', () => {
  it('should render with message', () => {
    render(<ErrorToast message="Something went wrong" onDismiss={vi.fn()} />);
    expect(screen.getByText('Something went wrong')).toBeDefined();
  });

  it('should call onDismiss when close button is clicked', async () => {
    const onDismiss = vi.fn();
    render(<ErrorToast message="Error" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('x'));
    // onDismiss is called after a 300ms fade-out animation
    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledOnce();
    });
  });

  it('should have show class when visible', () => {
    render(<ErrorToast message="Error" onDismiss={vi.fn()} />);
    const toast = screen.getByText('Error').closest('.error-toast')!;
    expect(toast.className).toContain('error-toast-show');
  });

  it('should auto-dismiss after duration', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<ErrorToast message="Error" onDismiss={onDismiss} duration={1000} />);

    // Not dismissed yet
    expect(onDismiss).not.toHaveBeenCalled();

    // Advance past the duration + fade-out animation
    vi.advanceTimersByTime(1300);
    expect(onDismiss).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it('should not render when message is empty', () => {
    const { container } = render(<ErrorToast message="" onDismiss={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
