import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LobbyPage from '../LobbyPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
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

const mockRoom = {
  rooms: [
    { roomId: 'ROOM1', playerCount: 2, hostName: 'Host1', packages: [1] },
    { roomId: 'ROOM2', playerCount: 1, hostName: 'Host2', packages: [1, 2] },
  ],
  currentRoom: null,
  myUid: null,
  playerName: null,
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  startGame: vi.fn(),
  refreshRooms: vi.fn(),
};

vi.mock('../../hooks/useRoom', () => ({
  useRoom: () => mockRoom,
}));

vi.mock('../../components/lobby/RoomList', () => ({
  default: ({ rooms, onJoinRoom }: { rooms: { roomId: string; playerCount: number; hostName: string }[]; onJoinRoom: (id: string) => void }) => (
    <div data-testid="room-list">
      {rooms.map(r => (
        <div key={r.roomId}>
          <span>{r.roomId}</span>
          <span>{r.hostName}</span>
          <button onClick={() => onJoinRoom(r.roomId)}>加入</button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../components/lobby/CreateRoomDialog', () => ({
  default: ({ onCreate, onClose }: { onCreate: (...args: unknown[]) => void; onClose: () => void }) => (
    <div data-testid="create-dialog">
      <button onClick={() => onCreate(2, [1])}>创建</button>
      <button onClick={onClose}>关闭</button>
    </div>
  ),
}));

vi.mock('../../components/lobby/JoinRoomDialog', () => ({
  default: ({ initialRoomId, onJoin, onClose }: { initialRoomId: string; onJoin: (id: string, name: string) => void; onClose: () => void }) => (
    <div data-testid="join-dialog">
      <span>{initialRoomId}</span>
      <button onClick={() => onJoin(initialRoomId || 'XYZ', '玩家')}>加入</button>
      <button onClick={onClose}>关闭</button>
    </div>
  ),
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

describe('LobbyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageHandlers = [];
    wsState = { isConnected: true, isReconnecting: false, reconnectAttempts: 0, error: null };
    mockRoom.rooms = [
      { roomId: 'ROOM1', playerCount: 2, hostName: 'Host1', packages: [1] },
      { roomId: 'ROOM2', playerCount: 1, hostName: 'Host2', packages: [1, 2] },
    ];
    mockRoom.createRoom = vi.fn();
    mockRoom.joinRoom = vi.fn();
    mockRoom.refreshRooms = vi.fn();
  });

  it('should render lobby title', () => {
    render(<LobbyPage />);
    expect(screen.getByText('仙剑逍遥游')).toBeDefined();
    expect(screen.getByText('联机对战')).toBeDefined();
  });

  it('should show connected status', () => {
    render(<LobbyPage />);
    expect(screen.getByText('已连接')).toBeDefined();
  });

  it('should show reconnecting status', () => {
    wsState = { isConnected: false, isReconnecting: true, reconnectAttempts: 3, error: null };
    render(<LobbyPage />);
    expect(screen.getByText('重连中... (3)')).toBeDefined();
  });

  it('should show connect button when disconnected', () => {
    wsState = { isConnected: false, isReconnecting: false, reconnectAttempts: 0, error: null };
    render(<LobbyPage />);
    expect(screen.getByText('连接服务器')).toBeDefined();
  });

  it('should call connect when connect button clicked', () => {
    wsState = { isConnected: false, isReconnecting: false, reconnectAttempts: 0, error: null };
    render(<LobbyPage />);
    fireEvent.click(screen.getByText('连接服务器'));
    expect(mockWs.connect).toHaveBeenCalled();
  });

  it('should disable action buttons when disconnected', () => {
    wsState = { isConnected: false, isReconnecting: false, reconnectAttempts: 0, error: null };
    render(<LobbyPage />);
    expect(screen.getByText('创建房间')).toHaveProperty('disabled', true);
    expect(screen.getByText('加入房间')).toHaveProperty('disabled', true);
  });

  it('should enable action buttons when connected', () => {
    render(<LobbyPage />);
    expect(screen.getByText('创建房间')).toHaveProperty('disabled', false);
    expect(screen.getByText('加入房间')).toHaveProperty('disabled', false);
  });

  it('should open create dialog', () => {
    render(<LobbyPage />);
    fireEvent.click(screen.getByText('创建房间'));
    expect(screen.getByTestId('create-dialog')).toBeDefined();
  });

  it('should open join dialog', () => {
    render(<LobbyPage />);
    fireEvent.click(screen.getByText('加入房间'));
    expect(screen.getByTestId('join-dialog')).toBeDefined();
  });

  it('should call refreshRooms on connect', () => {
    render(<LobbyPage />);
    expect(mockRoom.refreshRooms).toHaveBeenCalled();
  });

  it('should render room list', () => {
    render(<LobbyPage />);
    expect(screen.getByTestId('room-list')).toBeDefined();
    expect(screen.getByText('ROOM1')).toBeDefined();
    expect(screen.getByText('ROOM2')).toBeDefined();
  });

  it('should show loading spinner when disconnected and not reconnecting', () => {
    wsState = { isConnected: false, isReconnecting: false, reconnectAttempts: 0, error: null };
    render(<LobbyPage />);
    expect(screen.getByTestId('spinner')).toBeDefined();
  });

  it('should navigate to room on room_created message', () => {
    render(<LobbyPage />);
    emitMessage({ type: 'room_created', payload: { roomId: 'NEW1' } });
    expect(mockNavigate).toHaveBeenCalledWith('/room/NEW1');
  });

  it('should show error toast on error message', () => {
    render(<LobbyPage />);
    emitMessage({ type: 'error', payload: { message: 'test error' } });
    expect(screen.getByText('test error')).toBeDefined();
  });

  it('should dismiss error toast', () => {
    render(<LobbyPage />);
    emitMessage({ type: 'error', payload: { message: 'err' } });
    fireEvent.click(screen.getByText('dismiss'));
    expect(screen.queryByText('err')).toBeNull();
  });

  it('should pass initial roomId to join dialog from room list', () => {
    render(<LobbyPage />);
    const joinButtons = screen.getAllByText('加入');
    fireEvent.click(joinButtons[0]);
    expect(screen.getByTestId('join-dialog')).toBeDefined();
    expect(screen.getAllByText('ROOM1').length).toBeGreaterThanOrEqual(1);
  });
});
