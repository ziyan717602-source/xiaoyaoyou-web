import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameOverResult from '../GameOverResult';
import type { GameResultPayload } from '@shared/network';

function makeResult(overrides: Partial<GameResultPayload> = {}): GameResultPayload {
  return {
    winner: 1,
    totalRounds: 15,
    akaScore: 3,
    aoScore: 2,
    reason: 'victory',
    ...overrides,
  };
}

describe('GameOverResult', () => {
  it('should render game over header', () => {
    render(<GameOverResult result={makeResult()} onReturnToLobby={vi.fn()} />);
    expect(screen.getByText('游戏结束')).toBeDefined();
  });

  it('should display winner when present', () => {
    render(<GameOverResult result={makeResult({ winner: 2 })} onReturnToLobby={vi.fn()} />);
    expect(screen.getByText('玩家 2')).toBeDefined();
    expect(screen.getByText('胜者')).toBeDefined();
  });

  it('should display draw when winner is null', () => {
    render(<GameOverResult result={makeResult({ winner: null })} onReturnToLobby={vi.fn()} />);
    expect(screen.getByText('平局')).toBeDefined();
  });

  it('should display total rounds', () => {
    render(<GameOverResult result={makeResult({ totalRounds: 20 })} onReturnToLobby={vi.fn()} />);
    expect(screen.getByText('20')).toBeDefined();
    expect(screen.getByText('总回合数')).toBeDefined();
  });

  it('display aka and ao scores', () => {
    render(<GameOverResult result={makeResult({ akaScore: 5, aoScore: 3 })} onReturnToLobby={vi.fn()} />);
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('仙阵营分数')).toBeDefined();
    expect(screen.getByText('剑阵营分数')).toBeDefined();
  });

  it('should display victory reason', () => {
    render(<GameOverResult result={makeResult({ reason: 'victory' })} onReturnToLobby={vi.fn()} />);
    expect(screen.getByText('胜利')).toBeDefined();
  });

  it('should display max_rounds reason', () => {
    render(<GameOverResult result={makeResult({ reason: 'max_rounds' })} onReturnToLobby={vi.fn()} />);
    expect(screen.getByText('达到最大回合数')).toBeDefined();
  });

  it('should display elimination reason', () => {
    render(<GameOverResult result={makeResult({ reason: 'elimination' })} onReturnToLobby={vi.fn()} />);
    expect(screen.getByText('玩家淘汰')).toBeDefined();
  });

  it('should call onReturnToLobby when button clicked', () => {
    const onReturn = vi.fn();
    render(<GameOverResult result={makeResult()} onReturnToLobby={onReturn} />);
    fireEvent.click(screen.getByText('返回大厅'));
    expect(onReturn).toHaveBeenCalled();
  });

  it('should render end reason label', () => {
    render(<GameOverResult result={makeResult()} onReturnToLobby={vi.fn()} />);
    expect(screen.getByText('结束原因')).toBeDefined();
  });
});
