# Implementation Plan

## Task Format Template

### Major task only
- [ ] {{NUMBER}}. {{TASK_DESCRIPTION}}{{PARALLEL_MARK}}
  - {{DETAIL_ITEM_1}}
  - _Requirements: {{REQUIREMENT_IDS}}_

### Major + Sub-task structure
- [ ] {{MAJOR_NUMBER}}. {{MAJOR_TASK_SUMMARY}}
- [ ] {{MAJOR_NUMBER}}.{{SUB_NUMBER}} {{SUB_TASK_DESCRIPTION}}{{PARALLEL_MARK}}
  - {{DETAIL_ITEM_1}}
  - {{DETAIL_ITEM_2}}
  - _Requirements: {{REQUIREMENT_IDS}}_
  - _Boundary: {{COMPONENT_NAMES}}_
  - _Depends: {{TASK_IDS}}_

---

## Task List

- [ ] 1. 项目基础设施搭建
- [ ] 1.1 初始化 React 项目配置
  - 创建 Vite 配置文件（vite.config.ts）
  - 配置 TypeScript 编译选项（tsconfig.json）
  - 配置开发服务器代理（WebSocket 代理）
  - 验证项目可以正常启动和编译
  - _Requirements: 1.1_

- [ ] 1.2 创建目录结构和基础文件
  - 创建 src/client/pages/、src/client/components/、src/client/hooks/、src/client/styles/ 目录
  - 创建 src/client/main.tsx 入口文件
  - 创建 src/client/App.tsx 主应用组件（路由配置）
  - 验证应用可以正常渲染空页面
  - _Requirements: 1.1, 1.2_

- [ ] 1.3 安装和配置样式工具
  - 配置 CSS 模块或全局样式方案
  - 创建 src/client/styles/global.css 全局样式文件
  - 定义基础颜色、字体、间距变量
  - 验证样式可以正常应用
  - _Requirements: 1.4, 1.5_

- [ ] 2. WebSocket 连接管理
- [ ] 2.1 实现 useWebSocket Hook
  - 创建 src/client/hooks/useWebSocket.ts
  - 实现 WebSocket 连接建立和关闭
  - 实现消息发送和接收
  - 实现自动重连机制（指数退避）
  - 实现心跳检测（ping/pong）
  - 验证连接可以正常建立和断开
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - _Boundary: Hooks_

- [ ] 2.2 实现消息处理和状态管理
  - 创建 src/client/hooks/useGameState.ts
  - 实现游戏状态接收和更新
  - 实现输入请求接收和处理
  - 实现游戏结果接收和显示
  - 验证状态可以正常更新
  - _Requirements: 2.2, 7.1, 8.1_
  - _Boundary: Hooks_

- [ ] 2.3 实现房间操作 Hook
  - 创建 src/client/hooks/useRoom.ts
  - 实现创建房间、加入房间、离开房间操作
  - 实现房间列表获取和刷新
  - 实现玩家列表更新
  - 验证房间操作可以正常执行
  - _Requirements: 3.1, 4.1, 4.3, 5.1, 5.3, 6.1, 6.7, 6.8_
  - _Boundary: Hooks_

- [ ] 3. 通用 UI 组件
- [ ] 3.1 实现卡牌图片组件
  - 创建 src/client/components/common/CardImage.tsx
  - 实现图片加载和错误处理
  - 实现占位符显示
  - 实现不同尺寸（small/medium/large）
  - 验证图片可以正常加载和显示
  - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - _Boundary: Components_

- [ ] 3.2 实现错误提示组件
  - 创建 src/client/components/common/ErrorToast.tsx
  - 实现错误消息显示
  - 实现自动消失和手动关闭
  - 验证错误提示可以正常显示
  - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - _Boundary: Components_

- [ ] 3.3 实现加载指示器组件
  - 创建 src/client/components/common/LoadingSpinner.tsx
  - 实现加载状态显示
  - 实现不同尺寸和颜色
  - 验证加载指示器可以正常显示
  - _Requirements: 2.2, 5.4_
  - _Boundary: Components_

- [ ] 4. 大厅 UI 组件
- [ ] 4.1 实现房间列表组件
  - 创建 src/client/components/lobby/RoomList.tsx
  - 实现房间信息显示（ID、玩家数、状态）
  - 实现空房间提示
  - 实现点击加入房间
  - 验证房间列表可以正常显示和交互
  - _Requirements: 3.2, 3.3, 3.4_
  - _Boundary: Components_

- [ ] 4.2 实现创建房间对话框
  - 创建 src/client/components/lobby/CreateRoomDialog.tsx
  - 实现玩家数量选择（2/4/6）
  - 实现确认创建和取消操作
  - 验证对话框可以正常显示和操作
  - _Requirements: 4.1, 4.2, 4.4_
  - _Boundary: Components_

- [ ] 4.3 实现加入房间对话框
  - 创建 src/client/components/lobby/JoinRoomDialog.tsx
  - 实现房间 ID 输入
  - 实现玩家名称输入
  - 实现输入验证（非空）
  - 实现确认加入和取消操作
  - 验证对话框可以正常显示和操作
  - _Requirements: 5.1, 5.2, 5.4, 5.5_
  - _Boundary: Components_

- [ ] 5. 房间等待页面
- [ ] 5.1 实现房间等待页面
  - 创建 src/client/pages/RoomPage.tsx
  - 实现玩家列表显示
  - 实现房主识别和开始游戏按钮
  - 实现离开房间按钮
  - 验证页面可以正常显示和操作
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  - _Boundary: Pages_

- [ ] 6. 游戏 UI 组件
- [ ] 6.1 实现手牌区组件
  - 创建 src/client/components/game/HandArea.tsx
  - 实现手牌列表显示
  - 实现卡牌选择和取消选择
  - 实现滚动查看
  - 验证手牌区可以正常显示和交互
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - _Boundary: Components_

- [ ] 6.2 实现战场区组件
  - 创建 src/client/components/game/BattleArea.tsx
  - 实现所有玩家信息显示
  - 实现当前回合玩家高亮
  - 实现牌堆数量显示
  - 实现阶段名称显示
  - 验证战场区可以正常显示
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - _Boundary: Components_

- [ ] 6.3 实现玩家信息组件
  - 创建 src/client/components/game/PlayerInfo.tsx
  - 实现玩家基本信息显示（名称、HP、手牌数、阵营）
  - 实现当前玩家高亮
  - 实现不同状态样式
  - 验证玩家信息可以正常显示
  - _Requirements: 8.1, 8.2, 8.3_
  - _Boundary: Components_

- [ ] 6.4 实现操作面板组件
  - 创建 src/client/components/game/OperationPanel.tsx
  - 实现操作格式解析
  - 实现可选操作按钮生成
  - 实现操作确认和取消
  - 实现超时倒计时
  - 验证操作面板可以正常显示和交互
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  - _Boundary: Components_

- [ ] 6.5 实现游戏结果组件
  - 创建 src/client/components/game/GameOverResult.tsx
  - 实现游戏结果显示（胜者、分数、原因）
  - 实现玩家排名显示
  - 实现返回大厅按钮
  - 验证游戏结果可以正常显示
  - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - _Boundary: Components_

- [ ] 7. 页面组件
- [ ] 7.1 实现大厅页面
  - 创建 src/client/pages/LobbyPage.tsx
  - 集成房间列表、创建对话框、加入对话框
  - 实现页面跳转逻辑
  - 验证大厅页面可以正常显示和操作
  - _Requirements: 3.1, 3.5, 4.5, 5.3_
  - _Boundary: Pages_

- [ ] 7.2 实现游戏页面
  - 创建 src/client/pages/GamePage.tsx
  - 集成手牌区、战场区、操作面板
  - 实现游戏状态更新
  - 实现操作提交
  - 验证游戏页面可以正常显示和交互
  - _Requirements: 7.1, 8.1, 9.1, 9.3_
  - _Boundary: Pages_

- [ ] 7.3 实现游戏结束页面
  - 创建 src/client/pages/GameOverPage.tsx
  - 集成游戏结果组件
  - 实现返回大厅逻辑
  - 验证游戏结束页面可以正常显示
  - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - _Boundary: Pages_

- [ ] 8. 响应式布局
- [ ] 8.1 实现响应式样式
  - 创建 src/client/styles/responsive.css
  - 实现移动端布局（纵向排列）
  - 实现 PC 端布局（横向/宽屏）
  - 实现媒体查询断点
  - 验证不同屏幕尺寸下布局正常
  - _Requirements: 1.4, 1.5, 11.1, 11.2, 11.5_
  - _Boundary: Styles_

- [ ] 8.2 实现触摸操作支持
  - 优化移动端触摸事件处理
  - 实现触摸滑动查看手牌
  - 实现触摸点击选择操作
  - 验证移动端操作流畅
  - _Requirements: 11.3, 11.4_
  - _Boundary: Styles, Components_

- [ ] 9. 集成和测试
- [ ] 9.1 集成测试
  - 创建 src/client/__tests__/App.test.tsx
  - 创建 src/client/__tests__/hooks.test.ts
  - 创建 src/client/__tests__/components.test.tsx
  - 实现页面路由跳转测试
  - 实现 WebSocket 连接测试
  - 实现组件渲染测试
  - 验证所有测试通过
  - _Requirements: 1.1, 2.1, 3.1, 7.1_
  - _Boundary: Tests_

- [ ] 9.2 E2E 测试
  - 实现完整游戏流程测试
  - 实现多客户端交互测试
  - 实现响应式布局测试
  - 验证所有 E2E 测试通过
  - _Requirements: 1.4, 1.5, 6.7, 7.1, 9.3, 10.4_
  - _Boundary: Tests_

- [ ] 10. 样式完善
- [ ] 10.1 实现游戏页面样式
  - 创建 src/client/styles/game.css
  - 实现手牌区样式
  - 实现战场区样式
  - 实现操作面板样式
  - 验证样式美观和一致性
  - _Requirements: 7.1, 8.1, 9.1_
  - _Boundary: Styles_

- [ ] 10.2 优化卡牌图片显示
  - 优化卡牌图片加载性能
  - 实现图片懒加载
  - 优化图片缓存
  - 验证图片加载速度和显示效果
  - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - _Boundary: Components, Styles_
