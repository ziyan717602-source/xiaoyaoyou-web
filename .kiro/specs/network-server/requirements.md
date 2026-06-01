# Requirements Document

## Introduction

本模块实现 WebSocket 服务器，支持多客户端连接、房间管理和游戏会话托管。通过 WebSocket 协议实现客户端与服务端的实时通信，支持创建/加入/列出房间、启动游戏会话、多客户端状态同步以及断线处理。服务端作为权威架构，托管 Game 实例并管理所有游戏状态。

## Requirements

### Requirement 1: WebSocket 服务器基础框架

**Objective:** 作为联机服务的基础，需要一个可运行的 WebSocket 服务器接受客户端连接。

#### Acceptance Criteria

1. When 服务器启动时，network-server 系统 shall 在指定端口监听 WebSocket 连接。
2. When 客户端发起 WebSocket 连接时，network-server 系统 shall 接受连接并分配唯一的连接标识。
3. When 客户端发送 JSON 消息时，network-server 系统 shall 解析消息并路由到对应的处理器。
4. When 服务器运行中发生异常时，network-server 系统 shall 记录错误日志而不崩溃。
5. Where 服务器需要优雅关闭时，network-server 系统 shall 通知所有已连接客户端并关闭连接。

### Requirement 2: 消息协议

**Objective:** 作为客户端与服务端的通信契约，需要定义统一的消息格式和类型系统。

#### Acceptance Criteria

1. When 客户端发送请求消息时，network-server 系统 shall 要求消息包含 type 字段标识消息类型。
2. When 服务端发送响应消息时，network-server 系统 shall 使用统一的 JSON 格式（包含 type、payload 字段）。
3. When 消息解析失败时，network-server 系统 shall 返回错误响应并保持连接。
4. When 收到未知类型的消息时，network-server 系统 shall 返回"未知消息类型"错误。
5. Where 消息需要关联请求时，network-server 系统 shall 支持 requestId 字段进行请求-响应配对。

### Requirement 3: 房间管理

**Objective:** 作为多人游戏的前提，玩家需要能够创建、加入、浏览和管理游戏房间。

#### Acceptance Criteria

1. When 客户端发送创建房间请求时，network-server 系统 shall 创建新房间并返回房间 ID。
2. When 客户端发送加入房间请求时，network-server 系统 shall 将客户端添加到指定房间并更新房间状态。
3. When 客户端发送列出房间请求时，network-server 系统 shall 返回当前所有可用房间列表（含房间 ID、玩家数、状态）。
4. When 房间内所有玩家离开时，network-server 系统 shall 自动销毁该房间。
5. When 客户端发送离开房间请求时，network-server 系统 shall 将客户端从房间移除并通知房间内其他玩家。
6. When 房间已满时，network-server 系统 shall 拒绝新的加入请求并返回"房间已满"错误。
7. When 房间已开始游戏时，network-server 系统 shall 拒绝新的加入请求并返回"游戏已开始"错误。

### Requirement 4: 游戏会话托管

**Objective:** 作为服务端权威架构，服务端需要托管 Game 实例并管理游戏生命周期。

#### Acceptance Criteria

1. When 房主发送开始游戏请求时，network-server 系统 shall 创建 Game 实例并启动游戏流程。
2. When 游戏需要玩家输入时（选将、出牌、战斗等），network-server 系统 shall 通过 WebSocket 向对应客户端发送输入请求。
3. When 客户端发送玩家操作时，network-server 系统 shall 将操作注入 Game 实例并验证操作合法性。
4. When 游戏状态发生变化时，network-server 系统 shall 向房间内所有客户端广播最新游戏状态。
5. When 游戏结束时，network-server 系统 shall 广播游戏结果并清理游戏会话。
6. Where 房间支持 2/4/6 人游戏时，network-server 系统 shall 根据房间配置创建对应数量的玩家。

### Requirement 5: 多客户端状态同步

**Objective:** 作为联机游戏的核心体验，所有客户端需要看到一致的游戏状态。

#### Acceptance Criteria

1. When 游戏状态更新时，network-server 系统 shall 向房间内所有已连接客户端发送状态快照。
2. When 客户端连接/断开时，network-server 系统 shall 更新房间内玩家列表并通知其他客户端。
3. When 客户端请求游戏状态时，network-server 系统 shall 返回当前完整的游戏状态。
4. When 客户端收到状态更新时，客户端应能基于最新状态渲染游戏界面（由 client-ui 模块实现）。

### Requirement 6: 断线处理

**Objective:** 作为联机游戏的健壮性要求，系统需要处理客户端意外断开的情况。

#### Acceptance Criteria

1. When 客户端意外断开连接时，network-server 系统 shall 标记该玩家为"已断线"并通知房间内其他玩家。
2. When 断线玩家在超时时间内重新连接时，network-server 系统 shall 恢复其游戏会话并同步当前状态。
3. When 断线玩家超过超时时间未重连时，network-server 系统 shall 将该玩家视为离场并继续游戏。
4. When 所有客户端都断开连接时，network-server 系统 shall 销毁对应房间。
5. Where 游戏进行中玩家断线时，network-server 系统 shall 保持游戏状态不变，等待重连或超时处理。

### Requirement 7: 服务端与 Game 实例集成

**Objective:** 作为 game-flow 模块的下游，network-server 需要正确托管和管理 Game 实例。

#### Acceptance Criteria

1. When 创建游戏会话时，network-server 系统 shall 使用 game-flow 的 Game 类创建游戏实例。
2. When 游戏需要玩家输入时，network-server 系统 shall 通过 Game 类的事件/回调机制注入玩家操作。
3. When 查询游戏状态时，network-server 系统 shall 通过 Game 类的 getBoard()、getPlayers() 等方法获取状态。
4. When 游戏结束时，network-server 系统 shall 接收 GameResult 并广播给客户端。

### Scope Boundary

**包含（In）**:
- WebSocket 服务器基础框架（连接管理、消息路由）
- 消息协议定义（JSON 格式、类型系统）
- 房间管理（创建/加入/列表/离开/销毁）
- 游戏会话托管（Game 实例管理、输入注入、状态广播）
- 多客户端状态同步
- 断线处理（检测、重连、超时）
- 服务端与 Game 实例集成

**不包含（Out）**:
- 客户端 UI（React 前端界面，属于 client-ui 模块）
- 游戏逻辑修改（属于 game-flow 模块）
- 用户认证/鉴权系统
- 数据持久化/数据库
- 分布式部署/负载均衡
- 聊天/好友/排行榜功能
