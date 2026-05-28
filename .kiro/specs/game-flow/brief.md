# Brief: game-flow

## Problem
将所有模块串联为完整的游戏流程，实现从创建游戏到结束的完整链路，并提供 AI 玩家用于自动测试。

## Current State
- 核心模型、引擎、卡牌效果已就绪
- 各模块可独立运行但未集成
- 无完整游戏流程

## Desired Outcome
- 可独立运行的完整游戏（无 UI、无网络）
- AI 玩家可自动完成一局游戏
- 单元测试覆盖核心流程
- 100 局 AI 对局无崩溃

## Approach
1. 编写 Game 类，串联所有模块
2. 实现完整游戏流程：创建→选将→发牌→回合循环→结算
3. 实现 AI 玩家（随机/贪心/规则策略）
4. 编写集成测试
5. 运行 AI 对局压力测试

## Scope
- **In**: Game 类、完整游戏流程、AI 玩家、集成测试
- **Out**: 网络层、UI

## Boundary Candidates
- src/shared/game/game.ts — Game 主类
- src/shared/game/ai/ — AI 玩家实现
- src/shared/game/__tests__/ — 集成测试

## Out of Boundary
- WebSocket 通信（network-server）
- React UI（client-ui）

## Upstream / Downstream
- **Upstream**: core-models, game-engine, card-effects
- **Downstream**: network-server（托管 Game 实例）、client-ui（显示游戏状态）

## Existing Spec Touchpoints
- **依赖**: core-models, game-engine, card-effects

## Constraints
- AI 玩家只在服务端运行
- 测试用固定随机种子确保可重复
- 100 局 AI 对局必须全部正常结束
