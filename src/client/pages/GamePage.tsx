import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ServerMessage } from '@shared/network';
import { useWebSocket } from '../hooks/useWebSocket';
import { useGameState } from '../hooks/useGameState';
import { useRoom } from '../hooks/useRoom';
import HandArea from '../components/game/HandArea';
import BattleArea from '../components/game/BattleArea';
import OperationPanel from '../components/game/OperationPanel';
import EventLog, { type LogEntry } from '../components/game/EventLog';
import ErrorToast from '../components/common/ErrorToast';

const GamePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const websocket = useWebSocket();
  const { gameState, gameResult, inputRequest, clearInputRequest, error, clearError } = useGameState(websocket);
  const room = useRoom(websocket);

  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const playerUid = room.myUid ?? 0;

  // Log counter
  const logIdRef = React.useRef(0);

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

  // Listen for game events and log them
  useEffect(() => {
    const unsub = websocket.onMessage((msg: ServerMessage) => {
      switch (msg.type) {
        case 'game_state':
          addLog('游戏状态已更新', 'system');
          break;
        case 'input_request':
          addLog(`操作请求: ${msg.payload.code}`, 'action');
          break;
        case 'game_over':
          addLog('游戏结束!', 'system');
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
  }, [websocket, addLog]);

  // Navigate to game over when result received
  useEffect(() => {
    if (gameResult) {
      navigate(`/game-over/${roomId}`);
    }
  }, [gameResult, navigate, roomId]);

  const handleCardSelect = useCallback((cardCode: string) => {
    setSelectedCards(prev =>
      prev.includes(cardCode)
        ? prev.filter(c => c !== cardCode)
        : [...prev, cardCode]
    );
  }, []);

  const handleOperationSubmit = useCallback((input: string) => {
    websocket.send({
      type: 'player_input',
      payload: { input },
    });
    clearInputRequest();
    setSelectedCards([]);
    addLog(`提交操作: ${input}`, 'action');
  }, [websocket, clearInputRequest, addLog]);

  const handleOperationCancel = useCallback(() => {
    clearInputRequest();
    setSelectedCards([]);
  }, [clearInputRequest]);

  // Current player info
  const currentPlayer = gameState?.players.find(p => p.uid === playerUid) || gameState?.players[0];
  const currentHand = currentPlayer?.hand || [];

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
        <EventLog entries={logEntries} />
      </div>

      {/* Center: Operation Panel */}
      <div className="game-center">
        {inputRequest && (
          <OperationPanel
            format={inputRequest.format}
            code={inputRequest.code}
            arg={inputRequest.arg}
            onSubmit={handleOperationSubmit}
            onCancel={onCancelAvailable(inputRequest) ? handleOperationCancel : undefined}
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
    </div>
  );
};

/** Check if the input request supports cancellation */
function onCancelAvailable(req: { format: string; code: string; arg: string }): boolean {
  // Some operations are mandatory (no cancel)
  const mandatoryOps = ['G0OH', 'G0MH', 'G0EHC'];
  return !mandatoryOps.some(op => req.code.startsWith(op));
}

export default GamePage;
