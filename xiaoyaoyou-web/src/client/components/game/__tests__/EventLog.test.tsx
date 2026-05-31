import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EventLog, { type LogEntry } from '../EventLog';

function makeEntries(count: number): LogEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    timestamp: Date.now() + i * 1000,
    text: `Event ${i + 1}`,
    type: 'info' as const,
  }));
}

// Simulate a real game log sequence with G-message translations
function makeGameLogEntries(): LogEntry[] {
  const base = Date.now();
  return [
    { id: 1, timestamp: base, text: '── 回合开始 ──', type: 'system' },
    { id: 2, timestamp: base + 100, text: '赵灵儿 的回合开始', type: 'system' },
    { id: 3, timestamp: base + 200, text: '赵灵儿 使用 [天雷破]', type: 'action' },
    { id: 4, timestamp: base + 300, text: '赵灵儿 对 熔岩兽王 使用 [天雷破]', type: 'action' },
    { id: 5, timestamp: base + 400, text: '赵灵儿 造成 3 点雷伤害', type: 'action' },
    { id: 6, timestamp: base + 500, text: '── 出牌阶段 ──', type: 'system' },
    { id: 7, timestamp: base + 600, text: '赵灵儿 装备了 [天蛇杖]', type: 'action' },
    { id: 8, timestamp: base + 700, text: '熔岩兽王 登场效果: 全场 HP-2', type: 'info' },
    { id: 9, timestamp: base + 800, text: '李逍遥 受到 2 点伤害', type: 'action' },
    { id: 10, timestamp: base + 900, text: '赵灵儿 受到 2 点伤害', type: 'action' },
    { id: 11, timestamp: base + 1000, text: '── 战斗结算 ──', type: 'system' },
    { id: 12, timestamp: base + 1100, text: '战斗结果: 胜利 (战力差: +1)', type: 'action' },
    { id: 13, timestamp: base + 1200, text: '熔岩兽王 胜利效果触发', type: 'info' },
    { id: 14, timestamp: base + 1300, text: '赵灵儿 捕获了 熔岩兽王 作为宠物', type: 'action' },
    { id: 15, timestamp: base + 1400, text: '赵灵儿 补充 2 张手牌', type: 'action' },
    { id: 16, timestamp: base + 1500, text: '── 回合结束 ──', type: 'system' },
  ];
}

describe('EventLog', () => {
  it('should render empty state when no entries', () => {
    render(<EventLog entries={[]} />);
    expect(screen.getByText('暂无事件')).toBeDefined();
  });

  it('should render log entries', () => {
    const entries = makeEntries(3);
    render(<EventLog entries={entries} />);
    expect(screen.getByText('Event 1')).toBeDefined();
    expect(screen.getByText('Event 2')).toBeDefined();
    expect(screen.getByText('Event 3')).toBeDefined();
  });

  it('should apply correct type class', () => {
    const entries: LogEntry[] = [
      { id: 1, timestamp: Date.now(), text: 'info msg', type: 'info' },
      { id: 2, timestamp: Date.now(), text: 'error msg', type: 'error' },
      { id: 3, timestamp: Date.now(), text: 'action msg', type: 'action' },
    ];
    const { container } = render(<EventLog entries={entries} />);
    const items = container.querySelectorAll('.event-log-entry');
    expect(items[0].className).toContain('event-log-info');
    expect(items[1].className).toContain('event-log-error');
    expect(items[2].className).toContain('event-log-action');
  });

  it('should limit displayed entries with maxEntries', () => {
    const entries = makeEntries(10);
    render(<EventLog entries={entries} maxEntries={3} />);
    expect(screen.queryByText('Event 1')).toBeNull();
    expect(screen.queryByText('Event 7')).toBeNull();
    expect(screen.getByText('Event 8')).toBeDefined();
    expect(screen.getByText('Event 10')).toBeDefined();
  });

  it('should show export button when onExport is provided', () => {
    const onExport = vi.fn();
    render(<EventLog entries={makeEntries(2)} onExport={onExport} />);
    expect(screen.getByText('导出')).toBeDefined();
  });

  it('should call onExport when export button clicked', () => {
    const onExport = vi.fn();
    render(<EventLog entries={makeEntries(3)} onExport={onExport} />);
    fireEvent.click(screen.getByText('导出'));
    expect(onExport).toHaveBeenCalled();
  });

  it('should not show export button when onExport is not provided', () => {
    render(<EventLog entries={makeEntries(2)} />);
    expect(screen.queryByText('导出')).toBeNull();
  });

  it('should format timestamp correctly', () => {
    const entry: LogEntry[] = [
      { id: 1, timestamp: new Date(2026, 0, 1, 9, 5, 3).getTime(), text: 'test', type: 'info' },
    ];
    render(<EventLog entries={entry} />);
    expect(screen.getByText('09:05:03')).toBeDefined();
  });

  describe('filtering', () => {
    it('should show all entries by default', () => {
      const entries = makeGameLogEntries();
      render(<EventLog entries={entries} />);
      // All 16 entries should be visible
      expect(screen.getByText('── 回合开始 ──')).toBeDefined();
      expect(screen.getByText('赵灵儿 使用 [天雷破]')).toBeDefined();
      expect(screen.getByText('李逍遥 受到 2 点伤害')).toBeDefined();
    });

    it('should filter to action entries only', () => {
      const entries = makeGameLogEntries();
      render(<EventLog entries={entries} />);
      fireEvent.click(screen.getByText('操作'));
      // Only action entries should be visible
      expect(screen.getByText('赵灵儿 使用 [天雷破]')).toBeDefined();
      expect(screen.queryByText('── 回合开始 ──')).toBeNull();
      expect(screen.queryByText('熔岩兽王 登场效果: 全场 HP-2')).toBeNull();
    });

    it('should filter to system entries only', () => {
      const entries = makeGameLogEntries();
      render(<EventLog entries={entries} />);
      fireEvent.click(screen.getByText('系统'));
      // Only system entries should be visible
      expect(screen.getByText('── 回合开始 ──')).toBeDefined();
      expect(screen.queryByText('赵灵儿 使用 [天雷破]')).toBeNull();
    });

    it('should filter to info entries only', () => {
      const entries = makeGameLogEntries();
      render(<EventLog entries={entries} />);
      fireEvent.click(screen.getByText('信息'));
      // Only info entries should be visible
      expect(screen.getByText('熔岩兽王 登场效果: 全场 HP-2')).toBeDefined();
      expect(screen.queryByText('赵灵儿 使用 [天雷破]')).toBeNull();
    });

    it('should show entry count', () => {
      const entries = makeGameLogEntries();
      render(<EventLog entries={entries} />);
      // Total 16 entries
      expect(screen.getByText('事件日志 (16)')).toBeDefined();
      // After filtering to action only
      fireEvent.click(screen.getByText('操作'));
      expect(screen.getByText('事件日志 (9)')).toBeDefined();
    });

    it('should show empty state when filter matches nothing', () => {
      const entries: LogEntry[] = [
        { id: 1, timestamp: Date.now(), text: 'test', type: 'action' },
      ];
      render(<EventLog entries={entries} />);
      fireEvent.click(screen.getByText('错误'));
      expect(screen.getByText('暂无事件')).toBeDefined();
    });
  });

  describe('G-message integration', () => {
    it('should display full game round log sequence', () => {
      const entries = makeGameLogEntries();
      render(<EventLog entries={entries} />);
      // Verify all key game events are displayed
      expect(screen.getByText('── 回合开始 ──')).toBeDefined();
      expect(screen.getByText('赵灵儿 的回合开始')).toBeDefined();
      expect(screen.getByText('赵灵儿 使用 [天雷破]')).toBeDefined();
      expect(screen.getByText('赵灵儿 对 熔岩兽王 使用 [天雷破]')).toBeDefined();
      expect(screen.getByText('赵灵儿 造成 3 点雷伤害')).toBeDefined();
      expect(screen.getByText('── 出牌阶段 ──')).toBeDefined();
      expect(screen.getByText('赵灵儿 装备了 [天蛇杖]')).toBeDefined();
      expect(screen.getByText('── 战斗结算 ──')).toBeDefined();
      expect(screen.getByText('战斗结果: 胜利 (战力差: +1)')).toBeDefined();
      expect(screen.getByText('赵灵儿 捕获了 熔岩兽王 作为宠物')).toBeDefined();
      expect(screen.getByText('── 回合结束 ──')).toBeDefined();
    });

    it('should filter game log by type', () => {
      const entries = makeGameLogEntries();
      render(<EventLog entries={entries} />);
      // Filter to system only - should show phase separators
      fireEvent.click(screen.getByText('系统'));
      expect(screen.getByText('── 回合开始 ──')).toBeDefined();
      expect(screen.getByText('── 出牌阶段 ──')).toBeDefined();
      expect(screen.getByText('── 战斗结算 ──')).toBeDefined();
      expect(screen.getByText('── 回合结束 ──')).toBeDefined();
      // Should not show action entries
      expect(screen.queryByText('赵灵儿 使用 [天雷破]')).toBeNull();
    });
  });
});
