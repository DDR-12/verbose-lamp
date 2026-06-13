// ===== 方块纹理生成（16x16 像素艺术） =====
import * as THREE from 'three';
import { BLOCKS, type BlockType } from './blocks';

function createCanvas(size = 16) {
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  return cvs;
}

function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function setPixel(cvs: HTMLCanvasElement, x: number, y: number, r: number, g: number, b: number, a = 255) {
  const ctx = cvs.getContext('2d');
  if (!ctx) return;
  const id = ctx.getImageData(0, 0, cvs.width, cvs.height);
  const idx = (y * cvs.width + x) * 4;
  if (idx < 0 || idx >= id.data.length) return;
  id.data[idx] = r;
  id.data[idx + 1] = g;
  id.data[idx + 2] = b;
  id.data[idx + 3] = a;
  ctx.putImageData(id, 0, 0);
}

function fillNoise(cvs: HTMLCanvasElement, base: number, variance: number, seed: number) {
  const [r, g, b] = hexToRgb(base);
  for (let y = 0; y < cvs.height; y++) {
    for (let x = 0; x < cvs.width; x++) {
      // 简单的伪随机噪点
      const n = Math.sin(x * 23.71 + y * 47.13 + seed * 7.3) * 1000;
      const noise = (n - Math.floor(n) - 0.5) * variance;
      setPixel(cvs, x, y,
        Math.max(0, Math.min(255, r + noise)),
        Math.max(0, Math.min(255, g + noise)),
        Math.max(0, Math.min(255, b + noise)));
    }
  }
}

/** 为每种方块生成 6 面纹理（实际游戏中合并为侧/顶/底 3 张） */
export interface BlockTextures {
  side: THREE.Texture;
  top: THREE.Texture;
  bottom: THREE.Texture;
}

const cache = new Map<BlockType, BlockTextures>();

function makeTextureFromCanvas(cvs: HTMLCanvasElement): THREE.Texture {
  const tex = new THREE.CanvasTexture(cvs);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function genGrassTop(cvs: HTMLCanvasElement) {
  fillNoise(cvs, 0x4a9b3a, 40, 1);
  // 加一些深浅色块
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(Math.random() * 16);
    const y = Math.floor(Math.random() * 16);
    setPixel(cvs, x, y, 30, 110, 30);
  }
}

function genGrassSide(cvs: HTMLCanvasElement) {
  // 顶部 3 像素是绿色，其余是泥土色
  fillNoise(cvs, 0x6b4a2b, 30, 2);
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 4; y++) {
      const noise = (Math.sin(x * 23.71 + y * 47.13) * 1000) % 1;
      const n = (noise - 0.5) * 30;
      setPixel(cvs, x, y, 74 + n, 155 + n, 58 + n);
    }
  }
}

function genDirt(cvs: HTMLCanvasElement) {
  fillNoise(cvs, 0x6b4a2b, 30, 3);
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(Math.random() * 16);
    const y = Math.floor(Math.random() * 16);
    setPixel(cvs, x, y, 80, 50, 30);
  }
}

function genStone(cvs: HTMLCanvasElement) {
  fillNoise(cvs, 0x808080, 40, 4);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(Math.random() * 16);
    const y = Math.floor(Math.random() * 16);
    setPixel(cvs, x, y, 60, 60, 60);
  }
}

function genWoodSide(cvs: HTMLCanvasElement) {
  fillNoise(cvs, 0x6a4b2a, 25, 5);
  // 垂直纹路
  for (let x = 0; x < 16; x++) {
    const stripe = (x % 3 === 0) ? -15 : 0;
    for (let y = 0; y < 16; y++) {
      const [r, g, b] = hexToRgb(0x6a4b2a);
      setPixel(cvs, x, y, r + stripe, g + stripe, b + stripe);
    }
  }
}

function genWoodTop(cvs: HTMLCanvasElement) {
  // 简化：用 side 代替
  genWoodSide(cvs);
}

function genLeaves(cvs: HTMLCanvasElement) {
  fillNoise(cvs, 0x2f7a2a, 35, 6);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(Math.random() * 16);
    const y = Math.floor(Math.random() * 16);
    setPixel(cvs, x, y, 60, 130, 50);
  }
}

function genSand(cvs: HTMLCanvasElement) {
  fillNoise(cvs, 0xe6d58a, 18, 7);
}

function genPlank(cvs: HTMLCanvasElement) {
  // 水平木板纹
  for (let y = 0; y < 16; y++) {
    const isBorder = (y === 4 || y === 8 || y === 12);
    const base = isBorder ? 0x705030 : 0xa07848;
    for (let x = 0; x < 16; x++) {
      const [r, g, b] = hexToRgb(base);
      const noise = ((Math.sin(x * 7.1 + y * 13.7) * 100) % 8) - 4;
      setPixel(cvs, x, y, r + noise, g + noise, b + noise);
    }
  }
}

function genBrick(cvs: HTMLCanvasElement) {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const isBorder = (y === 0 || y === 7 || (y === 4 && x >= 8) || (y === 12 && x < 8) || y === 15);
      const isVertical = ((y < 8 && (x === 7 || x === 15)) || (y >= 8 && y < 12 && (x === 0 || x === 8)) || (y >= 12 && (x === 0 || x === 7 || x === 15)));
      const color = (isBorder || isVertical) ? 0x5a2a1a : 0xb25a4b;
      const [r, g, b] = hexToRgb(color);
      const noise = ((Math.sin(x * 5.1 + y * 9.7) * 100) % 6) - 3;
      setPixel(cvs, x, y, r + noise, g + noise, b + noise);
    }
  }
}

const generators: Partial<Record<BlockType, { side?: (c: HTMLCanvasElement) => void; top?: (c: HTMLCanvasElement) => void; bottom?: (c: HTMLCanvasElement) => void }>> = {
  grass: { side: genGrassSide, top: genGrassTop, bottom: genDirt },
  dirt: { side: genDirt, top: genDirt, bottom: genDirt },
  stone: { side: genStone, top: genStone, bottom: genStone },
  wood: { side: genWoodSide, top: genWoodTop, bottom: genWoodTop },
  leaves: { side: genLeaves, top: genLeaves, bottom: genLeaves },
  sand: { side: genSand, top: genSand, bottom: genSand },
  plank: { side: genPlank, top: genPlank, bottom: genPlank },
  brick: { side: genBrick, top: genBrick, bottom: genBrick },
};

export function getBlockTextures(type: BlockType): BlockTextures | null {
  if (type === 'air' || type === 'water') return null;
  if (cache.has(type)) return cache.get(type)!;

  const gen = generators[type];
  if (!gen) return null;

  const cvsSide = createCanvas();
  (gen.side || gen.top || (() => {}))(cvsSide);
  const cvsTop = createCanvas();
  (gen.top || gen.side || (() => {}))(cvsTop);
  const cvsBottom = createCanvas();
  (gen.bottom || gen.top || gen.side || (() => {}))(cvsBottom);

  const t: BlockTextures = {
    side: makeTextureFromCanvas(cvsSide),
    top: makeTextureFromCanvas(cvsTop),
    bottom: makeTextureFromCanvas(cvsBottom),
  };
  cache.set(type, t);
  return t;
}

export function clearTextureCache() {
  cache.forEach((t) => {
    t.side.dispose();
    t.top.dispose();
    t.bottom.dispose();
  });
  cache.clear();
}
