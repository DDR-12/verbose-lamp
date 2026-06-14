// ===== 输入管理：键盘、鼠标、Pointer Lock、屏幕按钮统一接入 =====

import { gameActions, useGameStore } from './store';
import { DEFAULT_HOTBAR } from './hotbar';
import type { ToolType } from './tools';

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'Space',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
  'Digit6', 'Digit7', 'Digit8', 'Digit9',
  'KeyF', 'KeyR',
  'ShiftLeft', 'ShiftRight',
]);

export interface InputCallbacks {
  /** 左键按下（不含 UI 按钮点击） */
  onLeftDown?: () => void;
  onLeftUp?: () => void;
  /** 右键点击（不含 UI 按钮） */
  onRightClick?: () => void;
  /** 滚轮切换快捷栏 */
  onHotbarScroll?: (delta: number) => void;
  /** 数字键切换快捷栏 */
  onHotbarDigit?: (index: number) => void;
  /** 模式切换 */
  onToggleMode?: () => void;
  /** 重生 */
  onRespawn?: () => void;
  /** 跳（F 切换外） */
  onJump?: () => void;
}

export class InputManager {
  private container: HTMLElement | null = null;
  private callbacks: InputCallbacks = {};
  private locked: boolean = false;

  /** 由引擎调用：注入目标容器与回调 */
  attach(container: HTMLElement, callbacks: InputCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.bindEvents();
    console.log('[MC] InputManager 已绑定事件');
  }

  /** 由 Home 组件屏幕按钮调用 */
  press(code: string) {
    this.handleKeyDown(code);
  }
  release(code: string) {
    this.handleKeyUp(code);
  }

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('wheel', this.onWheel, { passive: false });
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    // 全局错误捕获
    window.addEventListener('error', (e) => {
      gameActions.setError(`全局错误: ${e.message}`);
      console.error('[MC] 全局错误:', e);
    });
    window.addEventListener('unhandledrejection', (e) => {
      gameActions.setError(`Promise 错误: ${e.reason}`);
      console.error('[MC] 未处理 Promise:', e);
    });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    this.handleKeyDown(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.handleKeyUp(e.code);
  };

  private handleKeyDown(code: string) {
    gameActions.addKey(code);
    this.handleGameShortcuts(code);
  }

  private handleKeyUp(code: string) {
    gameActions.removeKey(code);
  }

  private handleGameShortcuts(code: string) {
    if (code === 'KeyF') {
      this.callbacks.onToggleMode?.();
    } else if (code === 'KeyR') {
      this.callbacks.onRespawn?.();
    } else if (code === 'KeyE') {
      // 切换保存菜单
      const cur = useGameStore.getState();
      gameActions.setSaveMenuOpen(!cur.saveMenuOpen);
    } else if (code === 'Escape') {
      // 关闭保存菜单（如果有）
      if (useGameStore.getState().saveMenuOpen) {
        gameActions.setSaveMenuOpen(false);
      }
    } else if (/^Digit[1-9]$/.test(code)) {
      const idx = parseInt(code.replace('Digit', ''), 10) - 1;
      if (idx < DEFAULT_HOTBAR.length) this.callbacks.onHotbarDigit?.(idx);
    } else if (code === 'Space') {
      // 仅当玩家落地时通知（实际跳跃逻辑在 player.update 中处理）
      this.callbacks.onJump?.();
    }
  }

  private onMouseMove = (e: MouseEvent) => {
    if (this.locked) {
      const sens = 0.0022;
      const s = useGameStore.getState();
      let { yaw, pitch } = s;
      yaw -= e.movementX * sens;
      pitch -= e.movementY * sens;
      const lim = Math.PI / 2 - 0.01;
      if (pitch > lim) pitch = lim;
      if (pitch < -lim) pitch = -lim;
      gameActions.setYaw(yaw);
      gameActions.setPitch(pitch);
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    // 跳过 UI 按钮（让 Home 组件自己处理屏幕按钮）
    if (e.target instanceof HTMLElement && e.target.closest('button')) return;
    if (e.button === 0) {
      this.callbacks.onLeftDown?.();
    } else if (e.button === 2) {
      this.callbacks.onRightClick?.();
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('button')) return;
    if (e.button === 0) {
      this.callbacks.onLeftUp?.();
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.target instanceof HTMLElement && e.target.closest('button, input, textarea')) return;
    const delta = e.deltaY > 0 ? 1 : -1;
    this.callbacks.onHotbarScroll?.(delta);
  };

  private onPointerLockChange = () => {
    const dom = this.container;
    if (!dom) return;
    this.locked = document.pointerLockElement === dom;
    gameActions.setPointerLocked(this.locked);
    if (!this.locked) {
      // 退出锁定时取消破坏状态
      gameActions.setLeftDown(false);
      gameActions.setBreaking(null);
    }
  };

  /** 请求 Pointer Lock（用于鼠标控制视角） */
  requestPointerLock() {
    const dom = this.container;
    if (!dom) return;
    try {
      const fn: any = (dom as any).requestPointerLock
        || (dom as any).webkitRequestPointerLock
        || (dom as any).mozRequestPointerLock;
      if (fn) {
        const r = fn.call(dom);
        if (r && typeof r.catch === 'function') {
          r.catch((err: any) => console.warn('[MC] requestPointerLock 失败:', err?.message || err));
        }
      }
    } catch (err: any) {
      console.warn('[MC] requestPointerLock 异常:', err?.message || err);
    }
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}

// 单例
export const inputManager = new InputManager();
