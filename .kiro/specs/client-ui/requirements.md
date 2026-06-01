# Requirements Document

## Introduction

本模块实现 React 前端 UI，支持 PC 和移动端浏览器联机对战。提供大厅页面（创建/加入房间、房间列表）和游戏页面（手牌区、战场区、操作面板），通过 WebSocket 与 network-server 通信，使用共享协议类型确保与服务端消息格式一致。界面仅支持中文，使用现有 PNG 素材显示卡牌图片。

## Requirements

### Requirement 1: 页面路由和布局框架

**Objective:** 作为应用基础，需要建立页面路由系统和整体布局框架，支持大厅和游戏两个主要页面。

#### Acceptance Criteria

1. When 用户访问应用根路径时，client-ui 系统 shall 显示大厅页面。
2. When 用户进入游戏房间后，client-ui 系统 shall 自动跳转到游戏页面。
3. When 用户在游戏页面离开房间时，client-ui 系统 shall 返回大厅页面。
4. When 应用在移动端浏览器运行时，client-ui 系统 shall 采用响应式布局适配屏幕。
5. When 应用在 PC 浏览器运行时，client-ui 系统 shall 采用桌面布局显示完整信息。

### Requirement 2: WebSocket 连接管理

**Objective:** 作为联机通信基础，客户端需要管理与服务端的 WebSocket 连接生命周期。

#### Acceptance Criteria

1. When 应用启动时，client-ui 系统 shall 建立与服务端的 WebSocket 连接。
2. When WebSocket 连接建立时，client-ui 系统 shall 开始接收服务端消息并更新 UI 状态。
3. When WebSocket 连接断开时，client-ui 系统 shall 显示连接断开提示并尝试自动重连。
4. When 自动重连失败超过指定次数时，client-ui 系统 shall 显示手动重连按钮。
5. When 收到服务端 ping 消息时，client-ui 系统 shall 回复 pong 以维持心跳。
6. Where 连接需要认证时，client-ui 系统 shall 在连接建立后发送玩家名称。

### Requirement 3: 大厅页面 - 房间列表

**Objective:** 作为联机对战的入口，玩家需要查看当前所有可用的游戏房间。

#### Acceptance Criteria

1. When 用户进入大厅页面时，client-ui 系统 shall 向服务端请求房间列表。
2. When 收到房间列表数据时，client-ui 系统 shall 显示所有房间的房间 ID、当前玩家数、最大玩家数、房间状态。
3. When 房间列表为空时，client-ui 系统 shall 显示"暂无房间"提示。
4. When 房间状态发生变化时，client-ui 系统 shall 实时更新房间列表显示。
5. When 用户点击刷新按钮时，client-ui 系统 shall 重新请求房间列表。

### Requirement 4: 大厅页面 - 创建房间

**Objective:** 作为房主，玩家需要能够创建新的游戏房间。

#### Acceptance Criteria

1. When 用户点击"创建房间"按钮时，client-ui 系统 shall 弹出创建房间表单。
2. When 用户在表单中选择玩家数量（2/4/6）时，client-ui 系统 shall 记录选择的玩家数量。
3. When 用户确认创建房间时，client-ui 系统 shall 向服务端发送创建房间请求。
4. When 服务端返回房间创建成功时，client-ui 系统 shall 显示房间 ID 并提示玩家分享给好友。
5. When 创建房间成功时，client-ui 系统 shall 自动跳转到房间等待页面。

### Requirement 5: 大厅页面 - 加入房间

**Objective:** 作为加入者，玩家需要能够通过房间 ID 加入已有的游戏房间。

#### Acceptance Criteria

1. When 用户点击"加入房间"按钮时，client-ui 系统 shall 弹出加入房间表单。
2. When 用户输入房间 ID 和玩家名称时，client-ui 系统 shall 验证输入非空。
3. When 用户确认加入房间时，client-ui 系统 shall 向服务端发送加入房间请求。
4. When 服务端返回加入成功时，client-ui 系统 shall 跳转到房间等待页面。
5. When 服务端返回错误（房间不存在、已满、已开始）时，client-ui 系统 shall 显示对应的错误提示。

### Requirement 6: 房间等待页面

**Objective:** 作为房间内的玩家，在游戏开始前需要查看房间状态和等待其他玩家加入。

#### Acceptance Criteria

1. When 玩家加入房间后，client-ui 系统 shall 显示房间内所有玩家列表（名称、准备状态、连接状态）。
2. When 新玩家加入房间时，client-ui 系统 shall 实时更新玩家列表。
3. When 玩家离开房间时，client-ui 系统 shall 实时更新玩家列表。
4. When 房主在房间内且玩家数达到要求时，client-ui 系统 shall 显示"开始游戏"按钮。
5. When 非房主玩家在房间内时，client-ui 系统 shall 不显示"开始游戏"按钮。
6. When 房主点击"开始游戏"时，client-ui 系统 shall 向服务端发送开始游戏请求。
7. When 游戏开始时，client-ui 系统 shall 自动跳转到游戏页面。
8. When 玩家点击"离开房间"时，client-ui 系统 shall 向服务端发送离开请求并返回大厅。

### Requirement 7: 游戏页面 - 手牌区

**Objective:** 作为游戏玩家，需要查看和操作自己的手牌。

#### Acceptance Criteria

1. When 游戏状态更新时，client-ui 系统 shall 显示当前玩家的手牌列表。
2. When 手牌为多张时，client-ui 系统 shall 水平排列显示所有手牌。
3. When 手牌数量较多时，client-ui 系统 shall 支持滚动查看。
4. When 手牌包含卡牌图片时，client-ui 系统 shall 使用 PNG 素材正确显示卡牌外观。
5. When 手牌区在移动端时，client-ui 系统 shall 适配小屏幕显示。
6. When 手牌区在 PC 端时，client-ui 系统 shall 显示完整的卡牌信息。

### Requirement 8: 游戏页面 - 战场区

**Objective:** 作为游戏玩家，需要查看战场状态（其他玩家信息、牌堆数量、当前回合）。

#### Acceptance Criteria

1. When 游戏状态更新时，client-ui 系统 shall 显示所有玩家的基本信息（名称、HP、手牌数量、阵营）。
2. When 显示其他玩家信息时，client-ui 系统 shall 高亮当前回合玩家。
3. When 显示当前玩家信息时，client-ui 系统 shall 显示详细状态（HP、技能、装备等）。
4. When 游戏状态包含牌堆信息时，client-ui 系统 shall 显示手牌堆、怪物堆、事件堆的剩余数量。
5. When 游戏处于不同阶段时，client-ui 系统 shall 显示当前阶段名称。

### Requirement 9: 游戏页面 - 操作面板

**Objective:** 作为游戏玩家，需要通过操作面板与游戏交互（出牌、使用技能、选择目标等）。

#### Acceptance Criteria

1. When 收到服务端输入请求时，client-ui 系统 shall 显示操作面板并列出可用操作。
2. When 操作面板显示时，client-ui 系统 shall 解析操作格式（format）并生成对应的 UI 控件（按钮、选择列表等）。
3. When 用户选择操作并确认时，client-ui 系统 shall 向服务端发送玩家输入。
4. When 用户未在超时时间内操作时，client-ui 系统 shall 显示超时提示。
5. When 操作面板为空或不需要输入时，client-ui 系统 shall 隐藏操作面板。
6. When 操作涉及选择目标玩家时，client-ui 系统 shall 高亮可选目标并支持点击选择。
7. When 操作涉及选择卡牌时，client-ui 系统 shall 从手牌中高亮可选卡牌。

### Requirement 10: 游戏结束页面

**Objective:** 作为游戏结束时的展示，需要显示游戏结果和统计数据。

#### Acceptance Criteria

1. When 收到游戏结束消息时，client-ui 系统 shall 显示游戏结果（胜者、分数、结束原因）。
2. When 游戏结束时，client-ui 系统 shall 显示最终的玩家排名和分数。
3. When 游戏结束时，client-ui 系统 shall 显示"返回大厅"按钮。
4. When 用户点击"返回大厅"时，client-ui 系统 shall 清理游戏状态并跳转到大厅页面。

### Requirement 11: 响应式布局和触摸操作

**Objective:** 作为跨平台应用，需要在 PC 和移动端浏览器上提供良好的操作体验。

#### Acceptance Criteria

1. When 应用在移动端浏览器运行时，client-ui 系统 shall 采用纵向布局适配屏幕。
2. When 应用在 PC 浏览器运行时，client-ui 系统 shall 采用横向/宽屏布局。
3. When 在移动端操作手牌时，client-ui 系统 shall 支持触摸滑动和点击操作。
4. When 在移动端操作目标选择时，client-ui 系统 shall 支持触摸点击选择。
5. When 屏幕尺寸变化时，client-ui 系统 shall 动态调整布局。

### Requirement 12: 卡牌图片显示

**Objective:** 作为游戏视觉呈现，需要正确显示卡牌的 PNG 图片素材。

#### Acceptance Criteria

1. When 显示手牌时，client-ui 系统 shall 从素材目录加载对应的卡牌 PNG 图片。
2. When 卡牌图片加载失败时，client-ui 系统 shall 显示占位符或卡牌名称文字。
3. When 在不同屏幕尺寸下显示卡牌时，client-ui 系统 shall 保持卡牌比例不变形。
4. When 卡牌图片较大时，client-ui 系统 shall 使用缩略图并支持点击查看大图。

### Requirement 13: 错误处理和用户提示

**Objective:** 作为用户体验，需要对各种异常情况提供清晰的提示信息。

#### Acceptance Criteria

1. When 服务端返回错误消息时，client-ui 系统 shall 在界面上显示中文错误提示。
2. When 网络连接异常时，client-ui 系统 shall 显示网络异常提示。
3. When 操作失败时，client-ui 系统 shall 显示失败原因并允许重试。
4. When 游戏状态异常时，client-ui 系统 shall 显示状态异常提示并提供恢复选项。

### Scope Boundary

**包含（In）**:
- React 组件系统（页面、游戏组件、大厅组件）
- 页面路由（大厅、房间等待、游戏、游戏结束）
- WebSocket 客户端连接管理
- 响应式布局（PC 和移动端适配）
- 卡牌图片显示（PNG 素材加载）
- 触摸操作支持
- 错误提示和用户反馈

**不包含（Out）**:
- 游戏逻辑（属于 game-flow 模块）
- 服务端代码（属于 network-server 模块）
- 音效和动画特效
- 数据持久化
- 用户认证/鉴权
- 聊天/好友/排行榜功能
