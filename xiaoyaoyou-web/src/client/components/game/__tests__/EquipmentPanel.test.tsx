import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EquipmentPanel from '../EquipmentPanel';

describe('EquipmentPanel', () => {
  it('should render all four equipment slots', () => {
    render(<EquipmentPanel weapon={0} armor={0} trove={0} exEquip={0} />);
    expect(screen.getByText('武器')).toBeDefined();
    expect(screen.getByText('防具')).toBeDefined();
    expect(screen.getByText('行囊')).toBeDefined();
    expect(screen.getByText('扩展')).toBeDefined();
  });

  it('should show empty state when no equipment', () => {
    const { container } = render(
      <EquipmentPanel weapon={0} armor={0} trove={0} exEquip={0} />
    );
    const emptySlots = container.querySelectorAll('.equip-slot-empty');
    expect(emptySlots.length).toBe(4);
  });

  it('should show filled state when equipment exists', () => {
    const { container } = render(
      <EquipmentPanel weapon={17} armor={0} trove={0} exEquip={0} />
    );
    const filledSlots = container.querySelectorAll('.equip-slot-filled');
    expect(filledSlots.length).toBe(1);
  });

  it('should apply compact class when compact prop is true', () => {
    const { container } = render(
      <EquipmentPanel weapon={0} armor={0} trove={0} exEquip={0} compact />
    );
    expect((container.firstChild as HTMLElement).className).toContain('equipment-panel-compact');
  });

  it('should show card ID in compact mode', () => {
    render(
      <EquipmentPanel weapon={17} armor={0} trove={0} exEquip={0} compact />
    );
    expect(screen.getByText('17')).toBeDefined();
  });
});
