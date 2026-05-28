# 执行计划：7 项开发和测试

## 总览

```
Phase 1: data-layer      → 编译验证
Phase 2: core-models      → 编译验证 + 单元测试
Phase 3: game-engine      → 编译验证 + 单元测试
Phase 4: card-effects     → 编译验证 + 单元测试
Phase 5: game-flow        → 编译验证 + 单元测试 + AI 对局测试
Phase 6: network-server   → 编译验证 + 集成测试
Phase 7: client-ui        → 编译验证 + E2E 测试
Final:   全链路联调 + 100 局 AI 压力测试
```

## 依赖关系

```
data-layer ──→ core-models ──→ game-engine ──→ card-effects
                                                    │
                                                    ▼
                                              game-flow ──→ network-server ──→ client-ui
```

## Phase 1: data-layer（类型定义 + JSON 数据导出）

**执行方式**: `/kiro-impl data-layer` → subagent 自主实现
**预计时间**: 0.5-1 天

| 任务 | 内容 | 验证 |
|------|------|------|
| 1.1 | 项目初始化（tsconfig 路径别名） | `npm run typecheck` 通过 |
| 1.2 | 类型定义（10 个实体 + 枚举） | 无 any 类型 |
| 1.3 | 数据导出脚本（scripts/export-db.ts） | 生成 10 个 JSON 文件 |
| 1.4 | 数据加载器 | 可加载所有 JSON |
| 1.5 | 集成测试 | 测试覆盖所有类型 |

**完成标准**:
- [ ] `npm run typecheck` 零错误
- [ ] 10 个 JSON 数据文件存在且格式正确
- [ ] 数据加载器可加载所有数据
- [ ] 单元测试通过

---

## Phase 2: core-models（核心数据模型翻译）

**执行方式**: `/kiro-impl core-models` → subagent 自主实现
**预计时间**: 2-3 天

| 任务 | 内容 | 验证 |
|------|------|------|
| 2.1 | 工具类（Rueue, Diva, PriorityQueue, UFSet, Algo） | 单元测试 |
| 2.2 | 卡牌基类（Card, Tux, TuxEquip, Luggage, Illusion） | 单元测试 |
| 2.3 | 实体卡牌（Monster, Hero, Npc, Evenement, Rune） | 单元测试 |
| 2.4 | Player 类（状态、装备、位掩码、Diva） | 单元测试 |
| 2.5 | Board 类（牌堆、战斗状态、玩家管理） | 单元测试 |
| 2.6 | Skill/Bless/SKBranch（技能系统） | 单元测试 |
| 2.7 | Casting/RuleCode（选将规则） | 单元测试 |
| 2.8 | LibGroup（数据加载集成） | 单元测试 |

**完成标准**:
- [ ] `npm run typecheck` 零错误
- [ ] 所有工具类单元测试通过
- [ ] 所有卡牌类型单元测试通过
- [ ] Player/Board 单元测试通过
- [ ] Skill 系统单元测试通过
- [ ] `npm run test` 全部通过

---

## Phase 3: game-engine（事件系统 + 回合管理）

**执行方式**: `/kiro-impl game-engine` → subagent 自主实现
**预计时间**: 3-4 天

| 任务 | 内容 | 验证 |
|------|------|------|
| 3.1 | EventBus（事件总线、sk02 注册表） | 单元测试 |
| 3.2 | GMessage 类型和解析 | 单元测试 |
| 3.3 | G-Loop 核心（InnerGMessage, SimpleGMessage） | 单元测试 |
| 3.4 | RoundManager（回合状态机） | 单元测试 |
| 3.5 | XI 类（游戏初始化、MappingSksp） | 单元测试 |
| 3.6 | SelectHero（选将系统） | 单元测试 |
| 3.7 | Artiad 解析器 | 单元测试 |

**完成标准**:
- [ ] `npm run typecheck` 零错误
- [ ] EventBus 可注册和分发事件
- [ ] G-Loop 可处理基础命令
- [ ] RoundManager 可执行回合阶段转换
- [ ] XI 可初始化游戏并注册技能
- [ ] `npm run test` 全部通过

---

## Phase 4: card-effects（卡牌效果翻译）

**执行方式**: `/kiro-impl card-effects` → subagent 自主实现
**预计时间**: 3-4 天

| 任务 | 内容 | 验证 |
|------|------|------|
| 4.1 | 效果框架（CardEffect 接口、注册表） | 单元测试 |
| 4.2 | 手牌效果（武器/防具/技牌/战牌/特殊） | 单元测试 |
| 4.3 | 操作效果（CZ02） | 单元测试 |
| 4.4 | 角色技能（仙剑一~五 + 凤鸣玉誓） | 单元测试 |
| 4.5 | NPC/符文/事件效果 | 单元测试 |
| 4.6 | 效果注册表集成 | 集成测试 |

**完成标准**:
- [ ] `npm run typecheck` 零错误
- [ ] 所有范围内卡牌效果可触发
- [ ] 效果注册表完整
- [ ] `npm run test` 全部通过

---

## Phase 5: game-flow（完整游戏流程）

**执行方式**: `/kiro-impl game-flow` → subagent 自主实现
**预计时间**: 2-3 天

| 任务 | 内容 | 验证 |
|------|------|------|
| 5.1 | Game 类（串联所有模块） | 集成测试 |
| 5.2 | 完整游戏流程（创建→选将→回合→结束） | 集成测试 |
| 5.3 | AI 玩家（随机/贪心/规则策略） | 单元测试 |
| 5.4 | 2 人 AI 对局测试 | 100 局无崩溃 |
| 5.5 | 4 人 AI 对局测试 | 100 局无崩溃 |
| 5.6 | 6 人 AI 对局测试 | 100 局无崩溃 |

**完成标准**:
- [ ] `npm run typecheck` 零错误
- [ ] AI 玩家可自动完成一局游戏
- [ ] 2 人对局 100 局全部正常结束
- [ ] 4 人对局 100 局全部正常结束
- [ ] 6 人对局 100 局全部正常结束
- [ ] `npm run test` 全部通过

---

## Phase 6: network-server（WebSocket 服务器）

**执行方式**: `/kiro-impl network-server` → subagent 自主实现
**预计时间**: 2-3 天

| 任务 | 内容 | 验证 |
|------|------|------|
| 6.1 | 消息协议（序列化/反序列化） | 单元测试 |
| 6.2 | WebSocket 服务器基础 | 手动测试连接 |
| 6.3 | 连接管理（心跳、断线） | 单元测试 |
| 6.4 | 房间管理（创建/加入/列表） | 单元测试 |
| 6.5 | 游戏会话（托管 Game 实例） | 集成测试 |
| 6.6 | 多客户端同步 | 集成测试 |

**完成标准**:
- [ ] `npm run typecheck` 零错误
- [ ] WebSocket 服务器可启动
- [ ] 多客户端可连接并收发消息
- [ ] 房间创建/加入/列表正常
- [ ] 游戏会话可托管完整对局
- [ ] `npm run test` 全部通过

---

## Phase 7: client-ui（React 前端）

**执行方式**: `/kiro-impl client-ui` → subagent 自主实现
**预计时间**: 3-5 天

| 任务 | 内容 | 验证 |
|------|------|------|
| 7.1 | 页面路由和布局 | 手动测试 |
| 7.2 | WebSocket 客户端 hooks | 手动测试 |
| 7.3 | 大厅 UI（房间列表、创建/加入） | 手动测试 |
| 7.4 | 游戏 UI（桌面、手牌、战斗） | 手动测试 |
| 7.5 | 操作面板（出牌、技能、结束回合） | 手动测试 |
| 7.6 | 响应式适配（PC + 移动端） | 手动测试 |
| 7.7 | 卡牌图片加载 | 手动测试 |

**完成标准**:
- [ ] `npm run typecheck` 零错误
- [ ] 大厅页面可创建/加入房间
- [ ] 游戏页面可显示完整界面
- [ ] 手牌可拖拽出牌
- [ ] 移动端浏览器可正常使用
- [ ] `npm run build` 成功

---

## Final: 全链路联调

**执行方式**: 手动测试 + AI 压力测试
**预计时间**: 1-2 天

| 任务 | 内容 | 验证 |
|------|------|------|
| F.1 | 启动服务器 + 客户端 | 服务运行正常 |
| F.2 | 2 人联机对局 | 完整对局可进行 |
| F.3 | 4 人联机对局 | 完整对局可进行 |
| F.4 | 6 人联机对局 | 完整对局可进行 |
| F.5 | 100 局 AI 压力测试 | 无崩溃 |
| F.6 | 移动端测试 | 可正常使用 |

**完成标准**:
- [ ] 2/4/6 人联机对局可完整进行
- [ ] 100 局 AI 压力测试全部通过
- [ ] PC 和移动端浏览器均可正常使用
- [ ] 无内存泄漏、无死锁

---

## 时间估算

| Phase | 预计时间 | 累计 |
|-------|---------|------|
| Phase 1: data-layer | 0.5-1 天 | 0.5-1 天 |
| Phase 2: core-models | 2-3 天 | 2.5-4 天 |
| Phase 3: game-engine | 3-4 天 | 5.5-8 天 |
| Phase 4: card-effects | 3-4 天 | 8.5-12 天 |
| Phase 5: game-flow | 2-3 天 | 10.5-15 天 |
| Phase 6: network-server | 2-3 天 | 12.5-18 天 |
| Phase 7: client-ui | 3-5 天 | 15.5-23 天 |
| Final: 联调 | 1-2 天 | 16.5-25 天 |
| **合计** | | **17-25 天** |

## 执行命令

```bash
# Phase 1
/kiro-impl data-layer

# Phase 2（Phase 1 完成后）
/kiro-impl core-models

# Phase 3（Phase 2 完成后）
/kiro-impl game-engine

# Phase 4（Phase 3 完成后）
/kiro-impl card-effects

# Phase 5（Phase 4 完成后）
/kiro-impl game-flow

# Phase 6（Phase 5 完成后）
/kiro-impl network-server

# Phase 7（Phase 6 完成后）
/kiro-impl client-ui

# Final
npm run test:ai -- --games=100 --players=2
npm run test:ai -- --games=100 --players=4
npm run test:ai -- --games=100 --players=6
```
