# Brief: client-ui

## Problem
实现 React 前端 UI，支持 PC 和移动端浏览器联机对战。

## Current State
- 服务端已就绪（network-server 完成）
- 游戏逻辑可运行
- 无用户界面

## Desired Outcome
- 大厅页面：创建/加入房间、房间列表
- 游戏页面：完整游戏界面（手牌区、战场区、操作面板）
- 响应式布局：PC 和移动端适配
- 卡牌图片正确显示

## Approach
1. 实现页面路由和布局
2. 实现大厅 UI（房间列表、创建/加入房间）
3. 实现游戏 UI（桌面、手牌、战斗、操作）
4. 实现 WebSocket 客户端连接
5. 实现响应式适配和触摸操作

## Scope
- **In**: React 组件、页面路由、WebSocket 客户端、响应式布局、卡牌图片
- **Out**: 音效、动画特效、复杂交互

## Boundary Candidates
- src/client/App.tsx — 主应用
- src/client/pages/ — 页面组件
- src/client/components/game/ — 游戏 UI 组件
- src/client/components/lobby/ — 大厅 UI 组件
- src/client/hooks/ — React hooks

## Out of Boundary
- 游戏逻辑
- 服务端代码

## Upstream / Downstream
- **Upstream**: network-server（WebSocket 连接）、game-flow（游戏状态定义）
- **Downstream**: 无（最终产出）

## Existing Spec Touchpoints
- **依赖**: network-server, game-flow

## Constraints
- 响应式布局适配 PC 和移动端
- 使用现有 PNG 素材
- 仅中文界面
- 仅保留基础过渡动画
