# Design: network-server

## 概述

本设计实现 WebSocket 服务器，支持多客户端连接、房间管理和游戏会话托管。采用分层架构：连接管理层处理 WebSocket 连接生命周期，房间管理层管理房间的创建/加入/销毁，游戏会话层托管 Game 实例并协调玩家操作。消息协议定义客户端与服务端的通信契约，断线处理机制保障联机体验的健壮性。

## 边界承诺

**本模块拥有**:
- src/server/index.ts — 服务器入口（WebSocket 服务器启动、连接监听）
- src/server/connection.ts — 连接管理（连接生命周期、消息收发、心跳检测）
- src/server/room.ts — 房间管理（创建/加入/列表/离开/销毁、房间状态）
- src/server/game-session.ts — 游戏会话（Game 实例托管、输入注入、状态广播）
- src/shared/network/protocol.ts — 消息协议（类型定义、序列化/反序列化）
- src/server/__tests__/ — 服务器测试
  - src/server/__tests__/connection.test.ts — 连接管理测试
  - src/server/__tests__/room.test.ts — 房间管理测试
  - src/server/__tests__/game-session.test.ts — 游戏会话测试
  - src/server/__tests__/protocol.test.ts — 消息协议测试

**本模块不拥有**:
- 游戏逻辑（属于 game-flow 模块）
- 核心数据模型（属于 core-models 模块）
- 游戏引擎逻辑（属于 game-engine 模块）
- UI 组件（属于 client-ui 模块）

**依赖关系**:
- 上游依赖: game-flow（Game 类、GameConfig、GameResult、AIStrategy）
- 下游依赖: client-ui（通过 WebSocket 连接、使用消息协议）

**可能导致下游重新验证的变更**:
- 修改消息协议格式（消息类型、字段结构）
- 修改房间管理 API（创建/加入/列表接口）
- 修改游戏状态广播格式
- 修改断线处理超时机制
- 修改 WebSocket 服务器端口或连接参数

## 架构决策

### 1. 分层架构策略

**决策**: 使用三层架构（ConnectionManager → RoomManager → GameSession）分离关注点。

**理由**:
- ConnectionManager 只负责 WebSocket 连接生命周期，不关心业务逻辑
- RoomManager 只负责房间状态管理，不关心游戏执行
- GameSession 只负责 Game 实例托管，不关心网络传输
- 每层可独立测试，降低耦合度
- 便于后续扩展（如添加认证、限流等中间件）

### 2. 消息路由策略

**决策**: 使用类型化消息路由（Typed Message Router），根据消息 type 字段分发到对应处理器。

**理由**:
- TypeScript 类型系统保证消息格式的正确性
- 路由器可扩展，新增消息类型只需添加处理器
- 错误处理统一，未知消息类型返回标准错误
- 与 game-flow 的事件系统兼容（Game 类已使用 EventBus）

### 3. 房间状态管理策略

**决策**: 使用 Room 对象封装房间状态，RoomManager 管理 Room 对象集合。

**理由**:
- Room 对象封装房间内的玩家列表、游戏会话、房间配置
- RoomManager 提供全局的房间查询和管理能力
- 房间状态变更可被追踪（用于广播给客户端）
- 便于实现房间超时清理和资源回收

### 4. 游戏会话托管策略

**决策**: 每个房间创建独立的 GameSession 实例，GameSession 内部运行 Game 实例。

**理由**:
- GameSession 隔离不同房间的游戏状态，避免状态污染
- GameSession 可独立处理断线和重连逻辑
- GameSession 可独立管理游戏生命周期（创建、运行、结束、清理）
- 便于实现游戏暂停/恢复功能（未来扩展）

### 5. 断线处理策略

**决策**: 使用心跳检测 + 超时重连机制处理断线。

**理由**:
- 心跳检测可快速发现断线（无需等待消息发送失败）
- 超时重连给予玩家恢复游戏的机会
- 超时后自动离场，避免游戏被无限期阻塞
- 与 WebSocket 协议的 close 事件天然兼容

### 6. 状态广播策略

**决策**: 使用增量状态广播（Delta Broadcast），仅发送变化的状态。

**理由**:
- 减少网络传输量（游戏状态可能很大）
- 降低客户端解析负担（只需处理增量更新）
- 与 game-flow 的 EventBus 兼容（可订阅特定事件）
- 便于实现状态快照和回放（未来扩展）

## 组件设计

### 1. 消息协议 (src/shared/network/protocol.ts)

```typescript
// === 基础消息类型 ===

// 客户端 → 服务端消息
export type ClientMessage =
  | { type: 'create_room'; payload: { playerCount: number; packages: number[] } }
  | { type: 'join_room'; payload: { roomId: string; playerName: string } }
  | { type: 'leave_room' }
  | { type: 'list_rooms' }
  | { type: 'start_game' }
  | { type: 'player_input'; payload: { input: string } }
  | { type: 'get_state' }
  | { type: 'ping'; payload: { timestamp: number } };

// 服务端 → 客户端消息
export type ServerMessage =
  | { type: 'room_created'; payload: { roomId: string } }
  | { type: 'room_joined'; payload: { roomId: string; players: PlayerInfo[] } }
  | { type: 'room_left'; payload: { roomId: string } }
  | { type: 'room_list'; payload: { rooms: RoomInfo[] } }
  | { type: 'player_joined'; payload: { playerName: string; players: PlayerInfo[] } }
  | { type: 'player_left'; payload: { playerName: string; players: PlayerInfo[] } }
  | { type: 'player_disconnected'; payload: { playerName: string } }
  | { type: 'player_reconnected'; payload: { playerName: string } }
  | { type: 'game_started'; payload: { playerCount: number } }
  | { type: 'game_state'; payload: { state: GameState } }
  | { type: 'input_request'; payload: { format: string; code: string; arg: string } }
  | { type: 'game_over'; payload: { result: GameResult } }
  | { type: 'error'; payload: { code: string; message: string } }
  | { type: 'pong'; payload: { timestamp: number } };

// === 辅助类型 ===

export interface PlayerInfo {
  uid: number;
  name: string;
  isReady: boolean;
  isConnected: boolean;
}

export interface RoomInfo {
  roomId: string;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
}

export interface GameState {
  players: PlayerState[];
  currentTurn: number;
  phase: string;
  board: BoardState;
}

export interface PlayerState {
  uid: number;
  name: string;
  hp: number;
  hand: number[];  // Card IDs (numeric), client resolves to display codes via LibGroup
  team: number;
}

export interface BoardState {
  tuxPileCount: number;
  monPileCount: number;
  evePileCount: number;
}

// === 消息工具函数 ===

export function createMessage<T extends ServerMessage>(
  type: T['type'],
  payload: T['payload']
): T {
  return { type, payload } as T;
}

export function parseMessage(data: string): ClientMessage | null {
  try {
    const msg = JSON.parse(data);
    if (msg && typeof msg.type === 'string') {
      return msg as ClientMessage;
    }
    return null;
  } catch {
    return null;
  }
}

export function createErrorMessage(
  code: string,
  message: string
): ServerMessage {
  return { type: 'error', payload: { code, message } };
}
```

### 2. 连接管理 (src/server/connection.ts)

```typescript
import { WebSocket, WebSocketServer } from 'ws';
import { ServerMessage, parseMessage, createMessage, createErrorMessage } from '../shared/network/protocol';

export interface Connection {
  id: string;
  ws: WebSocket;
  playerName: string | null;
  roomId: string | null;
  isAlive: boolean;
  lastPing: number;
}

export type MessageHandler = (
  connectionId: string,
  message: ClientMessage
) => void;

export type ConnectionHandler = (connectionId: string) => void;

export class ConnectionManager {
  private connections: Map<string, Connection>;
  private heartbeatInterval: NodeJS.Timeout | null;
  private messageHandler: MessageHandler | null;
  private connectHandler: ConnectionHandler | null;
  private disconnectHandler: ConnectionHandler | null;

  constructor() {
    this.connections = new Map();
    this.heartbeatInterval = null;
    this.messageHandler = null;
    this.connectHandler = null;
    this.disconnectHandler = null;
  }

  // 启动 WebSocket 服务器
  start(port: number): WebSocketServer {
    const wss = new WebSocketServer({ port });

    wss.on('connection', (ws) => {
      const id = this.generateId();
      const connection: Connection = {
        id,
        ws,
        playerName: null,
        roomId: null,
        isAlive: true,
        lastPing: Date.now(),
      };

      this.connections.set(id, connection);

      ws.on('message', (data) => {
        this.handleMessage(id, data.toString());
      });

      ws.on('close', () => {
        this.handleDisconnect(id);
      });

      ws.on('pong', () => {
        this.handlePong(id);
      });

      // 通知新连接
      this.connectHandler?.(id);
    });

    // 启动心跳检测
    this.startHeartbeat(wss);

    return wss;
  }

  // 发送消息给指定连接
  send(connectionId: string, message: ServerMessage): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  // 广播消息给房间内所有连接
  broadcast(roomId: string, message: ServerMessage): void {
    for (const connection of this.connections.values()) {
      if (connection.roomId === roomId) {
        this.send(connection.id, message);
      }
    }
  }

  // 关闭连接
  close(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.ws.close();
      this.connections.delete(connectionId);
    }
  }

  // 获取连接
  getConnection(id: string): Connection | undefined {
    return this.connections.get(id);
  }

  // 获取房间内所有连接
  getRoomConnections(roomId: string): Connection[] {
    return Array.from(this.connections.values()).filter(
      (c) => c.roomId === roomId
    );
  }

  // 设置消息处理器
  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  // 设置连接处理器
  onConnect(handler: ConnectionHandler): void {
    this.connectHandler = handler;
  }

  // 设置断开处理器
  onDisconnect(handler: ConnectionHandler): void {
    this.disconnectHandler = handler;
  }

  // 私有方法：处理消息
  private handleMessage(connectionId: string, data: string): void {
    const message = parseMessage(data);
    if (message) {
      this.messageHandler?.(connectionId, message);
    } else {
      this.send(
        connectionId,
        createErrorMessage('INVALID_MESSAGE', '无效的消息格式')
      );
    }
  }

  // 私有方法：处理断开
  private handleDisconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isAlive = false;
      this.disconnectHandler?.(connectionId);
      // 延迟删除连接（等待可能的重连）
      setTimeout(() => {
        if (!connection.isAlive) {
          this.connections.delete(connectionId);
        }
      }, 5000);
    }
  }

  // 私有方法：处理 pong
  private handlePong(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isAlive = true;
      connection.lastPing = Date.now();
    }
  }

  // 私有方法：启动心跳
  private startHeartbeat(wss: WebSocketServer): void {
    this.heartbeatInterval = setInterval(() => {
      wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  // 私有方法：生成唯一 ID
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
```

### 3. 房间管理 (src/server/room.ts)

```typescript
import { RoomInfo, PlayerInfo } from '../shared/network/protocol';
import { GameSession } from './game-session';

export interface Room {
  id: string;
  players: Map<number, PlayerInfo>;
  playerCount: number;
  maxPlayers: number;
  packages: number[];
  status: 'waiting' | 'playing' | 'finished';
  gameSession: GameSession | null;
  createdAt: number;
}

export type RoomEventHandler = (roomId: string, event: string, data: unknown) => void;

export class RoomManager {
  private rooms: Map<string, Room>;
  private eventHandler: RoomEventHandler | null;

  constructor() {
    this.rooms = new Map();
    this.eventHandler = null;
  }

  // 创建房间
  createRoom(playerCount: number, packages: number[]): string {
    const roomId = this.generateRoomId();
    const room: Room = {
      id: roomId,
      players: new Map(),
      playerCount: 0,
      maxPlayers: playerCount,
      packages,
      status: 'waiting',
      gameSession: null,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    this.eventHandler?.(roomId, 'room_created', { roomId });
    return roomId;
  }

  // 加入房间
  joinRoom(
    roomId: string,
    playerName: string
  ): { success: boolean; error?: string; players?: PlayerInfo[] } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND', message: '房间不存在' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'GAME_STARTED', message: '游戏已开始' };
    }

    if (room.playerCount >= room.maxPlayers) {
      return { success: false, error: 'ROOM_FULL', message: '房间已满' };
    }

    // 检查玩家名是否重复
    for (const player of room.players.values()) {
      if (player.name === playerName) {
        return { success: false, error: 'NAME_TAKEN', message: '玩家名已被使用' };
      }
    }

    // 分配玩家 ID（从 1 开始）
    const uid = room.playerCount + 1;
    const playerInfo: PlayerInfo = {
      uid,
      name: playerName,
      isReady: true,
      isConnected: true,
    };

    room.players.set(uid, playerInfo);
    room.playerCount++;

    this.eventHandler?.(roomId, 'player_joined', { playerName, uid });
    return { success: true, players: this.getPlayerList(roomId) };
  }

  // 离开房间
  leaveRoom(
    roomId: string,
    uid: number
  ): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND' };
    }

    const player = room.players.get(uid);
    if (!player) {
      return { success: false, error: 'PLAYER_NOT_FOUND' };
    }

    room.players.delete(uid);
    room.playerCount--;

    this.eventHandler?.(roomId, 'player_left', { playerName: player.name });

    // 如果房间为空，销毁房间
    if (room.playerCount === 0) {
      this.destroyRoom(roomId);
    }

    return { success: true };
  }

  // 列出所有房间
  listRooms(): RoomInfo[] {
    return Array.from(this.rooms.values()).map((room) => ({
      roomId: room.id,
      playerCount: room.playerCount,
      maxPlayers: room.maxPlayers,
      status: room.status,
    }));
  }

  // 获取房间
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  // 获取房间内玩家列表
  getPlayerList(roomId: string): PlayerInfo[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.players.values());
  }

  // 标记玩家断线
  markPlayerDisconnected(roomId: string, uid: number): void {
    const room = this.rooms.get(roomId);
    if (room) {
      const player = room.players.get(uid);
      if (player) {
        player.isConnected = false;
        this.eventHandler?.(roomId, 'player_disconnected', {
          playerName: player.name,
        });
      }
    }
  }

  // 标记玩家重连
  markPlayerReconnected(roomId: string, uid: number): void {
    const room = this.rooms.get(roomId);
    if (room) {
      const player = room.players.get(uid);
      if (player) {
        player.isConnected = true;
        this.eventHandler?.(roomId, 'player_reconnected', {
          playerName: player.name,
        });
      }
    }
  }

  // 开始游戏
  startGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting') {
      return false;
    }

    if (room.playerCount < 2) {
      return false;
    }

    room.status = 'playing';
    this.eventHandler?.(roomId, 'game_started', {
      playerCount: room.playerCount,
    });
    return true;
  }

  // 结束游戏
  endGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = 'finished';
      this.eventHandler?.(roomId, 'game_finished', {});
    }
  }

  // 销毁房间
  destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      // 清理游戏会话
      if (room.gameSession) {
        room.gameSession.stop();
      }
      this.rooms.delete(roomId);
      this.eventHandler?.(roomId, 'room_destroyed', {});
    }
  }

  // 设置事件处理器
  onEvent(handler: RoomEventHandler): void {
    this.eventHandler = handler;
  }

  // 生成房间 ID
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
```

### 4. 游戏会话 (src/server/game-session.ts)

```typescript
import { Game, GameConfig, GameResult } from '../shared/game/game';
import { AIStrategy } from '../shared/game/ai/types';
import { GameState, GameResult as ProtocolGameResult } from '../shared/network/protocol';
import { RoomManager, Room } from './room';
import { ConnectionManager } from './connection';

export class GameSession {
  private game: Game;
  private room: Room;
  private roomManager: RoomManager;
  private connectionManager: ConnectionManager;
  private inputResolvers: Map<number, (input: string) => void>;
  private stateBroadcastTimer: NodeJS.Timeout | null;

  constructor(
    room: Room,
    roomManager: RoomManager,
    connectionManager: ConnectionManager
  ) {
    this.room = room;
    this.roomManager = roomManager;
    this.connectionManager = connectionManager;
    this.inputResolvers = new Map();
    this.stateBroadcastTimer = null;

    // 创建 Game 实例
    const config: GameConfig = {
      playerCount: room.playerCount,
      packages: room.packages,
      seed: Date.now(),
      maxRounds: 100,
      aiStrategies: this.createAIStrategies(),
    };

    this.game = new Game(config);
    room.gameSession = this;
  }

  // 启动游戏
  async start(): Promise<GameResult> {
    try {
      // 广播游戏开始
      this.connectionManager.broadcast(this.room.id, {
        type: 'game_started',
        payload: { playerCount: this.room.playerCount },
      });

      // 启动状态广播
      this.startStateBroadcast();

      // 运行游戏
      const result = await this.game.run();

      // 停止状态广播
      this.stopStateBroadcast();

      // 广播游戏结果
      this.connectionManager.broadcast(this.room.id, {
        type: 'game_over',
        payload: {
          result: {
            winner: result.winner ? result.winner.uid : null,
            totalRounds: result.totalRounds,
            akaScore: result.akaScore,
            aoScore: result.aoScore,
            reason: result.reason,
          },
        },
      });

      // 结束游戏
      this.roomManager.endGame(this.room.id);

      return result;
    } catch (error) {
      console.error('[GameSession] Error:', error);
      this.stopStateBroadcast();
      throw error;
    }
  }

  // 停止游戏
  stop(): void {
    this.stopStateBroadcast();
    this.inputResolvers.clear();
  }

  // 处理玩家输入
  handlePlayerInput(uid: number, input: string): boolean {
    const resolver = this.inputResolvers.get(uid);
    if (resolver) {
      resolver(input);
      this.inputResolvers.delete(uid);
      return true;
    }
    return false;
  }

  // 获取游戏状态
  getState(): GameState {
    const board = this.game.getBoard();
    const players = this.game.getPlayers();

    return {
      players: Array.from(players.values()).map((p) => ({
        uid: p.uid,
        name: p.name,
        hp: p.hp,
        hand: [...p.tux],  // Pass card IDs directly; client resolves codes via LibGroup
        team: p.team,
      })),
      currentTurn: this.game.getRoundManager().currentPlayer,
      phase: this.game.getRoundManager().currentPhase,
      board: {
        tuxPileCount: board.tuxPiles.count,
        monPileCount: board.monPiles.count,
        evePileCount: board.evePiles.count,
      },
    };
  }

  // 等待玩家输入（供 Game 类调用）
  async waitForInput(
    uid: number,
    format: string,
    code: string,
    arg: string
  ): Promise<string> {
    // 向玩家发送输入请求
    this.connectionManager.broadcast(this.room.id, {
      type: 'input_request',
      payload: { format, code, arg },
    });

    // 等待玩家输入
    return new Promise((resolve) => {
      this.inputResolvers.set(uid, resolve);

      // 设置超时（30 秒）
      setTimeout(() => {
        if (this.inputResolvers.has(uid)) {
          this.inputResolvers.delete(uid);
          resolve(''); // 超时返回空字符串
        }
      }, 30000);
    });
  }

  // 私有方法：创建 AI 策略
  private createAIStrategies(): AIStrategy[] {
    // 为人类玩家创建占位策略（实际由网络输入替代）
    return Array(this.room.playerCount).fill(null);
  }

  // 私有方法：启动状态广播
  private startStateBroadcast(): void {
    this.stateBroadcastTimer = setInterval(() => {
      const state = this.getState();
      this.connectionManager.broadcast(this.room.id, {
        type: 'game_state',
        payload: { state },
      });
    }, 100); // 每 100ms 广播一次状态
  }

  // 私有方法：停止状态广播
  private stopStateBroadcast(): void {
    if (this.stateBroadcastTimer) {
      clearInterval(this.stateBroadcastTimer);
      this.stateBroadcastTimer = null;
    }
  }
}
```

### 5. 服务器入口 (src/server/index.ts)

```typescript
import { ConnectionManager } from './connection';
import { RoomManager } from './room';
import { GameSession } from './game-session';
import { ClientMessage, createErrorMessage } from '../shared/network/protocol';

// 服务器配置
const PORT = parseInt(process.env.PORT || '3000', 10);

// 创建管理器
const connectionManager = new ConnectionManager();
const roomManager = new RoomManager();

// 临时存储连接 ID 到玩家 ID 的映射
const connectionToPlayer: Map<string, { roomId: string; uid: number }> =
  new Map();

// 处理连接
connectionManager.onConnect((connectionId) => {
  console.log(`[Server] Client connected: ${connectionId}`);
});

// 处理断开
connectionManager.onDisconnect((connectionId) => {
  console.log(`[Server] Client disconnected: ${connectionId}`);

  const mapping = connectionToPlayer.get(connectionId);
  if (mapping) {
    const { roomId, uid } = mapping;

    // 标记玩家断线
    roomManager.markPlayerDisconnected(roomId, uid);

    // 通知房间内其他玩家
    const players = roomManager.getPlayerList(roomId);
    const player = players.find((p) => p.uid === uid);
    if (player) {
      connectionManager.broadcast(roomId, {
        type: 'player_disconnected',
        payload: { playerName: player.name },
      });
    }

    connectionToPlayer.delete(connectionId);
  }
});

// 处理消息
connectionManager.onMessage((connectionId, message) => {
  handleMessage(connectionId, message);
});

// 消息处理器
async function handleMessage(
  connectionId: string,
  message: ClientMessage
): Promise<void> {
  switch (message.type) {
    case 'create_room': {
      const { playerCount, packages } = message.payload;
      const roomId = roomManager.createRoom(playerCount, packages);
      connectionManager.send(connectionId, {
        type: 'room_created',
        payload: { roomId },
      });
      break;
    }

    case 'join_room': {
      const { roomId, playerName } = message.payload;
      const result = roomManager.joinRoom(roomId, playerName);

      if (result.success) {
        // 获取新加入玩家的 UID
        const players = result.players || [];
        const newPlayer = players.find((p) => p.name === playerName);
        if (newPlayer) {
          connectionToPlayer.set(connectionId, {
            roomId,
            uid: newPlayer.uid,
          });
        }

        connectionManager.send(connectionId, {
          type: 'room_joined',
          payload: { roomId, players: players },
        });

        // 通知房间内其他玩家
        connectionManager.broadcast(roomId, {
          type: 'player_joined',
          payload: { playerName, players },
        });
      } else {
        connectionManager.send(
          connectionId,
          createErrorMessage(result.error || 'UNKNOWN', result.message || '未知错误')
        );
      }
      break;
    }

    case 'leave_room': {
      const mapping = connectionToPlayer.get(connectionId);
      if (mapping) {
        const { roomId, uid } = mapping;
        const result = roomManager.leaveRoom(roomId, uid);

        if (result.success) {
          connectionManager.send(connectionId, {
            type: 'room_left',
            payload: { roomId },
          });

          // 通知房间内其他玩家
          const players = roomManager.getPlayerList(roomId);
          connectionManager.broadcast(roomId, {
            type: 'player_left',
            payload: { playerName: 'Unknown', players },
          });

          connectionToPlayer.delete(connectionId);
        }
      }
      break;
    }

    case 'list_rooms': {
      const rooms = roomManager.listRooms();
      connectionManager.send(connectionId, {
        type: 'room_list',
        payload: { rooms },
      });
      break;
    }

    case 'start_game': {
      const mapping = connectionToPlayer.get(connectionId);
      if (mapping) {
        const { roomId } = mapping;
        const room = roomManager.getRoom(roomId);

        if (room && room.playerCount >= 2) {
          // 检查是否是房主（第一个加入的玩家）
          const players = roomManager.getPlayerList(roomId);
          const player = players.find(
            (p) => p.uid === mapping.uid
          );
          if (player && players[0].uid === player.uid) {
            // 开始游戏
            roomManager.startGame(roomId);

            // 创建游戏会话
            const gameSession = new GameSession(
              room,
              roomManager,
              connectionManager
            );

            // 异步运行游戏
            gameSession.start().catch((error) => {
              console.error('[Server] Game error:', error);
            });
          }
        }
      }
      break;
    }

    case 'player_input': {
      const mapping = connectionToPlayer.get(connectionId);
      if (mapping) {
        const { roomId, uid } = mapping;
        const room = roomManager.getRoom(roomId);

        if (room && room.gameSession) {
          const { input } = message.payload;
          room.gameSession.handlePlayerInput(uid, input);
        }
      }
      break;
    }

    case 'get_state': {
      const mapping = connectionToPlayer.get(connectionId);
      if (mapping) {
        const { roomId } = mapping;
        const room = roomManager.getRoom(roomId);

        if (room && room.gameSession) {
          const state = room.gameSession.getState();
          connectionManager.send(connectionId, {
            type: 'game_state',
            payload: { state },
          });
        }
      }
      break;
    }

    case 'ping': {
      const { timestamp } = message.payload;
      connectionManager.send(connectionId, {
        type: 'pong',
        payload: { timestamp },
      });
      break;
    }

    default: {
      connectionManager.send(
        connectionId,
        createErrorMessage('UNKNOWN_TYPE', '未知的消息类型')
      );
    }
  }
}

// 启动服务器
const wss = connectionManager.start(PORT);
console.log(`[Server] WebSocket server running on port ${PORT}`);

// 优雅关闭
process.on('SIGINT', () => {
  console.log('[Server] Shutting down...');
  wss.clients.forEach((ws) => {
    ws.close();
  });
  process.exit(0);
});
```

## 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  WebSocket 连接                                          │   │
│  │  发送: create_room, join_room, player_input, etc.        │   │
│  │  接收: room_created, game_state, input_request, etc.     │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ JSON 消息
┌───────────────────────────┴─────────────────────────────────────┐
│                     ConnectionManager                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  管理 WebSocket 连接生命周期                              │   │
│  │  心跳检测、消息收发、连接状态                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  消息路由: ClientMessage → 处理器                        │   │
│  │  create_room → RoomManager.createRoom                    │   │
│  │  join_room → RoomManager.joinRoom                        │   │
│  │  player_input → GameSession.handlePlayerInput            │   │
│  │  get_state → GameSession.getState                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                       RoomManager                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  管理 Room 对象集合                                       │   │
│  │  房间创建、加入、离开、销毁                                │   │
│  │  玩家状态管理（连接/断线）                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Room 对象                                                │   │
│  │  ├── players: Map<uid, PlayerInfo>                       │   │
│  │  ├── gameSession: GameSession | null                     │   │
│  │  └── status: 'waiting' | 'playing' | 'finished'         │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                      GameSession                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  托管 Game 实例（game-flow 模块）                         │   │
│  │  输入注入: waitForInput(uid) → 等待 WebSocket 输入        │   │
│  │  状态广播: getState() → 广播给房间内所有客户端             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Game 实例 (game-flow)                                   │   │
│  │  ├── Board, Players, EventBus                           │   │
│  │  ├── RoundManager, SelectHero                           │   │
│  │  └── Game.run() → 异步游戏循环                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 文件结构计划

```
src/server/
├── index.ts                    # 服务器入口（WebSocket 服务器启动、消息路由）
├── connection.ts               # 连接管理（WebSocket 连接生命周期、心跳检测）
├── room.ts                     # 房间管理（创建/加入/列表/离开/销毁）
├── game-session.ts             # 游戏会话（Game 实例托管、输入注入、状态广播）
└── __tests__/                  # 服务器测试
    ├── connection.test.ts      # 连接管理测试
    ├── room.test.ts            # 房间管理测试
    ├── game-session.test.ts    # 游戏会话测试
    └── protocol.test.ts        # 消息协议测试

src/shared/network/
└── protocol.ts                 # 消息协议（类型定义、序列化/反序列化）
```

## 测试策略

### 1. 消息协议测试

- 消息解析：验证 ClientMessage 和 ServerMessage 的序列化/反序列化
- 消息验证：验证消息格式的正确性（type 字段、payload 结构）
- 错误处理：验证无效消息的解析和错误响应
- 请求-响应配对：验证 requestId 字段的正确使用

### 2. 连接管理测试

- 连接建立：验证 WebSocket 连接的接受和 ID 分配
- 连接关闭：验证连接关闭的处理和清理
- 心跳检测：验证心跳 ping/pong 的正确实现
- 消息收发：验证消息的发送和接收

### 3. 房间管理测试

- 房间创建：验证房间 ID 生成和房间状态初始化
- 房间加入：验证玩家加入、人数限制、状态检查
- 房间离开：验证玩家离开、房间清理
- 房间列表：验证房间列表的正确返回
- 房间销毁：验证空房间的自动销毁

### 4. 游戏会话测试

- 会话创建：验证 Game 实例的正确创建
- 输入注入：验证 waitForInput 和 handlePlayerInput 的交互
- 状态广播：验证 getState 和状态广播的正确性
- 游戏结束：验证游戏结果的正确广播

### 5. 集成测试

- 完整流程：验证从创建房间到游戏结束的完整流程
- 多客户端：验证多个客户端同时连接和交互
- 断线重连：验证断线检测和重连逻辑
- 错误恢复：验证各种异常情况的处理

## 风险与缓解

### 1. WebSocket 连接稳定性

**风险**: 网络不稳定可能导致 WebSocket 连接意外断开。

**缓解**:
- 实现心跳检测快速发现断线
- 实现超时重连机制给予恢复机会
- 实现断线状态保持（游戏状态不变）
- 详细的连接状态日志便于调试

### 2. 游戏状态同步

**风险**: 多客户端同时操作可能导致状态不一致。

**缓解**:
- 服务端作为权威架构，所有操作由服务端验证
- 增量状态广播确保所有客户端看到相同状态
- 定期全量状态同步作为兜底机制
- 客户端只显示服务端确认的状态

### 3. 内存泄漏

**风险**: 房间和连接对象未正确清理可能导致内存泄漏。

**缓解**:
- 房间为空时自动销毁
- 连接断开后延迟清理（等待重连）
- 定期清理超时房间和连接
- 使用 WeakMap 或 WeakRef 管理临时对象

### 4. 并发操作

**风险**: 多个客户端同时发送操作可能导致竞态条件。

**缓解**:
- 使用 Promise 队列管理玩家输入
- 游戏逻辑是单线程的（Node.js 事件循环）
- 操作验证在服务端进行，客户端只发送意图
- 详细的错误日志便于调试竞态问题

## Requirements Traceability

| Requirement | Summary | Components | Interfaces |
|-------------|---------|------------|------------|
| 1 | WebSocket 服务器基础框架 | index.ts, connection.ts | ConnectionManager, start(), send(), broadcast() |
| 2 | 消息协议 | protocol.ts | ClientMessage, ServerMessage, parseMessage() |
| 3 | 房间管理 | room.ts | RoomManager, createRoom(), joinRoom(), leaveRoom() |
| 4 | 游戏会话托管 | game-session.ts | GameSession, start(), handlePlayerInput() |
| 5 | 多客户端状态同步 | connection.ts, game-session.ts | broadcast(), getState() |
| 6 | 断线处理 | connection.ts, room.ts | handleDisconnect(), markPlayerDisconnected() |
| 7 | 服务端与 Game 实例集成 | game-session.ts | GameSession, waitForInput(), getState() |
