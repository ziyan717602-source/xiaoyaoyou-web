import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ServerMessage, HeroInfo } from '@shared/network';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { useGameState } from '../hooks/useGameState';
import { useRoom } from '../hooks/useRoom';
import { useBattleAnimations } from '../hooks/useBattleAnimations';
import { gMessageToLogText, type LogContext } from '../utils/g-message-log';
import HandArea from '../components/game/HandArea';
import BattleArea from '../components/game/BattleArea';
import InputController from '../components/game/InputController';
import HeroSelectDialog from '../components/game/HeroSelectDialog';
import EquipmentPanel from '../components/game/EquipmentPanel';
import SkillPanel from '../components/game/SkillPanel';
import DiscardPilePanel from '../components/game/DiscardPilePanel';
import EventLog, { type LogEntry } from '../components/game/EventLog';
import ErrorToast from '../components/common/ErrorToast';
import { parseFormat } from '../utils/format-parser';

/** Phase code → human-readable Chinese name */
const PHASE_NAMES: Record<string, string> = {
  '00': '回合开始',
  OC: '回合开始',
  ST: '阶段开始',
  EP: '事件准备',
  EV: '事件阶段',
  EE: '事件执行',
  GS: '礼开始',
  GR: '礼接收',
  GE: '礼结束',
  SK: '技牌阶段',
  Z0: '战斗准备',
  ZW: '选择支援/阻碍',
  ZU: '支援/阻碍更新',
  ZM: '翻怪阶段',
  NP: 'NPC遭遇',
  Z1: '怪物沉默',
  Z8: '战前准备',
  CC: '怪物登场',
  PD: '宠物登场',
  ZC: '玩家池',
  ZD: '出牌阶段',
  ZN: '战斗结算',
  VS: '胜败效果',
  ZF: '战斗清理',
  ZE: '怪物击败',
  ZZ: '战斗后',
  BC: '补牌阶段',
  QR: '手牌限制',
  TM: '回合结束',
  IC: '间歇关闭',
  ED: '回合清理',
};

const GamePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const websocket = useWebSocketContext();
  const { gameState, gameResult, inputRequest, clearInputRequest, error, clearError } = useGameState(websocket);
  const room = useRoom(websocket);

  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<number[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`game-log-${roomId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [heroSelectRequest, setHeroSelectRequest] = useState<{ uid: number; availableHeroes: HeroInfo[] } | null>(null);
  const playerUid = room.myUid ?? 0;
  const battleAnimations = useBattleAnimations();

  // Extract target player UIDs from input request format string
  // Uses parseFormat to correctly handle T/J segments with pT prefix
  const targetUids = React.useMemo(() => {
    if (!inputRequest || inputRequest.uid !== playerUid) return [];
    const parsed = parseFormat(inputRequest.format);
    for (const seg of parsed.segments) {
      if (seg.type === 'T' || seg.type === 'J') {
        // T segments: options are plain UIDs like "1","2"
        // J segments: options are "T1","T2" — extract the number
        return seg.options.map(o => {
          const match = o.value.match(/T?(\d+)/);
          return match ? parseInt(match[1], 10) : NaN;
        }).filter(n => !isNaN(n));
      }
    }
    return [];
  }, [inputRequest, playerUid]);

  // Request current game state on mount (for page refresh / navigation)
  useEffect(() => {
    if (websocket.state.isConnected && playerUid > 0 && roomId && room.playerName) {
      websocket.send({
        type: 'get_state',
        payload: { requestUid: playerUid, roomId, playerName: room.playerName! },
      });
    }
  }, [websocket.state.isConnected, playerUid, roomId, room.playerName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle hero selection from game state response (for page refresh / navigation)
  useEffect(() => {
    if (gameState?.heroSelectRequest && gameState.heroSelectRequest.uid === playerUid) {
      setHeroSelectRequest(gameState.heroSelectRequest);
    }
  }, [gameState?.heroSelectRequest, playerUid]);

  // Log counter
  const logIdRef = React.useRef(0);

  // Track previous phase for phase change detection
  const prevPhaseRef = React.useRef<string | null>(null);

  // Add log entry helper
  const addLog = useCallback((text: string, type: LogEntry['type'] = 'info') => {
    logIdRef.current += 1;
    setLogEntries(prev => [...prev, {
      id: logIdRef.current,
      timestamp: Date.now(),
      text,
      type,
    }]);
  }, []);

  // Persist logs to localStorage
  useEffect(() => {
    if (roomId && logEntries.length > 0) {
      try {
        localStorage.setItem(`game-log-${roomId}`, JSON.stringify(logEntries));
      } catch { /* storage full, ignore */ }
    }
  }, [logEntries, roomId]);

  // Export logs as text file
  const handleExportLog = useCallback(() => {
    const lines = logEntries.map(e => {
      const d = new Date(e.timestamp);
      const ts = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
      return `[${ts}] [${(e.type || 'info').toUpperCase()}] ${e.text}`;
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-log-${roomId || 'unknown'}-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logEntries, roomId]);

  // Listen for game events and log them
  useEffect(() => {
    const unsub = websocket.onMessage((msg: ServerMessage) => {
      switch (msg.type) {
        case 'game_state':
          // Log phase changes with separator
          const newPhase = msg.payload.state.phase;
          if (prevPhaseRef.current !== null && prevPhaseRef.current !== newPhase) {
            const phaseName = PHASE_NAMES[newPhase] ?? newPhase;
            addLog(`── ${phaseName} ──`, 'system');
          }
          prevPhaseRef.current = newPhase;
          break;
        case 'input_request':
          addLog(`操作请求: ${msg.payload.code}`, 'action');
          break;
        case 'hero_select_request':
          if (msg.payload.uid === playerUid) {
            setHeroSelectRequest(msg.payload);
            addLog('请选择英雄', 'system');
          }
          break;
        case 'hero_select_response':
          if (msg.payload.success) {
            addLog(`玩家 ${msg.payload.uid} 选择了英雄`, 'info');
          }
          // Only clear dialog for the player who made the selection
          if (msg.payload.uid === playerUid) {
            setHeroSelectRequest(null);
          }
          break;
        case 'game_over':
          addLog('游戏结束!', 'system');
          break;
        case 'game_error':
          addLog(`游戏异常: ${msg.payload.message}`, 'error');
          break;
        case 'game_started':
          // Send ready message to server
          websocket.send({ type: 'player_ready' });
          addLog('游戏已开始，发送准备确认', 'system');
          break;
        case 'g_message':
          // Process G-Loop messages for battle animations
          battleAnimations.processGMessage(msg.payload.msg);
          // Generate human-readable log from G-message
          if (gameState) {
            const logCtx: LogContext = {
              players: gameState.players,
              lookup: gameState.nameLookup,
            };
            const logText = gMessageToLogText(msg.payload.msg, logCtx);
            if (logText) {
              addLog(logText, 'action');
            }
          }
          break;
        case 'error':
          addLog(`错误: ${msg.payload.message}`, 'error');
          break;
        case 'player_joined':
          addLog(`${msg.payload.playerName} 加入了游戏`, 'info');
          break;
        case 'player_left':
          addLog(`${msg.payload.playerName} 离开了游戏`, 'info');
          break;
      }
    });
    return unsub;
  }, [websocket, addLog, playerUid, gameState]);

  // Navigate to game over when result received
  useEffect(() => {
    if (gameResult) {
      navigate(`/game-over/${roomId}`, { state: { result: gameResult } });
    }
  }, [gameResult, navigate, roomId]);

  const handleCardSelect = useCallback((cardCode: string) => {
    setSelectedCards(prev =>
      prev.includes(cardCode)
        ? prev.filter(c => c !== cardCode)
        : [...prev, cardCode]
    );
  }, []);

  const handleTargetSelect = useCallback((uid: number) => {
    setSelectedTargets(prev =>
      prev.includes(uid)
        ? prev.filter(u => u !== uid)
        : [...prev, uid]
    );
  }, []);

  const handleOperationSubmit = useCallback((input: string) => {
    websocket.send({
      type: 'player_input',
      payload: { input },
    });
    clearInputRequest();
    setSelectedCards([]);
    setSelectedTargets([]);
    addLog(`提交操作: ${input}`, 'action');
  }, [websocket, clearInputRequest, addLog]);

  const handleOperationCancel = useCallback(() => {
    clearInputRequest();
    setSelectedCards([]);
    setSelectedTargets([]);
  }, [clearInputRequest]);

  const handleHeroSelect = useCallback((heroId: number) => {
    websocket.send({
      type: 'hero_select',
      payload: { heroId },
    });
    setHeroSelectRequest(null);
    addLog(`选择了英雄 #${heroId}`, 'action');
  }, [websocket, addLog]);

  // Current player info
  const currentPlayer = gameState?.players.find(p => p.uid === playerUid) || gameState?.players[0];
  const currentHand = currentPlayer?.hand || [];

  // Only show operation panel if the input request targets this player
  const myInputRequest = inputRequest && inputRequest.uid === playerUid ? inputRequest : null;

  return (
    <div className="game-page">
      {/* Top: Battle Area */}
      <div className="game-top">
        {gameState ? (
          <BattleArea
            players={gameState.players}
            currentTurnUid={gameState.currentTurn}
            currentPlayerUid={playerUid}
            phase={gameState.phase}
            board={gameState.board}
            targetUids={targetUids}
            selectedTargets={selectedTargets}
            onTargetSelect={handleTargetSelect}
            onRegisterAnimation={battleAnimations.registerPlayer}
          />
        ) : (
          <div className="game-loading">
            <div className="loading-spinner" />
            <span>等待游戏数据...</span>
          </div>
        )}
      </div>

      {/* Right: Event Log */}
      <div className="game-right">
        {currentPlayer && (
          <EquipmentPanel
            weapon={currentPlayer.weapon}
            armor={currentPlayer.armor}
            trove={currentPlayer.trove}
            exEquip={currentPlayer.exEquip}
            compact
          />
        )}
        {currentPlayer && (
          <SkillPanel
            skills={currentPlayer.skills || []}
            blesses={currentPlayer.blesses || []}
            nameLookup={gameState?.nameLookup?.skills}
            onSkillClick={(code) => {
              websocket.send({
                type: 'player_input',
                payload: { input: code },
              });
            }}
            enabled={!myInputRequest}
          />
        )}
        {gameState && (
          <DiscardPilePanel
            tuxDises={gameState.board.tuxDises || []}
            monDises={gameState.board.monDises || []}
            eveDises={gameState.board.eveDises || []}
          />
        )}
        <EventLog entries={logEntries} onExport={handleExportLog} />
      </div>

      {/* Center: Input Controller */}
      <div className="game-center">
        {myInputRequest && gameState && (
          <InputController
            inputRequest={myInputRequest}
            selectedCards={selectedCards}
            selectedTargets={selectedTargets}
            onCardSelect={handleCardSelect}
            onTargetSelect={handleTargetSelect}
            onSubmit={handleOperationSubmit}
            onCancel={handleOperationCancel}
            players={gameState.players}
            nameLookup={gameState.nameLookup as Record<string, string> | undefined}
            hand={currentHand}
            timeout={30}
          />
        )}
      </div>

      {/* Bottom: Hand Area */}
      <div className="game-bottom">
        <HandArea
          cards={currentHand}
          selectedCards={selectedCards}
          onCardSelect={handleCardSelect}
          disabled={!inputRequest}
        />
      </div>

      {/* Room ID badge */}
      <div className="game-room-badge">
        房间: {roomId}
      </div>

      {error && (
        <ErrorToast message={error} onDismiss={clearError} />
      )}

      {heroSelectRequest && (
        <HeroSelectDialog
          availableHeroes={heroSelectRequest.availableHeroes}
          onSelect={handleHeroSelect}
        />
      )}
    </div>
  );
};

export default GamePage;
