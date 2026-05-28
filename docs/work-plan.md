# 工作计划

## 总览

| 阶段 | 内容 | 预计工期 | 产出 |
|------|------|---------|------|
| Phase 0 | 项目搭建 | 1 天 | 项目骨架、依赖、配置 |
| Phase 1 | 数据层 | 1-2 天 | 类型定义、JSON 数据、数据加载 |
| Phase 2 | 核心引擎 | 3-5 天 | Board、Player、Card、事件系统 |
| Phase 3 | 卡牌效果 | 3-4 天 | 范围内所有卡牌效果 |
| Phase 4 | 游戏流程 | 2-3 天 | 完整回合流程、选将、战斗 |
| Phase 5 | 服务端 | 2-3 天 | WebSocket 服务器、房间管理 |
| Phase 6 | 客户端 | 3-5 天 | React UI、响应式适配 |
| Phase 7 | 联调测试 | 2-3 天 | 联机测试、AI 对局、Bug 修复 |
| **合计** | | **17-26 天** | |

---

## Phase 0：项目搭建（1 天）

### 任务清单

- [ ] 初始化 npm 项目（`npm init`）
- [ ] 安装依赖：
  ```
  # 开发依赖
  typescript, vite, vitest, @types/node, tsx
  
  # 前端
  react, react-dom, @types/react, @types/react-dom
  
  # 后端
  ws, @types/ws, better-sqlite3, @types/better-sqlite3
  
  # 工具
  concurrently
  ```
- [ ] 配置 TypeScript（`tsconfig.json`）
- [ ] 配置 Vite（`vite.config.ts`）
- [ ] 配置 Vitest（`vitest.config.ts`）
- [ ] 创建项目目录结构
- [ ] 编写 `package.json` scripts
- [ ] 验证 `npm run dev` 和 `npm run test` 可用

### 产出

```
xiaoyaoyou-web/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── src/
│   ├── shared/
│   ├── client/
│   └── server/
└── scripts/
```

---

## Phase 1：数据层（1-2 天）

### 1.1 类型定义（半天）

定义所有核心数据结构的 TypeScript 类型：

- [ ] `src/shared/types/card.ts` — 卡牌类型枚举、接口
- [ ] `src/shared/types/player.ts` — 玩家状态接口
- [ ] `src/shared/types/board.ts` — 游戏板状态接口
- [ ] `src/shared/types/skill.ts` — 技能接口
- [ ] `src/shared/types/event.ts` — 事件消息接口
- [ ] `src/shared/types/network.ts` — 网络消息接口

### 1.2 数据导出（半天）

从 psd.db3 导出 JSON 数据：

- [ ] 编写 `scripts/export-db.ts`
- [ ] 导出 `heroes.json`（34 个角色）
- [ ] 导出 `tux.json`（范围内手牌）
- [ ] 导出 `monsters.json`（20 个怪物）
- [ ] 导出 `npcs.json`（26 个 NPC）
- [ ] 导出 `events.json`（14 个事件）
- [ ] 导出 `skills.json`（范围内技能）
- [ ] 导出 `runes.json`、`exsp.json`、`ops.json`
- [ ] 导出场景牌、魔主牌、危机牌数据

### 1.3 数据加载（半天）

- [ ] `src/shared/data/loader.ts` — JSON 数据加载器
- [ ] `src/shared/data/index.ts` — 统一数据导出
- [ ] 验证数据完整性（数量、字段）

### 产出

- 10+ 个 JSON 数据文件
- 完整的 TypeScript 类型定义
- 数据加载模块

---

## Phase 2：核心引擎（3-5 天）

### 2.1 基础模型（1 天）

翻译 PSDBase 模块：

- [ ] `src/shared/game/card/card.ts` ← Card.cs（枚举、工具方法）
- [ ] `src/shared/game/card/tux.ts` ← Tux.cs（手牌类、委托系统）
- [ ] `src/shared/game/card/monster.ts` ← Monster.cs（怪物类、SPI 系统）
- [ ] `src/shared/game/card/hero.ts` ← Hero.cs（角色类）
- [ ] `src/shared/game/card/npc.ts` ← Npc.cs
- [ ] `src/shared/game/card/evenement.ts` ← Evenement.cs
- [ ] `src/shared/game/card/rune.ts` ← Rune.cs
- [ ] `src/shared/game/player.ts` ← Player.cs（玩家状态、Diva、位掩码）
- [ ] `src/shared/game/board.ts` ← Board.cs（游戏板、牌堆、战斗状态）
- [ ] `src/shared/game/skill.ts` ← Skill.cs + Bless
- [ ] `src/shared/game/sk-branch.ts` ← SKBranch.cs（技能分支解析）

### 2.2 规则模块（半天）

- [ ] `src/shared/game/rules/casting.ts` ← Casting.cs（选将系统）
- [ ] `src/shared/game/rules/rule-code.ts` ← RuleCode.cs（常量）

### 2.3 事件系统（1-2 天）— 最关键

翻译 XIG.cs（G-Loop 事件引擎）：

- [ ] `src/shared/game/engine/event-bus.ts` — 事件总线（sk02 注册表）
- [ ] `src/shared/game/engine/g-loop.ts` ← XIG.cs（核心事件循环）
  - [ ] RaiseGMessage 路由
  - [ ] InnerGMessage 优先级解析
  - [ ] SimpleGMessage 基础命令
  - [ ] SimpleGMessage100 底层命令
  - [ ] SkTriple/SKE 解析系统
  - [ ] 玩家输入处理
- [ ] `src/shared/game/engine/round.ts` ← XIR.cs（回合状态机）
  - [ ] RunRound 主循环
  - [ ] 各阶段实现（00→OC→ST→...→ED）
  - [ ] RunQuadStage / RunQuadMixedStage
- [ ] `src/shared/game/engine/xi.ts` ← XI.cs（游戏初始化、技能注册）
  - [ ] MappingSksp 事件注册
  - [ ] 牌堆构建
  - [ ] SelectHero 选将流程

### 2.4 Artiad 模块（半天）

翻译游戏动作解析器：

- [ ] `src/shared/game/engine/artiad/harm.ts`
- [ ] `src/shared/game/engine/artiad/cure.ts`
- [ ] `src/shared/game/engine/artiad/procedure.ts`
- [ ] 其他 Artiad 组件（按需）

### 2.5 工具模块（半天）

- [ ] `src/shared/game/utils/rueue.ts` ← Rueue.cs（双端队列）
- [ ] `src/shared/game/utils/diva.ts` ← Diva（动态 KV 存储）
- [ ] `src/shared/game/utils/priority-queue.ts` ← PriorityQueue.cs
- [ ] `src/shared/game/utils/uf-set.ts` ← UFSet.cs（并查集）
- [ ] `src/shared/game/utils/algo.ts` ← Algo.cs（算法工具）

### 产出

- 完整的游戏核心引擎
- 事件系统可独立运行
- 回合状态机可执行

---

## Phase 3：卡牌效果（3-4 天）

### 3.1 效果注册框架（半天）

- [ ] `src/shared/game/effects/types.ts` — CardEffect 接口
- [ ] `src/shared/game/effects/registry.ts` — 效果注册表
- [ ] `src/shared/game/effects/base.ts` — 通用效果工具函数

### 3.2 手牌效果（1-2 天）

翻译 JP06.cs、CZ02.cs 等：

- [ ] 武器牌效果（6 张）
- [ ] 防具牌效果（6 张）
- [ ] 技牌效果（9 张）
- [ ] 战牌效果（7 张）
- [ ] 特殊牌效果（7 张）
- [ ] 成长牌效果

### 3.3 角色技能（1-2 天）

翻译 JNS/ 目录下的技能实现：

- [ ] 仙剑一角色技能（7 角色）
- [ ] 仙剑二角色技能（5 角色）
- [ ] 仙剑三角色技能（3+2 角色）
- [ ] 仙剑三外传角色技能（4 角色）
- [ ] 仙剑四角色技能（5 角色）
- [ ] 仙剑五角色技能（2+6 角色）

### 3.4 其他效果（半天）

- [ ] NPC 效果（NC303.cs）
- [ ] 事件效果
- [ ] 魔主效果
- [ ] 危机效果
- [ ] 符文效果（SF09.cs）

### 产出

- 所有范围内卡牌效果实现
- 效果注册表完整
- 每个效果有对应单元测试

---

## Phase 4：游戏流程（2-3 天）

### 4.1 完整游戏流程（1-2 天）

- [ ] `src/shared/game/game.ts` — Game 类，串联所有模块
- [ ] 游戏初始化流程
- [ ] 选将流程
- [ ] 发牌流程
- [ ] 回合主循环
- [ ] 战斗流程
- [ ] 结算流程
- [ ] 胜负判定
- [ ] 游戏结束处理

### 4.2 AI 玩家（1 天）

- [ ] `src/shared/game/ai/random-ai.ts` — 随机策略 AI
- [ ] `src/shared/game/ai/greedy-ai.ts` — 贪心策略 AI
- [ ] `src/shared/game/ai/rule-ai.ts` — 规则策略 AI
- [ ] AI 决策接口实现

### 产出

- 可独立运行的游戏逻辑
- AI 玩家可自动对局
- 单元测试覆盖核心流程

---

## Phase 5：服务端（2-3 天）

### 5.1 WebSocket 服务器（1 天）

- [ ] `src/server/index.ts` — 服务器入口
- [ ] `src/server/connection.ts` — 客户端连接管理
- [ ] `src/shared/network/protocol.ts` — 消息协议定义
- [ ] `src/shared/network/serialize.ts` — 消息序列化

### 5.2 房间管理（半天）

- [ ] `src/server/room.ts` — 房间创建/加入/列表
- [ ] `src/server/room-manager.ts` — 房间管理器

### 5.3 游戏会话（1 天）

- [ ] `src/server/game-session.ts` — 游戏会话（托管 XI 引擎）
- [ ] 客户端消息处理
- [ ] 游戏状态广播
- [ ] 断线处理

### 5.4 服务端测试（半天）

- [ ] 连接管理测试
- [ ] 房间管理测试
- [ ] 游戏会话测试
- [ ] 多客户端并发测试

### 产出

- 可运行的 WebSocket 服务器
- 完整的房间管理
- 游戏会话托管

---

## Phase 6：客户端（3-5 天）

### 6.1 页面结构（半天）

- [ ] `src/client/App.tsx` — 主应用
- [ ] `src/client/pages/Lobby.tsx` — 大厅页
- [ ] `src/client/pages/Room.tsx` — 房间页
- [ ] `src/client/pages/Game.tsx` — 游戏页

### 6.2 游戏 UI 组件（2-3 天）

- [ ] `src/client/components/game/Board.tsx` — 游戏桌面
- [ ] `src/client/components/game/HandArea.tsx` — 手牌区
- [ ] `src/client/components/game/CardSlot.tsx` — 卡牌槽位
- [ ] `src/client/components/game/PlayerInfo.tsx` — 玩家信息
- [ ] `src/client/components/game/BattleArea.tsx` — 战场区
- [ ] `src/client/components/game/ActionPanel.tsx` — 操作面板
- [ ] `src/client/components/game/HeroSelect.tsx` — 选将界面
- [ ] `src/client/components/game/EventLog.tsx` — 事件日志

### 6.3 大厅 UI 组件（半天）

- [ ] `src/client/components/lobby/RoomList.tsx` — 房间列表
- [ ] `src/client/components/lobby/CreateRoom.tsx` — 创建房间
- [ ] `src/client/components/lobby/JoinRoom.tsx` — 加入房间

### 6.4 样式和适配（1 天）

- [ ] CSS 样式（响应式布局）
- [ ] 移动端适配（触摸操作）
- [ ] 卡牌图片加载和显示

### 产出

- 完整的 Web UI
- PC 和移动端可用
- 响应式布局

---

## Phase 7：联调测试（2-3 天）

### 7.1 联机联调（1 天）

- [ ] 前后端联调
- [ ] 多客户端联机测试
- [ ] 状态同步验证
- [ ] 断线重连测试

### 7.2 AI 对局测试（1 天）

- [ ] 2 人 AI 对局 × 100 局
- [ ] 4 人 AI 对局 × 100 局
- [ ] 全角色覆盖测试
- [ ] 全手牌覆盖测试
- [ ] 全怪物覆盖测试
- [ ] 全事件覆盖测试

### 7.3 Bug 修复（1 天）

- [ ] 修复 AI 对局发现的问题
- [ ] 修复联机同步问题
- [ ] 修复 UI 交互问题

### 产出

- 稳定可玩的联机版本
- AI 测试报告
- Bug 修复记录

---

## 风险和应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| G-Loop 翻译出错 | 高 | 高 | 用 AI 对局测试验证，逐阶段对比原版 |
| 卡牌效果翻译遗漏 | 中 | 中 | 用覆盖测试确保所有效果可触发 |
| 网络同步问题 | 中 | 中 | 先本地测试，再联机 |
| 移动端适配问题 | 低 | 低 | 优先保证 PC 可用，移动端后续优化 |
| 原版代码难以理解 | 中 | 高 | 使用 dnSpy 反编译查看，必要时运行原版调试 |
