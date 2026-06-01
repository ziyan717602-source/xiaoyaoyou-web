import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RoomPage from '../RoomPage';

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

let mockRoom: {
  currentRoom: { roomId: string; players: { uid: number; name: string; isReady: boolean; isConnected: boolean }[] } | null;
  myUid: number | null;
  leaveRoom: ReturnType<typeof vi.fn>;
  startGame: ReturnType<typeof vi.fn>;
};

vi.mock('../../hooks/useRoom', () => ({
  useRoom: () => mockRoom,
}));

vi.mock('../../components/common/LoadingSpinner', () => ({
  default: ({ text }: { text?: string }) => <div data-testid="spinner">{text}</div>,
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

describe('RoomPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageHandlers = [];
    wsState = { isConnected: true, isReconnecting: false, reconnectAttempts: 0, error: null };
    mockParams = { roomId: 'ABCD' };
    mockRoom = {
      currentRoom: {
        roomId: 'ABCD',
        players: [
          { uid: 1, name: 'Host', isReady: true, isConnected: true },
          { uid: 2, name: 'P2', isReady: false, isConnected: true },
        ],
      },
      myUid: 1,
      leaveRoom: vi.fn(),
      startGame: vi.fn(),
    };
  });

  it('should show loading when no room', () => {
    mockRoom.currentRoom = null;
    render(<RoomPage />);
    expect(screen.getByTestId('spinner')).toBeDefined();
    expect(screen.getByText('加载房间信息...')).toBeDefined();
  });

  it('should render room info', () => {
    render(<RoomPage />);
    expect(screen.getByText('房间: ABCD')).toBeDefined();
    expect(screen.getByText('Host')).toBeDefined();
    expect(screen.getByText('P2')).toBeDefined();
  });

  it('should display player count', () => {
    render(<RoomPage />);
    expect(screen.getByText('2 / 6')).toBeDefined();
  });

  it('should show host badge for first player', () => {
    render(<RoomPage />);
    expect(screen.getByText('房主')).toBeDefined();
  });

  it('should show disconnected status', () => {
    mockRoom.currentRoom!.players[1].isConnected = false;
    render(<RoomPage />);
    expect(screen.getByText('已断开')).toBeDefined();
  });

  it('should show start button when host and >= 2 players', () => {
    render(<RoomPage />);
    expect(screen.getByText('开始游戏')).toBeDefined();
  });

  it('should call startGame when start button clicked', () => {
    render(<RoomPage />);
    fireEvent.click(screen.getByText('开始游戏'));
    expect(mockRoom.startGame).toHaveBeenCalled();
  });

  it('should not show start button for non-host', () => {
    mockRoom.myUid = 2;
    render(<RoomPage />);
    expect(screen.queryByText('开始游戏')).toBeNull();
    expect(screen.getByText('等待房主开始游戏...')).toBeDefined();
  });

  it('should show start button when host with 1 player', () => {
    mockRoom.currentRoom!.players = [{ uid: 1, name: 'Host', isReady: true, isConnected: true }];
    render(<RoomPage />);
    expect(screen.getByText('开始游戏')).toBeDefined();
  });

  it('should leave room and navigate home', () => {
    render(<RoomPage />);
    fireEvent.click(screen.getByText('离开房间'));
    expect(mockRoom.leaveRoom).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should show empty slot when < 6 players', () => {
    render(<RoomPage />);
    expect(screen.getByText('等待加入...')).toBeDefined();
  });

  it('should navigate to game on game_started message', () => {
    render(<RoomPage />);
    emitMessage({ type: 'game_started', payload: {} });
    expect(mockNavigate).toHaveBeenCalledWith('/game/ABCD');
  });

  it('should navigate home on room_left message', () => {
    render(<RoomPage />);
    emitMessage({ type: 'room_left', payload: { roomId: 'ABCD' } });
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should show error toast on error message', () => {
    render(<RoomPage />);
    emitMessage({ type: 'error', payload: { message: 'Something failed' } });
    expect(screen.getByText('Something failed')).toBeDefined();
  });

  it('should dismiss error toast', () => {
    render(<RoomPage />);
    emitMessage({ type: 'error', payload: { message: 'err' } });
    fireEvent.click(screen.getByText('dismiss'));
    expect(screen.queryByText('err')).toBeNull();
  });

  it('should send get_room when connected but no room state', () => {
    mockRoom.currentRoom = null;
    mockParams = { roomId: 'ABCD' };
    render(<RoomPage />);
    expect(mockWs.send).toHaveBeenCalledWith({ type: 'get_room', payload: { roomId: 'ABCD' } });
  });

  it('should copy room id to clipboard', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<RoomPage />);
    fireEvent.click(screen.getByText('复制'));
    expect(writeText).toHaveBeenCalledWith('ABCD');
  });
});
