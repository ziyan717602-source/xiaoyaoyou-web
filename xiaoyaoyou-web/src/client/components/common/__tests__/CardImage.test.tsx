import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CardImage from '../CardImage';

describe('CardImage', () => {
  it('should render image with cardCode prop', () => {
    render(<CardImage cardCode="JP06" />);
    const img = screen.getByAltText('JP06') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('/images/tux_JP06.png');
  });

  it('should render image with cardId prop', () => {
    render(<CardImage cardId={42} />);
    const img = screen.getByAltText('Card#42') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('/images/tux_42.png');
  });

  it('should show placeholder on image error', () => {
    render(<CardImage cardCode="JP06" />);
    const img = screen.getByAltText('JP06') as HTMLImageElement;
    fireEvent.error(img);
    expect(screen.getByText('JP06')).toBeDefined();
    expect(screen.getByText('JP06').closest('.card-placeholder')).toBeDefined();
  });

  it('should apply selected class when selected is true', () => {
    const { container } = render(<CardImage cardCode="JP06" selected />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('card-selected');
  });

  it('should apply disabled class when disabled is true', () => {
    const { container } = render(<CardImage cardCode="JP06" disabled />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('card-disabled');
  });

  it('should call onClick when clicked and not disabled', () => {
    const onClick = vi.fn();
    render(<CardImage cardCode="JP06" onClick={onClick} />);
    const wrapper = screen.getByAltText('JP06').closest('.card-image')!;
    fireEvent.click(wrapper);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('should not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<CardImage cardCode="JP06" onClick={onClick} disabled />);
    const wrapper = screen.getByAltText('JP06').closest('.card-image')!;
    fireEvent.click(wrapper);
    expect(onClick).not.toHaveBeenCalled();
  });
});
