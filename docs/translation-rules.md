# C# → TypeScript 翻译规则

> 本文件定义从 psd48 C# 源码翻译到 TypeScript 的规范。所有翻译工作必须遵守这些规则。

## 一、总体原则

### 1.1 翻译优先级

1. **逻辑一致性** > 代码简洁性 > 性能
2. 保持原版的游戏行为完全一致，包括边界情况
3. 如果原版有 bug，在翻译时标注 `// TODO: 原版 bug` 但不修复（除非导致游戏无法进行）

### 1.2 命名约定

| C# | TypeScript | 示例 |
|----|-----------|------|
| PascalCase 类名 | PascalCase | `Board` → `Board` |
| PascalCase 方法名 | camelCase | `CalculateRPool()` → `calculateRPool()` |
| PascalCase 属性 | camelCase | `IsAlive` → `isAlive` |
| PascalCase 枚举值 | UPPER_SNAKE_CASE | `ClLevel.BOSS` → `ClLevel.BOSS` |
| _camelCase 私有字段 | `#` 私有字段或 `_` 前缀 | `_someField` |
| 事件代码字符串 | 保持原样 | `"G0OH"` → `"G0OH"` |

### 1.3 文件组织

- 每个 C# 文件翻译为一个 TS 文件，保持相同的文件名（小写）
- 每个 C# 类翻译为一个 TS class 或 interface + 独立函数
- C# 的 `partial class` 拆分为多个 TS 文件

## 二、类型映射

### 2.1 基础类型

| C# | TypeScript | 说明 |
|----|-----------|------|
| `ushort` | `number` | TS 没有 ushort，用 number |
| `int` | `number` | |
| `float/double` | `number` | |
| `bool` | `boolean` | |
| `string` | `string` | |
| `object` | `unknown` | |
| `void` | `void` | |
| `null` | `null` | |
| `DateTime` | `number` | 时间戳 |

### 2.2 集合类型

| C# | TypeScript | 说明 |
|----|-----------|------|
| `List<T>` | `T[]` | 数组 |
| `Dictionary<K,V>` | `Map<K,V>` 或 `Record<K,V>` | 频繁查找用 Map，静态映射用 Record |
| `IDictionary<K,V>` | `Map<K,V>` | |
| `ISet<T>` | `Set<T>` | |
| `Queue<T>` | `T[]`（用 push/shift） | |
| `Stack<T>` | `T[]`（用 push/pop） | |
| `Rueue<T>`（自定义） | `T[]`（用 push/shift） | 原版是双端队列 |

### 2.3 特殊类型

| C# 概念 | TypeScript 实现 |
|---------|---------------|
| `Diva`（动态 KV 存储） | `class Diva { private store = new Map<string, unknown>() }` |
| `Rueue<T>`（双端队列） | `class Rueue<T> { private items: T[] = [] }` |
| `ghost`（空对象哨兵） | `const GHOST = Symbol('ghost')` 或 `null` |
| `ushort` ID | `number`（加注释说明范围） |

## 三、核心模式翻译

### 3.1 委托/事件系统

**C# 原版**：
```csharp
// 定义委托
public delegate void ActionDelegate(Player player, int type, string fuse, string argst);
public delegate bool ValidDelegate(Player player, int type, string fuse);

// 注册
card.Action += SomeMethod;
card.Action += AnotherMethod;
```

**TypeScript 翻译**：
```typescript
// 定义类型
type ActionDelegate = (player: Player, type: number, fuse: string, argst: string) => void;
type ValidDelegate = (player: Player, type: number, fuse: string) => boolean;

// 注册（使用数组存储多个处理器）
class Card {
  actionHandlers: ActionDelegate[] = [];
  validHandlers: ValidDelegate[] = [];
  
  addAction(handler: ActionDelegate) { this.actionHandlers.push(handler); }
  addValid(handler: ValidDelegate) { this.validHandlers.push(handler); }
  
  // 调用时按优先级执行
  fireAction(player: Player, type: number, fuse: string, argst: string) {
    for (const handler of this.actionHandlers) {
      handler(player, type, fuse, argst);
    }
  }
}
```

### 3.2 反射注册（JNS 模式）

**C# 原版**（通过反射按命名约定查找方法）：
```csharp
// JP06.cs
public static void RegisterDelegates() {
    var methods = typeof(TuxCottage).GetMethods();
    foreach (var m in methods) {
        if (m.Name.StartsWith("JP06")) {
            // 根据后缀 Action/Valid/Input 注册到对应委托
        }
    }
}
```

**TypeScript 翻译**（显式注册表）：
```typescript
// effects/jp06.ts
export const jp06Effect: CardEffect = {
  action: (player, type, fuse, argst) => { /* ... */ },
  valid: (player, type, fuse) => { /* ... */ },
  input: (player, type, fuse, prev) => { /* ... */ },
};

// effects/registry.ts
import { jp06Effect } from './jp06';
import { heroEffects } from './heroes';

export const cardEffects: Record<string, CardEffect> = {
  'JP06': jp06Effect,
  ...heroEffects,
};
```

### 3.3 事件系统（G-Loop）

**C# 原版**：
```csharp
// 字符串命令协议
RaiseGMessage("G0OH,1,2,3,1");  // 谁,来源,元素,伤害

// 事件查找
var triples = sk02["G0OH"];  // 查找所有注册在此事件上的技能
```

**TypeScript 翻译**（保持字符串协议）：
```typescript
// 保持相同的命令格式
raiseGMessage("G0OH,1,2,3,1");

// 事件查找
const triples = this.sk02.get("G0OH");  // 相同的查找逻辑
```

### 3.4 线程管理

**C# 原版**（使用 Thread.Abort() 实现跳转）：
```csharp
Thread thd = new Thread(() => RunRound());
thd.Start();
// 需要跳转时
thd.Abort();
```

**TypeScript 翻译**（使用 async/await + 状态机）：
```typescript
// 不使用线程，改用状态机
class GameEngine {
  private cancelled = false;
  
  async runRound(): Promise<void> {
    this.cancelled = false;
    let stage = '00';
    
    while (stage !== 'ED' && !this.cancelled) {
      stage = await this.executeStage(stage);
    }
  }
  
  jumpToStage(stage: string) {
    this.cancelled = true;
    this.pendingJump = stage;
  }
}
```

### 3.5 位掩码操作

**C# 原版**：
```csharp
cardDisabled |= (1 << 2);  // 禁用 JP
cardDisabled &= ~(1 << 2); // 启用 JP
```

**TypeScript 翻译**（直接移植，保持注释）：
```typescript
cardDisabled |= (1 << 2);  // 禁用 JP
cardDisabled &= ~(1 << 2); // 启用 JP
```

### 3.6 优先级队列

**C# 原版**（DS/PriorityQueue.cs）：
```csharp
public class PriorityQueue<T> { ... }
```

**TypeScript 翻译**：
```typescript
class PriorityQueue<T> {
  private items: { value: T; priority: number }[] = [];
  // ... 实现
}
```

## 四、事件代码表

以下是 G-Loop 中使用的所有事件代码，翻译时必须保持一致：

### G0 基础事件
| 代码 | 含义 | 参数格式 |
|------|------|---------|
| G0IT | 获得手牌 | G0IT,who,card |
| G0OT | 失去手牌 | G0OT,who,card |
| G0HQ | 转移手牌 | G0HQ,from,to,card |
| G0DH | 弃牌 | G0DH,who,card |
| G0OH | 受到伤害 | G0OH,who,src,element,damage |
| G0IH | 恢复HP | G0IH,who,src,heal |
| G0LV | 倾慕 | G0LV,who,target |
| G0IY | 角色变更 | G0IY,who,newHero |
| G0CC | 使用卡牌 | G0CC,who,card,target |
| G0CD | 使用卡牌（详细） | G0CD,who,card,target,detail |
| G0ZH | HP归零 | G0ZH,who |
| G0ZW | 玩家死亡 | G0ZW,who |
| G0OY | 玩家离场 | G0OY,who |
| G0QZ | 夺取卡牌 | G0QZ,from,to,card |
| G0HZ | 纠缠怪物 | G0HZ,who,monster |
| G0XZ | 装备 | G0XZ,who,equip |
| G0ZB | 装备破坏 | G0ZB,who,equip |
| G0ZC | 装备消耗 | G0ZC,who,equip |
| G0ZI | 装备获取 | G0ZI,who,equip |
| G0ZS | 召唤宠物 | G0ZS,who,pet |
| G0ZL | 释放宠物 | G0ZL,who,pet |
| G0IA | 获得行动 | G0IA,who |
| G0OA | 失去行动 | G0OA,who |
| G0IX | 获得特殊 | G0IX,who,type |
| G0OX | 失去特殊 | G0OX,who,type |
| G0AX | 特殊变更 | G0AX,who,type |
| G0IB | 获得增益 | G0IB,who,buff |
| G0OB | 失去增益 | G0OB,who,buff |
| G0IW | 获得武器 | G0IW,who,weapon |
| G0OW | 失去武器 | G0OW,who,weapon |
| G0WB | 武器破坏 | G0WB,who,weapon |
| G09P | 九阴 | G09P,who |
| G0IP | 获得宠物 | G0IP,who,pet,element |
| G0OP | 失去宠物 | G0OP,who,pet |
| G0CZ | 消耗 | G0CZ,who,card |
| G0HC | 治疗 | G0HC,who,src,heal |
| G0HD | 危机 | G0HD,card |
| G0HH | 危机结算 | G0HH,card |
| G0HI | 危机影响 | G0HI,who,card |
| G0HL | 危机离场 | G0HL,card |
| G0IC | 获得符文 | G0IC,who,rune |
| G0OC | 失去符文 | G0OC,who,rune |
| G0HT | 回合开始 | G0HT,who |
| G0HG | 回合结束 | G0HG,who |
| G0QR | 弃牌阶段 | G0QR,who |
| G0HZ | 纠缠 | G0HZ,who,monster |

### G1 技能事件
| 代码 | 含义 |
|------|------|
| G1TH | 伤害预告 |
| G1WJ | 牌堆耗尽 |
| G1EV | 事件抽取 |

### G2 简单事件
| 代码 | 含义 |
|------|------|
| G2AS | 事件结束 |
| G2SS | 状态同步 |

## 五、翻译检查清单

翻译每个文件后，逐项检查：

- [ ] 所有类/接口的属性完整翻译
- [ ] 所有方法签名匹配原版
- [ ] 委托/事件注册使用数组模式
- [ ] 字符串命令协议保持一致
- [ ] 优先级逻辑保持一致
- [ ] 位掩码操作直接移植
- [ ] 边界情况（null/undefined）用 `null` 处理
- [ ] 添加了 `// TODO: 需要验证` 标注复杂逻辑
- [ ] 对应的单元测试已编写

## 六、不翻译的内容

以下内容不需要翻译，用替代方案：

| C# 内容 | TS 替代 |
|---------|--------|
| WPF XAML UI | React 组件 |
| TCP 网络 | WebSocket |
| SQLite 读取 | JSON 文件 |
| 反射注册 | 显式注册表 |
| Thread 管理 | async/await |
| BinaryReader/Writer | JSON.parse/stringify |
