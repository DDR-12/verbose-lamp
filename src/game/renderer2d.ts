import { World } from './world';
import { BlockType, BLOCKS } from './blocks';

/**
 * 2D Canvas 备用渲染器 —— 当 WebGL 不可用时自动降级
 * 渲染俯视图（XZ 平面），玩家在中心
 */
export class Renderer2D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: World;
  private tileSize = 16; // 每个方块的像素大小

  // 玩家状态（由引擎同步过来）
  playerX = 0;
  playerZ = 0;
  playerYaw = 0;
  playerY = 0;

  constructor(container: HTMLElement, world: World) {
    this.world = world;
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D Canvas 也不可用');
    this.ctx = ctx;
    container.appendChild(this.canvas);
    this.resize();
  }

  resize() {
    const w = this.canvas.parentElement?.clientWidth || window.innerWidth;
    const h = this.canvas.parentElement?.clientHeight || window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  render() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const ts = this.tileSize;

    // 清空
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, width, height);

    // 计算可见范围（以玩家为中心）
    const tilesX = Math.ceil(width / ts) + 2;
    const tilesZ = Math.ceil(height / ts) + 2;
    const cx = Math.floor(this.playerX);
    const cz = Math.floor(this.playerZ);
    const startX = cx - Math.floor(tilesX / 2);
    const startZ = cz - Math.floor(tilesZ / 2);

    // 玩家在屏幕中心
    const offsetX = width / 2 - (this.playerX - startX) * ts;
    const offsetZ = height / 2 - (this.playerZ - startZ) * ts;

    // 渲染方块（从玩家 Y 高度往下看，显示最顶层的实心方块）
    const playerBlockY = Math.floor(this.playerY);

    for (let dz = 0; dz < tilesZ; dz++) {
      for (let dx = 0; dx < tilesX; dx++) {
        const wx = startX + dx;
        const wz = startZ + dz;

        // 从玩家脚下的 Y 开始往下找最顶部的实心方块
        let topBlock: BlockType | null = null;
        let topY = -1;
        for (let y = Math.min(playerBlockY + 3, this.world.sizeY - 1); y >= 0; y--) {
          const b = this.world.get(wx, y, wz);
          if (b !== 'air' && b !== 'water' && BLOCKS[b].solid) {
            topBlock = b;
            topY = y;
            break;
          }
        }

        if (!topBlock) continue;

        const sx = offsetX + dx * ts;
        const sy = offsetZ + dz * ts;

        // 颜色
        const color = BLOCKS[topBlock].color;
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;

        // 高度着色：比玩家高的方块更亮，比玩家低的更暗
        const heightDiff = topY - playerBlockY;
        const shade = Math.max(0.3, Math.min(1.3, 1 + heightDiff * 0.08));

        ctx.fillStyle = `rgb(${Math.min(255, Math.floor(r * shade))}, ${Math.min(255, Math.floor(g * shade))}, ${Math.min(255, Math.floor(b * shade))})`;
        ctx.fillRect(sx, sy, ts - 1, ts - 1);

        // 方块边框
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(sx, sy, ts - 1, ts - 1);
      }
    }

    // 画玩家（三角形指向朝向）
    const px = width / 2;
    const py = height / 2;
    const size = ts * 0.8;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-this.playerYaw + Math.PI);

    // 身体
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-size * 0.6, size * 0.5);
    ctx.lineTo(size * 0.6, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // HUD 信息
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(8, 8, 220, 70);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`2D 模式 (WebGL 不可用)`, 14, 24);
    ctx.fillText(`位置: ${this.playerX.toFixed(1)}, ${this.playerY.toFixed(1)}, ${this.playerZ.toFixed(1)}`, 14, 40);
    ctx.fillText(`朝向: ${(this.playerYaw * 180 / Math.PI).toFixed(0)}°`, 14, 56);
    ctx.fillText(`WASD移动 · 方向键/鼠标转视角`, 14, 72);
  }

  dispose() {
    this.canvas.remove();
  }
}
