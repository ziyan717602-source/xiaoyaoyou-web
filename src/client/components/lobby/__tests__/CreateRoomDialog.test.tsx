import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateRoomDialog from '../CreateRoomDialog';

describe('CreateRoomDialog', () => {
  it('should render dialog with title "创建房间"', () => {
    render(<CreateRoomDialog onCreate={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('创建房间')).toBeDefined();
  });

  it('should have player count radio buttons (2, 4, 6)', () => {
    render(<CreateRoomDialog onCreate={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('2 人')).toBeDefined();
    expect(screen.getByText('4 人')).toBeDefined();
    expect(screen.getByText('6 人')).toBeDefined();
  });

  it('should have package checkboxes', () => {
    render(<CreateRoomDialog onCreate={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('标准包 1')).toBeDefined();
    expect(screen.getByText('标准包 2')).toBeDefined();
    expect(screen.getByText('标准包 3')).toBeDefined();
    expect(screen.getByText('标准包 4')).toBeDefined();
    expect(screen.getByText('标准包 5')).toBeDefined();
  });

  it('should have name input field', () => {
    render(<CreateRoomDialog onCreate={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText('留空默认为房主');
    expect(input).toBeDefined();
    expect(input.getAttribute('maxLength')).toBe('12');
  });

  it('should call onCreate with selected options when submit clicked', () => {
    const onCreate = vi.fn();
    render(<CreateRoomDialog onCreate={onCreate} onClose={vi.fn()} />);

    // Enter a player name
    const nameInput = screen.getByPlaceholderText('留空默认为房主');
    fireEvent.change(nameInput, { target: { value: '测试玩家' } });

    // Click the create button
    fireEvent.click(screen.getByText('创建'));

    // Default: playerCount=4, packages=[1], name='测试玩家'
    expect(onCreate).toHaveBeenCalledWith(4, [1], '测试玩家');
  });

  it('should call onClose when cancel clicked', () => {
    const onClose = vi.fn();
    render(<CreateRoomDialog onCreate={vi.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByText('取消'));
    expect(onClose).toHaveBeenCalled();
  });
});
