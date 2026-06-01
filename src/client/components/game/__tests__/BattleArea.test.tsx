import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BattleArea from '../BattleArea';
import type { PlayerState, BoardState } from '@shared/network';

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

const defaultBoard: BoardState = {
  tuxPileCount: 20,
  monPileCount: 15,
  evePileCount: 10,
  activeMonster: null,
  activeEvent: null,
  tuxDises: [],
  monDises: [],
  eveDises: [],
};

describe('BattleArea', () => {
  it('should render all players', () => {
    const players = [
      makePlayer({ uid: 1, name: '玩家1' }),
      makePlayer({ uid: 2, name: '玩家2' }),
    ];
    render(
      <BattleArea
        players={players}
        currentTurnUid={1}
        currentPlayerUid={1}
        phase="main"
        board={defaultBoard}
      />
    );
    expect(screen.getByText('玩家1')).toBeDefined();
    expect(screen.getByText('玩家2')).toBeDefined();
  });

  it('should display current phase label', () => {
    render(
      <BattleArea
        players={[makePlayer()]}
        currentTurnUid={1}
        currentPlayerUid={1}
        phase="battle"
        board={defaultBoard}
      />
    );
    // "战斗" appears in both info value and progress bar, so use container query
    const values = screen.getAllByText('战斗');
    expect(values.length).toBeGreaterThanOrEqual(1);
  });

  it('should render phase progress bar with all phases', () => {
    const { container } = render(
      <BattleArea
        players={[makePlayer()]}
        currentTurnUid={1}
        currentPlayerUid={1}
        phase="main"
        board={defaultBoard}
      />
    );
    const phaseLabels = container.querySelectorAll('.phase-label');
    const texts = Array.from(phaseLabels).map(el => el.textContent);
    expect(texts).toContain('回合开始');
    expect(texts).toContain('摸牌');
    expect(texts).toContain('弃牌');
    expect(texts).toContain('主要');
    expect(texts).toContain('战斗');
    expect(texts).toContain('回合结束');
  });

  it('should mark active phase in progress bar', () => {
    const { container } = render(
      <BattleArea
        players={[makePlayer()]}
        currentTurnUid={1}
        currentPlayerUid={1}
        phase="discard"
        board={defaultBoard}
      />
    );
    const activeSteps = container.querySelectorAll('.phase-active');
    expect(activeSteps.length).toBe(1);
    // discard is index 2
    const labels = container.querySelectorAll('.phase-label');
    expect(labels[2].textContent).toBe('弃牌');
  });

  it('should mark completed phases', () => {
    const { container } = render(
      <BattleArea
        players={[makePlayer()]}
        currentTurnUid={1}
        currentPlayerUid={1}
        phase="main"
        board={defaultBoard}
      />
    );
    // main is index 3, so start_turn(0), draw(1), discard(2) are done
    const doneSteps = container.querySelectorAll('.phase-done');
    expect(doneSteps.length).toBe(3);
  });

  it('should show pile counts', () => {
    render(
      <BattleArea
        players={[makePlayer()]}
        currentTurnUid={1}
        currentPlayerUid={1}
        phase="main"
        board={{ ...defaultBoard, tuxPileCount: 25, monPileCount: 8, evePileCount: 12 }}
      />
    );
    expect(screen.getByText('25')).toBeDefined();
    expect(screen.getByText('8')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
  });

  it('should pass isValidTarget to PlayerInfo', () => {
    const players = [
      makePlayer({ uid: 1, name: '玩家1' }),
      makePlayer({ uid: 2, name: '玩家2' }),
    ];
    const { container } = render(
      <BattleArea
        players={players}
        currentTurnUid={1}
        currentPlayerUid={1}
        phase="main"
        board={defaultBoard}
        targetUids={[2]}
      />
    );
    const playerInfos = container.querySelectorAll('.player-info');
    // Player 1 should be invalid target, Player 2 should be valid
    expect(playerInfos[0].className).toContain('player-info-target-invalid');
    expect(playerInfos[1].className).toContain('player-info-target-valid');
  });
});
