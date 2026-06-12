import * as THREE from 'three';
import { World, BLOCK_SIZE } from './world';
import { BlockType, BLOCKS } from './blocks';

const GRAVITY = -22;
const JUMP_SPEED = 9;
const PLAYER_SPEED = 5.5;
const PLAYER_EYE_HEIGHT = 1.6;
const PLAYER_HALF = 0.3; // 水平碰撞半径
const PLAYER_HEIGHT = 1.8;
const REACH = 6;

export interface EngineCallbacks {
  onHotbarChange?: (type: BlockType, index: number) => void;
}

export class MinecraftEngine {
  private container: HTMLElement;
  private world: World;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private chunkMesh!: THREE.Mesh; // 合并后的方块几何
  private waterMesh!: THREE.Mesh;

  private raycaster = new THREE.Raycaster();

  // 玩家状态
  private pos = new THREE.Vector3();
  private vel = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private onGround = false;

  private keys = new Set<string>();
  private hotbar: BlockType[];
  private hotbarIndex = 0;

  // 选中高亮框
  private highlight!: THREE.LineSegments;

  private raf = 0;
  private lastTime = 0;
  private pointerLocked = false;
  private callbacks: EngineCallbacks;

  constructor(container: HTMLElement, world: World, hotbar: BlockType[], callbacks: EngineCallbacks = {}) {
    this.container = container;
    this.world = world;
    this.hotbar = hotbar;
    this.callbacks = callbacks;

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (err) {
      const msg = document.createElement('div');
      msg.style.cssText =
        'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#87ceeb;color:#333;font-family:sans-serif;padding:20px;text-align:center;';
      msg.innerHTML =
        '<div style="max-width:520px"><h2>⛔ 无法创建 WebGL 上下文</h2><p>当前浏览器/环境禁用了 WebGL，无法运行 3D 游戏。</p><p>请在支持 WebGL 的浏览器（Chrome / Edge / Firefox / Safari）中打开此页面。</p></div>';
      container.appendChild(msg);
      throw new Error('WebGL not supported');
    }
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x87ceeb);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 25, 80);

    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.05, 500);

    // 光照
    const hemi = new THREE.HemisphereLight(0xffffff, 0x556b2f, 0.8);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(20, 50, 10);
    this.scene.add(dir);

    this.buildHighlight();
    this.rebuildMesh();

    // 玩家出生点
    this.pos.copy(world.spawnPoint());
    this.yaw = 0;
    this.pitch = -0.2;

    this.bindEvents();
    this.callbacks.onHotbarChange?.(this.hotbar[0], 0);

    this.lastTime = performance.now();
    this.loop();
  }

  setHotbar(hotbar: BlockType[]) {
    this.hotbar = hotbar;
    this.hotbarIndex = Math.min(this.hotbarIndex, hotbar.length - 1);
    this.callbacks.onHotbarChange?.(this.hotbar[this.hotbarIndex], this.hotbarIndex);
  }

  getHotbarIndex() {
    return this.hotbarIndex;
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    dom.addEventListener('click', () => {
      if (!this.pointerLocked) dom.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === dom;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      const sensitivity = 0.002;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;
      const lim = Math.PI / 2 - 0.01;
      if (this.pitch > lim) this.pitch = lim;
      if (this.pitch < -lim) this.pitch = -lim;
    });

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      // 热键 1-9
      if (/^Digit[1-9]$/.test(e.code)) {
        const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
        if (idx < this.hotbar.length) {
          this.hotbarIndex = idx;
          this.callbacks.onHotbarChange?.(this.hotbar[idx], idx);
        }
      }
      if (e.code === 'Space' && this.onGround) {
        this.vel.y = JUMP_SPEED;
        this.onGround = false;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('mousedown', (e) => {
      if (!this.pointerLocked) return;
      if (e.button === 0) this.breakBlock();
      else if (e.button === 2) this.placeBlock();
    });

    window.addEventListener('wheel', (e) => {
      if (!this.pointerLocked) return;
      const step = e.deltaY > 0 ? 1 : -1;
      this.hotbarIndex = (this.hotbarIndex + step + this.hotbar.length) % this.hotbar.length;
      this.callbacks.onHotbarChange?.(this.hotbar[this.hotbarIndex], this.hotbarIndex);
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private buildHighlight() {
    const geom = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const edges = new THREE.EdgesGeometry(geom);
    const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    this.highlight = new THREE.LineSegments(edges, mat);
    this.highlight.visible = false;
    this.scene.add(this.highlight);
  }

  /** 将所有方块合并为一个大的 BufferGeometry —— 每个面有轻微的颜色抖动 */
  private rebuildMesh() {
    const { sizeX, sizeY, sizeZ } = this.world;
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];

    const waterPositions: number[] = [];
    const waterNormals: number[] = [];
    const waterColors: number[] = [];

    // 6 个面（朝向）：+X, -X, +Y, -Y, +Z, -Z
    const faces: {
      normal: [number, number, number];
      /** 4 个顶点的相对偏移（相对于块中心） */
      verts: [number, number, number][];
      /** 邻居偏移 */
      neighbor: [number, number, number];
    }[] = [
      {
        normal: [1, 0, 0],
        verts: [[0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]],
        neighbor: [1, 0, 0],
      },
      {
        normal: [-1, 0, 0],
        verts: [[-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5]],
        neighbor: [-1, 0, 0],
      },
      {
        normal: [0, 1, 0],
        verts: [[-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5]],
        neighbor: [0, 1, 0],
      },
      {
        normal: [0, -1, 0],
        verts: [[-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5]],
        neighbor: [0, -1, 0],
      },
      {
        normal: [0, 0, 1],
        verts: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]],
        neighbor: [0, 0, 1],
      },
      {
        normal: [0, 0, -1],
        verts: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]],
        neighbor: [0, 0, -1],
      },
    ];

    const addFace = (
      targetP: number[], targetN: number[], targetC: number[],
      x: number, y: number, z: number, type: BlockType, fi: number,
    ) => {
      const color = shadeColor(BLOCKS[type].color, fi);
      const [nx, ny, nz] = faces[fi].normal;
      // 两个三角形：v0-v1-v2, v0-v2-v3
      const [v0, v1, v2, v3] = faces[fi].verts;
      const pushTri = (vx: number, vy: number, vz: number) => {
        targetP.push(x + vx, y + vy, z + vz);
        targetN.push(nx, ny, nz);
        targetC.push(color.r, color.g, color.b);
      };
      pushTri(v0[0], v0[1], v0[2]);
      pushTri(v1[0], v1[1], v1[2]);
      pushTri(v2[0], v2[1], v2[2]);
      pushTri(v0[0], v0[1], v0[2]);
      pushTri(v2[0], v2[1], v2[2]);
      pushTri(v3[0], v3[1], v3[2]);
    };

    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          const type = this.world.get(x, y, z);
          if (type === 'air') continue;

          for (let fi = 0; fi < 6; fi++) {
            const [dx, dy, dz] = faces[fi].neighbor;
            const neighborType = this.world.get(x + dx, y + dy, z + dz);
            const neighborSolid = neighborType !== 'air' && BLOCKS[neighborType].solid;
            // 只渲染朝外的面（邻居非实心）
            if (neighborSolid) continue;
            // 特殊处理：水只渲染到空气的面
            if (type === 'water' && neighborType === 'water') continue;

            if (type === 'water') {
              addFace(waterPositions, waterNormals, waterColors, x, y, z, type, fi);
            } else {
              addFace(positions, normals, colors, x, y, z, type, fi);
            }
          }
        }
      }
    }

    // 旧 mesh 清理
    if (this.chunkMesh) {
      this.chunkMesh.geometry.dispose();
      (this.chunkMesh.material as THREE.Material).dispose();
      this.scene.remove(this.chunkMesh);
    }
    if (this.waterMesh) {
      this.waterMesh.geometry.dispose();
      (this.waterMesh.material as THREE.Material).dispose();
      this.scene.remove(this.waterMesh);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.chunkMesh = new THREE.Mesh(geom, mat);
    this.scene.add(this.chunkMesh);

    const wgeom = new THREE.BufferGeometry();
    wgeom.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
    wgeom.setAttribute('normal', new THREE.Float32BufferAttribute(waterNormals, 3));
    wgeom.setAttribute('color', new THREE.Float32BufferAttribute(waterColors, 3));
    const wmat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    this.waterMesh = new THREE.Mesh(wgeom, wmat);
    this.scene.add(this.waterMesh);
  }

  private raycastBlock(): { hit: THREE.Vector3; normal: THREE.Vector3; blockPos: THREE.Vector3 } | null {
    // 检查玩家视线范围内的方块，用 raycaster 对整个 chunk mesh
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects([this.chunkMesh, this.waterMesh], false);
    if (hits.length === 0) return null;
    const h = hits[0];
    if (h.distance > REACH) return null;
    // 反推方块坐标
    const bp = new THREE.Vector3(
      Math.floor(h.point.x + h.face!.normal.x * 0.001 + 0.5),
      Math.floor(h.point.y + h.face!.normal.y * 0.001 + 0.5),
      Math.floor(h.point.z + h.face!.normal.z * 0.001 + 0.5),
    );
    return {
      hit: h.point,
      normal: h.face!.normal.clone(),
      blockPos: bp,
    };
  }

  private breakBlock() {
    const r = this.raycastBlock();
    if (!r) return;
    const { x, y, z } = r.blockPos;
    if (!this.world.inBounds(Math.floor(x), Math.floor(y), Math.floor(z))) return;
    const t = this.world.get(Math.floor(x), Math.floor(y), Math.floor(z));
    if (t === 'air') return;
    this.world.set(Math.floor(x), Math.floor(y), Math.floor(z), 'air');
    this.rebuildMesh();
  }

  private placeBlock() {
    const r = this.raycastBlock();
    if (!r) return;
    const t = this.hotbar[this.hotbarIndex];
    // 放置位置 = 被击中方块 + 面法线
    const nx = Math.floor(r.blockPos.x + r.normal.x);
    const ny = Math.floor(r.blockPos.y + r.normal.y);
    const nz = Math.floor(r.blockPos.z + r.normal.z);
    if (!this.world.inBounds(nx, ny, nz)) return;
    // 不允许放在玩家身上
    if (this.playerOccupies(nx, ny, nz)) return;
    this.world.set(nx, ny, nz, t);
    this.rebuildMesh();
  }

  private playerOccupies(bx: number, by: number, bz: number) {
    // 玩家 AABB 与方块 (bx, by, bz) 碰撞检测
    const minX = this.pos.x - PLAYER_HALF;
    const maxX = this.pos.x + PLAYER_HALF;
    const minZ = this.pos.z - PLAYER_HALF;
    const maxZ = this.pos.z + PLAYER_HALF;
    const minY = this.pos.y - PLAYER_EYE_HEIGHT; // 脚
    const maxY = minY + PLAYER_HEIGHT;
    return (
      maxX > bx && minX < bx + 1 &&
      maxY > by && minY < by + 1 &&
      maxZ > bz && minZ < bz + 1
    );
  }

  private collidesAt(pos: THREE.Vector3) {
    const minX = Math.floor(pos.x - PLAYER_HALF);
    const maxX = Math.floor(pos.x + PLAYER_HALF);
    const minZ = Math.floor(pos.z - PLAYER_HALF);
    const maxZ = Math.floor(pos.z + PLAYER_HALF);
    const minY = Math.floor(pos.y - PLAYER_EYE_HEIGHT);
    const maxY = Math.floor(pos.y - PLAYER_EYE_HEIGHT + PLAYER_HEIGHT);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.world.isSolid(x, y, z)) return true;
        }
      }
    }
    return false;
  }

  private update(dt: number) {
    // 计算移动方向
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();
    if (this.keys.has('KeyW')) move.add(forward);
    if (this.keys.has('KeyS')) move.sub(forward);
    if (this.keys.has('KeyD')) move.add(right);
    if (this.keys.has('KeyA')) move.sub(right);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(PLAYER_SPEED);

    // 水平速度 = move, 垂直受重力
    this.vel.x = move.x;
    this.vel.z = move.z;
    this.vel.y += GRAVITY * dt;
    if (this.vel.y < -40) this.vel.y = -40;

    // 逐轴移动 + 碰撞
    const step = (axis: 'x' | 'y' | 'z') => {
      const delta = this.vel[axis] * dt;
      if (delta === 0) return;
      this.pos[axis] += delta;
      if (this.collidesAt(this.pos)) {
        this.pos[axis] -= delta;
        if (axis === 'y') {
          if (delta < 0) this.onGround = true;
          this.vel.y = 0;
        } else {
          this.vel[axis] = 0;
        }
      } else if (axis === 'y' && delta < 0) {
        this.onGround = false;
      }
    };

    this.onGround = false;
    step('x');
    step('z');
    step('y');

    // 防止掉出世界
    if (this.pos.y < -10) this.pos.copy(this.world.spawnPoint());

    // 更新相机（相机在玩家眼睛位置）
    this.camera.position.set(this.pos.x, this.pos.y, this.pos.z);
    // yaw 绕 Y 轴，pitch 绕 X 轴 —— 通过 lookAt 计算
    const lookDir = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    this.camera.lookAt(this.pos.clone().add(lookDir));

    // 更新高亮框
    const r = this.raycastBlock();
    if (r) {
      this.highlight.visible = true;
      this.highlight.position.set(r.blockPos.x, r.blockPos.y, r.blockPos.z);
    } else {
      this.highlight.visible = false;
    }
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.chunkMesh?.geometry.dispose();
    this.waterMesh?.geometry.dispose();
  }
}

/** 给不同的面用不同亮度 —— 模拟简单的方向光 */
function shadeColor(hex: number, faceIndex: number) {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  // 顶面最亮（+Y=2），底面最暗（-Y=3），东西南北中等
  let factor = 1;
  if (faceIndex === 2) factor = 1.05; // 顶
  else if (faceIndex === 3) factor = 0.55; // 底
  else if (faceIndex === 4 || faceIndex === 5) factor = 0.8; // 前后
  else factor = 0.9; // 左右
  return {
    r: Math.min(1, r * factor),
    g: Math.min(1, g * factor),
    b: Math.min(1, b * factor),
  };
}
