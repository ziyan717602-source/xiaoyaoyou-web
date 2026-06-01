import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CardTooltip from '../CardTooltip';

describe('CardTooltip', () => {
  it('should not render when visible is false', () => {
    const { container } = render(
      <CardTooltip cardCode="JP01" visible={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render when visible is true', () => {
    render(<CardTooltip cardCode="JP01" visible />);
    expect(screen.getByText('偷盗')).toBeDefined();
  });

  it('should not render for unknown card code', () => {
    const { container } = render(
      <CardTooltip cardCode="UNKNOWN" visible />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should display card type label', () => {
    render(<CardTooltip cardCode="WQ01" visible />);
    expect(screen.getByText('武器')).toBeDefined();
  });
});
