import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import JoinRoomDialog from '../JoinRoomDialog';

describe('JoinRoomDialog', () => {
  it('should render dialog with title "加入房间"', () => {
    render(<JoinRoomDialog onJoin={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('加入房间')).toBeDefined();
  });

  it('should have room ID input pre-filled when initialRoomId provided', () => {
    render(
      <JoinRoomDialog initialRoomId="ABC123" onJoin={vi.fn()} onClose={vi.fn()} />
    );
    const roomIdInput = screen.getByPlaceholderText('输入房间号') as HTMLInputElement;
    expect(roomIdInput.value).toBe('ABC123');
  });

  it('should have empty room ID input when no initialRoomId', () => {
    render(<JoinRoomDialog onJoin={vi.fn()} onClose={vi.fn()} />);
    const roomIdInput = screen.getByPlaceholderText('输入房间号') as HTMLInputElement;
    expect(roomIdInput.value).toBe('');
  });

  it('should call onJoin with roomId and playerName when submit clicked', () => {
    const onJoin = vi.fn();
    render(<JoinRoomDialog onJoin={onJoin} onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('输入房间号'), {
      target: { value: 'ROOM01' },
    });
    fireEvent.change(screen.getByPlaceholderText('输入你的名称'), {
      target: { value: '玩家A' },
    });
    fireEvent.click(screen.getByText('加入'));

    expect(onJoin).toHaveBeenCalledWith('ROOM01', '玩家A');
  });

  it('should show error when room ID is empty on submit', () => {
    const onJoin = vi.fn();
    render(<JoinRoomDialog onJoin={onJoin} onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('输入你的名称'), {
      target: { value: '玩家A' },
    });
    fireEvent.click(screen.getByText('加入'));

    expect(screen.getByText('请输入房间号')).toBeDefined();
    expect(onJoin).not.toHaveBeenCalled();
  });

  it('should call onClose when cancel clicked', () => {
    const onClose = vi.fn();
    render(<JoinRoomDialog onJoin={vi.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByText('取消'));
    expect(onClose).toHaveBeenCalled();
  });
});
