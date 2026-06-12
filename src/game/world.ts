import * as THREE from 'three';
import { BlockType, BLOCKS, BLOCK_SIZE } from './blocks';

/** 简易伪随机数 —— 用 seed 保证世界可复现 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 二维平滑噪声（value noise） */
function smoothNoise2D(rand: () => number, gridX: number, gridZ: number) {
  const n = (x: number, z: number) => {
    // 基于整数坐标的伪随机
    const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    const v = s - Math.floor(s);
    return v * 2 - 1; // [-1, 1]
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

export class World {
  sizeX: number;
  sizeZ: number;
  sizeY: number;
  /** 一维数组：index = x + z*sizeX + y*sizeX*sizeZ */
  data: BlockType[];
  seed: number;
  /** 世界左下角原点（x,z 从 0 开始，y 从 0 开始） */
  origin = new THREE.Vector3(0, 0, 0);

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
  }

  /** 世界是否是固体 */
  isSolid(x: number, y: number, z: number) {
    const t = this.get(x, y, z);
    return t !== 'air' && BLOCKS[t].solid;
  }

  private generate() {
    const rand = mulberry32(this.seed);
    const cx = this.sizeX / 2;
    const cz = this.sizeZ / 2;

    // 1. 基础地形高度
    const heightMap: number[] = new Array(this.sizeX * this.sizeZ).fill(0);
    for (let z = 0; z < this.sizeZ; z++) {
      for (let x = 0; x < this.sizeX; x++) {
        // 多频率叠加 noise
        let h = 0;
        h += smoothNoise2D(rand, x * 0.08, z * 0.08) * 4;
        h += smoothNoise2D(rand, x * 0.18, z * 0.18) * 2;
        h += smoothNoise2D(rand, x * 0.04, z * 0.04) * 6;
        const ground = Math.floor(this.sizeY * 0.4 + h);
        heightMap[x + z * this.sizeX] = Math.max(2, Math.min(this.sizeY - 6, ground));
      }
    }

    // 2. 填充方块
    for (let z = 0; z < this.sizeZ; z++) {
      for (let x = 0; x < this.sizeX; x++) {
        const top = heightMap[x + z * this.sizeZ];
        for (let y = 0; y <= top; y++) {
          let t: BlockType = 'stone';
          if (y === top) {
            if (top <= this.sizeY * 0.35) t = 'sand';
            else t = 'grass';
          } else if (y >= top - 2) {
            if (top <= this.sizeY * 0.35) t = 'sand';
            else t = 'dirt';
          } else {
            t = 'stone';
          }
          this.set(x, y, z, t);
        }
      }
    }

    // 3. 生成几棵树
    const treeCount = 10;
    for (let i = 0; i < treeCount; i++) {
      const tx = Math.floor(rand() * (this.sizeX - 8)) + 4;
      const tz = Math.floor(rand() * (this.sizeZ - 8)) + 4;
      // 找到最高的草方块
      let topY = 0;
      for (let y = this.sizeY - 1; y >= 0; y--) {
        if (this.get(tx, y, tz) === 'grass') {
          topY = y;
          break;
        }
      }
      if (topY === 0) continue;
      const trunkH = 4 + Math.floor(rand() * 2);
      for (let k = 1; k <= trunkH; k++) {
        this.set(tx, topY + k, tz, 'wood');
      }
      // 叶子
      const leafY = topY + trunkH;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
            const lx = tx + dx, ly = leafY + dy, lz = tz + dz;
            if (this.get(lx, ly, lz) === 'air') this.set(lx, ly, lz, 'leaves');
          }
        }
      }
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dz === 0) continue;
          if (this.get(tx + dx, leafY + 2, tz + dz) === 'air')
            this.set(tx + dx, leafY + 2, tz + dz, 'leaves');
        }
      }
      if (this.get(tx, leafY + 2, tz) === 'air') this.set(tx, leafY + 2, tz, 'leaves');
    }
  }

  /** 返回玩家出生点（世界中上方某处） */
  spawnPoint() {
    const cx = Math.floor(this.sizeX / 2);
    const cz = Math.floor(this.sizeZ / 2);
    // 找到最高的实心方块
    let topY = 0;
    for (let y = this.sizeY - 1; y >= 0; y--) {
      if (this.isSolid(cx, y, cz)) {
        topY = y;
        break;
      }
    }
    return new THREE.Vector3(cx + 0.5, topY + 2, cz + 0.5);
  }
}

export { BLOCK_SIZE };
