// ===== 世界：体素 + 序列化 + 生成 =====
import { BLOCKS, type BlockType } from './blocks';

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothNoise2D(gridX: number, gridZ: number) {
  const n = (x: number, z: number) => {
    const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    const v = s - Math.floor(s);
    return v * 2 - 1;
  };
  const v00 = n(gridX, gridZ);
  const v10 = n(gridX + 1, gridZ);
  const v01 = n(gridX, gridZ + 1);
  const v11 = n(gridX + 1, gridZ + 1);
  const fx = gridX - Math.floor(gridX);
  const fz = gridZ - Math.floor(gridZ);
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = v00 * (1 - u) + v10 * u;
  const b = v01 * (1 - u) + v11 * u;
  return a * (1 - v) + b * v;
}

export interface SerializedBlock {
  x: number;
  y: number;
  z: number;
  t: BlockType;
}

export class World {
  sizeX: number;
  sizeZ: number;
  sizeY: number;
  data: BlockType[];
  seed: number;
  /** 标记世界是否被修改（用于增量保存） */
  dirty: boolean = false;
  /** 单调递增的版本号：每次 set 自增，渲染器据此判断是否需要重建网格 */
  version: number = 0;

  constructor(sizeX = 8, sizeZ = 8, sizeY = 8, seed = 1337) {
    this.sizeX = sizeX;
    this.sizeZ = sizeZ;
    this.sizeY = sizeY;
    this.seed = seed;
    this.data = new Array(sizeX * sizeZ * sizeY).fill('air');
    this.generate();
  }

  private idx(x: number, y: number, z: number) {
    return x + z * this.sizeX + y * this.sizeX * this.sizeZ;
  }

  inBounds(x: number, y: number, z: number) {
    return x >= 0 && x < this.sizeX && y >= 0 && y < this.sizeY && z >= 0 && z < this.sizeZ;
  }

  get(x: number, y: number, z: number): BlockType {
    if (!this.inBounds(x, y, z)) return 'air';
    return this.data[this.idx(x, y, z)];
  }

  set(x: number, y: number, z: number, type: BlockType) {
    if (!this.inBounds(x, y, z)) return;
    this.data[this.idx(x, y, z)] = type;
    this.dirty = true;
    this.version++;
  }

  isSolid(x: number, y: number, z: number) {
    const t = this.get(x, y, z);
    return t !== 'air' && t !== 'water' && BLOCKS[t].solid;
  }

  private generate() {
    // 小世界：只放一个 1x1 平台作为出生点，周围全部是空气
    // 玩家可以自由破坏/放置来扩展
    const cx = Math.floor(this.sizeX / 2);
    const cz = Math.floor(this.sizeZ / 2);
    const groundY = Math.max(1, Math.floor(this.sizeY * 0.5));
    // 平台：草方块作为顶部，下方 2 层是泥土，最下层是石头
    this.set(cx, groundY, cz, 'grass');
    this.set(cx, groundY - 1, cz, 'dirt');
    this.set(cx, groundY - 2, cz, 'dirt');
    this.set(cx, groundY - 3, cz, 'stone');
  }

  spawnPoint() {
    const cx = Math.floor(this.sizeX / 2);
    const cz = Math.floor(this.sizeZ / 2);
    for (let y = this.sizeY - 1; y >= 0; y--) {
      if (this.isSolid(cx, y, cz)) return { x: cx + 0.5, y: y + 1.6, z: cz + 0.5 };
    }
    return { x: cx + 0.5, y: 20, z: cz + 0.5 };
  }

  /** 增量序列化（只保存非默认方块） */
  serialize(): { sizeX: number; sizeZ: number; sizeY: number; seed: number; diff: SerializedBlock[] } {
    const diff: SerializedBlock[] = [];
    // 简化：保存所有非空气方块（也便于完全恢复）
    for (let y = 0; y < this.sizeY; y++) {
      for (let z = 0; z < this.sizeZ; z++) {
        for (let x = 0; x < this.sizeX; x++) {
          const t = this.get(x, y, z);
          if (t !== 'air') diff.push({ x, y, z, t });
        }
      }
    }
    return { sizeX: this.sizeX, sizeZ: this.sizeZ, sizeY: this.sizeY, seed: this.seed, diff };
  }

  /** 从 localStorage 恢复（如果保存存在且与默认 seed 一致） */
  loadFromStorage(): boolean {
    try {
      const raw = localStorage.getItem('mc-world-save-v2');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed.sizeX !== this.sizeX || parsed.sizeY !== this.sizeY || parsed.sizeZ !== this.sizeZ) return false;
      // 重置为全 air
      this.data = new Array(this.sizeX * this.sizeZ * this.sizeY).fill('air');
      for (const b of parsed.diff as SerializedBlock[]) {
        if (this.inBounds(b.x, b.y, b.z)) {
          this.data[this.idx(b.x, b.y, b.z)] = b.t;
        }
      }
      this.dirty = false;
      this.version++;
      console.log('[MC] 从 localStorage 恢复世界:', parsed.diff.length, '个方块');
      return true;
    } catch (e) {
      console.warn('[MC] localStorage 恢复失败:', e);
      return false;
    }
  }

  saveToStorage() {
    if (!this.dirty) return;
    try {
      const data = this.serialize();
      localStorage.setItem('mc-world-save-v2', JSON.stringify(data));
      console.log('[MC] 已保存到 localStorage:', data.diff.length, '个方块');
    } catch (e) {
      console.warn('[MC] localStorage 保存失败:', e);
    }
  }

  /** 保存到指定槽位（用于多存档） */
  saveToSlot(slot: number, name: string) {
    try {
      const data = this.serialize();
      const meta = {
        name,
        timestamp: Date.now(),
        sizeX: this.sizeX,
        sizeY: this.sizeY,
        sizeZ: this.sizeZ,
        seed: this.seed,
        blockCount: data.diff.length,
      };
      localStorage.setItem(`mc-save-${slot}-meta`, JSON.stringify(meta));
      localStorage.setItem(`mc-save-${slot}-data`, JSON.stringify(data));
      this.dirty = false;
      console.log(`[MC] 存档 ${slot} ("${name}") 已保存，${data.diff.length} 个方块`);
      return true;
    } catch (e) {
      console.warn(`[MC] 存档 ${slot} 保存失败:`, e);
      return false;
    }
  }

  /** 从指定槽位加载 */
  loadFromSlot(slot: number): boolean {
    try {
      const raw = localStorage.getItem(`mc-save-${slot}-data`);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      // 校验 size
      if (parsed.sizeX !== this.sizeX || parsed.sizeY !== this.sizeY || parsed.sizeZ !== this.sizeZ) {
        console.warn(`[MC] 存档 ${slot} size 不匹配 (${parsed.sizeX}x${parsed.sizeY}x${parsed.sizeZ})，跳过`);
        return false;
      }
      this.data = new Array(this.sizeX * this.sizeZ * this.sizeY).fill('air');
      for (const b of parsed.diff as SerializedBlock[]) {
        if (this.inBounds(b.x, b.y, b.z)) {
          this.data[this.idx(b.x, b.y, b.z)] = b.t;
        }
      }
      this.dirty = false;
      this.version++;
      console.log(`[MC] 从槽位 ${slot} 加载，${parsed.diff.length} 个方块`);
      return true;
    } catch (e) {
      console.warn(`[MC] 存档 ${slot} 加载失败:`, e);
      return false;
    }
  }

  /** 列出所有存档槽位（包含元数据） */
  static listSlots(): Array<{ slot: number; name: string; timestamp: number; blockCount: number } | null> {
    const out: Array<{ slot: number; name: string; timestamp: number; blockCount: number } | null> = [];
    for (let s = 0; s < 3; s++) {
      try {
        const raw = localStorage.getItem(`mc-save-${s}-meta`);
        if (!raw) {
          out.push(null);
          continue;
        }
        const m = JSON.parse(raw);
        out.push({ slot: s, name: m.name, timestamp: m.timestamp, blockCount: m.blockCount });
      } catch {
        out.push(null);
      }
    }
    return out;
  }

  /** 删除指定槽位 */
  static deleteSlot(slot: number) {
    try {
      localStorage.removeItem(`mc-save-${slot}-meta`);
      localStorage.removeItem(`mc-save-${slot}-data`);
      console.log(`[MC] 存档 ${slot} 已删除`);
    } catch {}
  }

  /** 当前世界是否已修改 */
  isDirty() { return this.dirty; }

  clearStorage() {
    try {
      localStorage.removeItem('mc-world-save-v2');
      console.log('[MC] 已清空 localStorage');
    } catch {}
  }
}
