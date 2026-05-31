import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock CardImage and CardTooltip to avoid image-loading issues
vi.mock('../../common/CardImage', () => ({
  default: ({ cardId }: { cardId: number }) => (
    <div data-testid="card-image">{cardId}</div>
  ),
}));

vi.mock('../../common/CardTooltip', () => ({
  default: () => <div data-testid="card-tooltip" />,
}));

import DiscardPilePanel from '../DiscardPilePanel';

describe('DiscardPilePanel', () => {
  it('should render three pile labels', () => {
    render(<DiscardPilePanel tuxDises={[]} monDises={[]} eveDises={[]} />);
    expect(screen.getByText('技牌')).toBeDefined();
    expect(screen.getByText('怪物')).toBeDefined();
    expect(screen.getByText('事件')).toBeDefined();
  });

  it('should show card counts for each pile', () => {
    render(<DiscardPilePanel tuxDises={[1, 2, 3]} monDises={[4]} eveDises={[5, 6]} />);
    const counts = screen.getAllByText(/^[0-9]+$/).map((el) => el.textContent);
    expect(counts).toContain('3');
    expect(counts).toContain('1');
    expect(counts).toContain('2');
  });

  it('should expand pile on toggle click', () => {
    render(<DiscardPilePanel tuxDises={[10, 20]} monDises={[]} eveDises={[]} />);
    // Initially no card images should be visible
    expect(screen.queryAllByTestId('card-image').length).toBe(0);

    // Click the tux pile toggle
    const toggles = screen.getAllByText('技牌');
    fireEvent.click(toggles[0].closest('button')!);

    // Now card images should appear
    expect(screen.getAllByTestId('card-image').length).toBe(2);
  });

  it('should collapse expanded pile on second click', () => {
    render(<DiscardPilePanel tuxDises={[10, 20]} monDises={[]} eveDises={[]} />);
    const toggle = screen.getAllByText('技牌')[0].closest('button')!;

    // First click - expand
    fireEvent.click(toggle);
    expect(screen.getAllByTestId('card-image').length).toBe(2);

    // Second click - collapse
    fireEvent.click(toggle);
    expect(screen.queryAllByTestId('card-image').length).toBe(0);
  });

  it('should show cards in reverse order when expanded', () => {
    render(<DiscardPilePanel tuxDises={[100, 200, 300]} monDises={[]} eveDises={[]} />);
    const toggle = screen.getAllByText('技牌')[0].closest('button')!;
    fireEvent.click(toggle);

    const cardImages = screen.getAllByTestId('card-image');
    expect(cardImages.map((el) => el.textContent)).toEqual(['300', '200', '100']);
  });
});
