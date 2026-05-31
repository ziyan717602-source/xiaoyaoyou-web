import { useCallback, useEffect, useState } from 'react';
import type { HeroInfo } from '@shared/network';
import type { UseWebSocketReturn } from './useWebSocket';

export interface HeroSelectManager {
  availableHeroes: HeroInfo[];
  selectedHeroes: Map<number, { heroId: number }>; // uid -> selection
  mySelection: number | null; // heroId I've selected
  selectHero: (heroId: number) => void;
}

export function useHeroSelect(websocket: UseWebSocketReturn): HeroSelectManager {
  const [availableHeroes, setAvailableHeroes] = useState<HeroInfo[]>([]);
  const [selectedHeroes, setSelectedHeroes] = useState<Map<number, { heroId: number }>>(new Map());
  const [mySelection, setMySelection] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = websocket.onMessage((message) => {
      if (message.type === 'hero_select_request') {
        setAvailableHeroes(message.payload.availableHeroes);
        setSelectedHeroes(new Map());
        setMySelection(null);
      }
      if (message.type === 'hero_select_response') {
        const { uid, heroId, success } = message.payload;
        if (success) {
          setSelectedHeroes(prev => {
            const next = new Map(prev);
            next.set(uid, { heroId });
            return next;
          });
        }
      }
    });
    return unsubscribe;
  }, [websocket]);

  const selectHero = useCallback((heroId: number) => {
    setMySelection(heroId);
    websocket.send({ type: 'hero_select', payload: { heroId } });
  }, [websocket]);

  return {
    availableHeroes,
    selectedHeroes,
    mySelection,
    selectHero,
  };
}
