// ===== 3D 渲染器（Three.js 体素第一人称） =====
import * as THREE from 'three';
import type { GameRenderer } from './renderer';
import { BLOCKS, type BlockType } from './blocks';
import { TOOLS } from './tools';
import { getBlockTextures } from './textures';
import type { Slot } from './types';
import type { World } from './world';

export class Renderer3D implements GameRenderer {
  readonly kind = '3d' as const;
  private container: HTMLElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private skyMesh: THREE.Mesh | null = null;
  private skyMat: THREE.ShaderMaterial | null = null;
  private highlight: THREE.LineSegments | null = null;
  private breakOverlay: THREE.LineSegments | null = null;
  private worldGroup: THREE.Group | null = null;
  private handScene: THREE.Scene | null = null;
  private handCamera: THREE.PerspectiveCamera | null = null;
  private handGroup: THREE.Group | null = null;
  private lastVersion = -1;
  private handSwing = 0;
  // 玩家手持工具的几何
  private handMesh: THREE.Mesh | null = null;

  init(container: HTMLElement): boolean {
    this.container = container;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
    } catch (e) {
      console.warn('[MC] 3D 渲染器：WebGL 不可用', e);
      return false;
    }
    if (!this.renderer.getContext()) {
      console.warn('[MC] 3D 渲染器：WebGL 上下文无效');
      return false;
    }
    const cw = container.clientWidth || window.innerWidth;
    const ch = container.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(cw, ch);
    this.renderer.setClearColor(0x2a3a4a);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 20, 80);

    // 光照
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x556b2f, 0.7);
    this.scene.add(this.hemiLight);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.9);
    this.sunLight.position.set(20, 40, 10);
    this.scene.add(this.sunLight);

    this.camera = new THREE.PerspectiveCamera(75, cw / ch, 0.05, 200);

    // 天空盒（球形渐变）
    const skyGeom = new THREE.SphereGeometry(150, 16, 12);
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x4a90e2) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 33 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.skyMesh = new THREE.Mesh(skyGeom, this.skyMat);
    this.scene.add(this.skyMesh);

    // 高亮框
    const edgeGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
    this.highlight = new THREE.LineSegments(
      edgeGeom,
      new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2 }),
    );
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    // 破坏裂纹
    this.breakOverlay = new THREE.LineSegments(
      edgeGeom.clone(),
      new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7 }),
    );
    this.breakOverlay.visible = false;
    this.scene.add(this.breakOverlay);

    // 玩家手持工具的小窗口
    this.handScene = new THREE.Scene();
    this.handCamera = new THREE.PerspectiveCamera(50, 1, 0.01, 10);
    this.handCamera.position.set(0, 0, 1.5);
    this.handCamera.lookAt(0, 0, 0);
    const handLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.handScene.add(handLight);
    this.handGroup = new THREE.Group();
    this.handGroup.position.set(0.5, -0.4, 0);
    this.handGroup.rotation.set(0.4, 0.3, 0);
    this.handScene.add(this.handGroup);
    this.handMesh = null;

    console.log('[MC] 3D 渲染器初始化成功');
    return true;
  }

  onResize() {
    if (!this.renderer || !this.camera || !this.container) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  requestPointerLock() {
    if (!this.renderer) return;
    try {
      const el: any = this.renderer.domElement;
      const fn = el.requestPointerLock || el.webkitRequestPointerLock || el.mozRequestPointerLock;
      if (fn) {
        const r = fn.call(el);
        if (r && typeof r.catch === 'function') r.catch(() => {});
      }
    } catch {}
  }

  /** 根据 world 重建方块网格（按方块类型分组，每组独立材质 + 纹理） */
  private buildWorldMeshFromWorld(world: World) {
    if (!this.scene) return;

    // 用 world.version 判断（每次 set 自增）
    if (world.version === this.lastVersion && this.worldGroup) return;
    this.lastVersion = world.version;

    // 清理旧的
    if (this.worldGroup) {
      this.scene.remove(this.worldGroup);
      this.worldGroup.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
          else (m.material as THREE.Material).dispose();
        }
      });
      this.worldGroup = null;
    }

    // 按方块类型分组收集
    type FaceData = { positions: number[]; normals: number[]; uvs: number[]; indices: number[] };
    const groups = new Map<BlockType, FaceData>();
    for (const t of Object.keys(BLOCKS) as BlockType[]) {
      if (t === 'air' || t === 'water') continue;
      groups.set(t, { positions: [], normals: [], uvs: [], indices: [] });
    }

    const faceShades = [0.85, 0.85, 1.0, 0.55, 0.75, 0.75]; // +X -X +Y -Y +Z -Z
    const neighborOff: [number, number, number][] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const faceVerts: [number, number, number][][] = [
      [[0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]],
      [[-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5]],
      [[-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5]],
      [[-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5]],
      [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]],
      [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]],
    ];
    // 0=side, 1=top, 2=bottom —— 但 BlockTextures 是 {side, top, bottom}，所以索引 0=side, 1=top, 2=bottom
    const faceTex: Array<'side' | 'top' | 'bottom'> = ['side', 'side', 'top', 'bottom', 'side', 'side'];

    // 预生成所有方块的纹理
    const blockTexCache = new Map<BlockType, ReturnType<typeof getBlockTextures>>();
    for (const t of Object.keys(BLOCKS) as BlockType[]) {
      if (t === 'air' || t === 'water') continue;
      blockTexCache.set(t, getBlockTextures(t));
    }

    // 收集几何
    for (let x = 0; x < world.sizeX; x++) {
      for (let y = 0; y < world.sizeY; y++) {
        for (let z = 0; z < world.sizeZ; z++) {
          const t = world.get(x, y, z);
          if (t === 'air' || t === 'water') continue;
          const data = groups.get(t);
          if (!data) continue;
          const base = BLOCKS[t].color;
          const baseR = ((base >> 16) & 0xff) / 255;
          const baseG = ((base >> 8) & 0xff) / 255;
          const baseB = (base & 0xff) / 255;

          for (let fi = 0; fi < 6; fi++) {
            const [dx, dy, dz] = neighborOff[fi];
            if (world.isSolid(x + dx, y + dy, z + dz)) continue;
            const shade = faceShades[fi];
            // 顶点颜色（即便用纹理也保留一些明暗变化 —— 但与纹理 map 冲突，简化用纯色 + shade）
            void baseR; void baseG; void baseB; void shade;
            const vs = faceVerts[fi];
            const startIdx = data.positions.length / 3;
            for (const v of vs) data.positions.push(x + v[0], y + v[1], z + v[2]);
            for (let k = 0; k < 4; k++) {
              const [nx, ny, nz] = neighborOff[fi];
              data.normals.push(nx, ny, nz);
            }
            // UV：每个面对应 0~1
            data.uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
            data.indices.push(startIdx, startIdx + 1, startIdx + 2, startIdx, startIdx + 2, startIdx + 3);
          }
        }
      }
    }

    // 为每种方块创建一个 mesh
    this.worldGroup = new THREE.Group();
    for (const [t, data] of groups) {
      if (data.positions.length === 0) continue;
      try {
        const tex = blockTexCache.get(t);
        const mat = new THREE.MeshLambertMaterial({
          map: tex?.side,
        });
        void faceTex;
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
        geom.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
        geom.setIndex(data.indices);
        const mesh = new THREE.Mesh(geom, mat);
        this.worldGroup.add(mesh);
      } catch (err) {
        console.warn('[MC] 跳过方块 mesh:', t, err);
      }
    }
    if (this.worldGroup.children.length > 0) {
      this.scene.add(this.worldGroup);
    } else {
      console.warn('[MC] worldGroup 为空（无可见方块）');
    }
  }

  /** 应用昼夜光照 */
  private applyDayNight(dayTime: number) {
    if (!this.hemiLight || !this.sunLight || !this.skyMat || !this.scene) return;
    // dayTime 0~24000
    const t = (dayTime / 24000) * Math.PI * 2;
    const sun = Math.sin(t - Math.PI / 2); // -1~1
    // 太阳位置
    const sunY = sun * 50;
    this.sunLight.position.set(20, sunY + 30, 10);

    // 强度
    const sunStrength = Math.max(0.05, sun * 0.8 + 0.2);
    this.sunLight.intensity = sunStrength;
    this.hemiLight.intensity = 0.3 + sunStrength * 0.6;

    // 天空颜色
    let topColor: THREE.Color, bottomColor: THREE.Color;
    if (sun > 0.3) {
      topColor = new THREE.Color(0x4a90e2);
      bottomColor = new THREE.Color(0xb4d4ed);
    } else if (sun > -0.1) {
      const k = (sun + 0.1) / 0.4;
      topColor = new THREE.Color().setRGB(0.3 + k * 0.3, 0.5 + k * 0.2, 0.9);
      bottomColor = new THREE.Color().setRGB(0.95, 0.5 + k * 0.3, 0.3);
    } else {
      topColor = new THREE.Color(0x0a0e1e);
      bottomColor = new THREE.Color(0x1a2540);
    }
    (this.skyMat.uniforms.topColor.value as THREE.Color).copy(topColor);
    (this.skyMat.uniforms.bottomColor.value as THREE.Color).copy(bottomColor);
    this.renderer?.setClearColor(topColor);
    if (this.scene.fog) {
      (this.scene.fog as THREE.Fog).color.copy(topColor);
    }
  }

  /** 更新手持工具的几何 */
  private updateHandTool(slot: Slot) {
    if (!this.handGroup) return;
    // 清除旧的
    while (this.handGroup.children.length > 0) {
      const c = this.handGroup.children[0];
      this.handGroup.remove(c);
      if ((c as any).geometry) (c as any).geometry.dispose();
      if ((c as any).material) (c as any).material.dispose();
    }
    if (slot.kind === 'tool') {
      const t = TOOLS[slot.type];
      const headMat = new THREE.MeshLambertMaterial({ color: t.accent });
      const handleMat = new THREE.MeshLambertMaterial({ color: t.color });
      // 柄
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), handleMat);
      handle.position.y = -0.2;
      this.handGroup.add(handle);
      // 头
      if (slot.type === 'axe') {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.08), headMat);
        head.position.set(0.04, 0.05, 0);
        this.handGroup.add(head);
      } else if (slot.type === 'pickaxe') {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), headMat);
        head.position.set(0, 0.1, 0);
        this.handGroup.add(head);
      } else if (slot.type === 'shovel') {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.06), headMat);
        head.position.set(0, 0.15, 0);
        this.handGroup.add(head);
      } else {
        // sword
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.04), headMat);
        head.position.set(0, 0.25, 0);
        this.handGroup.add(head);
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.06), new THREE.MeshLambertMaterial({ color: t.accent }));
        guard.position.y = 0.02;
        this.handGroup.add(guard);
      }
    } else {
      // 方块
      const color = BLOCKS[slot.type].color;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color }));
      mesh.position.set(0, 0, 0);
      this.handGroup.add(mesh);
    }
  }

  render(state: {
    pos: { x: number; y: number; z: number };
    yaw: number;
    pitch: number;
    vel: { x: number; y: number; z: number };
    onGround: boolean;
    mode: 'walk' | 'fly';
    highlight: { x: number; y: number; z: number } | null;
    breaking: { pos: { x: number; y: number; z: number }; progress: number; block: BlockType } | null;
    dayTime: number;
    currentSlot: Slot;
    isBreaking: boolean;
  }, world: World) {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.buildWorldMeshFromWorld(world);
    this.applyDayNight(state.dayTime);

    // 工具摆动
    if (state.isBreaking) {
      this.handSwing = (this.handSwing + 0.35) % (Math.PI * 2);
    } else {
      this.handSwing *= 0.85;
    }
    if (this.handGroup) {
      this.handGroup.position.x = 0.5;
      this.handGroup.position.y = -0.4 + Math.sin(this.handSwing) * 0.08;
      this.handGroup.rotation.z = Math.sin(this.handSwing) * 0.5;
    }

    // 相机
    this.camera.position.set(state.pos.x, state.pos.y, state.pos.z);
    const lookX = state.pos.x - Math.sin(state.yaw) * Math.cos(state.pitch);
    const lookY = state.pos.y + Math.sin(state.pitch);
    const lookZ = state.pos.z - Math.cos(state.yaw) * Math.cos(state.pitch);
    this.camera.lookAt(lookX, lookY, lookZ);

    // 高亮
    if (state.highlight && this.highlight) {
      this.highlight.visible = true;
      this.highlight.position.set(state.highlight.x, state.highlight.y, state.highlight.z);
    } else if (this.highlight) {
      this.highlight.visible = false;
    }

    // 破坏裂纹
    if (state.breaking && this.breakOverlay) {
      this.breakOverlay.visible = true;
      this.breakOverlay.position.set(state.breaking.pos.x, state.breaking.pos.y, state.breaking.pos.z);
      (this.breakOverlay.material as THREE.LineBasicMaterial).opacity = 0.3 + 0.6 * state.breaking.progress;
    } else if (this.breakOverlay) {
      this.breakOverlay.visible = false;
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.renderer) {
      this.renderer.domElement.remove();
      this.renderer.dispose();
    }
    if (this.worldGroup) {
      this.worldGroup.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
          else (m.material as THREE.Material).dispose();
        }
      });
    }
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}
