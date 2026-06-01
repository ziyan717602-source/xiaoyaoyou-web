import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RoomList from '../RoomList';
import type { RoomInfo } from '@shared/network';

describe('RoomList', () => {
  const makeRoom = (overrides: Partial<RoomInfo> = {}): RoomInfo => ({
    roomId: 'ROOM01',
    playerCount: 2,
    maxPlayers: 4,
    status: 'waiting',
    ...overrides,
  });

  it('should show "暂无房间" when rooms array is empty', () => {
    render(<RoomList rooms={[]} onJoinRoom={vi.fn()} />);
    expect(screen.getByText('暂无房间')).toBeDefined();
  });

  it('should render list of rooms', () => {
    const rooms = [
      makeRoom({ roomId: 'AAA' }),
      makeRoom({ roomId: 'BBB' }),
    ];
    render(<RoomList rooms={rooms} onJoinRoom={vi.fn()} />);
    expect(screen.getByText('AAA')).toBeDefined();
    expect(screen.getByText('BBB')).toBeDefined();
  });

  it('should display room info (roomId, playerCount, maxPlayers)', () => {
    const rooms = [makeRoom({ roomId: 'ROOM99', playerCount: 3, maxPlayers: 6 })];
    render(<RoomList rooms={rooms} onJoinRoom={vi.fn()} />);
    expect(screen.getByText('ROOM99')).toBeDefined();
    expect(screen.getByText('3 / 6')).toBeDefined();
  });

  it('should display room status label', () => {
    const waiting = [makeRoom({ status: 'waiting' })];
    const { unmount: unmount1 } = render(<RoomList rooms={waiting} onJoinRoom={vi.fn()} />);
    expect(screen.getByText('等待中')).toBeDefined();
    unmount1();

    const playing = [makeRoom({ status: 'playing' })];
    render(<RoomList rooms={playing} onJoinRoom={vi.fn()} />);
    expect(screen.getByText('游戏中')).toBeDefined();
  });

  it('should call onJoinRoom when join button clicked', () => {
    const onJoinRoom = vi.fn();
    const rooms = [makeRoom({ roomId: 'JOIN123' })];
    render(<RoomList rooms={rooms} onJoinRoom={onJoinRoom} />);

    fireEvent.click(screen.getByText('加入'));
    expect(onJoinRoom).toHaveBeenCalledWith('JOIN123');
  });

  it('should show "已满" when room is full', () => {
    const rooms = [makeRoom({ playerCount: 4, maxPlayers: 4, status: 'waiting' })];
    render(<RoomList rooms={rooms} onJoinRoom={vi.fn()} />);
    expect(screen.getByText('已满')).toBeDefined();
  });

  it('should not show join button for full room', () => {
    const rooms = [makeRoom({ playerCount: 4, maxPlayers: 4, status: 'waiting' })];
    render(<RoomList rooms={rooms} onJoinRoom={vi.fn()} />);
    expect(screen.queryByText('加入')).toBeNull();
  });
});
