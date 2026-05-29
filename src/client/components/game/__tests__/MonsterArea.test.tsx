import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MonsterArea from '../MonsterArea';
import type { ActiveMonster } from '@shared/network';

describe('MonsterArea', () => {
  it('should not render when monster is null', () => {
    const { container } = render(<MonsterArea monster={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render monster name', () => {
    const monster: ActiveMonster = {
      code: 'MO001',
      name: '蝴蝶仙子',
      str: 5,
      agl: 3,
      element: 1,
      level: 2,
    };
    render(<MonsterArea monster={monster} />);
    expect(screen.getByText('蝴蝶仙子')).toBeDefined();
  });

  it('should render monster stats', () => {
    const monster: ActiveMonster = {
      code: 'MO001',
      name: '蝴蝶仙子',
      str: 5,
      agl: 3,
      element: 1,
      level: 2,
    };
    render(<MonsterArea monster={monster} />);
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });

  it('should render element label', () => {
    const monster: ActiveMonster = {
      code: 'MO001',
      name: '蝴蝶仙子',
      str: 5,
      agl: 3,
      element: 1,
      level: 2,
    };
    render(<MonsterArea monster={monster} />);
    expect(screen.getByText('水')).toBeDefined();
  });

  it('should render different element labels', () => {
    const elements = [
      { element: 0, label: '无' },
      { element: 1, label: '水' },
      { element: 2, label: '火' },
      { element: 3, label: '雷' },
      { element: 4, label: '风' },
      { element: 5, label: '土' },
      { element: 6, label: '阴' },
      { element: 7, label: '阳' },
    ];

    for (const { element, label } of elements) {
      const monster: ActiveMonster = {
        code: 'MO001',
        name: '测试怪物',
        str: 1,
        agl: 1,
        element,
        level: 1,
      };
      const { unmount } = render(<MonsterArea monster={monster} />);
      expect(screen.getByText(label)).toBeDefined();
      unmount();
    }
  });
});
