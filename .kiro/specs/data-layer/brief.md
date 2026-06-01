# Brief: data-layer

## Problem
项目需要将 C# 的 psd.db3 SQLite 数据库转换为 TypeScript 可用的 JSON 格式，并定义所有核心数据结构的类型。

## Current State
- 数据存储在 psd.db3（SQLite，206KB）
- 无 TypeScript 类型定义
- 无数据加载机制

## Desired Outcome
- 所有核心数据结构有完整的 TypeScript 类型定义
- psd.db3 数据导出为 JSON 文件
- 数据加载器可读取 JSON 并构建运行时对象

## Approach
1. 编写 scripts/export-db.ts 从 psd.db3 读取数据并导出为 JSON
2. 根据 C# 代码定义 TypeScript 类型（接口 + 枚举）
3. 编写数据加载器

## Scope
- **In**: Hero/Tux/Monster/Npc/Eve/Skill/Rune/Exsp/Ops/NJ 的类型定义和 JSON 导出
- **Out**: 游戏逻辑、UI、网络

## Boundary Candidates
- src/shared/types/ — 所有 TypeScript 类型定义
- src/shared/data/ — JSON 数据文件 + 加载器
- scripts/export-db.ts — 数据导出脚本

## Out of Boundary
- 游戏逻辑翻译
- UI 组件
- 网络通信

## Upstream / Downstream
- **Upstream**: psd.db3 数据库
- **Downstream**: core-models（依赖类型定义和数据）

## Existing Spec Touchpoints
- 无（首个 spec）

## Constraints
- 类型定义必须与 C# 代码保持一致
- JSON 数据必须包含范围内所有卡牌
- 数据导出脚本使用 better-sqlite3 读取数据库
