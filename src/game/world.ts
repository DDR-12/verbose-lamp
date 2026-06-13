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

  constructor(sizeX = 48, sizeZ = 48, sizeY = 24, seed = 1337) {
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
    const rand = mulberry32(this.seed);
    const heightMap = new Array(this.sizeX * this.sizeZ).fill(0);
    for (let z = 0; z < this.sizeZ; z++) {
      for (let x = 0; x < this.sizeX; x++) {
        let h = 0;
        h += smoothNoise2D(x * 0.08, z * 0.08) * 4;
        h += smoothNoise2D(x * 0.18, z * 0.18) * 2;
        h += smoothNoise2D(x * 0.04, z * 0.04) * 6;
        const ground = Math.floor(this.sizeY * 0.4 + h);
        heightMap[x + z * this.sizeX] = Math.max(2, Math.min(this.sizeY - 8, ground));
      }
    }

    for (let z = 0; z < this.sizeZ; z++) {
      for (let x = 0; x < this.sizeX; x++) {
        const top = heightMap[x + z * this.sizeX];
        for (let y = 0; y <= top; y++) {
          let t: BlockType = 'stone';
          if (y === top) {
            t = top <= this.sizeY * 0.35 ? 'sand' : 'grass';
          } else if (y >= top - 2) {
            t = top <= this.sizeY * 0.35 ? 'sand' : 'dirt';
          } else {
            t = 'stone';
          }
          this.set(x, y, z, t);
        }
      }
    }

    // 树
    const treeCount = 12;
    for (let i = 0; i < treeCount; i++) {
      const tx = Math.floor(rand() * (this.sizeX - 8)) + 4;
      const tz = Math.floor(rand() * (this.sizeZ - 8)) + 4;
      let topY = 0;
      for (let y = this.sizeY - 1; y >= 0; y--) {
        if (this.get(tx, y, tz) === 'grass') { topY = y; break; }
      }
      if (topY === 0) continue;
      const trunkH = 4 + Math.floor(rand() * 2);
      for (let k = 1; k <= trunkH; k++) this.set(tx, topY + k, tz, 'wood');
      const leafY = topY + trunkH;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -2; dx <= 2; dx++)
          for (let dz = -2; dz <= 2; dz++) {
            if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
            if (this.get(tx + dx, leafY + dy, tz + dz) === 'air') this.set(tx + dx, leafY + dy, tz + dz, 'leaves');
          }
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dz === 0) continue;
          if (this.get(tx + dx, leafY + 2, tz + dz) === 'air') this.set(tx + dx, leafY + 2, tz + dz, 'leaves');
        }
      if (this.get(tx, leafY + 2, tz) === 'air') this.set(tx, leafY + 2, tz, 'leaves');
    }
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

  clearStorage() {
    try {
      localStorage.removeItem('mc-world-save-v2');
      console.log('[MC] 已清空 localStorage');
    } catch {}
  }
}
