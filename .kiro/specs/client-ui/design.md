# Design: client-ui

## 概述

本设计实现 React 前端 UI，支持 PC 和移动端浏览器联机对战。采用组件化架构：页面层管理路由和页面布局，组件层实现大厅和游戏 UI，Hooks 层封装 WebSocket 连接和状态管理。设计遵循响应式原则，通过 CSS 媒体查询和 Flexbox/Grid 布局适配不同屏幕尺寸。WebSocket 客户端通过共享协议类型与 network-server 通信，确保消息格式一致。

## 边界承诺

**本模块拥有**:
- src/client/App.tsx — 主应用入口（路由、全局状态）
- src/client/pages/ — 页面组件
  - src/client/pages/LobbyPage.tsx — 大厅页面
  - src/client/pages/RoomPage.tsx — 房间等待页面
  - src/client/pages/GamePage.tsx — 游戏页面
  - src/client/pages/GameOverPage.tsx — 游戏结束页面
- src/client/components/lobby/ — 大厅 UI 组件
  - src/client/components/lobby/RoomList.tsx — 房间列表
  - src/client/components/lobby/CreateRoomDialog.tsx — 创建房间对话框
  - src/client/components/lobby/JoinRoomDialog.tsx — 加入房间对话框
- src/client/components/game/ — 游戏 UI 组件
  - src/client/components/game/HandArea.tsx — 手牌区
  - src/client/components/game/BattleArea.tsx — 战场区
  - src/client/components/game/OperationPanel.tsx — 操作面板
  - src/client/components/game/PlayerInfo.tsx — 玩家信息
  - src/client/components/game/GameOverResult.tsx — 游戏结果
- src/client/components/common/ — 通用 UI 组件
  - src/client/components/common/CardImage.tsx — 卡牌图片组件
  - src/client/components/common/ErrorToast.tsx — 错误提示组件
  - src/client/components/common/LoadingSpinner.tsx — 加载指示器
- src/client/hooks/ — React Hooks
  - src/client/hooks/useWebSocket.ts — WebSocket 连接管理
  - src/client/hooks/useGameState.ts — 游戏状态管理
  - src/client/hooks/useRoom.ts — 房间操作管理
- src/client/styles/ — 样式文件
  - src/client/styles/global.css — 全局样式
  - src/client/styles/responsive.css — 响应式样式
  - src/client/styles/game.css — 游戏页面样式
- src/client/__tests__/ — 测试文件
  - src/client/__tests__/App.test.tsx — 应用基础测试
  - src/client/__tests__/hooks.test.ts — Hooks 测试
  - src/client/__tests__/components.test.tsx — 组件测试

**本模块不拥有**:
- 游戏逻辑（属于 game-flow 模块）
- 网络通信协议（属于 network-server 模块）
- 核心数据模型（属于 core-models 模块）

**依赖关系**:
- 上游依赖: network-server（WebSocket 连接、消息协议）、game-flow（游戏状态定义）
- 下游依赖: 无（最终产出）

**可能导致下游重新验证的变更**:
- 修改消息协议格式（消息类型、字段结构）
- 修改游戏状态广播格式
- 修改 WebSocket 连接参数

## 架构决策

### 1. 组件化架构策略

**决策**: 使用 React 函数组件 + Hooks 模式，采用分层架构（Pages → Components → Hooks）。

**理由**:
- 函数组件 + Hooks 是 React 18 的推荐模式，性能更好
- 分层架构分离关注点：Pages 管理路由，Components 处理 UI，Hooks 封装逻辑
- 便于测试：Hooks 可独立测试，Components 可独立渲染测试
- 与项目技术栈一致（React 18 + TypeScript）

### 2. 状态管理策略

**决策**: 使用 React 内置状态管理（useState + useReducer + Context），不引入外部状态库。

**理由**:
- 游戏状态相对简单（房间状态、游戏状态、操作状态），无需 Redux 等重型方案
- Context API 足够处理全局状态（WebSocket 连接、当前玩家信息）
- 减少外部依赖，降低项目复杂度
- 便于调试：状态变更集中在组件内

### 3. WebSocket 集成策略

**决策**: 使用自定义 Hook（useWebSocket）封装 WebSocket 连接，通过回调机制与组件交互。

**理由**:
- Hook 封装连接生命周期（连接、重连、心跳），组件无需关心底层细节
- 回调机制允许组件响应服务端消息（状态更新、输入请求、错误）
- 与 React 的单向数据流一致：Hook 接收消息 → 更新状态 → 组件重新渲染
- 便于测试：可 mock WebSocket 连接

### 4. 响应式布局策略

**决策**: 使用 CSS 媒体查询 + Flexbox/Grid 实现响应式布局，PC 和移动端共享组件。

**理由**:
- CSS 媒体查询是 Web 标准，无需额外库
- Flexbox/Grid 提供灵活的布局能力，适配不同屏幕尺寸
- 共享组件减少代码重复，通过 props 控制布局差异
- 便于维护：样式与逻辑分离

### 5. 卡牌图片显示策略

**决策**: 使用 React 组件（CardImage）封装卡牌图片加载和错误处理。

**理由**:
- 统一管理图片加载状态（loading、error、success）
- 错误时显示占位符，提升用户体验
- 支持缩略图和大图模式，适配不同场景
- 便于复用：手牌区、战场区、操作面板都使用同一组件

## 组件设计

### 1. 主应用 (src/client/App.tsx)

```typescript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WebSocketProvider } from './hooks/useWebSocket';
import { GameStateProvider } from './hooks/useGameState';
import LobbyPage from './pages/LobbyPage';
import RoomPage from './pages/RoomPage';
import GamePage from './pages/GamePage';
import GameOverPage from './pages/GameOverPage';

const App: React.FC = () => {
  return (
    <WebSocketProvider>
      <GameStateProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LobbyPage />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
            <Route path="/game/:roomId" element={<GamePage />} />
            <Route path="/game-over/:roomId" element={<GameOverPage />} />
          </Routes>
        </BrowserRouter>
      </GameStateProvider>
    </WebSocketProvider>
  );
};

export default App;
```

### 2. WebSocket Hook (src/client/hooks/useWebSocket.ts)

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { ClientMessage, ServerMessage, parseMessage } from '../../shared/network/protocol';

export interface WebSocketState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
}

export interface UseWebSocketReturn {
  state: WebSocketState;
  send: (message: ClientMessage) => void;
  onMessage: (handler: (message: ServerMessage) => void) => () => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, (message: ServerMessage) => void>>(new Map());
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isReconnecting: false,
    reconnectAttempts: 0,
  });

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        isReconnecting: false,
        reconnectAttempts: 0,
      }));
    };

    ws.onmessage = (event) => {
      const message = parseMessage(event.data);
      if (message) {
        handlersRef.current.forEach(handler => handler(message));
      }
    };

    ws.onclose = () => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isReconnecting: true,
        reconnectAttempts: prev.reconnectAttempts + 1,
      }));

      // 自动重连（指数退避）
      setTimeout(() => {
        connect();
      }, Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000));
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };
  }, [url, state.reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState({
      isConnected: false,
      isReconnecting: false,
      reconnectAttempts: 0,
    });
  }, []);

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const onMessage = useCallback((handler: (message: ServerMessage) => void) => {
    const id = Math.random().toString(36).substring(2, 9);
    handlersRef.current.set(id, handler);
    return () => {
      handlersRef.current.delete(id);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { state, send, onMessage, connect, disconnect };
}
```

### 3. 游戏状态 Hook (src/client/hooks/useGameState.ts)

```typescript
import { useCallback, useEffect, useState } from 'react';
import { GameState, PlayerState, GameResult } from '../../shared/network/protocol';
import { UseWebSocketReturn } from './useWebSocket';

export interface GameStateManager {
  gameState: GameState | null;
  gameResult: GameResult | null;
  inputRequest: { format: string; code: string; arg: string } | null;
  clearInputRequest: () => void;
}

export function useGameState(websocket: UseWebSocketReturn): GameStateManager {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [inputRequest, setInputRequest] = useState<{ format: string; code: string; arg: string } | null>(null);

  useEffect(() => {
    const unsubscribe = websocket.onMessage((message) => {
      switch (message.type) {
        case 'game_state':
          setGameState(message.payload.state);
          break;
        case 'input_request':
          setInputRequest(message.payload);
          break;
        case 'game_over':
          setGameResult(message.payload.result);
          break;
        case 'error':
          console.error('[Game] Server error:', message.payload);
          break;
      }
    });

    return unsubscribe;
  }, [websocket]);

  const clearInputRequest = useCallback(() => {
    setInputRequest(null);
  }, []);

  return { gameState, gameResult, inputRequest, clearInputRequest };
}
```

### 4. 房间操作 Hook (src/client/hooks/useRoom.ts)

```typescript
import { useCallback, useEffect, useState } from 'react';
import { RoomInfo, PlayerInfo } from '../../shared/network/protocol';
import { UseWebSocketReturn } from './useWebSocket';

export interface RoomManager {
  rooms: RoomInfo[];
  currentRoom: { roomId: string; players: PlayerInfo[] } | null;
  createRoom: (playerCount: number, packages: number[]) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  refreshRooms: () => void;
}

export function useRoom(websocket: UseWebSocketReturn): RoomManager {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<{ roomId: string; players: PlayerInfo[] } | null>(null);

  useEffect(() => {
    const unsubscribe = websocket.onMessage((message) => {
      switch (message.type) {
        case 'room_list':
          setRooms(message.payload.rooms);
          break;
        case 'room_created':
          // 房间创建成功，等待加入
          break;
        case 'room_joined':
          setCurrentRoom({
            roomId: message.payload.roomId,
            players: message.payload.players,
          });
          break;
        case 'room_left':
          setCurrentRoom(null);
          break;
        case 'player_joined':
        case 'player_left':
          if (currentRoom) {
            setCurrentRoom(prev => prev ? {
              ...prev,
              players: message.payload.players,
            } : null);
          }
          break;
      }
    });

    return unsubscribe;
  }, [websocket, currentRoom]);

  const createRoom = useCallback((playerCount: number, packages: number[]) => {
    websocket.send({
      type: 'create_room',
      payload: { playerCount, packages },
    });
  }, [websocket]);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    websocket.send({
      type: 'join_room',
      payload: { roomId, playerName },
    });
  }, [websocket]);

  const leaveRoom = useCallback(() => {
    websocket.send({ type: 'leave_room' });
    setCurrentRoom(null);
  }, [websocket]);

  const startGame = useCallback(() => {
    websocket.send({ type: 'start_game' });
  }, [websocket]);

  const refreshRooms = useCallback(() => {
    websocket.send({ type: 'list_rooms' });
  }, [websocket]);

  return {
    rooms,
    currentRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    refreshRooms,
  };
}
```

### 5. 卡牌图片组件 (src/client/components/common/CardImage.tsx)

```typescript
import React, { useState } from 'react';

interface CardImageProps {
  cardCode: string;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}

const CardImage: React.FC<CardImageProps> = ({
  cardCode,
  size = 'medium',
  onClick,
  selected = false,
  disabled = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeMap = {
    small: { width: 60, height: 84 },
    medium: { width: 100, height: 140 },
    large: { width: 150, height: 210 },
  };

  const { width, height } = sizeMap[size];
  const imageUrl = `/assets/cards/${cardCode}.png`;

  if (imageError) {
    return (
      <div
        className={`card-placeholder ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
        style={{ width, height }}
        onClick={disabled ? undefined : onClick}
      >
        <span>{cardCode}</span>
      </div>
    );
  }

  return (
    <div
      className={`card-image-container ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      style={{ width, height }}
      onClick={disabled ? undefined : onClick}
    >
      {isLoading && <div className="card-loading" />}
      <img
        src={imageUrl}
        alt={cardCode}
        width={width}
        height={height}
        onLoad={() => setIsLoading(false)}
        onError={() => setImageError(true)}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </div>
  );
};

export default CardImage;
```

### 6. 手牌区组件 (src/client/components/game/HandArea.tsx)

```typescript
import React from 'react';
import CardImage from '../common/CardImage';

interface HandAreaProps {
  cards: string[];
  selectedCards: string[];
  onCardSelect: (cardCode: string) => void;
  disabled?: boolean;
}

const HandArea: React.FC<HandAreaProps> = ({
  cards,
  selectedCards,
  onCardSelect,
  disabled = false,
}) => {
  return (
    <div className="hand-area">
      <div className="hand-area-header">
        <span>手牌 ({cards.length})</span>
      </div>
      <div className="hand-area-cards">
        {cards.map((cardCode, index) => (
          <CardImage
            key={`${cardCode}-${index}`}
            cardCode={cardCode}
            size="medium"
            selected={selectedCards.includes(cardCode)}
            disabled={disabled}
            onClick={() => onCardSelect(cardCode)}
          />
        ))}
      </div>
    </div>
  );
};

export default HandArea;
```

### 7. 战场区组件 (src/client/components/game/BattleArea.tsx)

```typescript
import React from 'react';
import { PlayerState } from '../../../shared/network/protocol';
import PlayerInfo from './PlayerInfo';

interface BattleAreaProps {
  players: PlayerState[];
  currentTurn: number;
  phase: string;
  board: {
    tuxPileCount: number;
    monPileCount: number;
    evePileCount: number;
  };
}

const BattleArea: React.FC<BattleAreaProps> = ({
  players,
  currentTurn,
  phase,
  board,
}) => {
  return (
    <div className="battle-area">
      <div className="battle-area-header">
        <span>回合: {currentTurn}</span>
        <span>阶段: {phase}</span>
      </div>
      <div className="battle-area-board">
        <div className="pile-info">
          <span>手牌堆: {board.tuxPileCount}</span>
          <span>怪物堆: {board.monPileCount}</span>
          <span>事件堆: {board.evePileCount}</span>
        </div>
      </div>
      <div className="battle-area-players">
        {players.map((player) => (
          <PlayerInfo
            key={player.uid}
            player={player}
            isCurrentTurn={player.uid === currentTurn}
          />
        ))}
      </div>
    </div>
  );
};

export default BattleArea;
```

### 8. 操作面板组件 (src/client/components/game/OperationPanel.tsx)

```typescript
import React, { useState, useCallback } from 'react';

interface OperationPanelProps {
  format: string;
  code: string;
  arg: string;
  onSubmit: (input: string) => void;
  onCancel?: () => void;
  timeout?: number;
}

const OperationPanel: React.FC<OperationPanelProps> = ({
  format,
  code,
  arg,
  onSubmit,
  onCancel,
  timeout = 30,
}) => {
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(timeout);

  // 解析 format 字符串，提取可选项
  const parseOptions = useCallback((format: string): string[] => {
    const match = format.match(/\(([^)]+)\)/);
    if (match) {
      return match[1].split('p');
    }
    return [];
  }, []);

  const options = parseOptions(format);

  const handleSubmit = () => {
    if (selectedValue) {
      onSubmit(selectedValue);
    }
  };

  return (
    <div className="operation-panel">
      <div className="operation-panel-header">
        <span>请选择操作</span>
        <span className="timeout">剩余时间: {timeLeft}s</span>
      </div>
      <div className="operation-panel-options">
        {options.map((option) => (
          <button
            key={option}
            className={`operation-option ${selectedValue === option ? 'selected' : ''}`}
            onClick={() => setSelectedValue(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="operation-panel-actions">
        <button
          className="operation-submit"
          disabled={!selectedValue}
          onClick={handleSubmit}
        >
          确认
        </button>
        {onCancel && (
          <button className="operation-cancel" onClick={onCancel}>
            取消
          </button>
        )}
      </div>
    </div>
  );
};

export default OperationPanel;
```

### 9. 玩家信息组件 (src/client/components/game/PlayerInfo.tsx)

```typescript
import React from 'react';
import { PlayerState } from '../../../shared/network/protocol';

interface PlayerInfoProps {
  player: PlayerState;
  isCurrentTurn: boolean;
  isCurrentPlayer?: boolean;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({
  player,
  isCurrentTurn,
  isCurrentPlayer = false,
}) => {
  return (
    <div className={`player-info ${isCurrentTurn ? 'current-turn' : ''} ${isCurrentPlayer ? 'current-player' : ''}`}>
      <div className="player-info-header">
        <span className="player-name">{player.name}</span>
        <span className="player-team">阵营 {player.team}</span>
      </div>
      <div className="player-info-stats">
        <span className="player-hp">HP: {player.hp}</span>
        <span className="player-hand">手牌: {player.hand.length}</span>
      </div>
    </div>
  );
};

export default PlayerInfo;
```

### 10. 大厅页面 (src/client/pages/LobbyPage.tsx)

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useRoom } from '../hooks/useRoom';
import RoomList from '../components/lobby/RoomList';
import CreateRoomDialog from '../components/lobby/CreateRoomDialog';
import JoinRoomDialog from '../components/lobby/JoinRoomDialog';

const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const websocket = useWebSocket('ws://localhost:3000');
  const room = useRoom(websocket);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  const handleRoomCreated = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  const handleRoomJoined = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <h1>仙剑逍遥游</h1>
        <div className="lobby-actions">
          <button onClick={() => setShowCreateDialog(true)}>创建房间</button>
          <button onClick={() => setShowJoinDialog(true)}>加入房间</button>
          <button onClick={room.refreshRooms}>刷新列表</button>
        </div>
      </div>
      <div className="lobby-content">
        <RoomList rooms={room.rooms} onJoinRoom={handleRoomJoined} />
      </div>
      {showCreateDialog && (
        <CreateRoomDialog
          onCreate={room.createRoom}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
      {showJoinDialog && (
        <JoinRoomDialog
          onJoin={room.joinRoom}
          onClose={() => setShowJoinDialog(false)}
        />
      )}
    </div>
  );
};

export default LobbyPage;
```

## 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Client                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Pages (LobbyPage, RoomPage, GamePage, GameOverPage)     │   │
│  │  ├── 管理页面路由和布局                                   │   │
│  │  ├── 调用 Hooks 获取状态和操作方法                        │   │
│  │  └── 渲染 Components                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Components (RoomList, HandArea, BattleArea, etc.)       │   │
│  │  ├── 接收 Props 渲染 UI                                  │   │
│  │  ├── 处理用户交互（点击、输入）                           │   │
│  │  └── 调用 Hooks 回调更新状态                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Hooks (useWebSocket, useGameState, useRoom)             │   │
│  │  ├── 管理 WebSocket 连接和消息                           │   │
│  │  ├── 维护游戏状态和房间状态                              │   │
│  │  └── 提供操作方法（send, createRoom, joinRoom）          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  WebSocket 连接                                          │   │
│  │  ├── 发送: create_room, join_room, player_input, etc.    │   │
│  │  └── 接收: room_list, game_state, input_request, etc.    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │ JSON 消息
┌───────────────────────────┴─────────────────────────────────────┐
│                     network-server                               │
│  ├── ConnectionManager (WebSocket 连接管理)                     │
│  ├── RoomManager (房间管理)                                      │
│  └── GameSession (游戏会话托管)                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 文件结构计划

```
src/client/
├── App.tsx                     # 主应用入口（路由、全局状态）
├── main.tsx                    # React 应用挂载
├── pages/                      # 页面组件
│   ├── LobbyPage.tsx           # 大厅页面（房间列表、创建/加入）
│   ├── RoomPage.tsx            # 房间等待页面（玩家列表、开始游戏）
│   ├── GamePage.tsx            # 游戏页面（手牌区、战场区、操作面板）
│   └── GameOverPage.tsx        # 游戏结束页面（结果、排名）
├── components/                 # UI 组件
│   ├── lobby/                  # 大厅组件
│   │   ├── RoomList.tsx        # 房间列表
│   │   ├── CreateRoomDialog.tsx # 创建房间对话框
│   │   └── JoinRoomDialog.tsx  # 加入房间对话框
│   ├── game/                   # 游戏组件
│   │   ├── HandArea.tsx        # 手牌区
│   │   ├── BattleArea.tsx      # 战场区
│   │   ├── OperationPanel.tsx  # 操作面板
│   │   ├── PlayerInfo.tsx      # 玩家信息
│   │   └── GameOverResult.tsx  # 游戏结果
│   └── common/                 # 通用组件
│       ├── CardImage.tsx       # 卡牌图片组件
│       ├── ErrorToast.tsx      # 错误提示组件
│       └── LoadingSpinner.tsx  # 加载指示器
├── hooks/                      # React Hooks
│   ├── useWebSocket.ts         # WebSocket 连接管理
│   ├── useGameState.ts         # 游戏状态管理
│   └── useRoom.ts              # 房间操作管理
├── styles/                     # 样式文件
│   ├── global.css              # 全局样式
│   ├── responsive.css          # 响应式样式
│   └── game.css                # 游戏页面样式
└── __tests__/                  # 测试文件
    ├── App.test.tsx            # 应用基础测试
    ├── hooks.test.ts           # Hooks 测试
    └── components.test.tsx     # 组件测试
```

## 测试策略

### 1. 单元测试

- Hooks 测试：验证 useWebSocket 连接管理、useGameState 状态更新、useRoom 操作方法
- 组件测试：验证 CardImage 图片加载、HandArea 手牌渲染、PlayerInfo 信息显示
- 工具函数测试：验证消息解析、格式解析、超时处理

### 2. 集成测试

- 页面集成：验证 LobbyPage → RoomPage → GamePage 的路由跳转
- WebSocket 集成：验证消息收发和状态同步
- 操作流程：验证创建房间 → 加入房间 → 开始游戏的完整流程

### 3. E2E 测试

- 完整游戏流程：创建房间 → 加入房间 → 游戏开始 → 操作 → 游戏结束
- 多客户端：验证多个浏览器标签同时连接和交互
- 响应式：验证 PC 和移动端布局切换

### 4. 测试覆盖

- 组件渲染：所有组件的渲染测试
- 用户交互：点击、输入、提交等操作测试
- 状态管理：状态更新和同步测试
- 错误处理：网络异常、操作失败等场景测试
