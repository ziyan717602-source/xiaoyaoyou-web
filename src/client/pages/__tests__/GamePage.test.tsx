import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import GamePage from '../GamePage';

const mockNavigate = vi.fn();
let mockParams: { roomId?: string } = {};

vi.mock('react-router-dom', () => ({
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
}));

let messageHandlers: ((msg: Record<string, unknown>) => void)[] = [];
let wsState = { isConnected: true, isReconnecting: false, reconnectAttempts: 0, error: null as string | null };
const mockWs = {
  get state() { return wsState; },
  send: vi.fn(),
  onMessage: vi.fn((h: (msg: Record<string, unknown>) => void) => {
    messageHandlers.push(h);
    return () => { messageHandlers = messageHandlers.filter(x => x !== h); };
  }),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocketContext: () => mockWs,
}));

const mockGameState = {
  gameState: null as Record<string, unknown> | null,
  gameResult: null as { winner: number | null; totalRounds: number; akaScore: number; aoScore: number; reason: string } | null,
  inputRequest: null as { uid: number; format: string; code: string; arg: string } | null,
  error: null as string | null,
  clearInputRequest: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('../../hooks/useGameState', () => ({
  useGameState: () => mockGameState,
}));

const mockRoom = {
  currentRoom: { roomId: 'ABCD', players: [{ uid: 1, name: 'P1', isReady: true, isConnected: true }] },
  myUid: 1,
  playerName: 'P1',
  rooms: [],
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  startGame: vi.fn(),
  refreshRooms: vi.fn(),
};

vi.mock('../../hooks/useRoom', () => ({
  useRoom: () => mockRoom,
}));

vi.mock('../../hooks/useBattleAnimations', () => ({
  useBattleAnimations: () => ({
    registerPlayer: vi.fn(),
    processGMessage: vi.fn(),
  }),
}));

vi.mock('../../components/game/BattleArea', () => ({
  default: ({ players }: { players: unknown[] }) => (
    <div data-testid="battle-area">{players.length} players</div>
  ),
}));

vi.mock('../../components/game/HandArea', () => ({
  default: ({ cards }: { cards: string[] }) => (
    <div data-testid="hand-area">{cards.length} cards</div>
  ),
}));

vi.mock('../../components/game/OperationPanel', () => ({
  default: ({ format, code, onSubmit, onCancel }: { format: string; code: string; onSubmit: (input: string) => void; onCancel?: () => void }) => (
    <div data-testid="operation-panel">
      <span>{code}</span>
      <button onClick={() => onSubmit('test-input')}>submit</button>
      {onCancel && <button onClick={onCancel}>cancel</button>}
    </div>
  ),
}));

vi.mock('../../components/game/HeroSelectDialog', () => ({
  default: ({ onSelect }: { onSelect: (id: number) => void }) => (
    <div data-testid="hero-select-dialog">
      <button onClick={() => onSelect(1001)}>pick</button>
    </div>
  ),
}));

vi.mock('../../components/game/EquipmentPanel', () => ({
  default: () => <div data-testid="equipment-panel" />,
}));

vi.mock('../../components/game/EventLog', () => ({
  default: ({ entries, onExport }: { entries: { text: string }[]; onExport?: () => void }) => (
    <div data-testid="event-log">
      {entries.length} entries
      {onExport && <button onClick={onExport}>export</button>}
    </div>
  ),
}));

vi.mock('../../components/common/ErrorToast', () => ({
  default: ({ message, onDismiss }: { message: string; onDismiss: () => void }) => (
    <div data-testid="error-toast">
      <span>{message}</span>
      <button onClick={onDismiss}>dismiss</button>
    </div>
  ),
}));

function emitMessage(msg: Record<string, unknown>) {
  act(() => { messageHandlers.forEach(h => h(msg)); });
}

describe('GamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageHandlers = [];
    wsState = { isConnected: true, isReconnecting: false, reconnectAttempts: 0, error: null };
    mockParams = { roomId: 'ABCD' };
    mockGameState.gameState = null;
    mockGameState.gameResult = null;
    mockGameState.inputRequest = null;
    mockGameState.error = null;
    localStorage.clear();
  });

  it('should show loading when no game state', () => {
    render(<GamePage />);
    expect(screen.getByText('等待游戏数据...')).toBeDefined();
  });

  it('should render battle area when game state exists', () => {
    mockGameState.gameState = {
      players: [{ uid: 1, name: 'P1', hand: [] }],
      currentTurn: 1,
      phase: 'main',
      board: { tuxPileCount: 20, monPileCount: 15, evePileCount: 10, activeMonster: null },
    };
    render(<GamePage />);
    expect(screen.getByTestId('battle-area')).toBeDefined();
    expect(screen.getByText('1 players')).toBeDefined();
  });

  it('should render room badge', () => {
    render(<GamePage />);
    expect(screen.getByText('房间: ABCD')).toBeDefined();
  });

  it('should render event log', () => {
    render(<GamePage />);
    expect(screen.getByTestId('event-log')).toBeDefined();
  });

  it('should render equipment panel when player has data', () => {
    mockGameState.gameState = {
      players: [{ uid: 1, name: 'P1', hand: [], weapon: null, armor: null, trove: null, exEquip: null }],
      currentTurn: 1,
      phase: 'main',
      board: { tuxPileCount: 20, monPileCount: 15, evePileCount: 10, activeMonster: null },
    };
    render(<GamePage />);
    expect(screen.getByTestId('equipment-panel')).toBeDefined();
  });

  it('should show input controller when input request targets me', () => {
    mockGameState.gameState = { players: [{ uid: 1, name: 'P1', hand: [], weapon: 0, armor: 0, trove: 0, exEquip: 0, hp: 10, hpBase: 10, str: 4, dex: 3, team: 1, pets: [], status: [] }], currentTurn: 1, phase: 'main', board: { tuxPileCount: 20, monPileCount: 15, evePileCount: 10, activeMonster: null } };
    mockGameState.inputRequest = { uid: 1, format: 'T1(a1a2)', code: 'T01', arg: '选择' };
    render(<GamePage />);
    expect(screen.getByTestId('input-controller')).toBeDefined();
  });

  it('should not show input controller for other player input', () => {
    mockGameState.gameState = { players: [{ uid: 1, name: 'P1', hand: [], weapon: 0, armor: 0, trove: 0, exEquip: 0, hp: 10, hpBase: 10, str: 4, dex: 3, team: 1, pets: [], status: [] }], currentTurn: 1, phase: 'main', board: { tuxPileCount: 20, monPileCount: 15, evePileCount: 10, activeMonster: null } };
    mockGameState.inputRequest = { uid: 2, format: 'T1(a1a2)', code: 'T01', arg: '选择' };
    render(<GamePage />);
    expect(screen.queryByTestId('input-controller')).toBeNull();
  });

  it('should render decide button in input controller', () => {
    mockGameState.gameState = { players: [{ uid: 1, name: 'P1', hand: [], weapon: 0, armor: 0, trove: 0, exEquip: 0, hp: 10, hpBase: 10, str: 4, dex: 3, team: 1, pets: [], status: [] }], currentTurn: 1, phase: 'main', board: { tuxPileCount: 20, monPileCount: 15, evePileCount: 10, activeMonster: null } };
    mockGameState.inputRequest = { uid: 1, format: 'T1(a1a2)', code: 'T01', arg: '选择' };
    render(<GamePage />);
    expect(screen.getByText('决定')).toBeDefined();
  });

  it('should have disabled decide button when no selections made', () => {
    mockGameState.gameState = { players: [{ uid: 1, name: 'P1', hand: [], weapon: 0, armor: 0, trove: 0, exEquip: 0, hp: 10, hpBase: 10, str: 4, dex: 3, team: 1, pets: [], status: [] }], currentTurn: 1, phase: 'main', board: { tuxPileCount: 20, monPileCount: 15, evePileCount: 10, activeMonster: null } };
    mockGameState.inputRequest = { uid: 1, format: 'T1(a1a2)', code: 'T01', arg: '选择' };
    render(<GamePage />);
    const btn = screen.getByText('决定') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('should show hero select dialog when hero_select_request received', () => {
    render(<GamePage />);
    emitMessage({
      type: 'hero_select_request',
      payload: {
        uid: 1,
        availableHeroes: [{ avatar: 1001, name: '李逍遥', group: 1, gender: 'M', hp: 10, str: 4, dex: 3 }],
      },
    });
    expect(screen.getByTestId('hero-select-dialog')).toBeDefined();
  });

  it('should send hero_select on hero pick', () => {
    render(<GamePage />);
    emitMessage({
      type: 'hero_select_request',
      payload: {
        uid: 1,
        availableHeroes: [{ avatar: 1001, name: '李逍遥', group: 1, gender: 'M', hp: 10, str: 4, dex: 3 }],
      },
    });
    fireEvent.click(screen.getByText('pick'));
    expect(mockWs.send).toHaveBeenCalledWith({
      type: 'hero_select',
      payload: { heroId: 1001 },
    });
  });

  it('should show error toast', () => {
    mockGameState.error = 'Something failed';
    render(<GamePage />);
    expect(screen.getByText('Something failed')).toBeDefined();
  });

  it('should dismiss error toast', () => {
    mockGameState.error = 'err';
    render(<GamePage />);
    fireEvent.click(screen.getByText('dismiss'));
    expect(mockGameState.clearError).toHaveBeenCalled();
  });

  it('should navigate to game over on game result', () => {
    mockGameState.gameResult = { winner: 1, totalRounds: 10, akaScore: 5, aoScore: 3, reason: 'victory' };
    render(<GamePage />);
    expect(mockNavigate).toHaveBeenCalledWith('/game-over/ABCD', {
      state: { result: mockGameState.gameResult },
    });
  });

  it('should send player_ready on game_started', () => {
    render(<GamePage />);
    emitMessage({ type: 'game_started', payload: {} });
    expect(mockWs.send).toHaveBeenCalledWith({ type: 'player_ready' });
  });

  it('should provide skip when operation is optional', () => {
    mockGameState.gameState = { players: [{ uid: 1, name: 'P1', hand: [], weapon: 0, armor: 0, trove: 0, exEquip: 0, hp: 10, hpBase: 10, str: 4, dex: 3, team: 1, pets: [], status: [] }], currentTurn: 1, phase: 'main', board: { tuxPileCount: 20, monPileCount: 15, evePileCount: 10, activeMonster: null } };
    mockGameState.inputRequest = { uid: 1, format: '/T1(a1a2)', code: 'T01', arg: '选择' };
    render(<GamePage />);
    expect(screen.getByText('跳过')).toBeDefined();
  });

  it('should not provide skip for mandatory operations', () => {
    mockGameState.gameState = { players: [{ uid: 1, name: 'P1', hand: [], weapon: 0, armor: 0, trove: 0, exEquip: 0, hp: 10, hpBase: 10, str: 4, dex: 3, team: 1, pets: [], status: [] }], currentTurn: 1, phase: 'main', board: { tuxPileCount: 20, monPileCount: 15, evePileCount: 10, activeMonster: null } };
    mockGameState.inputRequest = { uid: 1, format: 'T1(a1a2)', code: 'G0OH', arg: '选择' };
    render(<GamePage />);
    expect(screen.queryByText('跳过')).toBeNull();
  });

  it('should send get_state on mount when connected', () => {
    render(<GamePage />);
    expect(mockWs.send).toHaveBeenCalledWith({
      type: 'get_state',
      payload: { requestUid: 1, roomId: 'ABCD', playerName: 'P1' },
    });
  });
});
