# Tasks: network-server

## 任务总览

- 总计: 12 个主要任务, 约 45 个子任务
- 覆盖需求: 1-7 (全部 7 个需求区域)
- 平均任务大小: 1-3 小时/子任务
- 并行标记 (P): 满足并行条件的任务已标记

---

## 1. 消息协议定义 (P)

### 1.1 创建消息协议类型定义
_Boundary: src/shared/network/protocol.ts_

- [ ] 1.1.1 创建 `src/shared/network/protocol.ts`，定义基础消息类型
  - 定义 `ClientMessage` 联合类型（create_room, join_room, leave_room, list_rooms, start_game, player_input, get_state, ping）
  - 定义 `ServerMessage` 联合类型（room_created, room_joined, room_left, room_list, player_joined, player_left, player_disconnected, player_reconnected, game_started, game_state, input_request, game_over, error, pong）
  - 定义辅助类型（PlayerInfo, RoomInfo, GameState, PlayerState, BoardState）
  - Done: 基础消息类型定义完成，TypeScript 编译通过

- [ ] 1.1.2 实现消息工具函数
  - 实现 `createMessage<T>()` 泛型消息创建函数
  - 实现 `parseMessage(data: string)` 消息解析函数
  - 实现 `createErrorMessage()` 错误消息创建函数
  - 验证消息序列化/反序列化的正确性
  - Done: 工具函数实现完成，可正确解析和创建消息

### 1.2 编写消息协议测试 (P)
_Boundary: src/shared/network/__tests__/protocol.test.ts_

- [ ] 1.2.1 创建 `src/shared/network/__tests__/protocol.test.ts`，编写协议测试
  - 测试 ClientMessage 序列化/反序列化
  - 测试 ServerMessage 序列化/反序列化
  - 测试错误消息创建
  - 测试无效消息解析（返回 null）
  - Done: 协议测试通过

---

## 2. 连接管理模块 (P)

### 2.1 实现 ConnectionManager 核心功能
_Boundary: src/server/connection.ts_

- [ ] 2.1.1 创建 `src/server/connection.ts`，实现 Connection 接口和 ConnectionManager 类
  - 定义 `Connection` 接口（id, ws, playerName, roomId, isAlive, lastPing）
  - 定义 `MessageHandler`、`ConnectionHandler` 类型
  - 实现 `ConnectionManager` 构造函数（初始化 connections Map）
  - 实现 `generateId()` 生成唯一连接 ID
  - Done: Connection 接口和 ConnectionManager 类定义完成

- [ ] 2.1.2 实现 WebSocket 服务器启动功能
  - 实现 `start(port)` 方法，创建 WebSocketServer
  - 实现连接事件处理（connection, message, close, pong）
  - 实现连接对象创建和存储
  - 实现连接 ID 分配
  - Done: WebSocket 服务器可启动并接受连接

- [ ] 2.1.3 实现消息收发功能
  - 实现 `send(connectionId, message)` 方法，发送消息给指定连接
  - 实现 `broadcast(roomId, message)` 方法，广播消息给房间内所有连接
  - 实现消息序列化（JSON.stringify）
  - 验证连接状态检查（readyState === OPEN）
  - Done: 消息收发功能正常

- [ ] 2.1.4 实现心跳检测功能
  - 实现 `startHeartbeat(wss)` 方法，启动心跳检测
  - 实现 ping/pong 机制
  - 实现超时连接清理（30 秒超时）
  - 验证心跳检测可发现断线连接
  - Done: 心跳检测功能正常

- [ ] 2.1.5 实现连接关闭和清理功能
  - 实现 `close(connectionId)` 方法，关闭连接并清理
  - 实现 `handleDisconnect()` 方法，处理连接断开事件
  - 实现延迟删除机制（等待可能的重连）
  - 实现 `getConnection()` 和 `getRoomConnections()` 查询方法
  - Done: 连接关闭和清理功能正常

### 2.2 实现事件处理器注册
_Boundary: src/server/connection.ts_

- [ ] 2.2.1 实现事件处理器注册方法
  - 实现 `onMessage(handler)` 方法，注册消息处理器
  - 实现 `onConnect(handler)` 方法，注册连接处理器
  - 实现 `onDisconnect(handler)` 方法，注册断开处理器
  - 验证事件处理器可正确调用
  - Done: 事件处理器注册功能正常

### 2.3 编写连接管理测试 (P)
_Boundary: src/server/__tests__/connection.test.ts_

- [ ] 2.3.1 创建 `src/server/__tests__/connection.test.ts`，编写连接管理测试
  - 测试 WebSocket 服务器启动
  - 测试连接建立和 ID 分配
  - 测试消息发送和接收
  - 测试连接关闭和清理
  - 测试心跳检测
  - Done: 连接管理测试通过

---

## 3. 房间管理模块 (P)

### 3.1 实现 RoomManager 核心功能
_Boundary: src/server/room.ts_

- [ ] 3.1.1 创建 `src/server/room.ts`，实现 Room 接口和 RoomManager 类
  - 定义 `Room` 接口（id, players, playerCount, maxPlayers, packages, status, gameSession, createdAt）
  - 定义 `RoomEventHandler` 类型
  - 实现 `RoomManager` 构造函数（初始化 rooms Map）
  - 实现 `generateRoomId()` 生成房间 ID
  - Done: Room 接口和 RoomManager 类定义完成

- [ ] 3.1.2 实现房间创建功能
  - 实现 `createRoom(playerCount, packages)` 方法
  - 生成唯一房间 ID（6 位大写字母数字）
  - 初始化房间状态（status: 'waiting', players: Map）
  - 触发 room_created 事件
  - Done: 房间创建功能正常

- [ ] 3.1.3 实现房间加入功能
  - 实现 `joinRoom(roomId, playerName)` 方法
  - 验证房间存在性
  - 验证房间状态（status: 'waiting'）
  - 验证房间人数（playerCount < maxPlayers）
  - 验证玩家名唯一性
  - 分配玩家 ID（从 1 开始）
  - 更新房间状态
  - 触发 player_joined 事件
  - Done: 房间加入功能正常

- [ ] 3.1.4 实现房间离开功能
  - 实现 `leaveRoom(roomId, uid)` 方法
  - 验证房间存在性
  - 验证玩家存在性
  - 移除玩家
  - 更新房间状态
  - 触发 player_left 事件
  - 检查房间是否为空（自动销毁）
  - Done: 房间离开功能正常

- [ ] 3.1.5 实现房间列表功能
  - 实现 `listRooms()` 方法
  - 返回所有房间的摘要信息（roomId, playerCount, maxPlayers, status）
  - 验证列表数据正确性
  - Done: 房间列表功能正常

- [ ] 3.1.6 实现房间状态管理功能
  - 实现 `getRoom(roomId)` 方法，获取房间详情
  - 实现 `getPlayerList(roomId)` 方法，获取房间内玩家列表
  - 实现 `markPlayerDisconnected(roomId, uid)` 方法，标记玩家断线
  - 实现 `markPlayerReconnected(roomId, uid)` 方法，标记玩家重连
  - Done: 房间状态管理功能正常

- [ ] 3.1.7 实现游戏开始和结束功能
  - 实现 `startGame(roomId)` 方法，开始游戏
  - 验证房间状态（status: 'waiting'）
  - 验证最少玩家数（>= 2）
  - 更新房间状态（status: 'playing'）
  - 实现 `endGame(roomId)` 方法，结束游戏
  - 实现 `destroyRoom(roomId)` 方法，销毁房间
  - Done: 游戏开始和结束功能正常

### 3.2 实现房间事件处理器
_Boundary: src/server/room.ts_

- [ ] 3.2.1 实现 `onEvent(handler)` 方法
  - 注册房间事件处理器
  - 验证事件处理器可正确调用
  - Done: 事件处理器注册功能正常

### 3.3 编写房间管理测试 (P)
_Boundary: src/server/__tests__/room.test.ts_

- [ ] 3.3.1 创建 `src/server/__tests__/room.test.ts`，编写房间管理测试
  - 测试房间创建
  - 测试房间加入（正常、房间不存在、房间已满、游戏已开始、玩家名重复）
  - 测试房间离开
  - 测试房间列表
  - 测试房间状态管理
  - 测试游戏开始和结束
  - 测试房间销毁
  - Done: 房间管理测试通过

---

## 4. 游戏会话模块

### 4.1 实现 GameSession 核心功能
_Boundary: src/server/game-session.ts_

- [ ] 4.1.1 创建 `src/server/game-session.ts`，实现 GameSession 类
  - 定义 `GameSession` 类属性（game, room, roomManager, connectionManager, inputResolvers, stateBroadcastTimer）
  - 实现构造函数（初始化 Game 实例、设置 room.gameSession）
  - 实现 `createAIStrategies()` 方法，创建 AI 策略占位
  - Done: GameSession 类定义完成

- [ ] 4.1.2 实现游戏启动功能
  - 实现 `start()` 方法，启动游戏
  - 广播 game_started 消息
  - 启动状态广播定时器
  - 调用 `game.run()` 运行游戏
  - 处理游戏结束（停止广播、广播结果、结束游戏）
  - 实现错误处理（try-catch）
  - Done: 游戏启动功能正常

- [ ] 4.1.3 实现输入注入功能
  - 实现 `waitForInput(uid, format, code, arg)` 方法
  - 广播 input_request 消息给房间内所有客户端
  - 返回 Promise 等待玩家输入
  - 实现超时机制（30 秒）
  - 实现 `handlePlayerInput(uid, input)` 方法
  - 验证输入解析和 Promise 解析
  - Done: 输入注入功能正常

- [ ] 4.1.4 实现状态广播功能
  - 实现 `getState()` 方法，获取游戏状态
  - 从 Game 实例获取 Board、Players 信息
  - 构建 GameState 对象
  - 实现 `startStateBroadcast()` 方法，启动定时广播（100ms 间隔）
  - 实现 `stopStateBroadcast()` 方法，停止广播
  - Done: 状态广播功能正常

- [ ] 4.1.5 实现游戏停止功能
  - 实现 `stop()` 方法，停止游戏
  - 停止状态广播
  - 清理输入解析器
  - Done: 游戏停止功能正常

### 4.2 编写游戏会话测试
_Boundary: src/server/__tests__/game-session.test.ts_

- [ ] 4.2.1 创建 `src/server/__tests__/game-session.test.ts`，编写游戏会话测试
  - 测试 GameSession 创建
  - 测试游戏启动
  - 测试输入注入（正常输入、超时）
  - 测试状态广播
  - 测试游戏停止
  - Done: 游戏会话测试通过

---

## 5. 服务器入口模块

### 5.1 实现服务器入口和消息路由
_Boundary: src/server/index.ts_

- [ ] 5.1.1 创建 `src/server/index.ts`，实现服务器入口
  - 实现服务器配置（PORT 环境变量）
  - 创建 ConnectionManager 和 RoomManager 实例
  - 实现连接事件处理（onConnect, onDisconnect）
  - 实现 connectionToPlayer 映射管理
  - Done: 服务器入口基础结构完成

- [ ] 5.1.2 实现消息路由处理器
  - 实现 `handleMessage(connectionId, message)` 函数
  - 实现 create_room 消息处理
  - 实现 join_room 消息处理
  - 实现 leave_room 消息处理
  - 实现 list_rooms 消息处理
  - 实现 start_game 消息处理
  - 实现 player_input 消息处理
  - 实现 get_state 消息处理
  - 实现 ping 消息处理
  - 实现未知消息类型处理
  - Done: 消息路由处理器完成

- [ ] 5.1.3 实现服务器启动和关闭
  - 实现服务器启动（connectionManager.start(PORT)）
  - 实现优雅关闭（SIGINT 信号处理）
  - 验证服务器可正常启动和关闭
  - Done: 服务器启动和关闭功能正常

### 5.2 编写服务器入口集成测试
_Boundary: src/server/__tests__/integration.test.ts_

- [ ] 5.2.1 创建 `src/server/__tests__/integration.test.ts`，编写集成测试
  - 测试完整流程：创建房间 → 加入房间 → 开始游戏 → 游戏结束
  - 测试多客户端连接和交互
  - 测试消息路由的正确性
  - Done: 服务器入口集成测试通过

---

## 6. 项目配置和依赖

### 6.1 配置 WebSocket 依赖
_Boundary: package.json, tsconfig.json_

- [ ] 6.1.1 更新项目配置
  - 在 package.json 中添加 ws 依赖
  - 在 package.json 中添加 @types/ws 开发依赖
  - 在 tsconfig.json 中配置 server 目录的编译选项
  - 验证依赖安装成功
  - Done: WebSocket 依赖配置完成

- [ ] 6.1.2 配置服务器启动脚本
  - 在 package.json 中添加 dev:server 脚本
  - 在 package.json 中添加 build:server 脚本
  - 验证脚本可正常执行
  - Done: 服务器启动脚本配置完成

---

## 7. 连接管理测试

### 7.1 编写连接管理单元测试
_Boundary: src/server/__tests__/connection.test.ts_

- [ ] 7.1.1 编写 WebSocket 服务器启动测试
  - 测试服务器在指定端口启动
  - 测试服务器接受连接
  - 测试连接 ID 分配
  - Done: 服务器启动测试通过

- [ ] 7.1.2 编写消息收发测试
  - 测试发送消息给指定连接
  - 测试广播消息给房间内所有连接
  - 测试消息序列化/反序列化
  - Done: 消息收发测试通过

- [ ] 7.1.3 编写连接生命周期测试
  - 测试连接建立事件
  - 测试连接断开事件
  - 测试心跳检测
  - 测试连接清理
  - Done: 连接生命周期测试通过

---

## 8. 房间管理测试

### 8.1 编写房间管理单元测试
_Boundary: src/server/__tests__/room.test.ts_

- [ ] 8.1.1 编写房间创建测试
  - 测试房间 ID 生成
  - 测试房间状态初始化
  - 测试事件触发
  - Done: 房间创建测试通过

- [ ] 8.1.2 编写房间加入测试
  - 测试正常加入
  - 测试房间不存在
  - 测试房间已满
  - 测试游戏已开始
  - 测试玩家名重复
  - Done: 房间加入测试通过

- [ ] 8.1.3 编写房间离开测试
  - 测试正常离开
  - 测试房间自动销毁（空房间）
  - Done: 房间离开测试通过

- [ ] 8.1.4 编写房间状态管理测试
  - 测试玩家断线标记
  - 测试玩家重连标记
  - 测试房间列表
  - Done: 房间状态管理测试通过

---

## 9. 游戏会话测试

### 9.1 编写游戏会话单元测试
_Boundary: src/server/__tests__/game-session.test.ts_

- [ ] 9.1.1 编写游戏会话创建测试
  - 测试 Game 实例创建
  - 测试 room.gameSession 设置
  - Done: 游戏会话创建测试通过

- [ ] 9.1.2 编写输入注入测试
  - 测试 waitForInput 等待输入
  - 测试 handlePlayerInput 解析输入
  - 测试超时处理
  - Done: 输入注入测试通过

- [ ] 9.1.3 编写状态广播测试
  - 测试 getState 获取状态
  - 测试状态广播定时器
  - Done: 状态广播测试通过

---

## 10. 集成测试

### 10.1 编写端到端集成测试
_Boundary: src/server/__tests__/integration.test.ts_

- [ ] 10.1.1 编写完整游戏流程测试
  - 创建房间 → 加入房间 → 开始游戏 → 游戏结束
  - 验证消息序列的正确性
  - Done: 完整游戏流程测试通过

- [ ] 10.1.2 编写多客户端测试
  - 多个客户端同时连接
  - 多个客户端同时操作
  - 验证状态同步
  - Done: 多客户端测试通过

- [ ] 10.1.3 编写错误恢复测试
  - 测试无效消息处理
  - 测试房间不存在处理
  - 测试游戏未开始处理
  - Done: 错误恢复测试通过

---

## 11. 文档和类型导出

### 11.1 创建模块导出
_Boundary: src/shared/network/index.ts, src/server/index.ts_

- [ ] 11.1.1 创建 `src/shared/network/index.ts`，导出协议类型
  - 导出 ClientMessage 类型
  - 导出 ServerMessage 类型
  - 导出辅助类型（PlayerInfo, RoomInfo, GameState 等）
  - 导出工具函数（createMessage, parseMessage, createErrorMessage）
  - Done: 协议模块导出完成

- [ ] 11.1.2 确保服务器模块导出正确
  - 导出 ConnectionManager 类
  - 导出 RoomManager 类
  - 导出 GameSession 类
  - Done: 服务器模块导出完成

---

## 12. 最终验证

### 12.1 运行所有测试

- [ ] 12.1.1 运行所有单元测试
  - 运行消息协议测试
  - 运行连接管理测试
  - 运行房间管理测试
  - 运行游戏会话测试
  - 确保所有测试通过
  - Done: 所有单元测试通过

- [ ] 12.1.2 运行所有集成测试
  - 运行服务器入口集成测试
  - 运行端到端集成测试
  - 确保所有测试通过
  - Done: 所有集成测试通过

### 12.2 验证代码编译

- [ ] 12.2.1 验证所有模块可编译
  - 运行 TypeScript 编译器检查所有文件
  - 修复任何类型错误
  - Done: 所有模块编译通过

- [ ] 12.2.2 验证服务器可启动
  - 启动 WebSocket 服务器
  - 验证服务器监听指定端口
  - 验证服务器可接受连接
  - Done: 服务器可正常启动

### 12.3 验证与上游集成

- [ ] 12.3.1 验证与 game-flow 模块的集成
  - 验证 Game 类可被正确实例化
  - 验证 Game.run() 可被正确调用
  - 验证输入注入机制可正常工作
  - Done: 与 game-flow 集成正常

---

## 任务依赖关系

```
1.1 消息协议类型 ──┐
                    ├── 1.2 协议测试
                    │
2.1 连接管理核心 ──┐
                    ├── 2.2 事件处理器
                    │        │
                    │        ├── 2.3 连接测试
                    │        │
                    │        └── 5.1 服务器入口
                    │
3.1 房间管理核心 ──┐
                    ├── 3.2 事件处理器
                    │        │
                    │        ├── 3.3 房间测试
                    │        │
                    │        └── 5.1 服务器入口
                    │
4.1 游戏会话核心 ──┐
                    ├── 4.2 游戏会话测试
                    │        │
                    │        └── 5.1 服务器入口
                    │
6.1 项目配置 ──────┐
                    └── 5.1 服务器入口
                              │
                              ├── 5.2 集成测试
                              │
                              ├── 7.1 连接测试
                              │
                              ├── 8.1 房间测试
                              │
                              ├── 9.1 游戏会话测试
                              │
                              ├── 10.1 端到端测试
                              │
                              ├── 11.1 模块导出
                              │
                              └── 12.1-12.3 最终验证
```

## 并行任务标记

以下任务满足并行条件，可同时执行：

- **(P)** 1.1 消息协议类型 + 1.2 协议测试（协议定义独立，可并行）
- **(P)** 2.1 连接管理核心 + 3.1 房间管理核心（管理器独立，可并行）
- **(P)** 2.3 连接测试 + 3.3 房间测试 + 4.2 游戏会话测试（测试用例独立，可并行）
- **(P)** 7.1 连接测试 + 8.1 房间测试 + 9.1 游戏会话测试（单元测试独立，可并行）

## 测试覆盖矩阵

| Requirement | Task IDs | Test Coverage |
|-------------|----------|---------------|
| 1. WebSocket 服务器基础框架 | 2.1, 2.2, 5.1 | 2.3, 7.1 |
| 2. 消息协议 | 1.1 | 1.2 |
| 3. 房间管理 | 3.1, 3.2 | 3.3, 8.1 |
| 4. 游戏会话托管 | 4.1 | 4.2, 9.1 |
| 5. 多客户端状态同步 | 2.1, 4.1 | 2.3, 10.1 |
| 6. 断线处理 | 2.1, 3.1 | 2.3, 8.1 |
| 7. 服务端与 Game 实例集成 | 4.1, 5.1 | 4.2, 10.1, 12.3 |
