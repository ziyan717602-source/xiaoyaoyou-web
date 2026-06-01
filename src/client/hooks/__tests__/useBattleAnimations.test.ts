import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBattleAnimations } from '../useBattleAnimations';

describe('useBattleAnimations', () => {
  it('should return registerPlayer and processGMessage', () => {
    const { result } = renderHook(() => useBattleAnimations());
    expect(typeof result.current.registerPlayer).toBe('function');
    expect(typeof result.current.processGMessage).toBe('function');
  });

  describe('registerPlayer', () => {
    it('should register a callback for a uid', () => {
      const { result } = renderHook(() => useBattleAnimations());
      const cb = vi.fn();
      result.current.registerPlayer(1, cb);
      // No error means success — callback is stored internally
    });

    it('should return an unsubscribe function', () => {
      const { result } = renderHook(() => useBattleAnimations());
      const cb = vi.fn();
      const unsub = result.current.registerPlayer(1, cb);
      expect(typeof unsub).toBe('function');
    });

    it('should not call callback after unsubscribe', () => {
      const { result } = renderHook(() => useBattleAnimations());
      const cb = vi.fn();
      const unsub = result.current.registerPlayer(1, cb);
      unsub();
      result.current.processGMessage('G0OH,1,2,3,5,1');
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('processGMessage - G0OH (damage)', () => {
    it('should trigger harm animation for valid damage', () => {
      const { result } = renderHook(() => useBattleAnimations());
      const cb = vi.fn();
      result.current.registerPlayer(1, cb);
      act(() => {
        result.current.processGMessage('G0OH,1,2,3,5,1');
      });
      expect(cb).toHaveBeenCalledWith({ uid: 1, type: 'harm', amount: 5 });
    });

    it('should handle uppercase G0OH', () => {
      const { result } = renderHook(() => useBattleAnimations());
      const cb = vi.fn();
      result.current.registerPlayer(2, cb);
      act(() => {
        result.current.processGMessage('G0OH,2,1,1,3,1');
      });
      expect(cb).toHaveBeenCalledWith({ uid: 2, type: 'harm', amount: 3 });
    });

    it('should not trigger for zero damage', () => {
      const { result } = renderHook(() => useBattleAnimations());
      const cb = vi.fn();
      result.current.registerPlayer(1, cb);
      act(() => {
        result.current.processGMessage('G0OH,1,2,3,0,1');
      });
      expect(cb).not.toHaveBeenCalled();
    });

    it('should not trigger for uid 0', () => {
      const { result } = renderHook(() => useBattleAnimations());
      const cb = vi.fn();
      result.current.registerPlayer(0, cb);
      act(() => {
        result.current.processGMessage('G0OH,0,2,3,5,1');
      });
      expect(cb).not.toHaveBeenCalled();
    });

    it('should not trigger for short messages', () => {
      const { result } = renderHook(() => useBattleAnimations());
      const cb = vi.fn();
      result.current.registerPlayer(1, cb);
      act(() => {
        result.current.processGMessage('G0OH,1,2');
      });
      expect(cb).not.toHaveBeenCalled();
    });

    it('should not trigger for non-matching messages', () => {
      const { result } = renderHook(() => useBattleAnimations());
      const cb = vi.fn();
      result.current.registerPlayer(1, cb);
      act(() => {
        result.current.processGMessage('G0XX,1,2,3,5,1');
      });
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('processGMessage - G0IH (heal)', () => {
    it('should trigger cure animation for valid heal', () => {
      const { result } = renderHook(() => useBattleAnimations());
      const cb = vi.fn();
      result.current.registerPlayer(3, cb);
      act(() => {
        result.current.processGMessage('G0IH,3,1,2,4,1');
      });
      expect(cb).toHaveBeenCalledWith({ uid: 3, type: 'cure', amount: 4 });
    });

    it('should not trigger for zero heal', () => {
      const { result } = renderHook(() => useBattleAnimations());
      const cb = vi.fn();
      result.current.registerPlayer(1, cb);
      act(() => {
        result.current.processGMessage('G0IH,1,2,3,0,1');
      });
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('multi-player scenarios', () => {
    it('should call correct callback for the target uid', () => {
      const { result } = renderHook(() => useBattleAnimations());
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      result.current.registerPlayer(1, cb1);
      result.current.registerPlayer(2, cb2);
      act(() => {
        result.current.processGMessage('G0OH,2,1,3,7,1');
      });
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledWith({ uid: 2, type: 'harm', amount: 7 });
    });

    it('should handle multiple messages in sequence', () => {
      const { result } = renderHook(() => useBattleAnimations());
      const cb = vi.fn();
      result.current.registerPlayer(1, cb);
      act(() => {
        result.current.processGMessage('G0OH,1,2,3,5,1');
        result.current.processGMessage('G0IH,1,3,1,3,1');
      });
      expect(cb).toHaveBeenCalledTimes(2);
      expect(cb).toHaveBeenCalledWith({ uid: 1, type: 'harm', amount: 5 });
      expect(cb).toHaveBeenCalledWith({ uid: 1, type: 'cure', amount: 3 });
    });
  });
});
