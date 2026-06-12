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
  onBreakProgress?: (pos: { x: number; y: number; z: number } | null, progress: number) => void;
  onModeChange?: (mode: 'walk' | 'fly') => void;
  onPointerLockChange?: (locked: boolean) => void;
  onDebug?: (state: {
    pointerLocked: boolean;
    mode: 'walk' | 'fly';
    yaw: number;
    pitch: number;
    pos: { x: number; y: number; z: number };
    keys: string[];
    onGround: boolean;
    hasMesh: boolean;
  }) => void;
}

export class MinecraftEngine {
  private container: HTMLElement;
  private world: World;
  private hotbar: SlotKind[];
  private callbacks: EngineCallbacks;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;

  private highlight: THREE.LineSegments | null = null;
  private meshBuilt = false;

  // 玩家状态
  private pos = new THREE.Vector3();
  private vel = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private onGround = false;
  private mode: 'walk' | 'fly' = 'walk';

  // 输入 — 单一 Set，外部（屏幕按钮）+ 内部（键盘事件）共用
  keys = new Set<string>();
  private leftDown = false;
  private hotbarIndex = 0;
  private pointerLocked = false;

  // 破坏进度
  private breakTarget: { x: number; y: number; z: number } | null = null;
  private breakProgress = 0;

  private rafId = 0;
  private lastTime = 0;
  private debugTimer = 0;
  private destroyed = false;

  // 事件句柄 — 箭头函数绑定（自动保留 this）
  private _onClick = () => this.tryRequestPointerLock();
  private _onWheel = (e: WheelEvent) => this.onWheel(e);
  private _onMouseDown = (e: MouseEvent) => this.onMouseDown(e);
  private _onMouseUp = (e: MouseEvent) => this.onMouseUp(e);
  private _onContextMenu = (e: Event) => e.preventDefault();
  private _onKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
  private _onKeyUp = (e: KeyboardEvent) => this.onKeyUp(e);
  private _onPointerLockChange = () => this.onPointerLockChange();
  private _onResize = () => this.onResize();
  private _onMouseMove = (e: MouseEvent) => this.onMouseMove(e);

  constructor(container: HTMLElement, world: World, hotbar: SlotKind[], callbacks: EngineCallbacks = {}) {
    this.container = container;
    this.world = world;
    this.hotbar = hotbar;
    this.callbacks = callbacks;

    console.log('[MC] 初始化引擎...');

    if (!this.initRenderer()) {
      console.warn('[MC] WebGL 初始化失败，引擎退出。');
      return;
    }

    this.buildHighlight();
    this.rebuildMesh();
    this.meshBuilt = true;

    // 出生点：在世界中心上方的空气里
    const sp = this.findSafeSpawn();
    this.pos.copy(sp);
    console.log('[MC] 玩家出生:', this.pos.toArray());

    this.bindEvents();
    this.callbacks.onHotbarChange?.(this.hotbarIndex);
    this.callbacks.onModeChange?.(this.mode);
    this.callbacks.onPointerLockChange?.(false);

    this.lastTime = performance.now();
    this.loop();
    console.log('[MC] 引擎已启动，渲染循环运行中。');
  }

  // ====== 公开 API ======

  forceFreeLook() {
    // 让方向键始终可以转视角，与指针锁无关
    this.pointerLocked = false;
    this.callbacks.onPointerLockChange?.(false);
  }

  tryRequestPointerLock() {
    const dom = this.renderer?.domElement;
    if (!dom) return;
    try {
      const fn: any =
        (dom as any).requestPointerLock ||
        (dom as any).webkitRequestPointerLock ||
        (dom as any).mozRequestPointerLock;
      if (fn) {
        const r = fn.call(dom);
        if (r && typeof r.catch === 'function') {
          r.catch((err: any) => console.warn('[MC] requestPointerLock 失败:', err?.message || err));
        }
      } else {
        console.warn('[MC] 当前浏览器不支持 pointer lock，继续使用方向键即可。');
      }
    } catch (err: any) {
      console.warn('[MC] requestPointerLock 异常:', err?.message || err);
    }
  }

  pressKey(code: string) {
    // 屏幕按钮调用
    this.keys.add(code);
  }

  releaseKey(code: string) {
    this.keys.delete(code);
  }

  startBreak() {
    this.leftDown = true;
    this.tryBreakTick(0.05);
  }

  endBreak() {
    this.leftDown = false;
    this.resetBreak();
  }

  placeBlock() {
    this.doPlaceBlock();
  }

  respawn() {
    this.pos.copy(this.findSafeSpawn());
    this.vel.set(0, 0, 0);
  }

  dispose() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('wheel', this._onWheel);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.removeEventListener('webkitpointerlockchange', this._onPointerLockChange);
    document.removeEventListener('mozpointerlockchange', this._onPointerLockChange);
    const dom = this.renderer?.domElement;
    if (dom) {
      dom.removeEventListener('click', this._onClick);
      dom.removeEventListener('contextmenu', this._onContextMenu);
    }
    this.renderer?.dispose();
  }

  // ====== 初始化 ======

  private initRenderer(): boolean {
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (err: any) {
      this.showFatal('WebGL 初始化失败：' + (err?.message || err));
      return false;
    }

    const cw = this.container.clientWidth || window.innerWidth;
    const ch = this.container.clientHeight || window.innerHeight;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(cw, ch);
    this.renderer.setClearColor(0x87ceeb);
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 40, 140);

    // 光照：半球光 + 方向光
    const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3a2a, 0.85);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(30, 60, 20);
    this.scene.add(sun);

    this.camera = new THREE.PerspectiveCamera(75, cw / ch, 0.1, 500);
    this.camera.position.copy(this.pos);

    return true;
  }

  private showFatal(msg: string) {
    const div = document.createElement('div');
    div.style.cssText =
      'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;font-family:sans-serif;padding:30px;text-align:center;font-size:14px;';
    div.innerHTML = `<div><h2 style="margin-bottom:12px">⛔ 无法启动</h2><div style="opacity:.85">${msg}</div></div>`;
    this.container.appendChild(div);
  }

  private findSafeSpawn(): THREE.Vector3 {
    // 从世界中心向上找一个 2 格高的空气柱，脚下为实心方块
    const cx = Math.floor(this.world.sizeX / 2);
    const cz = Math.floor(this.world.sizeZ / 2);
    for (let y = this.world.sizeY - 1; y > 0; y--) {
      const below = this.world.isSolid(cx, y - 1, cz);
      const air1 = !this.world.isSolid(cx, y, cz);
      const air2 = !this.world.isSolid(cx, y + 1, cz);
      if (below && air1 && air2) {
        // 眼睛位置在 y+1 方块中部
        return new THREE.Vector3(cx + 0.5, y + PLAYER_EYE_HEIGHT, cz + 0.5);
      }
    }
    return new THREE.Vector3(cx + 0.5, this.world.sizeY, cz + 0.5);
  }

  private buildHighlight() {
    if (!this.scene) return;
    const geom = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const edges = new THREE.EdgesGeometry(geom);
    const mat = new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2 });
    this.highlight = new THREE.LineSegments(edges, mat);
    this.highlight.visible = false;
    this.scene.add(this.highlight);
  }

  // ====== 事件绑定 ======

  private bindEvents() {
    const dom = this.renderer!.domElement;

    // 画布点击 = 请求指针锁定
    dom.addEventListener('click', this._onClick);
    dom.addEventListener('contextmenu', this._onContextMenu);

    // 鼠标按钮（全局）
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);

    // 滚轮切换快捷栏
    window.addEventListener('wheel', this._onWheel, { passive: false });

    // 键盘（全局）
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // 鼠标移动（全局）
    window.addEventListener('mousemove', this._onMouseMove);

    // pointer lock 变更
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('webkitpointerlockchange', this._onPointerLockChange);
    document.addEventListener('mozpointerlockchange', this._onPointerLockChange);

    // 窗口尺寸
    window.addEventListener('resize', this._onResize);
  }

  private onPointerLockChange() {
    const dom = this.renderer?.domElement;
    if (!dom) return;
    const locked =
      document.pointerLockElement === dom ||
      (document as any).webkitPointerLockElement === dom ||
      (document as any).mozPointerLockElement === dom;
    this.pointerLocked = !!locked;
    this.callbacks.onPointerLockChange?.(this.pointerLocked);
    console.log('[MC] 指针锁变更 ->', this.pointerLocked);
  }

  private onKeyDown(e: KeyboardEvent) {
    // 游戏控制键要 preventDefault，避免页面滚动
    const gameKeys = [
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'Space',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
      'Digit6', 'Digit7', 'Digit8', 'Digit9',
      'KeyF',
    ];
    if (gameKeys.includes(e.code)) e.preventDefault();

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
    // 只有点击到画布上才响应破坏/放置，避免与 UI 按钮冲突
    if (e.target instanceof HTMLElement && e.target.closest('button')) return;
    if (e.button === 0) {
      this.leftDown = true;
      this.tryBreakTick(0.05);
    } else if (e.button === 2) {
      this.doPlaceBlock();
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button === 0) {
      this.leftDown = false;
      this.resetBreak();
    }
  }

  private onMouseMove(e: MouseEvent) {
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
    if (!this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ====== 网格重建 ======

  private rebuildMesh() {
    if (!this.scene) return;

    // 移除已有的 mesh（高亮框不删除）
    const removeList: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      if ((obj as any).isMesh) removeList.push(obj);
    });
    for (const obj of removeList) this.scene.remove(obj);

    const { sizeX, sizeY, sizeZ } = this.world;
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];

    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          const type = this.world.get(x, y, z);
          if (type === 'air' || type === 'water') continue;
          this.emitBlock(positions, normals, colors, x, y, z, type);
        }
      }
    }

    if (positions.length > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
      const mesh = new THREE.Mesh(geom, mat);
      this.scene.add(mesh);
    }

    // 水块
    const waterP: number[] = [];
    const waterN: number[] = [];
    const waterC: number[] = [];
    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          if (this.world.get(x, y, z) === 'water') {
            this.emitBlock(waterP, waterN, waterC, x, y, z, 'water');
          }
        }
      }
    }
    if (waterP.length > 0) {
      const g2 = new THREE.BufferGeometry();
      g2.setAttribute('position', new THREE.Float32BufferAttribute(waterP, 3));
      g2.setAttribute('normal', new THREE.Float32BufferAttribute(waterN, 3));
      g2.setAttribute('color', new THREE.Float32BufferAttribute(waterC, 3));
      const m2 = new THREE.MeshLambertMaterial({
        vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false,
      });
      this.scene.add(new THREE.Mesh(g2, m2));
    }
  }

  private emitBlock(
    positions: number[], normals: number[], colors: number[],
    x: number, y: number, z: number, type: BlockType,
  ) {
    const faces: { normal: [number, number, number]; shade: number; indices: [number, number, number, number] }[] = [
      { normal: [ 1, 0, 0], shade: 0.90, indices: [0, 1, 2, 3] },
      { normal: [-1, 0, 0], shade: 0.90, indices: [0, 1, 2, 3] },
      { normal: [ 0, 1, 0], shade: 1.05, indices: [0, 1, 2, 3] },
      { normal: [ 0,-1, 0], shade: 0.55, indices: [0, 1, 2, 3] },
      { normal: [ 0, 0, 1], shade: 0.82, indices: [0, 1, 2, 3] },
      { normal: [ 0, 0,-1], shade: 0.82, indices: [0, 1, 2, 3] },
    ];
    const neighborOffsets: [number, number, number][] = [
      [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
    ];
    // 6 个面的 4 个顶点（相对方块中心）
    const vertsOfFace = (fi: number): [number, number, number][] => {
      if (fi === 0) return [[0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]]; // +X
      if (fi === 1) return [[-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5]]; // -X
      if (fi === 2) return [[-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5]]; // +Y
      if (fi === 3) return [[-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5]]; // -Y
      if (fi === 4) return [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]]; // +Z
      return [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]];            // -Z
    };

    for (let fi = 0; fi < 6; fi++) {
      const [dx, dy, dz] = neighborOffsets[fi];
      if (this.world.isSolid(x + dx, y + dy, z + dz)) continue;

      const colorBase = BLOCKS[type].color;
      const shade = faces[fi].shade;
      const r = Math.min(1, ((colorBase >> 16) & 0xff) / 255 * shade);
      const g = Math.min(1, ((colorBase >> 8) & 0xff) / 255 * shade);
      const b = Math.min(1, (colorBase & 0xff) / 255 * shade);

      const vs = vertsOfFace(fi);
      const [nx, ny, nz] = faces[fi].normal;

      // v0, v1, v2
      for (const v of [vs[0], vs[1], vs[2]]) {
        positions.push(x + v[0], y + v[1], z + v[2]);
        normals.push(nx, ny, nz);
        colors.push(r, g, b);
      }
      // v0, v2, v3
      for (const v of [vs[0], vs[2], vs[3]]) {
        positions.push(x + v[0], y + v[1], z + v[2]);
        normals.push(nx, ny, nz);
        colors.push(r, g, b);
      }
    }
  }

  // ====== 射线 & 破坏/放置 ======

  private raycastBlock() {
    if (!this.camera || !this.scene) return null;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    raycaster.far = REACH;
    const meshes: THREE.Mesh[] = [];
    this.scene.traverse((obj) => { if ((obj as any).isMesh) meshes.push(obj as THREE.Mesh); });
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    const h = hits[0];
    if (!h.face) return null;
    const normal = h.face.normal.clone().round();
    const blockPos = new THREE.Vector3(
      Math.floor(h.point.x + 0.5),
      Math.floor(h.point.y + 0.5),
      Math.floor(h.point.z + 0.5),
    );
    // 如果命中空气（不应该发生）或越界，就反向修正
    if (!this.world.inBounds(blockPos.x, blockPos.y, blockPos.z)) return null;
    const t = this.world.get(blockPos.x, blockPos.y, blockPos.z);
    if (t === 'air') {
      const alt = blockPos.clone().sub(normal);
      if (!this.world.inBounds(alt.x, alt.y, alt.z)) return null;
      if (this.world.get(alt.x, alt.y, alt.z) === 'air') return null;
      return { blockPos: alt, normal };
    }
    return { blockPos, normal };
  }

  private resetBreak() {
    this.breakTarget = null;
    this.breakProgress = 0;
    this.callbacks.onBreakProgress?.(null, 0);
  }

  private tryBreakTick(dt: number) {
    const r = this.raycastBlock();
    if (!r) { this.resetBreak(); return; }
    const { x, y, z } = { x: r.blockPos.x, y: r.blockPos.y, z: r.blockPos.z };
    const block = this.world.get(x, y, z);
    if (block === 'air' || block === 'water') { this.resetBreak(); return; }

    if (!this.breakTarget || this.breakTarget.x !== x || this.breakTarget.y !== y || this.breakTarget.z !== z) {
      this.breakTarget = { x, y, z };
      this.breakProgress = 0;
    }
    const slot = this.hotbar[this.hotbarIndex];
    const total = slotBreakTime(slot, block) ?? 0.5;
    this.breakProgress += dt / total;
    this.callbacks.onBreakProgress?.(this.breakTarget, Math.min(1, this.breakProgress));

    if (this.breakProgress >= 1) {
      this.world.set(x, y, z, 'air');
      this.rebuildMesh();
      this.resetBreak();
    }
  }

  private doPlaceBlock() {
    const r = this.raycastBlock();
    if (!r) return;
    const slot = this.hotbar[this.hotbarIndex];
    if (slot.kind !== 'block') return;
    if (slot.type === 'water' || slot.type === 'air') return;

    const nx = Math.floor(r.blockPos.x + r.normal.x);
    const ny = Math.floor(r.blockPos.y + r.normal.y);
    const nz = Math.floor(r.blockPos.z + r.normal.z);
    if (!this.world.inBounds(nx, ny, nz)) return;
    if (this.playerOccupies(nx, ny, nz)) return;
    if (this.world.get(nx, ny, nz) !== 'air') return;

    this.world.set(nx, ny, nz, slot.type);
    this.rebuildMesh();
  }

  private playerOccupies(bx: number, by: number, bz: number) {
    const minX = this.pos.x - PLAYER_HALF;
    const maxX = this.pos.x + PLAYER_HALF;
    const minZ = this.pos.z - PLAYER_HALF;
    const maxZ = this.pos.z + PLAYER_HALF;
    const minY = this.pos.y - PLAYER_EYE_HEIGHT;
    const maxY = minY + PLAYER_HEIGHT;
    return (maxX > bx && minX < bx + 1 && maxY > by && minY < by + 1 && maxZ > bz && minZ < bz + 1);
  }

  private collidesAt(pos: THREE.Vector3): boolean {
    const minX = Math.floor(pos.x - PLAYER_HALF);
    const maxX = Math.floor(pos.x + PLAYER_HALF);
    const minZ = Math.floor(pos.z - PLAYER_HALF);
    const maxZ = Math.floor(pos.z + PLAYER_HALF);
    const minY = Math.floor(pos.y - PLAYER_EYE_HEIGHT);
    const maxY = Math.floor(pos.y - PLAYER_EYE_HEIGHT + PLAYER_HEIGHT - 0.001);
    for (let x = minX; x <= maxX; x++)
      for (let y = minY; y <= maxY; y++)
        for (let z = minZ; z <= maxZ; z++)
          if (this.world.isSolid(x, y, z)) return true;
    return false;
  }

  // ====== 主循环 ======

  private loop = () => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.loop);
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; // 避免长时间暂停后的巨大跳跃
    this.lastTime = now;

    this.update(dt);

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    // 每 ~100ms 推一次调试信息
    this.debugTimer += dt;
    if (this.debugTimer > 0.1) {
      this.debugTimer = 0;
      this.callbacks.onDebug?.({
        pointerLocked: this.pointerLocked,
        mode: this.mode,
        yaw: this.yaw,
        pitch: this.pitch,
        pos: { x: this.pos.x, y: this.pos.y, z: this.pos.z },
        keys: Array.from(this.keys),
        onGround: this.onGround,
        hasMesh: this.meshBuilt,
      });
    }
  };

  private update(dt: number) {
    // === 移动向量（基于 yaw 的前/右方向）===
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    const forward = new THREE.Vector3(-sinYaw, 0, -cosYaw);
    const right = new THREE.Vector3(cosYaw, 0, -sinYaw);
    const move = new THREE.Vector3();

    if (this.keys.has('KeyW')) move.add(forward);
    if (this.keys.has('KeyS')) move.sub(forward);
    if (this.keys.has('KeyD')) move.add(right);
    if (this.keys.has('KeyA')) move.sub(right);

    if (this.mode === 'fly') {
      const speed = FLY_SPEED;
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);
      this.vel.x = move.x;
      this.vel.z = move.z;
      this.vel.y = 0;
      if (this.keys.has('Space')) this.vel.y = speed;
      if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) this.vel.y = -speed;

      const tryAxis = (axis: 'x' | 'y' | 'z') => {
        const d = this.vel[axis] * dt;
        if (d === 0) return;
        const test = this.pos.clone();
        test[axis] += d;
        if (!this.collidesAt(test)) this.pos[axis] += d;
      };
      tryAxis('x'); tryAxis('z'); tryAxis('y');
      this.onGround = false;
    } else {
      // 走路模式
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(PLAYER_SPEED);
      this.vel.x = move.x;
      this.vel.z = move.z;
      this.vel.y += GRAVITY * dt;
      if (this.vel.y < -40) this.vel.y = -40;

      const stepAxis = (axis: 'x' | 'y' | 'z') => {
        const d = this.vel[axis] * dt;
        if (d === 0) return;
        const test = this.pos.clone();
        test[axis] += d;
        if (this.collidesAt(test)) {
          if (axis === 'y') {
            if (d < 0) this.onGround = true;
            this.vel.y = 0;
          } else {
            this.vel[axis] = 0;
          }
        } else {
          this.pos[axis] += d;
          if (axis === 'y' && d < 0) this.onGround = false;
        }
      };
      this.onGround = false;
      stepAxis('x');
      stepAxis('z');
      stepAxis('y');
    }

    // 防掉出世界
    if (this.pos.y < -5) {
      this.pos.copy(this.findSafeSpawn());
      this.vel.set(0, 0, 0);
    }

    // === 视角：方向键（始终可用）或鼠标锁定后使用 movementX/Y ===
    const ARROW_SPEED = 1.8; // 弧度/秒
    if (!this.pointerLocked) {
      if (this.keys.has('ArrowLeft'))  this.yaw -= ARROW_SPEED * dt;
      if (this.keys.has('ArrowRight')) this.yaw += ARROW_SPEED * dt;
      if (this.keys.has('ArrowUp'))    this.pitch += ARROW_SPEED * dt;
      if (this.keys.has('ArrowDown')) this.pitch -= ARROW_SPEED * dt;
      const lim = Math.PI / 2 - 0.01;
      if (this.pitch > lim) this.pitch = lim;
      if (this.pitch < -lim) this.pitch = -lim;
    }

    // 应用相机
    if (this.camera) {
      this.camera.position.copy(this.pos);
      const dir = new THREE.Vector3(
        -Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch),
      );
      this.camera.lookAt(this.pos.clone().add(dir));
    }

    // 高亮方块
    if (this.highlight) {
      const r = this.raycastBlock();
      if (r) {
        this.highlight.visible = true;
        this.highlight.position.set(r.blockPos.x, r.blockPos.y, r.blockPos.z);
      } else {
        this.highlight.visible = false;
      }
    }

    // 破坏进度
    if (this.leftDown) this.tryBreakTick(dt);
  }
}
