// ===== 引擎主控：调度输入、玩家、世界、渲染器 =====

import { World } from './world';
import { useGameStore, gameActions } from './store';
import { inputManager, type InputCallbacks } from './input';
import { Renderer3D } from './renderer3d';
import { Renderer2D } from './renderer2d';
import type { GameRenderer } from './renderer';
import { BLOCKS, type BlockType } from './blocks';
import { breakTime } from './tools';
import { audio } from './audio';
import type { Slot } from './types';

const GRAVITY = -22;
const JUMP_SPEED = 9;
const PLAYER_SPEED = 5.5;
const FLY_SPEED = 12;
const PLAYER_EYE = 1.6;
const PLAYER_HALF = 0.3;
const PLAYER_HEIGHT = 1.8;
const REACH = 6;
const ARROW_SPEED = 1.8;

export class GameEngine {
  private container: HTMLElement;
  private world: World;
  private renderer: GameRenderer | null = null;
  private rafId = 0;
  private lastTime = 0;
  private destroyed = false;
  private frameCount = 0;
  private debugTimer = 0;
  private saveTimer = 0;
  private stepTimer = 0;
  private leftDownAt = 0;
  private lastRenderError: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. 加载世界（小世界 8x8x8，初始只有 1 个 1x1 平台）
    this.world = new World(8, 8, 8, 1337);
    const loaded = this.world.loadFromStorage();
    console.log('[MC] 世界加载:', loaded ? '从存档恢复' : '新生成');

    // 2. 设置玩家出生点
    const sp = this.world.spawnPoint();
    gameActions.setPos(sp.x, sp.y, sp.z);
    gameActions.setYaw(0);
    gameActions.setPitch(-0.15);

    // 3. 尝试启动 3D 渲染器
    // 先做轻量级 WebGL 检测（不实例化完整 renderer）
    const probe = document.createElement('canvas');
    const webglOK = !!(probe.getContext('webgl2') || probe.getContext('webgl') || probe.getContext('experimental-webgl'));
    console.log('[MC] WebGL 检测:', webglOK ? '可用' : '不可用');
    if (webglOK) {
      try {
        const r3d = new Renderer3D();
        if (r3d.init(container)) {
          this.renderer = r3d;
          gameActions.setRenderer('3d');
          console.log('[MC] 使用 3D 渲染器');
        } else {
          throw new Error('Renderer3D.init 返回 false');
        }
      } catch (err: any) {
        console.warn('[MC] 3D 启动失败，降级到 2D:', err?.message || err);
        // 清理可能残留的 dom
        while (container.firstChild) container.removeChild(container.firstChild);
        this.tryStart2D(container);
      }
    } else {
      this.tryStart2D(container);
    }

    // 4. 绑定输入
    const cb: InputCallbacks = {
      onLeftDown: () => {
        gameActions.setLeftDown(true);
        this.leftDownAt = performance.now();
      },
      onLeftUp: () => {
        gameActions.setLeftDown(false);
        gameActions.setBreaking(null);
      },
      onRightClick: () => {
        this.placeBlock();
      },
      onHotbarDigit: (idx) => {
        gameActions.setHotbarIndex(idx);
        gameActions.setBreaking(null);
      },
      onHotbarScroll: (delta) => {
        const s = useGameStore.getState();
        const n = s.slots.length;
        const next = (s.hotbarIndex + delta + n) % n;
        gameActions.setHotbarIndex(next);
        gameActions.setBreaking(null);
      },
      onToggleMode: () => {
        const s = useGameStore.getState();
        gameActions.setMode(s.mode === 'walk' ? 'fly' : 'walk');
        audio.swoosh();
      },
      onRespawn: () => {
        const sp = this.world.spawnPoint();
        gameActions.setPos(sp.x, sp.y, sp.z);
        gameActions.setVel(0, 0, 0);
        gameActions.setBreaking(null);
      },
    };
    inputManager.attach(container, cb);
    // 暴露引擎给屏幕按钮
    (window as any).__mc = {
      engine: this,
      input: inputManager,
      audio,
      world: this.world,
    };

    // 监听窗口尺寸变化
    window.addEventListener('resize', this.handleResize);
    this.handleResize();

    // 5. 启动主循环
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
    console.log('[MC] 引擎主循环启动');
  }

  /** 屏幕按钮触发：放置方块 */
  placeBlock() {
    const hit = this.raycastBlock();
    if (!hit) {
      gameActions.setSaveMessage('✗ 放置失败：先看向一个方块');
      setTimeout(() => gameActions.setSaveMessage(null), 1500);
      return;
    }
    const slot = useGameStore.getState().slots[useGameStore.getState().hotbarIndex];
    if (slot.kind !== 'block') {
      gameActions.setSaveMessage('✗ 放置失败：当前槽是工具（切到方块槽 1-6）');
      setTimeout(() => gameActions.setSaveMessage(null), 1500);
      return;
    }
    if (slot.type === 'air' || slot.type === 'water') {
      gameActions.setSaveMessage('✗ 放置失败：空气/水不能放');
      setTimeout(() => gameActions.setSaveMessage(null), 1500);
      return;
    }
    const nx = hit.blockPos.x + hit.normal.x;
    const ny = hit.blockPos.y + hit.normal.y;
    const nz = hit.blockPos.z + hit.normal.z;
    if (!this.world.inBounds(nx, ny, nz)) return;
    const s = useGameStore.getState();
    if (this.playerOccupies(nx, ny, nz, s.pos)) {
      gameActions.setSaveMessage('✗ 放置失败：位置被你身体占用');
      setTimeout(() => gameActions.setSaveMessage(null), 1500);
      return;
    }
    if (this.world.get(nx, ny, nz) !== 'air') return;
    this.world.set(nx, ny, nz, slot.type);
    audio.place(BLOCKS[slot.type].soundFreq);
  }

  /** 屏幕按钮触发：开始破坏 */
  startBreak() {
    gameActions.setLeftDown(true);
    this.leftDownAt = performance.now();
  }
  /** 屏幕按钮触发：结束破坏 */
  endBreak() {
    gameActions.setLeftDown(false);
    gameActions.setBreaking(null);
  }

  /** 重新生成世界（清空 localStorage） */
  resetWorld() {
    this.world.clearStorage();
    location.reload();
  }

  /** 快速保存到指定槽位 */
  quickSave(slot: number, name: string) {
    const ok = this.world.saveToSlot(slot, name);
    const ts = new Date();
    const fmt = `${ts.getHours()}:${String(ts.getMinutes()).padStart(2, '0')}`;
    gameActions.setSaveMessage(ok ? `✓ 槽位 ${slot + 1} "${name}" 已保存 (${fmt})` : `✗ 保存失败`);
    gameActions.setSaveMenuOpen(false);
    setTimeout(() => gameActions.setSaveMessage(null), 2500);
    return ok;
  }

  /** 快速加载指定槽位 */
  quickLoad(slot: number) {
    const ok = this.world.loadFromSlot(slot);
    // 重置玩家位置到出生点
    const sp = this.world.spawnPoint();
    gameActions.setPos(sp.x, sp.y, sp.z);
    gameActions.setVel(0, 0, 0);
    gameActions.setBreaking(null);
    gameActions.setHighlight(null);
    gameActions.setSaveMessage(ok ? `✓ 已加载槽位 ${slot + 1}` : `✗ 加载失败`);
    gameActions.setSaveMenuOpen(false);
    setTimeout(() => gameActions.setSaveMessage(null), 2500);
    return ok;
  }

  /** 启动 2D 渲染器 */
  private tryStart2D(container: HTMLElement): boolean {
    try {
      const r2d = new Renderer2D();
      if (r2d.init(container)) {
        this.renderer = r2d;
        gameActions.setRenderer('2d');
        console.log('[MC] 使用 2D 渲染器（降级）');
        return true;
      }
    } catch (err: any) {
      console.error('[MC] 2D 渲染器启动异常:', err?.message || err);
    }
    gameActions.setError('无法启动任何渲染器');
    return false;
  }

  private handleResize = () => {
    this.renderer?.onResize();
  };

  private loop = () => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.loop);
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    // 标签页切换后 dt 可能很大（>0.5s），跳过本次更新避免位置跳变
    if (dt > 0.5) {
      this.lastTime = now;
      return;
    }
    this.lastTime = now;
    this.frameCount++;
    try {
      this.update(dt);
      this.render();
    } catch (err: any) {
      const msg = err?.message || String(err);
      // 记录但不阻塞游戏（如果阻塞，玩家就动不了）
      if (this.lastRenderError !== msg) {
        this.lastRenderError = msg;
      }
      console.error('[MC] 主循环错误:', err);
    }
    // 调试信息推送
    this.debugTimer += dt;
    if (this.debugTimer > 0.1) {
      this.debugTimer = 0;
      gameActions.setFrameCount(this.frameCount);
    }
    // 自动保存（每 5 秒）
    this.saveTimer += dt;
    if (this.saveTimer > 5) {
      this.saveTimer = 0;
      this.world.saveToStorage();
    }
  };

  private update(dt: number) {
    const s = useGameStore.getState();
    if (s.paused) return;
    // 注意：不要因为 s.error 就 return —— 那会让玩家无法移动
    // 即使渲染失败，玩家也应当能操作（破坏/放置用 updatePlayer/raycastBlock，不依赖渲染）

    // 1. 处理破坏
    if (s.leftDown) {
      this.tickBreaking(dt);
    } else {
      if (s.breaking) gameActions.setBreaking(null);
    }

    // 2. 更新玩家位置
    this.updatePlayer(dt);

    // 3. 更新 highlight
    this.updateHighlight();

    // 4. 推进昼夜
    const dayTime = (s.dayTime + dt * 20) % 24000;
    gameActions.setDayTime(dayTime);
  }

  private updateHighlight() {
    const hit = this.raycastBlock();
    if (hit) gameActions.setHighlight(hit.blockPos);
    else gameActions.setHighlight(null);
  }

  private render() {
    if (!this.renderer) return;
    const s = useGameStore.getState();
    const slot = s.slots[s.hotbarIndex];
    try {
      this.renderer.render({
        pos: s.pos,
        yaw: s.yaw,
        pitch: s.pitch,
        vel: s.vel,
        onGround: s.onGround,
        mode: s.mode,
        highlight: s.highlight,
        breaking: s.breaking,
        dayTime: s.dayTime,
        currentSlot: slot,
        isBreaking: s.leftDown && s.breaking !== null,
      }, this.world);
    } catch (err: any) {
      const msg = err?.message || String(err);
      // 单次渲染错误只 warn，不修改 store.error（避免 setError 后 update 跳过导致玩家无法移动）
      if (this.lastRenderError !== msg) {
        this.lastRenderError = msg;
        console.warn('[MC] 渲染器错误（已忽略，下次再错会继续 warn）:', msg);
      }
    }
  }

  // ===== 玩家移动 =====
  private updatePlayer(dt: number) {
    const s = useGameStore.getState();
    const keys = s.keys;
    const { pos, yaw, pitch, mode, vel } = s;

    // 移动方向（基于 yaw 的前/右）
    const forwardX = -Math.sin(yaw);
    const forwardZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    let moveX = 0, moveZ = 0;
    if (keys.has('KeyW')) { moveX += forwardX; moveZ += forwardZ; }
    if (keys.has('KeyS')) { moveX -= forwardX; moveZ -= forwardZ; }
    if (keys.has('KeyD')) { moveX += rightX; moveZ += rightZ; }
    if (keys.has('KeyA')) { moveX -= rightX; moveZ -= rightZ; }
    const moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);

    let newVel = { ...vel };
    if (mode === 'fly') {
      const speed = FLY_SPEED;
      if (moveLen > 0) {
        const inv = 1 / moveLen;
        newVel.x = moveX * inv * speed;
        newVel.z = moveZ * inv * speed;
      } else {
        newVel.x = 0;
        newVel.z = 0;
      }
      newVel.y = 0;
      if (keys.has('Space')) newVel.y = speed;
      if (keys.has('ShiftLeft') || keys.has('ShiftRight')) newVel.y = -speed;
    } else {
      if (moveLen > 0) {
        const inv = 1 / moveLen;
        newVel.x = moveX * inv * PLAYER_SPEED;
        newVel.z = moveZ * inv * PLAYER_SPEED;
      } else {
        newVel.x = 0;
        newVel.z = 0;
      }
      newVel.y = (vel.y || 0) + GRAVITY * dt;
      if (newVel.y < -40) newVel.y = -40;
      // 跳跃
      if (keys.has('Space') && s.onGround) {
        newVel.y = JUMP_SPEED;
      }
    }

    // 应用碰撞
    const newPos = this.moveWithCollision({ ...pos }, newVel, dt);
    // 鼠标未锁定时用箭头键转视角（避免与 mousemove 冲突）
    if (!s.pointerLocked) {
      let ny = yaw, np = pitch;
      if (keys.has('ArrowLeft')) ny += ARROW_SPEED * dt;
      if (keys.has('ArrowRight')) ny -= ARROW_SPEED * dt;
      if (keys.has('ArrowUp')) np += ARROW_SPEED * dt;
      if (keys.has('ArrowDown')) np -= ARROW_SPEED * dt;
      const lim = Math.PI / 2 - 0.01;
      if (np > lim) np = lim;
      if (np < -lim) np = -lim;
      gameActions.setYaw(ny);
      gameActions.setPitch(np);
    }

    // 防掉出世界
    if (newPos.y < -5) {
      const sp = this.world.spawnPoint();
      newPos.x = sp.x; newPos.y = sp.y; newPos.z = sp.z;
      newVel.x = 0; newVel.y = 0; newVel.z = 0;
    }
    gameActions.setPos(newPos.x, newPos.y, newPos.z);
    gameActions.setVel(newVel.x, newVel.y, newVel.z);
    gameActions.setOnGround(this.isOnGround(newPos));
  }

  private moveWithCollision(pos: { x: number; y: number; z: number }, vel: { x: number; y: number; z: number }, dt: number) {
    const newPos = { ...pos };
    const stepAxis = (axis: 'x' | 'y' | 'z') => {
      const d = vel[axis] * dt;
      if (d === 0) return;
      const test = { ...newPos };
      test[axis] += d;
      if (this.collidesAt(test)) {
        vel[axis] = 0;
      } else {
        newPos[axis] = test[axis];
      }
    };
    stepAxis('x');
    stepAxis('z');
    stepAxis('y');
    return newPos;
  }

  private isOnGround(pos: { x: number; y: number; z: number }) {
    // 玩家脚底下方一个方块是实心
    const test = { ...pos };
    test.y = pos.y - PLAYER_EYE - 0.05;
    return this.collidesAt(test);
  }

  private collidesAt(pos: { x: number; y: number; z: number }) {
    const minX = Math.floor(pos.x - PLAYER_HALF);
    const maxX = Math.floor(pos.x + PLAYER_HALF);
    const minZ = Math.floor(pos.z - PLAYER_HALF);
    const maxZ = Math.floor(pos.z + PLAYER_HALF);
    const minY = Math.floor(pos.y - PLAYER_EYE);
    const maxY = Math.floor(pos.y - PLAYER_EYE + PLAYER_HEIGHT - 0.01);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.world.isSolid(x, y, z)) return true;
        }
      }
    }
    return false;
  }

  private playerOccupies(bx: number, by: number, bz: number, pos: { x: number; y: number; z: number }) {
    const minX = pos.x - PLAYER_HALF;
    const maxX = pos.x + PLAYER_HALF;
    const minZ = pos.z - PLAYER_HALF;
    const maxZ = pos.z + PLAYER_HALF;
    const minY = pos.y - PLAYER_EYE;
    const maxY = minY + PLAYER_HEIGHT;
    return (maxX > bx && minX < bx + 1 && maxY > by && minY < by + 1 && maxZ > bz && minZ < bz + 1);
  }

  // ===== 射线拾取 =====
  raycastBlock(): { blockPos: { x: number; y: number; z: number }; normal: { x: number; y: number; z: number } } | null {
    const s = useGameStore.getState();
    const { pos, yaw, pitch } = s;
    const dirX = -Math.sin(yaw) * Math.cos(pitch);
    const dirY = Math.sin(pitch);
    const dirZ = -Math.cos(yaw) * Math.cos(pitch);

    // DDA
    let mapX = Math.floor(pos.x);
    let mapY = Math.floor(pos.y);
    let mapZ = Math.floor(pos.z);
    let tMaxX = ((dirX > 0 ? mapX + 1 : mapX) - pos.x) / (dirX || 1e-6);
    let tMaxY = ((dirY > 0 ? mapY + 1 : mapY) - pos.y) / (dirY || 1e-6);
    let tMaxZ = ((dirZ > 0 ? mapZ + 1 : mapZ) - pos.z) / (dirZ || 1e-6);
    const tDeltaX = Math.abs(1 / (dirX || 1e-6));
    const tDeltaY = Math.abs(1 / (dirY || 1e-6));
    const tDeltaZ = Math.abs(1 / (dirZ || 1e-6));
    const stepX = dirX > 0 ? 1 : -1;
    const stepY = dirY > 0 ? 1 : -1;
    const stepZ = dirZ > 0 ? 1 : -1;
    let t = 0;
    let normal = { x: 0, y: 0, z: 0 };
    while (t < REACH) {
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        t = tMaxX;
        tMaxX += tDeltaX;
        mapX += stepX;
        normal = { x: -stepX, y: 0, z: 0 };
      } else if (tMaxY < tMaxZ) {
        t = tMaxY;
        tMaxY += tDeltaY;
        mapY += stepY;
        normal = { x: 0, y: -stepY, z: 0 };
      } else {
        t = tMaxZ;
        tMaxZ += tDeltaZ;
        mapZ += stepZ;
        normal = { x: 0, y: 0, z: -stepZ };
      }
      if (!this.world.inBounds(mapX, mapY, mapZ)) return null;
      const block = this.world.get(mapX, mapY, mapZ);
      if (block !== 'air' && block !== 'water') {
        return { blockPos: { x: mapX, y: mapY, z: mapZ }, normal };
      }
    }
    return null;
  }

  private tickBreaking(dt: number) {
    const hit = this.raycastBlock();
    if (!hit) {
      if (useGameStore.getState().breaking) gameActions.setBreaking(null);
      return;
    }
    const { x, y, z } = hit.blockPos;
    const block = this.world.get(x, y, z);
    if (block === 'air' || block === 'water') {
      if (useGameStore.getState().breaking) gameActions.setBreaking(null);
      return;
    }
    const cur = useGameStore.getState().breaking;
    if (!cur || cur.pos.x !== x || cur.pos.y !== y || cur.pos.z !== z) {
      // 切换目标时重置
      const slot = useGameStore.getState().slots[useGameStore.getState().hotbarIndex];
      const tool = slot.kind === 'tool' ? slot.type : null;
      const total = breakTime(tool, block, BLOCKS[block].hardness);
      gameActions.setBreaking({ pos: { x, y, z }, progress: 0, total, block });
    }
    const next = useGameStore.getState().breaking;
    if (!next) return;
    const newProgress = Math.min(1, next.progress + dt / next.total);
    gameActions.setBreaking({ ...next, progress: newProgress });
    if (newProgress >= 1) {
      this.world.set(x, y, z, 'air');
      audio.break(BLOCKS[block].soundFreq);
      gameActions.setBreaking(null);
    }
  }

  dispose() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    this.world.saveToStorage();
    this.renderer?.dispose();
    inputManager.dispose();
    window.removeEventListener('resize', this.handleResize);
    (window as any).__mc = null;
  }
}
