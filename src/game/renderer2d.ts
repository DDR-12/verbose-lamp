import { World } from './world';
import { BlockType, BLOCKS } from './blocks';

/**
 * 2D Canvas 备用渲染器 —— 当 WebGL 不可用时自动降级
 * 第一人称俯视视角：世界随玩家朝向旋转，WASD 相对朝向移动
 */
export class Renderer2D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: World;
  private tileSize = 18;

  playerX = 0;
  playerZ = 0;
  playerYaw = 0;
  playerPitch = 0;
  playerY = 0;

  constructor(container: HTMLElement, world: World) {
    this.world = world;
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:crosshair;';
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D Canvas 不可用');
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

    // 天空
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, width, height);

    // 以屏幕中心为原点，旋转整个世界
    const cx = width / 2;
    const cy = height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    // 旋转：让玩家面朝的方向（-yaw）对应屏幕上方
    ctx.rotate(-this.playerYaw - Math.PI / 2);

    // 计算可见范围（旋转后的矩形需要更大的范围）
    const diagonal = Math.sqrt(width * width + height * height) / 2;
    const tilesNeeded = Math.ceil(diagonal / ts) + 2;

    const pcx = Math.floor(this.playerX);
    const pcz = Math.floor(this.playerZ);

    const playerBlockY = Math.floor(this.playerY);

    // 渲染方块
    for (let dz = -tilesNeeded; dz <= tilesNeeded; dz++) {
      for (let dx = -tilesNeeded; dx <= tilesNeeded; dx++) {
        const wx = pcx + dx;
        const wz = pcz + dz;

        // 找最顶部的实心方块
        let topBlock: BlockType | null = null;
        let topY = -1;
        for (let y = Math.min(playerBlockY + 5, this.world.sizeY - 1); y >= 0; y--) {
          const b = this.world.get(wx, y, wz);
          if (b !== 'air' && b !== 'water' && BLOCKS[b].solid) {
            topBlock = b;
            topY = y;
            break;
          }
        }
        if (!topBlock) continue;

        // 方块在屏幕上的位置（相对于玩家，以玩家为原点）
        const sx = (wx - this.playerX) * ts;
        const sy = (wz - this.playerZ) * ts;

        // 颜色
        const color = BLOCKS[topBlock].color;
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;

        // 高度差着色
        const heightDiff = topY - playerBlockY;
        const shade = Math.max(0.35, Math.min(1.4, 1 + heightDiff * 0.1));

        // pitch 影响：低头看更亮，抬头看更暗（模拟仰视/俯视）
        const pitchShade = 1 + this.playerPitch * 0.15;
        const finalShade = shade * Math.max(0.5, Math.min(1.3, pitchShade));

        ctx.fillStyle = `rgb(${Math.min(255, Math.floor(r * finalShade))}, ${Math.min(255, Math.floor(g * finalShade))}, ${Math.min(255, Math.floor(b * finalShade))})`;
        ctx.fillRect(sx - ts / 2, sy - ts / 2, ts - 1, ts - 1);

        // 边框
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(sx - ts / 2, sy - ts / 2, ts - 1, ts - 1);
      }
    }

    // 画准星方向指示线（从玩家向前延伸）
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -diagonal);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();

    // ====== 固定 UI（不随世界旋转） ======

    // 中心准星
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx, cy + 12);
    ctx.stroke();

    // 玩家位置小圆点
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 朝向三角（固定在屏幕上方中央，表示"前方"）
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 20);
    ctx.lineTo(cx - 6, cy - 12);
    ctx.lineTo(cx + 6, cy - 12);
    ctx.closePath();
    ctx.fill();

    // HUD
    const yawDeg = ((this.playerYaw * 180 / Math.PI) % 360 + 360) % 360;
    const pitchDeg = this.playerPitch * 180 / Math.PI;
    let compass = '北';
    if (yawDeg >= 315 || yawDeg < 45) compass = '北';
    else if (yawDeg >= 45 && yawDeg < 135) compass = '西';
    else if (yawDeg >= 135 && yawDeg < 225) compass = '南';
    else compass = '东';

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(8, 8, 260, 90);
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('2D 模式 (WebGL 不可用)', 14, 26);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`位置: ${this.playerX.toFixed(1)}, ${this.playerY.toFixed(1)}, ${this.playerZ.toFixed(1)}`, 14, 44);
    ctx.fillText(`朝向: ${yawDeg.toFixed(0)}° (${compass})  俯仰: ${pitchDeg.toFixed(0)}°`, 14, 60);
    ctx.fillStyle = '#8f8';
    ctx.fillText(`WASD移动 · 方向键转视角 · 鼠标拖拽转`, 14, 78);
    ctx.fillText(`左键破坏 · 右键放置 · F切换飞行/走路`, 14, 94);

    // 罗盘
    ctx.save();
    ctx.translate(width - 50, 50);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // N 指针
    ctx.save();
    ctx.rotate(-this.playerYaw - Math.PI / 2);
    ctx.fillStyle = '#f44';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // N 字
    ctx.fillStyle = '#f44';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -32);
    ctx.restore();
  }

  dispose() {
    this.canvas.remove();
  }
}
