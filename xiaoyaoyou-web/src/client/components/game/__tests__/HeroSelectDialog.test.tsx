import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeroSelectDialog from '../HeroSelectDialog';
import type { HeroInfo } from '@shared/network/protocol';

const mockHeroes: HeroInfo[] = [
  { avatar: 1001, name: '李逍遥', group: 1, gender: 'M', hp: 10, str: 4, dex: 3 },
  { avatar: 1002, name: '赵灵儿', group: 1, gender: 'F', hp: 8, str: 2, dex: 4 },
  { avatar: 2001, name: '王小虎', group: 2, gender: 'M', hp: 12, str: 5, dex: 2 },
];

describe('HeroSelectDialog', () => {
  it('should render all heroes', () => {
    render(<HeroSelectDialog availableHeroes={mockHeroes} onSelect={vi.fn()} />);
    expect(screen.getByText('李逍遥')).toBeDefined();
    expect(screen.getByText('赵灵儿')).toBeDefined();
    expect(screen.getByText('王小虎')).toBeDefined();
  });

  it('should render hero stats', () => {
    render(<HeroSelectDialog availableHeroes={mockHeroes} onSelect={vi.fn()} />);
    expect(screen.getByText('HP:10')).toBeDefined();
    expect(screen.getByText('力:4')).toBeDefined();
    expect(screen.getByText('速:3')).toBeDefined();
  });

  it('should render group labels', () => {
    render(<HeroSelectDialog availableHeroes={mockHeroes} onSelect={vi.fn()} />);
    const groups = screen.getAllByText('仙剑一');
    expect(groups.length).toBe(2);
    expect(screen.getByText('仙剑二')).toBeDefined();
  });

  it('should disable confirm button when no selection', () => {
    render(<HeroSelectDialog availableHeroes={mockHeroes} onSelect={vi.fn()} />);
    const btn = screen.getByText('确认选择');
    expect(btn).toHaveProperty('disabled', true);
  });

  it('should select hero on click', () => {
    render(<HeroSelectDialog availableHeroes={mockHeroes} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByText('李逍遥'));
    const btn = screen.getByText('确认选择');
    expect(btn).toHaveProperty('disabled', false);
  });

  it('should call onSelect with hero avatar on confirm', () => {
    const onSelect = vi.fn();
    render(<HeroSelectDialog availableHeroes={mockHeroes} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('李逍遥'));
    fireEvent.click(screen.getByText('确认选择'));
    expect(onSelect).toHaveBeenCalledWith(1001);
  });

  it('should allow changing selection before confirm', () => {
    const onSelect = vi.fn();
    render(<HeroSelectDialog availableHeroes={mockHeroes} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('李逍遥'));
    fireEvent.click(screen.getByText('赵灵儿'));
    fireEvent.click(screen.getByText('确认选择'));
    expect(onSelect).toHaveBeenCalledWith(1002);
  });

  it('should render dialog header', () => {
    render(<HeroSelectDialog availableHeroes={mockHeroes} onSelect={vi.fn()} />);
    expect(screen.getByText('选择英雄')).toBeDefined();
  });

  it('should show fallback group label for unknown group', () => {
    const heroes: HeroInfo[] = [
      { avatar: 9999, name: '测试角色', group: 99, gender: 'M', hp: 10, str: 3, dex: 3 },
    ];
    render(<HeroSelectDialog availableHeroes={heroes} onSelect={vi.fn()} />);
    expect(screen.getByText('系列99')).toBeDefined();
  });
});
