import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ServerMessage } from '@shared/network';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { useRoom } from '../hooks/useRoom';
import { useHeroSelect } from '../hooks/useHeroSelect';
import HeroGrid from '../components/hero-select/HeroGrid';
import SelectionStatus from '../components/hero-select/SelectionStatus';
import LoadingSpinner from '../components/common/LoadingSpinner';

const HeroSelectPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const websocket = useWebSocketContext();
  const room = useRoom(websocket);
  const heroSelect = useHeroSelect(websocket);

  // Navigate to game when game_started arrives
  useEffect(() => {
    const unsub = websocket.onMessage((msg: ServerMessage) => {
      if (msg.type === 'game_started') {
        navigate(`/game/${roomId}`);
      }
      if (msg.type === 'room_left') {
        navigate('/');
      }
    });
    return unsub;
  }, [websocket, navigate, roomId]);

  // Build the set of already-taken hero IDs (from other players' selections)
  const takenHeroIds = new Set<number>();
  const myUid = room.myUid;
  heroSelect.selectedHeroes.forEach((sel, uid) => {
    if (uid !== myUid) {
      takenHeroIds.add(sel.heroId);
    }
  });

  // Build player selection status list (look up hero name from availableHeroes)
  const heroNameMap = new Map(heroSelect.availableHeroes.map(h => [h.avatar, h.name]));
  const playerSelections = (room.currentRoom?.players || []).map(p => {
    const sel = heroSelect.selectedHeroes.get(p.uid);
    return {
      uid: p.uid,
      name: p.name,
      heroName: sel ? heroNameMap.get(sel.heroId) || null : null,
    };
  });

  if (!room.currentRoom) {
    return (
      <div className="hero-select-page">
        <LoadingSpinner size="large" text="加载中..." />
      </div>
    );
  }

  return (
    <div className="hero-select-page">
      <div className="hero-select-header">
        <h2>选择角色</h2>
        <div className="hero-select-room-id">房间: {roomId}</div>
      </div>

      <div className="hero-select-content">
        <div className="hero-select-main">
          {heroSelect.availableHeroes.length > 0 ? (
            <HeroGrid
              heroes={heroSelect.availableHeroes}
              selectedHeroIds={takenHeroIds}
              mySelection={heroSelect.mySelection}
              onSelect={heroSelect.selectHero}
            />
          ) : (
            <LoadingSpinner text="等待可用角色..." />
          )}
        </div>

        <div className="hero-select-sidebar">
          <SelectionStatus players={playerSelections} />
        </div>
      </div>
    </div>
  );
};

export default HeroSelectPage;
