// ===== 2D 射线投射渲染器（Wolfenstein 风格第一人称伪 3D）=====
// 保证在所有浏览器里都能跑 —— 包括 WebGL 禁用的环境

import type { GameRenderer } from './renderer';
import { BLOCKS, type BlockType } from './blocks';
import { TOOLS } from './tools';
import type { Slot } from './types';
import type { World } from './world';

const FOV = Math.PI / 3; // 60 度视野
const MAX_DIST = 16; // 渲染距离

// 方块类型 → 颜色（按面方向）
function blockColor(t: BlockType, face: 'top' | 'side' | 'bottom' | 'vert'): [number, number, number] {
  const base = BLOCKS[t].color;
  let r = (base >> 16) & 0xff;
  let g = (base >> 8) & 0xff;
  let b = base & 0xff;
  const mult = face === 'top' ? 1.15 : face === 'bottom' ? 0.55 : face === 'vert' ? 0.9 : 0.8;
  return [Math.min(255, Math.floor(r * mult)), Math.min(255, Math.floor(g * mult)), Math.min(255, Math.floor(b * mult))];
}

export class Renderer2D implements GameRenderer {
  readonly kind = '2d' as const;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private container: HTMLElement | null = null;
  // 帧间缓存：避免每帧重绘太慢时闪烁
  private lastRender = 0;
  // 玩家手持工具的摆动
  private toolSwing = 0;

  init(container: HTMLElement): boolean {
    this.container = container;
    const cvs = document.createElement('canvas');
    cvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;z-index:1;';
    const ctx = cvs.getContext('2d');
    if (!ctx) {
      console.error('[MC] 2D 渲染器：无法获取 CanvasRenderingContext2D');
      return false;
    }
    this.canvas = cvs;
    this.ctx = ctx;
    container.appendChild(cvs);
    this.onResize();
    // 立即画一帧（让用户看到画面不是空白）
    this.drawLoadingFrame();
    console.log('[MC] 2D 渲染器初始化成功');
    return true;
  }

  /** 立即画一帧 loading 画面（防止 init 后到第一帧 render 之间是空白） */
  private drawLoadingFrame() {
    if (!this.ctx || !this.canvas) return;
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, width, height / 2);
    ctx.fillStyle = '#3a4a3a';
    ctx.fillRect(0, height / 2, width, height / 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('2D 渲染器已就绪，正在加载...', width / 2, height / 2 - 10);
    ctx.fillText('WASD 移动 · 方向键转视角 · F 飞行', width / 2, height / 2 + 14);
  }

  onResize() {
    if (!this.canvas || !this.container) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    // 限制最大分辨率
    const scale = Math.min(1, 800 / w);
    this.canvas.width = Math.max(320, Math.floor(w * scale));
    this.canvas.height = Math.max(240, Math.floor(h * scale));
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  private dayTimeColor(dayTime: number): { sky: string; floor: string; fog: number } {
    // dayTime 0~24000, 0=黎明 6000=正午 12000=黄昏 18000=深夜
    const t = (dayTime / 24000) * Math.PI * 2;
    // 太阳高度
    const sun = Math.sin(t - Math.PI / 2); // -1~1
    // 天顶颜色
    let topR: number, topG: number, topB: number;
    if (sun > 0.3) {
      // 白天
      const k = (sun - 0.3) / 0.7;
      topR = 100 + k * 35; topG = 180 + k * 30; topB = 230 + k * 25;
    } else if (sun > -0.1) {
      // 黄昏/黎明
      const k = (sun + 0.1) / 0.4;
      topR = 230 + (1 - k) * 20; topG = 130 + (1 - k) * 50; topB = 80 + (1 - k) * 150;
    } else {
      // 黑夜
      topR = 15; topG = 18; topB = 35;
    }
    // 地板颜色
    const floorR = Math.floor(topR * 0.5);
    const floorG = Math.floor(topG * 0.5);
    const floorB = Math.floor(topB * 0.5);
    return {
      sky: `rgb(${Math.floor(topR)}, ${Math.floor(topG)}, ${Math.floor(topB)})`,
      floor: `rgb(${floorR}, ${floorG}, ${floorB})`,
      fog: 1 - Math.max(0, sun) * 0.3,
    };
  }

  render(state: {
    pos: { x: number; y: number; z: number };
    yaw: number;
    pitch: number;
    highlight: { x: number; y: number; z: number } | null;
    breaking: { pos: { x: number; y: number; z: number }; progress: number; block: BlockType } | null;
    dayTime: number;
    currentSlot: Slot;
    isBreaking: boolean;
  }, world: World) {
    if (!this.ctx || !this.canvas) return;
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // 工具摆动
    if (state.isBreaking) {
      this.toolSwing = (this.toolSwing + 0.4) % (Math.PI * 2);
    } else {
      this.toolSwing *= 0.85;
    }

    const colors = this.dayTimeColor(state.dayTime);
    // 天空
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height / 2);
    skyGrad.addColorStop(0, colors.sky);
    skyGrad.addColorStop(1, colors.sky);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height / 2);

    // 地面
    const floorGrad = ctx.createLinearGradient(0, height / 2, 0, height);
    floorGrad.addColorStop(0, colors.floor);
    floorGrad.addColorStop(1, colors.floor);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, height / 2, width, height / 2);

    // 玩家位置（脚底）
    const px = state.pos.x;
    const py = state.pos.y - 1.6; // 脚底
    const pz = state.pos.z;

    // 视线的水平方向（X-Z 平面）
    const dirX = -Math.sin(state.yaw);
    const dirZ = -Math.cos(state.yaw);
    // 视线高度（玩家眼睛）≈ 1.6
    const eyeY = state.pos.y;

    // 仰俯角
    const pitchFactor = state.pitch; // -PI/2 ~ PI/2
    const horizonY = height / 2 + pitchFactor * (height / 4);

    // ===== 射线投射：对每列像素发射一条射线 =====
    const rays = Math.min(width, 320); // 控制列数
    const colWidth = width / rays;

    for (let col = 0; col < rays; col++) {
      const screenX = (col + 0.5) / rays * 2 - 1; // -1~1
      const rayAngle = state.yaw + screenX * (FOV / 2);
      const rayDirX = -Math.sin(rayAngle);
      const rayDirZ = -Math.cos(rayAngle);

      // DDA 步进
      let mapX = Math.floor(px);
      let mapZ = Math.floor(pz);
      const deltaDistX = Math.abs(1 / (rayDirX || 1e-6));
      const deltaDistZ = Math.abs(1 / (rayDirZ || 1e-6));
      let stepX = 0, stepZ = 0;
      let sideDistX = 0, sideDistZ = 0;
      if (rayDirX < 0) { stepX = -1; sideDistX = (px - mapX) * deltaDistX; }
      else { stepX = 1; sideDistX = (mapX + 1 - px) * deltaDistX; }
      if (rayDirZ < 0) { stepZ = -1; sideDistZ = (pz - mapZ) * deltaDistZ; }
      else { stepZ = 1; sideDistZ = (mapZ + 1 - pz) * deltaDistZ; }

      let hit = false;
      let side = 0; // 0=X 边, 1=Z 边
      let dist = 0;
      let hitBlock: BlockType = 'air';
      let hitY = 0; // 命中时的 y 高度

      for (let step = 0; step < 40; step++) {
        if (sideDistX < sideDistZ) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistZ += deltaDistZ;
          mapZ += stepZ;
          side = 1;
        }
        // 检查这个垂直列上的所有方块（眼睛到地面）
        // 简单：取视线 1.6 高度附近
        const testY = Math.floor(eyeY);
        const t = world.get(mapX, testY, mapZ);
        if (t !== 'air' && t !== 'water') {
          hit = true;
          hitBlock = t;
          hitY = testY;
          dist = side === 0 ? (mapX - px + (1 - stepX) / 2) / (rayDirX || 1e-6)
                             : (mapZ - pz + (1 - stepZ) / 2) / (rayDirZ || 1e-6);
          break;
        }
      }

      if (hit) {
        // 修正距离（避免鱼眼）
        const perpDist = dist * Math.cos(rayAngle - state.yaw);
        if (perpDist > 0.1 && perpDist < MAX_DIST) {
          // 柱子高度 = 屏幕高度 / 距离
          const wallHeight = height / perpDist;
          const wallTop = horizonY - wallHeight / 2;
          const wallBottom = horizonY + wallHeight / 2;

          const face = side === 0 ? 'vert' : 'vert';
          const col_rgb = blockColor(hitBlock, face);
          // 边墙颜色稍暗
          const shade = side === 0 ? 0.85 : 1.0;
          const r = Math.floor(col_rgb[0] * shade);
          const g = Math.floor(col_rgb[1] * shade);
          const b = Math.floor(col_rgb[2] * shade);
          // 距离衰减
          const fade = Math.max(0.2, 1 - perpDist / MAX_DIST);
          ctx.fillStyle = `rgb(${Math.floor(r * fade)}, ${Math.floor(g * fade)}, ${Math.floor(b * fade)})`;
          ctx.fillRect(col * colWidth, wallTop, colWidth + 0.5, wallBottom - wallTop);

          // 高亮
          if (state.highlight && state.highlight.x === mapX && state.highlight.z === mapZ) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.fillRect(col * colWidth, wallTop, colWidth + 0.5, wallBottom - wallTop);
            // 边框
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.lineWidth = 1;
            ctx.strokeRect(col * colWidth, wallTop, colWidth + 0.5, wallBottom - wallTop);
          }

          // 破坏裂纹
          if (state.breaking && state.breaking.pos.x === mapX && state.breaking.pos.z === mapZ) {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.3 + 0.5 * state.breaking.progress})`;
            // 画裂纹线
            ctx.strokeStyle = `rgba(0, 0, 0, ${0.5 + 0.4 * state.breaking.progress})`;
            ctx.lineWidth = 1;
            const segs = 5 + Math.floor(state.breaking.progress * 10);
            for (let s = 0; s < segs; s++) {
              const sx = col * colWidth + Math.random() * colWidth;
              const sy = wallTop + Math.random() * (wallBottom - wallTop);
              const sl = 2 + Math.random() * 6;
              const dir = Math.random() * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(sx + Math.cos(dir) * sl, sy + Math.sin(dir) * sl);
              ctx.stroke();
            }
          }
        }
      }
    }

    // ===== 手持工具（屏幕右下角） =====
    this.drawHeldItem(ctx, width, height, state.currentSlot);

    // ===== 准星 =====
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2;
    const cx = width / 2;
    const cy = height / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 10);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // ===== HUD =====
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(8, 8, 220, 70);
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('2D 模式 (WebGL 不可用)', 14, 24);
    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.fillText(`pos: ${state.pos.x.toFixed(1)}, ${state.pos.y.toFixed(1)}, ${state.pos.z.toFixed(1)}`, 14, 42);
    ctx.fillText(`yaw: ${(state.yaw * 180 / Math.PI).toFixed(0)}°  pitch: ${(state.pitch * 180 / Math.PI).toFixed(0)}°`, 14, 58);
    ctx.fillStyle = '#8f8';
    ctx.fillText(`WASD 移动 · 方向键转视角 · F 飞行`, 14, 72);
  }

  private drawHeldItem(ctx: CanvasRenderingContext2D, w: number, h: number, slot: Slot) {
    const baseX = w * 0.7;
    const baseY = h * 0.75;
    const swing = Math.sin(this.toolSwing) * 18;

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.rotate(-0.3 - Math.sin(this.toolSwing) * 0.2);

    if (slot.kind === 'tool') {
      const t = TOOLS[slot.type];
      const hex = '#' + t.color.toString(16).padStart(6, '0');
      const accent = '#' + t.accent.toString(16).padStart(6, '0');
      // 工具柄
      ctx.fillStyle = '#5a3a1b';
      ctx.fillRect(-3, 0, 6, 50);
      // 工具头
      ctx.fillStyle = accent;
      if (slot.type === 'axe') {
        ctx.beginPath();
        ctx.moveTo(-3, -10);
        ctx.lineTo(15, -16);
        ctx.lineTo(18, 2);
        ctx.lineTo(-3, 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();
      } else if (slot.type === 'pickaxe') {
        ctx.beginPath();
        ctx.moveTo(-18, -10);
        ctx.lineTo(18, -16);
        ctx.lineTo(20, -4);
        ctx.lineTo(-18, 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();
      } else if (slot.type === 'shovel') {
        ctx.beginPath();
        ctx.moveTo(-8, -16);
        ctx.lineTo(8, -16);
        ctx.lineTo(6, 4);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();
      } else {
        // sword
        ctx.beginPath();
        ctx.moveTo(-2, -28);
        ctx.lineTo(2, -28);
        ctx.lineTo(3, 0);
        ctx.lineTo(-3, 0);
        ctx.closePath();
        ctx.fillStyle = '#dadada';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();
        ctx.fillStyle = '#d4a02a';
        ctx.fillRect(-8, 0, 16, 4);
      }
    } else {
      // 方块
      const color = BLOCKS[slot.type].color;
      const c = '#' + color.toString(16).padStart(6, '0');
      ctx.fillStyle = c;
      ctx.fillRect(-12, -8, 24, 24);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-12, -8, 24, 24);
    }
    ctx.restore();
  }

  requestPointerLock() {
    // 2D 模式不支持 pointer lock —— 用方向键和鼠标拖拽
  }

  dispose() {
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
  }
}
