import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import HeroGrid from '../HeroGrid';
import type { HeroInfo } from '@shared/network';

const mockHeroes: HeroInfo[] = [
  { avatar: 1, name: '英雄A', group: 1, gender: 'M', hp: 10, str: 5, dex: 3 },
  { avatar: 2, name: '英雄B', group: 2, gender: 'F', hp: 8, str: 4, dex: 6 },
  { avatar: 3, name: '英雄C', group: 1, gender: 'M', hp: 12, str: 7, dex: 2 },
];

describe('HeroGrid', () => {
  it('should render hero cards', () => {
    render(
      <HeroGrid heroes={mockHeroes} selectedHeroIds={new Set()} mySelection={null} onSelect={vi.fn()} />
    );
    expect(screen.getByText('英雄A')).toBeDefined();
    expect(screen.getByText('英雄B')).toBeDefined();
    expect(screen.getByText('英雄C')).toBeDefined();
  });

  it('should call onSelect when hero clicked', () => {
    const onSelect = vi.fn();
    render(
      <HeroGrid heroes={mockHeroes} selectedHeroIds={new Set()} mySelection={null} onSelect={onSelect} />
    );
    fireEvent.click(screen.getByText('英雄A').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('should not call onSelect when taken hero clicked', () => {
    const onSelect = vi.fn();
    render(
      <HeroGrid heroes={mockHeroes} selectedHeroIds={new Set([2])} mySelection={null} onSelect={onSelect} />
    );
    fireEvent.click(screen.getByText('英雄B').closest('button')!);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should mark selected hero with selected class', () => {
    const { container } = render(
      <HeroGrid heroes={mockHeroes} selectedHeroIds={new Set()} mySelection={1} onSelect={vi.fn()} />
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons[0].className).toContain('hero-card-selected');
  });

  it('should mark taken heroes with unavailable class', () => {
    const { container } = render(
      <HeroGrid heroes={mockHeroes} selectedHeroIds={new Set([3])} mySelection={null} onSelect={vi.fn()} />
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons[2].className).toContain('hero-card-unavailable');
  });
});
