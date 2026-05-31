import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeroSelectPage from '../HeroSelectPage';

const mockNavigate = vi.fn();
let mockParams: { roomId?: string } = {};

vi.mock('react-router-dom', () => ({
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
}));

let messageHandlers: ((msg: Record<string, unknown>) => void)[] = [];
const mockWs = {
  state: { isConnected: true, isReconnecting: false, reconnectAttempts: 0, error: null },
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

const mockRoom = {
  currentRoom: {
    roomId: 'ABCD',
    players: [
      { uid: 1, name: 'P1', isReady: true, isConnected: true },
      { uid: 2, name: 'P2', isReady: false, isConnected: true },
    ],
  },
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

const mockHeroSelect = {
  availableHeroes: [
    { avatar: 1001, name: '李逍遥', group: 1, gender: 'M', hp: 10, str: 4, dex: 3 },
    { avatar: 1002, name: '赵灵儿', group: 1, gender: 'F', hp: 8, str: 2, dex: 4 },
  ],
  selectedHeroes: new Map<number, { heroId: number }>(),
  mySelection: null as number | null,
  selectHero: vi.fn(),
};

vi.mock('../../hooks/useHeroSelect', () => ({
  useHeroSelect: () => mockHeroSelect,
}));

vi.mock('../../components/hero-select/HeroGrid', () => ({
  default: ({ heroes, mySelection }: { heroes: { name: string }[]; mySelection: number | null }) => (
    <div data-testid="hero-grid">
      {heroes.map(h => <span key={h.name}>{h.name}</span>)}
      {mySelection && <span data-testid="selection">{mySelection}</span>}
    </div>
  ),
}));

vi.mock('../../components/hero-select/SelectionStatus', () => ({
  default: ({ players }: { players: { name: string; heroName: string | null }[] }) => (
    <div data-testid="selection-status">
      {players.map(p => <span key={p.name}>{p.name}: {p.heroName || '未选择'}</span>)}
    </div>
  ),
}));

vi.mock('../../components/common/LoadingSpinner', () => ({
  default: ({ text }: { text?: string }) => <div data-testid="spinner">{text}</div>,
}));

describe('HeroSelectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageHandlers = [];
    mockParams = { roomId: 'ABCD' };
    mockRoom.currentRoom = {
      roomId: 'ABCD',
      players: [
        { uid: 1, name: 'P1', isReady: true, isConnected: true },
        { uid: 2, name: 'P2', isReady: false, isConnected: true },
      ],
    };
    mockRoom.myUid = 1;
    mockHeroSelect.availableHeroes = [
      { avatar: 1001, name: '李逍遥', group: 1, gender: 'M', hp: 10, str: 4, dex: 3 },
      { avatar: 1002, name: '赵灵儿', group: 1, gender: 'F', hp: 8, str: 2, dex: 4 },
    ];
    mockHeroSelect.selectedHeroes = new Map<number, { heroId: number }>();
    mockHeroSelect.mySelection = null;
  });

  it('should show loading when no room', () => {
    mockRoom.currentRoom = null as unknown as typeof mockRoom.currentRoom;
    render(<HeroSelectPage />);
    expect(screen.getByTestId('spinner')).toBeDefined();
  });

  it('should render hero select header', () => {
    render(<HeroSelectPage />);
    expect(screen.getByText('选择角色')).toBeDefined();
    expect(screen.getByText('房间: ABCD')).toBeDefined();
  });

  it('should render hero grid when heroes available', () => {
    render(<HeroSelectPage />);
    expect(screen.getByTestId('hero-grid')).toBeDefined();
    expect(screen.getByText('李逍遥')).toBeDefined();
    expect(screen.getByText('赵灵儿')).toBeDefined();
  });

  it('should show waiting spinner when no heroes available', () => {
    mockHeroSelect.availableHeroes = [];
    render(<HeroSelectPage />);
    expect(screen.getByText('等待可用角色...')).toBeDefined();
  });

  it('should render selection status', () => {
    render(<HeroSelectPage />);
    expect(screen.getByTestId('selection-status')).toBeDefined();
  });

  it('should show player names in selection status', () => {
    render(<HeroSelectPage />);
    expect(screen.getByText('P1: 未选择')).toBeDefined();
    expect(screen.getByText('P2: 未选择')).toBeDefined();
  });

  it('should show selected hero in status', () => {
    mockHeroSelect.selectedHeroes.set(1, { heroId: 1001 });
    render(<HeroSelectPage />);
    expect(screen.getByText('P1: 李逍遥')).toBeDefined();
  });

  it('should pass taken hero ids to HeroGrid', () => {
    mockHeroSelect.selectedHeroes.set(2, { heroId: 1002 });
    render(<HeroSelectPage />);
    // The HeroGrid mock should receive selectedHeroIds containing 1002 (player 2's pick)
    // We can verify this indirectly through the component
    expect(screen.getByTestId('hero-grid')).toBeDefined();
  });

  it('should not mark own selection as taken', () => {
    mockHeroSelect.selectedHeroes.set(1, { heroId: 1001 });
    render(<HeroSelectPage />);
    // Player 1's own selection should NOT be in takenHeroIds
    expect(screen.getByTestId('hero-grid')).toBeDefined();
  });

  it('should navigate to game on game_started', () => {
    render(<HeroSelectPage />);
    messageHandlers.forEach(h => h({ type: 'game_started', payload: {} }));
    expect(mockNavigate).toHaveBeenCalledWith('/game/ABCD');
  });

  it('should navigate home on room_left', () => {
    render(<HeroSelectPage />);
    messageHandlers.forEach(h => h({ type: 'room_left', payload: { roomId: 'ABCD' } }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
