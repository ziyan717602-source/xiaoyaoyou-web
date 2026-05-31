import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import SelectionStatus from '../SelectionStatus';

describe('SelectionStatus', () => {
  const players = [
    { uid: 1, name: '玩家A', heroName: null },
    { uid: 2, name: '玩家B', heroName: '赵云' },
    { uid: 3, name: '玩家C', heroName: null },
  ];

  it('should render player list', () => {
    render(<SelectionStatus players={players} />);
    expect(screen.getByText('玩家A')).toBeDefined();
    expect(screen.getByText('玩家B')).toBeDefined();
    expect(screen.getByText('玩家C')).toBeDefined();
  });

  it('should show waiting text for players without hero', () => {
    render(<SelectionStatus players={players} />);
    const waitingTexts = screen.getAllByText('等待选择...');
    expect(waitingTexts.length).toBe(2);
  });

  it('should show hero name for players who have selected', () => {
    render(<SelectionStatus players={players} />);
    expect(screen.getByText('赵云')).toBeDefined();
  });

  it('should apply done and waiting CSS classes', () => {
    const { container } = render(<SelectionStatus players={players} />);
    const items = container.querySelectorAll('.selection-status-item');
    // Player A - waiting
    expect(items[0].className).toContain('selection-status-waiting');
    // Player B - done
    expect(items[1].className).toContain('selection-status-done');
    // Player C - waiting
    expect(items[2].className).toContain('selection-status-waiting');
  });
});
