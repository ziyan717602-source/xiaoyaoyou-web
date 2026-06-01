import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameOverPage from '../GameOverPage';

const mockNavigate = vi.fn();
let mockLocationState: Record<string, unknown> = {};

vi.mock('react-router-dom', () => ({
  useParams: () => ({ roomId: 'ABCD' }),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: mockLocationState }),
}));

const mockGameState = {
  gameResult: null as { winner: number | null; totalRounds: number; akaScore: number; aoScore: number; reason: string } | null,
};

vi.mock('../../hooks/useGameState', () => ({
  useGameState: () => ({
    gameState: null,
    gameResult: mockGameState.gameResult,
    inputRequest: null,
    error: null,
    clearInputRequest: vi.fn(),
    clearError: vi.fn(),
  }),
}));

const mockWs = {
  state: { isConnected: true, isReconnecting: false, reconnectAttempts: 0, error: null },
  send: vi.fn(),
  onMessage: vi.fn(() => vi.fn()),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocketContext: () => mockWs,
}));

// Mock GameOverResult to verify props
vi.mock('../../components/game/GameOverResult', () => ({
  default: ({ result, onReturnToLobby }: { result: { winner: number | null; totalRounds: number; akaScore: number; aoScore: number; reason: string }; onReturnToLobby: () => void }) => (
    <div data-testid="game-over-result">
      <span data-testid="winner">{result.winner === null ? '平局' : `玩家 ${result.winner}`}</span>
      <span data-testid="rounds">{result.totalRounds}</span>
      <button onClick={onReturnToLobby}>返回大厅</button>
    </div>
  ),
}));

describe('GameOverPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationState = {};
    mockGameState.gameResult = null;
  });

  it('should render game over result', () => {
    render(<GameOverPage />);
    expect(screen.getByTestId('game-over-result')).toBeDefined();
  });

  it('should use route state result when available', () => {
    mockLocationState = {
      result: { winner: 2, totalRounds: 10, akaScore: 5, aoScore: 3, reason: 'victory' },
    };
    render(<GameOverPage />);
    expect(screen.getByTestId('winner')).toHaveProperty('textContent', '玩家 2');
    expect(screen.getByTestId('rounds')).toHaveProperty('textContent', '10');
  });

  it('should fallback to useGameState result', () => {
    mockGameState.gameResult = { winner: 1, totalRounds: 8, akaScore: 4, aoScore: 2, reason: 'victory' };
    render(<GameOverPage />);
    expect(screen.getByTestId('winner')).toHaveProperty('textContent', '玩家 1');
  });

  it('should use default result when no result available', () => {
    render(<GameOverPage />);
    expect(screen.getByTestId('winner')).toHaveProperty('textContent', '平局');
    expect(screen.getByTestId('rounds')).toHaveProperty('textContent', '0');
  });

  it('should navigate to lobby on return', () => {
    render(<GameOverPage />);
    screen.getByText('返回大厅').click();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should prefer route state over useGameState', () => {
    mockLocationState = {
      result: { winner: 3, totalRounds: 12, akaScore: 6, aoScore: 1, reason: 'victory' },
    };
    mockGameState.gameResult = { winner: 1, totalRounds: 8, akaScore: 4, aoScore: 2, reason: 'victory' };
    render(<GameOverPage />);
    expect(screen.getByTestId('winner')).toHaveProperty('textContent', '玩家 3');
  });
});
