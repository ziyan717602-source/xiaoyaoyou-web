# Roadmap: 仙剑逍遥游网页联机版

## Overview

将 C# WPF 桌面版逍遥游（psd48，67K 行代码）翻译为 TypeScript + React 网页联机版。采用水平分层策略：先翻译数据层和类型定义，再翻译核心游戏模型，然后翻译游戏引擎和卡牌效果，最后实现联机服务端和客户端 UI。

## Approach Decision

- **Chosen**: 水平分层（Horizontal Layering）
- **Why**: 翻译工作集中在同一技术层，可以集中处理 C#→TS 的类型映射和模式转换。每个 spec 完成后产出可编译的 TypeScript 模块。
- **Rejected alternatives**: 垂直切片（每个 spec 跨多层，翻译工作分散，不利于统一处理翻译模式）

## Scope

- **In**: 标准版 + 凤鸣玉誓扩展包的全部卡牌（34 角色、20 怪物、范围内手牌/NPC/事件）、2/4/6 人联机、WebSocket 通信、React 响应式 UI
- **Out**: 高级选将模式、聊天/好友/排行、音效动画、数据持久化、AI 对手（测试用除外）

## Constraints

- TypeScript + React 18 + Vite + Node.js + WebSocket
- 游戏逻辑放在 src/shared/，前后端共享
- 服务端权威架构
- 保持原版字符串命令协议（G0OH 等）
- 数据从 psd.db3 导出为 JSON

## Boundary Strategy

- **Why this split**: 水平分层让翻译工作按技术复杂度递增，每层都可独立编译验证
- **Shared seams to watch**: 类型定义层是所有后续层的基础，必须最先完成且保持稳定

## Specs (dependency order)

- [x] data-layer -- 类型定义 + JSON 数据导出。Dependencies: none
- [x] core-models -- 翻译 PSDBase（Board, Player, Card, Skill 等数据模型）。Dependencies: data-layer
- [x] game-engine -- 翻译 XIG/XIR/XI（事件系统、回合管理、游戏初始化）。Dependencies: core-models
- [x] card-effects -- 翻译 JNS/ 卡牌效果实现。Dependencies: core-models, game-engine
- [x] game-flow -- 完整游戏流程集成（选将→摸牌→出牌→战斗→结算）。Dependencies: core-models, game-engine, card-effects
- [x] network-server -- WebSocket 服务器 + 房间管理 + 游戏会话。Dependencies: game-flow
- [x] client-ui -- React 前端 UI（大厅、房间、游戏界面）。Dependencies: network-server, game-flow
