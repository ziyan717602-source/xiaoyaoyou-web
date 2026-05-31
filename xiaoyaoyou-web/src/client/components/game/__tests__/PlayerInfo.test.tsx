import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import PlayerInfo from '../PlayerInfo';
import type { PlayerState } from '@shared/network';
import type { AnimationEvent } from '../../../hooks/useBattleAnimations';

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    uid: 1,
    name: '测试玩家',
    heroAvatar: 0,
    hp: 8,
    hpBase: 10,
    hand: [],
    handCount: 3,
    team: 1,
    weapon: 0,
    armor: 0,
    trove: 0,
    exEquip: 0,
    str: 3,
    dex: 2,
    pets: [0, 0, 0, 0, 0, 0, 0],
    petCodes: [],
    skills: [],
    blesses: [],
    status: [],
    ...overrides,
  };
}

describe('PlayerInfo', () => {
  it('should render player name', () => {
    render(<PlayerInfo player={makePlayer()} isCurrentTurn={false} />);
    expect(screen.getByText('测试玩家')).toBeDefined();
  });

  it('should show current turn badge when isCurrentTurn is true', () => {
    render(<PlayerInfo player={makePlayer()} isCurrentTurn={true} />);
    expect(screen.getByText('当前回合')).toBeDefined();
  });

  it('should not show current turn badge when isCurrentTurn is false', () => {
    render(<PlayerInfo player={makePlayer()} isCurrentTurn={false} />);
    expect(screen.queryByText('当前回合')).toBeNull();
  });

  it('should show self badge when isCurrentPlayer is true', () => {
    render(<PlayerInfo player={makePlayer()} isCurrentTurn={false} isCurrentPlayer={true} />);
    expect(screen.getByText('自己')).toBeDefined();
  });

  it('should display HP bar with correct percentage', () => {
    render(<PlayerInfo player={makePlayer({ hp: 5, hpBase: 10 })} isCurrentTurn={false} />);
    expect(screen.getByText('5/10')).toBeDefined();
  });

  it('should display STR and DEX stats', () => {
    render(<PlayerInfo player={makePlayer({ str: 4, dex: 2, handCount: 5 })} isCurrentTurn={false} />);
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });

  it('should display hand count', () => {
    render(<PlayerInfo player={makePlayer({ handCount: 5 })} isCurrentTurn={false} />);
    expect(screen.getByText('5')).toBeDefined();
  });

  it('should display team label', () => {
    const { container } = render(<PlayerInfo player={makePlayer({ team: 1 })} isCurrentTurn={false} />);
    const badge = container.querySelector('.player-team-badge');
    expect(badge?.textContent).toBe('仙');

    const { container: container2 } = render(<PlayerInfo player={makePlayer({ team: 2 })} isCurrentTurn={false} />);
    const badge2 = container2.querySelector('.player-team-badge');
    expect(badge2?.textContent).toBe('剑');
  });

  it('should apply dead class when hp <= 0', () => {
    const { container } = render(
      <PlayerInfo player={makePlayer({ hp: 0 })} isCurrentTurn={false} />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('player-info-dead');
  });

  it('should render status badges', () => {
    render(
      <PlayerInfo
        player={makePlayer({ status: ['immobilized', 'petDisabled'] })}
        isCurrentTurn={false}
      />
    );
    expect(screen.getByText('定身')).toBeDefined();
    expect(screen.getByText('封灵')).toBeDefined();
  });

  it('should render pet icons when pets exist', () => {
    render(
      <PlayerInfo
        player={makePlayer({ pets: [1001, 0, 0, 0, 0, 0, 0] })}
        isCurrentTurn={false}
      />
    );
    expect(screen.getByText('冰')).toBeDefined();
  });

  it('should apply target-valid class when isValidTarget is true', () => {
    const { container } = render(
      <PlayerInfo player={makePlayer()} isCurrentTurn={false} isValidTarget={true} />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('player-info-target-valid');
  });

  it('should apply target-invalid class when isValidTarget is false', () => {
    const { container } = render(
      <PlayerInfo player={makePlayer()} isCurrentTurn={false} isValidTarget={false} />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('player-info-target-invalid');
  });

  it('should not apply target classes when isValidTarget is undefined', () => {
    const { container } = render(
      <PlayerInfo player={makePlayer()} isCurrentTurn={false} isValidTarget={undefined} />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toContain('player-info-target-valid');
    expect(el.className).not.toContain('player-info-target-invalid');
  });
});
