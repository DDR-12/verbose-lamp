import * as THREE from 'three';
import { World } from './world';
import { BlockType, BLOCKS, SlotKind, slotBreakTime } from './blocks';

const GRAVITY = -22;
const JUMP_SPEED = 9;
const PLAYER_SPEED = 5.5;
const FLY_SPEED = 12;
const PLAYER_EYE_HEIGHT = 1.6;
const PLAYER_HALF = 0.3;
const PLAYER_HEIGHT = 1.8;
const REACH = 6;

export interface EngineCallbacks {
  onHotbarChange?: (index: number) => void;
  /** 破坏进度更新：pos 为方块坐标，progress 0~1；pos 为 null 时清除 */
  onBreakProgress?: (pos: { x: number; y: number; z: number } | null, progress: number) => void;
  onModeChange?: (mode: 'walk' | 'fly') => void;
  onPointerLockChange?: (locked: boolean) => void;
}

export class MinecraftEngine {
  private container: HTMLElement;
  private world: World;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  // 破坏高亮（裂纹显示用 EdgesGeometry）
  private highlight!: THREE.LineSegments;
  private breakOverlay!: THREE.LineSegments; // 破坏裂纹

  // 玩家状态
  private pos = new THREE.Vector3();
  private vel = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private onGround = false;
  private mode: 'walk' | 'fly' = 'walk';

  // 输入状态
  private keys = new Set<string>();
  private leftDown = false;   // 左键是否按住（用于持续破坏）
  private hotbar: SlotKind[];
  private hotbarIndex = 0;
  private yawAccum = 0;        // 非锁定模式下的视角输入累积
  private pitchAccum = 0;
  private useArrowCamera = false;

  // 破坏进度
  private breakTarget: { x: number; y: number; z: number } | null = null;
  private breakProgress = 0;

  private raf = 0;
  private lastTime = 0;
  private pointerLocked = false;
  private callbacks: EngineCallbacks;

  // 事件句柄缓存以便卸载
  private _onClick = () => this.requestLock();
  private _onWheel = (e: WheelEvent) => this.onWheel(e);
  private _onMouseDown = (e: MouseEvent) => this.onMouseDown(e);
  private _onMouseUp = (e: MouseEvent) => this.onMouseUp(e);
  private _onContextMenu = (e: Event) => e.preventDefault();
  private _onKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
  private _onKeyUp = (e: KeyboardEvent) => this.onKeyUp(e);
  private _onPointerLockChange = () => this.onPointerLockChange();
  private _onResize = () => this.onResize();

  constructor(container: HTMLElement, world: World, hotbar: SlotKind[], callbacks: EngineCallbacks = {}) {
    this.container = container;
    this.world = world;
    this.hotbar = hotbar;
    this.callbacks = callbacks;

    if (!this.initRenderer()) return;
    this.buildHighlight();
    this.rebuildMesh();

    this.pos.copy(world.spawnPoint());
    this.yaw = 0;
    this.pitch = -0.15;

    this.bindEvents();
    this.callbacks.onHotbarChange?.(this.hotbarIndex);
    this.callbacks.onModeChange?.(this.mode);
    this.callbacks.onPointerLockChange?.(false);

    this.lastTime = performance.now();
    this.loop();
  }

  setHotbar(hotbar: SlotKind[]) {
    this.hotbar = hotbar;
    this.hotbarIndex = Math.min(this.hotbarIndex, hotbar.length - 1);
    this.callbacks.onHotbarChange?.(this.hotbarIndex);
  }

  getHotbarIndex() {
    return this.hotbarIndex;
  }

  private initRenderer(): boolean {
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      const msg = document.createElement('div');
      msg.style.cssText =
        'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#87ceeb;color:#222;font-family:sans-serif;padding:20px;text-align:center;';
      msg.innerHTML =
        '<div style="max-width:520px"><h2>⛔ 无法创建 WebGL 上下文</h2><p>当前浏览器/环境禁用了 WebGL，无法运行 3D 游戏。</p><p>请在支持 WebGL 的桌面浏览器（Chrome / Edge / Firefox / Safari）中打开此页面。</p></div>';
      this.container.appendChild(msg);
      return false;
    }
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x87ceeb);
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 30, 100);

    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.05,
      500,
    );

    const hemi = new THREE.HemisphereLight(0xffffff, 0x556b2f, 0.8);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(20, 50, 10);
    this.scene.add(dir);

    return true;
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    dom.addEventListener('click', this._onClick);
    window.addEventListener('wheel', this._onWheel, { passive: false });
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    dom.addEventListener('contextmenu', this._onContextMenu);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('mozpointerlockchange', this._onPointerLockChange);
    document.addEventListener('webkitpointerlockchange', this._onPointerLockChange);
    window.addEventListener('resize', this._onResize);
  }

  /** 更健壮的请求指针锁：尝试多种前缀，捕获失败后把游戏切换到“自由模式” */
  private requestLock() {
    const dom = this.renderer.domElement;
    try {
      if (document.pointerLockElement === dom) return;
      const fn: any =
        dom.requestPointerLock ||
        (dom as any).webkitRequestPointerLock ||
        (dom as any).mozRequestPointerLock ||
        (dom as any).msRequestPointerLock;
      if (fn) {
        const result = fn.call(dom);
        if (result && typeof result.catch === 'function') {
          result.catch((err: any) => {
            console.warn('[MC] requestPointerLock 失败：', err?.message || err);
            this.useArrowCamera = true;
            this.callbacks.onPointerLockChange?.(false);
          });
        }
      } else {
        console.warn('[MC] 当前浏览器不支持 pointer lock，将使用箭头键转视角。');
        this.useArrowCamera = true;
        this.callbacks.onPointerLockChange?.(false);
      }
    } catch (err: any) {
      console.warn('[MC] requestPointerLock 异常：', err?.message || err);
      this.useArrowCamera = true;
      this.callbacks.onPointerLockChange?.(false);
    }
  }

  /** 公开方法：允许 React 组件在按钮点击时显式请求锁定 */
  tryRequestPointerLock() {
    this.requestLock();
  }

  /** 公开方法：在任意模式下都能“游玩” */
  toggleFreeLook() {
    this.useArrowCamera = !this.useArrowCamera;
    return this.useArrowCamera;
  }

  private onPointerLockChange() {
    const dom = this.renderer.domElement;
    const locked =
      document.pointerLockElement === dom ||
      (document as any).mozPointerLockElement === dom ||
      (document as any).webkitPointerLockElement === dom;
    this.pointerLocked = locked;
    this.callbacks.onPointerLockChange?.(locked);
    if (!locked && this.leftDown) {
      // 失去锁时同时取消破坏状态
      this.leftDown = false;
      this.resetBreak();
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    // 用于控制的键：阻止默认（避免页面滚动等）
    const controlKeys = [
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'Space',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
      'Digit6', 'Digit7', 'Digit8', 'Digit9',
      'KeyF', 'ShiftLeft', 'ShiftRight',
      'KeyR',
    ];
    if (controlKeys.includes(e.code)) e.preventDefault();

    this.keys.add(e.code);

    if (/^Digit[1-9]$/.test(e.code)) {
      const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
      if (idx < this.hotbar.length) {
        this.hotbarIndex = idx;
        this.callbacks.onHotbarChange?.(idx);
        this.resetBreak();
      }
    }
    if (e.code === 'KeyF') {
      this.mode = this.mode === 'walk' ? 'fly' : 'walk';
      this.vel.set(0, 0, 0);
      this.callbacks.onModeChange?.(this.mode);
    }
    if (e.code === 'Space' && this.onGround && this.mode === 'walk') {
      this.vel.y = JUMP_SPEED;
      this.onGround = false;
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    const step = e.deltaY > 0 ? 1 : -1;
    this.hotbarIndex = (this.hotbarIndex + step + this.hotbar.length) % this.hotbar.length;
    this.callbacks.onHotbarChange?.(this.hotbarIndex);
    this.resetBreak();
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button === 0) {
      this.leftDown = true;
      this.tryBreakTick(0.05);
    } else if (e.button === 2) {
      this.placeBlock();
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button === 0) {
      this.leftDown = false;
      this.resetBreak();
    }
  }

  /** 外部鼠标移动：锁定模式用 movementX/Y，未锁定模式用箭头键处理 */
  handleMouseMove(e: MouseEvent) {
    if (this.pointerLocked) {
      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;
      const lim = Math.PI / 2 - 0.01;
      if (this.pitch > lim) this.pitch = lim;
      if (this.pitch < -lim) this.pitch = -lim;
    }
  }

  private onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ======== 高亮 / 破坏裂纹 ========
  private buildHighlight() {
    const geom = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const edges = new THREE.EdgesGeometry(geom);
    const mat = new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2 });
    this.highlight = new THREE.LineSegments(edges, mat);
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    // 破坏裂纹：用同一边框线，但颜色变亮作为"裂纹"示意
    const crackMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    this.breakOverlay = new THREE.LineSegments(edges.clone(), crackMat);
    this.breakOverlay.scale.setScalar(1.005);
    this.breakOverlay.visible = false;
    this.scene.add(this.breakOverlay);
  }

  // ======== 网格重建 ========
  private rebuildMesh() {
    const { sizeX, sizeY, sizeZ } = this.world;
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const waterP: number[] = [];
    const waterN: number[] = [];
    const waterC: number[] = [];

    const facesNormal: [number, number, number][] = [
      [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
    ];
    const neighborOffset: [number, number, number][] = [
      [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
    ];

    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          const type = this.world.get(x, y, z);
          if (type === 'air') continue;

          for (let fi = 0; fi < 6; fi++) {
            const [dx, dy, dz] = neighborOffset[fi];
            const neighbor = this.world.get(x + dx, y + dy, z + dz);
            const neighborSolid = neighbor !== 'air' && BLOCKS[neighbor].solid;
            if (neighborSolid) continue;
            if (type === 'water' && neighbor === 'water') continue;

            const [nx, ny, nz] = facesNormal[fi];
            // 构建 4 个角点
            const verts: [number, number, number][] = [];
            // 基于法线计算四个顶点（相对方块中心）
            if (fi === 0) { // +X
              verts.push([0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]);
            } else if (fi === 1) { // -X
              verts.push([-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5]);
            } else if (fi === 2) { // +Y (顶)
              verts.push([-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5]);
            } else if (fi === 3) { // -Y (底)
              verts.push([-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5]);
            } else if (fi === 4) { // +Z
              verts.push([-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]);
            } else { // -Z
              verts.push([0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]);
            }
            const shade = shadeFactor(fi);
            const base = BLOCKS[type].color;
            const r = Math.min(1, ((base >> 16) & 0xff) / 255 * shade);
            const g = Math.min(1, ((base >> 8) & 0xff) / 255 * shade);
            const b = Math.min(1, (base & 0xff) / 255 * shade);

            const pushTri = (vx: number, vy: number, vz: number) => {
              const target = type === 'water' ? waterP : positions;
              const tn = type === 'water' ? waterN : normals;
              const tc = type === 'water' ? waterC : colors;
              target.push(x + vx, y + vy, z + vz);
              tn.push(nx, ny, nz);
              tc.push(r, g, b);
            };
            // v0-v1-v2, v0-v2-v3
            for (const v of [verts[0], verts[1], verts[2]]) pushTri(v[0], v[1], v[2]);
            for (const v of [verts[0], verts[2], verts[3]]) pushTri(v[0], v[1], v[2]);
          }
        }
      }
    }

    // 清理旧 mesh
    this.scene.children
      .filter((c) => c !== this.highlight && c !== this.breakOverlay && (c as any).isMesh)
      .forEach((m) => {
        this.scene.remove(m);
        ((m as THREE.Mesh).geometry as THREE.BufferGeometry).dispose?.();
      });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geom, mat);
    this.scene.add(mesh);

    if (waterP.length > 0) {
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', new THREE.Float32BufferAttribute(waterP, 3));
      wg.setAttribute('normal', new THREE.Float32BufferAttribute(waterN, 3));
      wg.setAttribute('color', new THREE.Float32BufferAttribute(waterC, 3));
      const wm = new THREE.MeshLambertMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      });
      const waterMesh = new THREE.Mesh(wg, wm);
      this.scene.add(waterMesh);
    }
  }

  // ======== 射线拾取 ========
  private raycastBlock(): { hit: THREE.Vector3; normal: THREE.Vector3; blockPos: THREE.Vector3 } | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const meshes = this.scene.children.filter((c): c is THREE.Mesh => (c as any).isMesh);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    const h = hits[0];
    if (h.distance > REACH) return null;
    if (!h.face) return null;
    const normal = h.face.normal.clone().round();
    const blockPos = new THREE.Vector3(
      Math.floor(h.point.x + 0.5),
      Math.floor(h.point.y + 0.5),
      Math.floor(h.point.z + 0.5),
    );
    // 方块中心附近的点可能刚好落在整数边界上，稍微再往回退一点确保准确
    // 若目标是空气，说明我们的 round 可能偏了，尝试 normal 方向反推
    if (this.world.get(blockPos.x, blockPos.y, blockPos.z) === 'air') {
      const alt = blockPos.clone().sub(normal);
      if (this.world.get(alt.x, alt.y, alt.z) !== 'air') {
        return { hit: h.point, normal, blockPos: alt };
      }
      return null;
    }
    return { hit: h.point, normal, blockPos };
  }

  // ======== 破坏 & 放置 ========
  private resetBreak() {
    this.breakTarget = null;
    this.breakProgress = 0;
    this.callbacks.onBreakProgress?.(null, 0);
    if (this.breakOverlay) this.breakOverlay.visible = false;
  }

  private tryBreakTick(dt: number) {
    const hit = this.raycastBlock();
    if (!hit) {
      this.resetBreak();
      return;
    }
    const { x, y, z } = hit.blockPos;
    const block = this.world.get(x, y, z);
    if (block === 'air' || block === 'water') {
      this.resetBreak();
      return;
    }
    // 切换目标时重置进度
    if (!this.breakTarget || this.breakTarget.x !== x || this.breakTarget.y !== y || this.breakTarget.z !== z) {
      this.breakTarget = { x, y, z };
      this.breakProgress = 0;
    }
    const slot = this.hotbar[this.hotbarIndex];
    const total = slotBreakTime(slot, block);
    if (total == null) {
      this.resetBreak();
      return;
    }
    this.breakProgress += dt / total;
    this.callbacks.onBreakProgress?.(this.breakTarget, Math.min(1, this.breakProgress));

    // 显示破坏裂纹 overlay
    this.breakOverlay.position.set(x, y, z);
    this.breakOverlay.visible = true;
    ((this.breakOverlay.material as THREE.LineBasicMaterial).opacity) =
      0.2 + 0.7 * Math.min(1, this.breakProgress);
    (this.breakOverlay.material as THREE.LineBasicMaterial).needsUpdate = true;

    if (this.breakProgress >= 1) {
      this.world.set(x, y, z, 'air');
      this.rebuildMesh();
      this.resetBreak();
    }
  }

  private placeBlock() {
    const hit = this.raycastBlock();
    if (!hit) return;
    const slot = this.hotbar[this.hotbarIndex];
    // 工具不能放置
    if (slot.kind !== 'block') return;
    if (slot.type === 'water' || slot.type === 'air') return;

    const tx = Math.floor(hit.blockPos.x + hit.normal.x);
    const ty = Math.floor(hit.blockPos.y + hit.normal.y);
    const tz = Math.floor(hit.blockPos.z + hit.normal.z);
    if (!this.world.inBounds(tx, ty, tz)) return;
    // 不能放置在玩家自身
    if (this.playerOccupies(tx, ty, tz)) return;
    // 目标格必须是空气（防止叠放）
    if (this.world.get(tx, ty, tz) !== 'air') return;

    this.world.set(tx, ty, tz, slot.type);
    this.rebuildMesh();
  }

  private playerOccupies(bx: number, by: number, bz: number) {
    const minX = this.pos.x - PLAYER_HALF;
    const maxX = this.pos.x + PLAYER_HALF;
    const minZ = this.pos.z - PLAYER_HALF;
    const maxZ = this.pos.z + PLAYER_HALF;
    const minY = this.pos.y - PLAYER_EYE_HEIGHT;
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
    // ==== 移动 ====
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    if (this.keys.has('KeyW')) move.add(forward);
    if (this.keys.has('KeyS')) move.sub(forward);
    if (this.keys.has('KeyD')) move.add(right);
    if (this.keys.has('KeyA')) move.sub(right);

    if (this.mode === 'fly') {
      const speed = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) ? FLY_SPEED * 1.8 : FLY_SPEED;
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);
      this.vel.x = move.x;
      this.vel.z = move.z;
      this.vel.y = 0;
      if (this.keys.has('Space')) this.vel.y = speed;
      if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) this.vel.y = -speed;
      // 飞行模式下也做简单碰撞：碰到实心方块就不动
      const tryMove = (axis: 'x' | 'y' | 'z') => {
        const d = this.vel[axis] * dt;
        if (d === 0) return;
        this.pos[axis] += d;
        if (this.collidesAt(this.pos)) this.pos[axis] -= d;
      };
      tryMove('x'); tryMove('z'); tryMove('y');
      this.onGround = false;
    } else {
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(PLAYER_SPEED);
      this.vel.x = move.x;
      this.vel.z = move.z;
      this.vel.y += GRAVITY * dt;
      if (this.vel.y < -40) this.vel.y = -40;

      const step = (axis: 'x' | 'y' | 'z') => {
        const d = this.vel[axis] * dt;
        if (d === 0) return;
        this.pos[axis] += d;
        if (this.collidesAt(this.pos)) {
          this.pos[axis] -= d;
          if (axis === 'y') {
            if (d < 0) this.onGround = true;
            this.vel.y = 0;
          } else {
            this.vel[axis] = 0;
          }
        } else if (axis === 'y' && d < 0) {
          this.onGround = false;
        }
      };
      this.onGround = false;
      step('x'); step('z'); step('y');
    }

    // 越界防护
    if (this.pos.y < -10) this.pos.copy(this.world.spawnPoint());

    // ==== 视角（箭头键作为鼠标的兜底，鼠标未锁定也能用）====
    const ARROW_SPEED = 2.2; // rad/秒
    if (!this.pointerLocked) {
      if (this.keys.has('ArrowLeft'))  this.yaw   += ARROW_SPEED * dt;
      if (this.keys.has('ArrowRight')) this.yaw   -= ARROW_SPEED * dt;
      if (this.keys.has('ArrowUp'))    this.pitch += ARROW_SPEED * dt;
      if (this.keys.has('ArrowDown')) this.pitch -= ARROW_SPEED * dt;
      const lim = Math.PI / 2 - 0.01;
      if (this.pitch > lim) this.pitch = lim;
      if (this.pitch < -lim) this.pitch = -lim;
    }

    const lookDir = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    this.camera.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.camera.lookAt(this.pos.clone().add(lookDir));

    // ==== 高亮（始终显示，鼠标不锁定也能看到目标方块）====
    const hit = this.raycastBlock();
    if (hit) {
      this.highlight.visible = true;
      this.highlight.position.set(hit.blockPos.x, hit.blockPos.y, hit.blockPos.z);
    } else {
      this.highlight.visible = false;
    }

    // ==== 持续破坏（左键按住即可，不要求鼠标锁定）====
    if (this.leftDown) {
      this.tryBreakTick(dt);
    }
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.08, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('wheel', this._onWheel);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    const dom = this.renderer?.domElement;
    if (dom) {
      dom.removeEventListener('click', this._onClick);
      dom.removeEventListener('contextmenu', this._onContextMenu);
    }
    this.renderer?.dispose();
  }
}

function shadeFactor(faceIndex: number): number {
  // 顶面最亮，然后左右、前后，底面最暗 — 模拟简单日光
  switch (faceIndex) {
    case 2: return 1.05; // 顶
    case 0: return 0.92; // +X
    case 1: return 0.92; // -X
    case 4: return 0.82; // +Z
    case 5: return 0.82; // -Z
    case 3: return 0.6;  // 底
    default: return 1;
  }
}
