# 仙剑奇侠传：逍遥游 — 网页联机版

将 C# WPF 桌面版逍遥游（psd48）重写为 TypeScript + React 网页版，支持 PC/移动端浏览器多人联机对战。

## 开发范围

**正式版 + 凤鸣玉誓扩展包**，具体内容：

| 类别 | 数量 | 说明 |
|------|------|------|
| 英雄 | 34 | 26 正式版 + 8 凤鸣玉誓 |
| 怪物 | 20 | 5属性×4 |
| 手牌 | 56 | 15技牌 + 17战牌 + 14特殊牌 + 10装备 |
| NPC | 26 | 对应26张基础角色 |
| 事件 | 14 | |

**游戏模式：** 基础模式（随机选将），不包含 BP/自定义模式

**人数：** 2人(1v1)、4人(2v2)、6人(3v3)

## 技术栈

- **前端：** React 18 + TypeScript + Vite 6
- **后端：** Node.js + TypeScript + ws (WebSocket)
- **数据：** JSON（从 psd.db3 导出）
- **测试：** Vitest + @testing-library/react
- **参考源码：** psd48-master（C# WPF 原版）

## 项目结构

```
xiaoyaoyou-web/
├── src/
│   ├── shared/               # 前后端共享代码
│   │   ├── types/            # TypeScript 类型定义（枚举、接口）
│   │   ├── game/             # 游戏核心逻辑
│   │   │   ├── board.ts      # 棋盘状态
│   │   │   ├── player.ts     # 玩家状态
│   │   │   ├── skill.ts      # 技能系统
│   │   │   ├── card/         # 卡牌类（英雄、怪物、手牌、NPC、事件）
│   │   │   ├── rules/        # 规则系统（施法、伤害计算）
│   │   │   ├── engine/       # 游戏引擎（XI、XIG、XIR、G-Loop、Artiad）
│   │   │   ├── effects/      # 卡牌效果实现（JNS 系列）
│   │   │   ├── ai/           # AI 策略（Random、Greedy、Rule）
│   │   │   └── lib/          # 数据库封装（英雄库、怪物库、手牌库等）
│   │   ├── data/             # 卡牌数据 JSON
│   │   └── network/          # 网络协议定义
│   ├── client/               # React 前端
│   │   ├── pages/            # 页面（主页、房间、游戏、结算）
│   │   ├── components/       # 组件（手牌区、战斗区、InputController 等）
│   │   ├── hooks/            # Hooks（useGameState、useRoom、useWebSocket）
│   │   ├── utils/            # 工具（format-parser 格式解析器）
│   │   ├── styles/           # CSS 样式
│   │   └── contexts/         # WebSocket 上下文
│   └── server/               # Node.js 服务端
│       ├── index.ts          # WebSocket 服务器入口 + 消息路由
│       ├── room.ts           # 房间管理
│       ├── connection.ts     # 连接管理（心跳、广播）
│       └── game-session.ts   # 游戏会话（托管引擎、状态广播）
├── docs/                     # 文档
│   ├── scope.md              # 开发范围边界
│   ├── consolidated/         # 整合后的权威文档
│   │   ├── card-info.md      # 卡牌数据（56手牌+20怪物+26NPC+14事件）
│   │   └── game-flow.md      # 游戏流程（28个回合阶段）
│   ├── engine-comparison.md  # 引擎对比审查（WPF vs Web）
│   ├── wpf-vs-web-comparison.md  # 前端+引擎全面对比
│   ├── translation-rules.md  # C#→TS 翻译规则
│   └── screenshots/          # 关键截图
├── scripts/
│   └── export-db.ts          # 从 psd.db3 导出 JSON 数据
└── package.json
```

## 核心架构

```
┌─────────────────────────────────────┐
│           React Client              │
│  手牌区 / 角色区 / 战场区 / 操作区    │
│         WebSocket 连接              │
└──────────────┬──────────────────────┘
               │ JSON 消息
┌──────────────┴──────────────────────┐
│         Node.js Server              │
│  ┌────────────────────────────┐    │
│  │  XI Engine (游戏引擎)       │    │
│  │  - G-Loop 事件系统          │    │
│  │  - 回合管理                 │    │
│  │  - 卡牌效果                 │    │
│  │  - 322 个技能的触发/结算     │    │
│  └────────────────────────────┘    │
│  房间管理 / 玩家连接                 │
└─────────────────────────────────────┘
```

**关键设计：**
- 服务端权威架构，所有游戏逻辑在服务端执行
- 客户端只负责显示状态和发送操作指令
- 手牌信息隔离：每个玩家只能看到自己的手牌
- 状态广播：服务端向各玩家发送个性化状态

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（客户端 + 服务端）
npm run dev

# 客户端: http://localhost:5173
# 服务端: ws://localhost:5174
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动客户端和服务端 |
| `npm run dev:client` | 仅启动 Vite 开发服务器 |
| `npm run dev:server` | 仅启动 WebSocket 服务端 |
| `npm run build` | 构建生产版本 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run test` | 运行所有测试 |
| `npm run test:watch` | 监听模式运行测试 |
| `npm run test:coverage` | 运行测试并生成覆盖率报告 |
| `npm run lint` | ESLint 代码检查 |
| `npm run export-db` | 从 SQLite 导出数据到 JSON |

## 当前进度

### 已完成

| Phase | 内容 | 状态 |
|-------|------|------|
| Phase 1 | 武器卡效果（WQ04 典当） | ✅ |
| Phase 2 | 英雄选择联网（协议 + 服务端 + UI） | ✅ |
| Phase 3 | 手牌信息隔离（协议 + 服务端过滤 + 状态广播） | ✅ |
| Phase 4 | 当前怪物 UI（协议 + 服务端 + MonsterArea 组件） | ✅ |
| Phase 5 | 操作交互重构（InputController + format-parser） | ✅ |
| Phase 6 | AI 补位（RuleAI + 添加AI按钮） | ✅ |
| Phase 7 | runStage() 优先级派发（技能触发系统） | ✅ |
| Phase 8 | g0ht 监听器（战后摸牌阶段） | ✅ |
| Phase 9 | 装备栏 UI（EquipArea CSS 补全） | ✅ |
| Phase 10 | 技能面板（SkillPanel 组件 + 协议扩展） | ✅ |
| Phase 11 | 响应式移动端优化 | ✅ |
| Phase 12 | 游戏流程 Bug 修复（选人重复/ZD战牌/ZC技能） | ✅ |
| Phase 13 | 架构级根因修复（run:stage连接/通配符展开/事件牌/G1SG） | ✅ |

### 测试状态

- **测试文件：** 85 个
- **测试用例：** 1473 个全部通过
- **覆盖模块：** 卡牌效果、游戏引擎、网络协议、服务端、数据加载、format-parser、UI组件

### 待开发

| Phase | 内容 | 优先级 |
|-------|------|--------|
| — | 选人列表过滤 NPC 角色 | 中 |
| — | 妨碍者选择发给敌方全队 | 中 |

## 网络协议

所有消息通过 WebSocket 以 JSON 格式传输，使用 `type` 字段区分消息类型。

### 客户端 → 服务端

| 消息类型 | 说明 |
|---------|------|
| `create_room` | 创建房间 |
| `join_room` | 加入房间 |
| `reconnect` | 断线重连 |
| `leave_room` | 离开房间 |
| `list_rooms` | 获取房间列表 |
| `start_game` | 开始游戏 |
| `add_ai` | 添加AI玩家补满房间 |
| `hero_select` | 选择英雄 |
| `player_input` | 提交操作 |
| `get_state` | 请求游戏状态 |
| `ping` | 心跳 |

### 服务端 → 客户端

| 消息类型 | 说明 |
|---------|------|
| `room_created` | 房间已创建 |
| `room_joined` | 已加入房间 |
| `player_joined` | 玩家加入通知 |
| `player_left` | 玩家离开通知 |
| `game_started` | 游戏已开始 |
| `hero_select_request` | 请求选择英雄 |
| `hero_select_response` | 英雄选择结果 |
| `game_state` | 游戏状态广播 |
| `input_request` | 请求玩家操作 |
| `game_over` | 游戏结束 |
| `error` | 错误信息 |

## 游戏引擎

核心引擎翻译自 C# psd48，包含：

- **XI 游戏主循环** — 管理游戏流程和状态
- **G-Loop 事件系统** — 基于字符串命令的事件协议（如 `G0OH,1,2,3,1`）
- **Artiad 系统** — 异步输入处理和分支解析
- **技能系统** — 322 个技能的触发/结算逻辑
- **卡牌效果** — 武器、防具、技牌、战牌、特殊牌的效果实现
- **AI 策略** — Random（随机）、Greedy（贪心）、Rule（规则）三种 AI

## 数据来源

游戏数据从原版 SQLite 数据库导出：

- **源数据库：** `psd48-master/~ex-lib/psd.db3`
- **导出脚本：** `scripts/export-db.ts`
- **输出位置：** `src/shared/data/*.json`

## 不在范围内

以下功能明确不在开发计划中：

- 聊天系统、好友系统、排行榜、成就系统
- 观战模式、录像回放
- 音效/音乐、精细动画效果
- 多语言支持、数据持久化、用户账号系统、应用内购

## 参考资料

- 原版源码：`psd48-master/`（C# WPF）
- 开发范围：`docs/scope.md`
- 卡牌数据：`docs/consolidated/card-info.md`
- 游戏流程：`docs/consolidated/game-flow.md`
- 引擎对比：`docs/engine-comparison.md`
- 翻译规则：`docs/translation-rules.md`
