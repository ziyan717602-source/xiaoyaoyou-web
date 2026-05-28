# 仙剑奇侠传：逍遥游 - 网页联机版

## 项目概述

将 C# WPF 桌面版逍遥游（psd48）重写为 TypeScript + React 网页版，支持 PC/移动端浏览器联机对战。

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **后端**: Node.js + TypeScript + ws (WebSocket)
- **数据**: JSON（从 psd.db3 导出）
- **测试**: Vitest + 自定义 AI 玩家
- **参考源码**: `../psd48-master/` (C# WPF 原版)

## 项目结构

```
xiaoyaoyou-web/
├── CLAUDE.md                 # 本文件 - 项目顶层指南
├── docs/
│   ├── scope.md              # 开发范围边界（必须遵守）
│   ├── translation-rules.md  # C#→TS 翻译规则
│   ├── test-plan.md          # 测试计划
│   └── work-plan.md          # 工作计划
├── src/
│   ├── shared/               # 前后端共享代码
│   │   ├── types/            # TypeScript 类型定义
│   │   ├── game/             # 游戏核心逻辑（翻译自 C#）
│   │   │   ├── board.ts      # ← Board.cs
│   │   │   ├── player.ts     # ← Player.cs
│   │   │   ├── skill.ts      # ← Skill.cs
│   │   │   ├── card/         # ← Card/*.cs
│   │   │   ├── rules/        # ← Rules/*.cs
│   │   │   ├── engine/       # ← XIG.cs, XIR.cs, XI.cs
│   │   │   └── effects/      # ← JNS/*.cs (卡牌效果)
│   │   ├── data/             # 卡牌数据（从 DB 导出的 JSON）
│   │   └── network/          # 网络协议定义
│   ├── client/               # React 前端
│   │   ├── components/       # UI 组件
│   │   ├── pages/            # 页面
│   │   └── hooks/            # React hooks
│   └── server/               # Node.js 服务端
│       ├── index.ts          # WebSocket 服务器入口
│       ├── room.ts           # 房间管理
│       └── game-session.ts   # 游戏会话（托管 XI 引擎）
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

## 关键约定

### 事件系统

原版使用字符串命令协议（如 `"G0OH,1,2,3,1"`），TypeScript 版保持相同的消息格式以确保逻辑一致性。详见 `docs/translation-rules.md`。

### 卡牌效果注册

原版通过反射（`GetType().GetMethod(code+"Action")`）注册效果。TS 版使用显式注册表：

```typescript
// effects/registry.ts
export const cardEffects: Record<string, CardEffect> = {
  'JP06': { action: jp06Action, valid: jp06Valid, input: jp06Input },
  // ...
};
```

### 开发范围

**严格遵守** `docs/scope.md` 中定义的范围。不在范围内的内容不开发。

## 参考源码位置

| 原版模块 | 路径 | 对应 TS 模块 |
|---------|------|-------------|
| Board.cs | `../psd48-master/PSDBase/Board.cs` | `src/shared/game/board.ts` |
| Player.cs | `../psd48-master/PSDBase/Player.cs` | `src/shared/game/player.ts` |
| Skill.cs | `../psd48-master/PSDBase/Skill.cs` | `src/shared/game/skill.ts` |
| Tux.cs | `../psd48-master/PSDBase/Card/Tux.cs` | `src/shared/game/card/tux.ts` |
| Monster.cs | `../psd48-master/PSDBase/Card/Monster.cs` | `src/shared/game/card/monster.ts` |
| Hero.cs | `../psd48-master/PSDBase/Card/Hero.cs` | `src/shared/game/card/hero.ts` |
| Casting.cs | `../psd48-master/PSDBase/Rules/Casting.cs` | `src/shared/game/rules/casting.ts` |
| XI.cs | `../psd48-master/PSDGamepkg/XI.cs` | `src/shared/game/engine/xi.ts` |
| XIG.cs | `../psd48-master/PSDGamepkg/XIG.cs` | `src/shared/game/engine/xig.ts` |
| XIR.cs | `../psd48-master/PSDGamepkg/XIR.cs` | `src/shared/game/engine/xir.ts` |
| JNS/*.cs | `../psd48-master/PSDGamepkg/JNS/` | `src/shared/game/effects/` |
| psd.db3 | `../psd48-master/~ex-lib/psd.db3` | `src/shared/data/*.json` |

## 数据库表

详见 `docs/scope.md` 中的数据库结构说明。导出脚本在 `scripts/export-db.ts`。

---

## Skills 使用说明

本项目在 `.claude/skills/` 下安装了以下 skills，仅在本项目目录中生效。

### cc-sdd 自主开发框架（Spec-Driven Development）

用于将大规模开发任务拆分为 spec → 自主实现的循环工作流。

**工作流程：**

```
分析代码 → /kiro-discovery → 写 spec → /kiro-impl 自主实现 → 验证
```

| 命令 | 用途 | 何时使用 |
|------|------|---------|
| `/kiro-discovery "想法"` | 分析项目，生成 brief + roadmap | 项目初期，规划整体翻译策略 |
| `/kiro-spec-init "描述"` | 初始化一个 spec（需求阶段） | 开始一个新模块的翻译 |
| `/kiro-spec-quick {feature}` | 快速生成完整 spec（需求+设计+任务） | 想一步到位创建 spec |
| `/kiro-spec-requirements {feature}` | 编写需求文档 | 细化 spec 的需求部分 |
| `/kiro-spec-design {feature}` | 编写设计文档 | 细化 spec 的技术设计 |
| `/kiro-spec-tasks {feature}` | 生成实现任务列表 | 将设计拆分为可执行任务 |
| `/kiro-impl {feature}` | 自主实现（subagent 逐任务执行） | 核心：长时间自主开发 |
| `/kiro-spec-status {feature}` | 查看 spec 进度 | 随时检查完成情况 |
| `/kiro-validate-gap {feature}` | 校验 spec 与现有代码的差距 | 已有代码时做差距分析 |
| `/kiro-validate-design {feature}` | 设计评审 | 实现前验证设计合理性 |
| `/kiro-validate-impl {feature}` | 实现验证 | 实现后验证正确性 |
| `/kiro-debug` | 根因调试协议 | 遇到 bug 时使用 |
| `/kiro-review` | 对抗性代码评审 | 任务完成后做 review |
| `/kiro-verify-completion` | 完成前验证门禁 | 声称完成前必须通过 |

**推荐用法（卡牌游戏翻译项目）：**

```
# 1. 整体规划
/kiro-discovery "将 C# WPF 逍遥游翻译为 TypeScript + React"

# 2. 为每个模块创建 spec
/kiro-spec-quick board-game-core
/kiro-spec-quick card-effects
/kiro-spec-quick network-server

# 3. 自主实现
/kiro-impl board-game-core

# 4. 检查进度
/kiro-spec-status board-game-core
```

### superpowers 工程实践 Skills

| Skill | 用途 |
|-------|------|
| `test-driven-development` | TDD：先写测试再实现 |
| `writing-plans` | 编写详细的实现计划 |
| `systematic-debugging` | 系统化调试：先找根因再修复 |
| `verification-before-completion` | 完成前必须运行验证命令 |
| `using-git-worktrees` | 隔离工作区 |
| `finishing-a-development-branch` | 完成分支的合并/PR流程 |

### 其他 Skills

| Skill | 用途 |
|-------|------|
| `frontend-design` | 高质量前端 UI 设计（React 组件） |
| `fullstack-developer` | 全栈开发参考（React + Node.js） |
| `code-reviewer` | 代码审查 |
| `webapp-testing` | Playwright 浏览器自动化测试 |
| `neat-freak` | 会话结束时同步文档和记忆 |
| `web-access` | 联网操作（搜索、网页抓取） |
| `skill-creator` | 创建/改进自定义 skill |

### 注意事项

- Skills 仅在本项目目录（`xiaoyaoyou-web/`）中激活，不会影响其他项目
- cc-sdd 的 spec 文件存储在 `.kiro/specs/` 目录下
- 使用 `/kiro-impl` 时会自动启动 subagent 并行实现任务
- 长时间自主开发建议使用 `/loop` 配合定期检查进度
