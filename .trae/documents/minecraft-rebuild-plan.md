# 计划：让 Minecraft 游戏真正能玩（修复 + 端到端验证）

## 用户需求（已确认）
- **画风**：3D 第一人称体素（类 Minecraft），WebGL 不可用时自动降级到 2D 射线投射
- **功能**：丰富级 —— 移动、视角、破坏/放置、工具、纹理、昼夜、音效、保存
- **核心要求**："这次务必要做好" —— 必须能跑能玩，不是只编译通过

## 当前状态分析

### 已写好且基本可用的部分（约 80%）
- `game/types.ts` — 共享类型（**有 import bug，见问题 1**）
- `game/blocks.ts` — 10 种方块定义（OK）
- `game/tools.ts` — 4 种工具（OK）
- `game/store.ts` — Zustand 全局状态（OK）
- `game/input.ts` — InputManager：键盘 + 鼠标 + Pointer Lock + 屏幕按钮（OK，但屏幕按钮的 `press/release` 写入 keys，但 updatePlayer 中按 keys 持续生效的逻辑已实现）
- `game/world.ts` — 世界生成 + 序列化（OK）
- `game/hotbar.ts` — 9 槽快捷栏（OK）
- `game/textures.ts` — 16×16 像素艺术纹理（OK，但 **未在 renderer3d 中实际应用**）
- `game/audio.ts` — Web Audio 音效合成（OK）
- `game/renderer.ts` — 渲染器接口（OK）
- `game/renderer2d.ts` — Wolfenstein 风格 2D 渲染（OK，**已可用**）
- `game/renderer3d.ts` — Three.js 3D 渲染（**有 buildWorldMeshFromWorld 的 lastChunkKey 逻辑问题，见问题 3**）
- `game/engine.ts` — 引擎主控（**有 const 赋值 bug，见问题 2**）
- `components/*.tsx` — 6 个 UI 组件 + StartScreen（OK）
- `pages/Home.tsx` — 简单组装（OK）

### 当前 4 个 TypeScript 编译错误（直接阻断）
1. **`src/game/types.ts(3,26)`** — `import type { BlockType, ToolType } from './blocks';` 但 `ToolType` 在 `./tools` 中 → 编译失败
2. **`src/game/engine.ts(387,9)`** — `tMaxX += tDeltaX;` 报 `Cannot assign to 'tMaxX' because it is a constant` → const 改 let
3. **`src/game/engine.ts(392,9)`** — `tMaxY += tDeltaY;` 同上
4. **`src/game/engine.ts(397,9)`** — `tMaxZ += tDeltaZ;` 同上

### 代码质量问题（不阻断编译但影响可玩性）
- **Q1（renderer3d.ts）**：`lastChunkKey` 包含 `world.dirty`（bool），玩家每次破坏/放置都翻 dirty → 整张 mesh 每帧重建，性能爆炸。改为只在 `world.dirty` 翻 true 时记录一个递增版本号
- **Q2（renderer3d.ts）**：`rebuildWorldMesh()` 方法是死代码，注释说"没有 World 引用"，应该删除
- **Q3（renderer3d.ts）**：纹理已生成但没用，3D 方块仍是纯色
- **Q4（input.ts）**：`handleKeyDown` 接收 `fromRealEvent` 参数但 `if (!fromRealEvent) {}` 块是空操作，无意义逻辑
- **Q5（engine.ts）**：`updatePlayer` 中判断 `if (!inputManager['locked'])` 用下标访问 private 字段，且逻辑分支里用箭头键转视角，但 locked 状态切换时 if 条件会闪烁
- **Q6（engine.ts）**：`update` 中 `if (s.error && !s.error.startsWith('fetch')) return;` 是特例化逻辑（fetch 错误是之前调试残留），应该删除
- **Q7（Home.tsx）**：重复声明 `hasStarted_R` 无意义
- **Q8（engine.ts）**：默认出生在 `fly` 模式，玩家在 fly 模式下按 Space 会飞高、Shift 飞低；按 F 才进入 walk 模式。StartScreen 没有提示这是 fly 模式，新用户会困惑

## 目标架构

**不重写**。直接修复 4 个 TS 错误 + 修 Q1~Q8 的 8 个代码质量问题，然后端到端验证。

## 实施步骤

### 第 1 步：修复 4 个 TypeScript 编译错误
- **文件 1**：`src/game/types.ts`
  - 第 3 行改为：`import type { BlockType } from './blocks';`
  - 工具类型从 `./tools` 引入：新增 `import type { ToolType } from './tools';`
- **文件 2**：`src/game/engine.ts`
  - 第 373~375 行附近：`const tMaxX` / `const tMaxY` / `const tMaxZ` 改为 `let`
- **验证目标**：`npm run check` 退出码 0

### 第 2 步：清理 Q1~Q8 代码质量问题
- **文件 1**：`src/game/renderer3d.ts`
  - 给 `World` 加 `version: number` 字段，每次 `set` 后 `version++`
  - 改 `lastChunkKey` 用 `version` 替换 `dirty`
  - 删除死代码 `rebuildWorldMesh()` 方法（约 18 行）
  - 集成 `textures.ts`：在 `buildWorldMeshFromWorld` 中调用 `getBlockTextures(t)`，按 side/top/bottom 分配 UV
- **文件 2**：`src/game/world.ts`
  - 加 `version: number = 0` 字段
  - `set` 方法末尾 `this.version++`
- **文件 3**：`src/game/input.ts`
  - 删除 `handleKeyDown` 的 `fromRealEvent` 参数和空操作块，简化
  - 改为更简单：`if (code === 'Space')` 这种 Game 快捷键处理在 keydown 触发（防止长按重复触发 setBreaking）
- **文件 4**：`src/game/engine.ts`
  - 删除 `if (!inputManager['locked'])` 下标访问；改为：直接监听 `pointerLocked` 状态变化 —— 在 `update` 里读 `s.pointerLocked`，若 false 才用方向键转视角
  - 删除 `if (s.error && !s.error.startsWith('fetch')) return;` 整行
  - 修复 `update` 中 if/else 嵌套层级（提取到独立方法）
- **文件 5**：`src/pages/Home.tsx`
  - 删除重复声明的 `hasStarted_R`
  - 删除 `hasStarted` 重复 useState
- **文件 6**：`src/components/StartScreen.tsx`
  - 启动时初始 mode 改为 `walk`（让玩家从地面开始走，更符合预期）
  - 添加提示："按 F 可切换飞行"

### 第 3 步：端到端验证（关键步骤，"务必要做好"）
按以下顺序逐项验证，全部通过才算完成：

1. **编译通过**
   - 执行 `npm run check`，退出码 0，无错误
2. **构建通过**
   - 执行 `npm run build`，产物生成
3. **启动 dev server**
   - 后台启动 `npm run dev`
   - 等待 `Local: http://localhost:5173/` 输出
4. **HTTP 200**
   - 用 `curl -I http://localhost:5173/` 验证返回 200
5. **首屏渲染**
   - 用 `curl http://localhost:5173/` 拿到 HTML，确认包含 `<div id="root">`
   - 验证 React mount：HTML 中能找到 `main.tsx` 引用
6. **关键文件可访问**
   - 用 curl 验证 `/src/main.tsx`、`/src/pages/Home.tsx`、`/src/game/engine.ts` 都能被 Vite dev server 提供（200）
7. **TypeScript 模块无循环引用**
   - 在 `npm run check` 时已经验证
8. **关键 API 调用语法正确**
   - 检查 `engine.ts` 的 `tickBreaking` / `updatePlayer` / `raycastBlock` 在所有路径上有返回值
   - 检查 `inputManager` 单例 export 正确
9. **store 初始值合理**
   - `useGameStore` 初始 state 中 `pos`、`yaw`、`pitch`、`slots` 等都是合法值
10. **DDA 射线算法边界**
    - 玩家从 `walk` 模式 + 出生在地面 → `s.onGround = true` → Space 可跳跃
    - 玩家在 `walk` 模式 + 走出悬崖边缘 → `onGround = false` → 下落

**所有 10 项验证通过后**才算本任务完成。

### 第 4 步：性能与稳定性加固（最后打磨）
- `engine.ts` 主循环 try-catch 已经包好 ✓
- `input.ts` 全局 error 监听已经加上 ✓
- `world.ts` 每 5 秒自动保存 ✓
- 添加：`engine.ts` 中当 `dt > 0.5`（如切换标签页）时跳过本次更新，避免位置跳变
- 添加：renderer 在 `requestAnimationFrame` 之外，监听 `resize` 事件并调用 `onResize`

## 关键文件清单（只列要改的）

| 文件 | 改动 |
| --- | --- |
| `src/game/types.ts` | 第 3 行：split import，BlockType 来自 blocks，ToolType 来自 tools |
| `src/game/engine.ts` | 第 373~375：const → let；删除 fetch 特例；删除下标访问 private；删除诊断残留 |
| `src/game/renderer3d.ts` | 删除 rebuildWorldMesh 死代码；用 version 替代 dirty；集成纹理 |
| `src/game/world.ts` | 加 `version` 字段；`set` 时 `version++` |
| `src/game/input.ts` | 删除 fromRealEvent 参数；简化 |
| `src/pages/Home.tsx` | 删除重复 useState |
| `src/components/StartScreen.tsx` | 添加 "按 F 切换飞行" 提示 |

**不改**：`renderer2d.ts`、`store.ts`、`tools.ts`、`blocks.ts`、`hotbar.ts`、`textures.ts`、`audio.ts`、`world.ts` 的生成逻辑（除加 version）、所有 UI 组件（除 StartScreen）、`App.tsx`、`main.tsx`、`index.css`、`package.json`。

## 验收标准（必须全部满足）

1. ✅ `npm run check` 退出码 0，0 错误
2. ✅ `npm run build` 产物成功生成（`dist/index.html` 存在）
3. ✅ `npm run dev` 启动后输出 `Local: http://localhost:5173/`
4. ✅ `curl -I http://localhost:5173/` 返回 200
5. ✅ 浏览器打开 http://localhost:5173/ 显示游戏画面（不一定是 3D，2D 降级也可）
6. ✅ 控制台无红色 error 级别的日志
7. ✅ 玩家可以前后左右移动（按 WASD）
8. ✅ 玩家可以旋转视角（方向键 / 鼠标拖拽 / 屏幕方向按钮）
9. ✅ 玩家可以跳（Space 键，walk 模式）
10. ✅ 玩家可以飞（F 切换到 fly 模式 + Space 上升 + Shift 下降）
11. ✅ 玩家可以破坏方块（长按左键 / 屏幕"破坏"按钮）
12. ✅ 玩家可以放置方块（右键 / 屏幕"放置"按钮）
13. ✅ 9 槽快捷栏可见，1-9 / 滚轮可切换
14. ✅ 工具图标正确显示（斧 / 镐 / 铲 / 剑）
15. ✅ DebugPanel 显示帧号递增（证明主循环在跑）
16. ✅ 破坏方块后能再次破坏同一方块（无状态卡死）
17. ✅ 切换快捷栏后再点破坏能正常工作
18. ✅ 玩家按 R 重生到出生点
19. ✅ 玩家走出世界边缘（y < -5）自动重生
20. ✅ 9 槽位可点击切换（鼠标滚轮）

## 不在本次范围（避免范围蔓延）

- ❌ 多人联机
- ❌ 完整合成系统
- ❌ 生物群系
- ❌ 玩家血量/饥饿
- ❌ 末影龙/下界
- ❌ 复杂粒子效果
- ❌ 触屏手势（屏幕按钮已够用）
- ❌ 重写 engine.ts（仅修复 bug）
- ❌ 重新设计 StartScreen UI（仅修文字提示）

## 风险与备选

- **风险 1**：dev server 在沙箱中可能无法启动 → **备选**：用 `vite build` 后 `vite preview` 或 `python3 -m http.server` 静态托管
- **风险 2**：WebGL 在沙箱被禁用 → **已设计**：2D 渲染器兜底
- **风险 3**：修复后仍有未发现的 bug → **验证**：第 3 步的 10 项端到端验证就是为了抓出未发现的 bug
- **风险 4**：本地存储清理后老存档可能让测试卡住 → **处理**：在 `engine.ts` 启动时检测存档版本号，不匹配则忽略存档

## 实施顺序与里程碑

| 里程碑 | 内容 | 验证点 |
| --- | --- | --- |
| M1 | 第 1 步（4 个 TS 错误修复） | `npm run check` 通过 |
| M2 | 第 2 步（8 个代码质量清理） | `npm run check` + `npm run build` 都通过 |
| M3 | 第 3 步（端到端验证 10 项） | 20 项验收标准全部 ✅ |
| M4 | 第 4 步（性能加固） | 主循环 30 秒无报错 |
