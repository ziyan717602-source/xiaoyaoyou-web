import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HandArea from '../HandArea';

describe('HandArea', () => {
  it('should show empty message when no cards', () => {
    render(
      <HandArea cards={[]} selectedCards={[]} onCardSelect={vi.fn()} />
    );
    expect(screen.getByText('暂无手牌')).toBeDefined();
  });

  it('should render card count', () => {
    render(
      <HandArea cards={['JP01', 'JP02']} selectedCards={[]} onCardSelect={vi.fn()} />
    );
    expect(screen.getByText('(2)')).toBeDefined();
  });

  it('should call onCardSelect when card is clicked', () => {
    const onSelect = vi.fn();
    render(
      <HandArea cards={['JP01']} selectedCards={[]} onCardSelect={onSelect} />
    );
    fireEvent.click(screen.getByAltText('JP01'));
    expect(onSelect).toHaveBeenCalledWith('JP01');
  });

  it('should not call onCardSelect when disabled', () => {
    const onSelect = vi.fn();
    render(
      <HandArea cards={['JP01']} selectedCards={[]} onCardSelect={onSelect} disabled />
    );
    fireEvent.click(screen.getByAltText('JP01'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should show title', () => {
    render(
      <HandArea cards={[]} selectedCards={[]} onCardSelect={vi.fn()} />
    );
    expect(screen.getByText('手牌')).toBeDefined();
  });
});
