# Brief: network-server

## Problem
实现 WebSocket 服务器，支持多客户端连接、房间管理和游戏会话托管。

## Current State
- 游戏逻辑已就绪（game-flow 完成）
- 无网络通信
- 无房间管理

## Desired Outcome
- WebSocket 服务器可运行
- 支持创建/加入/列出房间
- 游戏会话托管 XI 引擎
- 多客户端状态同步
- 断线处理

## Approach
1. 实现 WebSocket 服务器基础框架
2. 实现消息协议（序列化/反序列化）
3. 实现房间管理（创建/加入/列表/开始）
4. 实现游戏会话（托管 Game 实例、处理客户端消息、广播状态）
5. 实现断线处理

## Scope
- **In**: WebSocket 服务器、消息协议、房间管理、游戏会话
- **Out**: 客户端 UI

## Boundary Candidates
- src/server/index.ts — 服务器入口
- src/server/connection.ts — 连接管理
- src/server/room.ts — 房间管理
- src/server/game-session.ts — 游戏会话
- src/shared/network/protocol.ts — 消息协议

## Out of Boundary
- React 客户端（client-ui）
- 游戏逻辑修改

## Upstream / Downstream
- **Upstream**: game-flow（托管 Game 实例）
- **Downstream**: client-ui（通过 WebSocket 连接）

## Existing Spec Touchpoints
- **依赖**: game-flow

## Constraints
- 服务端权威架构
- 单进程，无分布式需求
- JSON 消息格式
