/**
 * useBattleAnimations - Hook for triggering battle animations based on G-Messages
 *
 * Parses G0OH (damage) and G0IH (heal) messages and triggers animations on the
 * affected player components.
 */
import { useCallback, useRef } from 'react';

export interface AnimationEvent {
  uid: number;
  type: 'harm' | 'cure';
  amount: number;
}

export function useBattleAnimations() {
  const animationCallbacks = useRef<Map<number, (event: AnimationEvent) => void>>(new Map());

  const registerPlayer = useCallback((uid: number, callback: (event: AnimationEvent) => void) => {
    animationCallbacks.current.set(uid, callback);
    return () => {
      animationCallbacks.current.delete(uid);
    };
  }, []);

  const processGMessage = useCallback((msg: string) => {
    const upper = msg.toUpperCase();

    // G0OH - Damage: G0OH,target,source,element,damage,mask
    if (upper.startsWith('G0OH,')) {
      const parts = msg.split(',');
      if (parts.length >= 5) {
        const targetUid = parseInt(parts[1], 10);
        const damage = parseInt(parts[4], 10);
        if (targetUid > 0 && damage > 0) {
          const callback = animationCallbacks.current.get(targetUid);
          if (callback) {
            callback({ uid: targetUid, type: 'harm', amount: damage });
          }
        }
      }
    }

    // G0IH - Heal: G0IH,target,source,element,heal,mask
    if (upper.startsWith('G0IH,')) {
      const parts = msg.split(',');
      if (parts.length >= 5) {
        const targetUid = parseInt(parts[1], 10);
        const heal = parseInt(parts[4], 10);
        if (targetUid > 0 && heal > 0) {
          const callback = animationCallbacks.current.get(targetUid);
          if (callback) {
            callback({ uid: targetUid, type: 'cure', amount: heal });
          }
        }
      }
    }
  }, []);

  return {
    registerPlayer,
    processGMessage,
  };
}
