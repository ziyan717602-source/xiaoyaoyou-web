import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HandArea from '../HandArea';
import type { CardInstanceState } from '@shared/network/protocol';

function makeCard(instanceId: number, code: string): CardInstanceState {
  return { instanceId, code, name: code, type: 'tux', zone: 'hand', visible: true };
}

describe('HandArea', () => {
  it('should show empty message when no cards', () => {
    render(
      <HandArea cards={[]} selectedCardInstanceIds={[]} onCardSelect={vi.fn()} />
    );
    expect(screen.getByText('暂无手牌')).toBeDefined();
  });

  it('should render card count', () => {
    render(
      <HandArea cards={[makeCard(1, 'JP01'), makeCard(2, 'JP02')]} selectedCardInstanceIds={[]} onCardSelect={vi.fn()} />
    );
    expect(screen.getByText('(2)')).toBeDefined();
  });

  it('should call onCardSelect when card is clicked', () => {
    const onSelect = vi.fn();
    render(
      <HandArea cards={[makeCard(1, 'JP01')]} selectedCardInstanceIds={[]} onCardSelect={onSelect} />
    );
    fireEvent.click(screen.getByAltText('JP01'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('should not call onCardSelect when disabled', () => {
    const onSelect = vi.fn();
    render(
      <HandArea cards={[makeCard(1, 'JP01')]} selectedCardInstanceIds={[]} onCardSelect={onSelect} disabled />
    );
    fireEvent.click(screen.getByAltText('JP01'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should show title', () => {
    render(
      <HandArea cards={[]} selectedCardInstanceIds={[]} onCardSelect={vi.fn()} />
    );
    expect(screen.getByText('手牌')).toBeDefined();
  });
});
