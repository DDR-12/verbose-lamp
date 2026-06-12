import { useEffect, useRef, useState } from 'react';
import { MinecraftEngine } from '../game/engine';
import { World } from '../game/world';
import { BLOCKS, HOTBAR, BlockType } from '../game/blocks';

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MinecraftEngine | null>(null);
  const [hotbarIdx, setHotbarIdx] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const world = new World(48, 48, 24, 1337);
    try {
      const engine = new MinecraftEngine(containerRef.current, world, HOTBAR, {
        onHotbarChange: (_type, idx) => setHotbarIdx(idx),
      });
      engineRef.current = engine;
      const onFirstClick = () => setStarted(true);
      containerRef.current.addEventListener('click', onFirstClick);
      return () => {
        containerRef.current?.removeEventListener('click', onFirstClick);
        engine.dispose();
      };
    } catch (err) {
      console.warn('Failed to start Minecraft engine:', err);
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white select-none">
      {/* Three.js canvas 容器 */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* 十字准星 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative w-6 h-6">
          <div className="absolute left-1/2 top-0 w-[2px] h-full -translate-x-1/2 bg-white/90 mix-blend-difference" />
          <div className="absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2 bg-white/90 mix-blend-difference" />
        </div>
      </div>

      {/* 左上角标题 */}
      <div className="pointer-events-none absolute top-4 left-4">
        <div className="text-2xl font-black tracking-wider drop-shadow-lg">
          <span className="text-lime-300">我的</span>
          <span className="text-amber-200">世界</span>
          <span className="text-white/70 text-sm ml-2 font-normal">Web Edition</span>
        </div>
      </div>

      {/* 操作提示 */}
      <div className="pointer-events-none absolute top-4 right-4 text-right text-xs leading-relaxed bg-black/40 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10">
        <div className="text-white/90 font-semibold mb-1">操作</div>
        <div><kbd className="kbd">WASD</kbd> 移动</div>
        <div><kbd className="kbd">鼠标</kbd> 视角</div>
        <div><kbd className="kbd">Space</kbd> 跳跃</div>
        <div><kbd className="kbd">左键</kbd> 破坏方块</div>
        <div><kbd className="kbd">右键</kbd> 放置方块</div>
        <div><kbd className="kbd">1-9 / 滚轮</kbd> 切换方块</div>
      </div>

      {/* 开始提示 */}
      {!started && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="bg-black/60 backdrop-blur-md rounded-2xl px-8 py-6 border border-white/15 text-center shadow-2xl">
            <div className="text-2xl font-bold mb-2">点击屏幕开始游戏</div>
            <div className="text-sm text-white/70">按 ESC 可退出鼠标锁定</div>
          </div>
        </div>
      )}

      {/* 底部方块选择栏 */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="flex gap-1.5 bg-black/40 backdrop-blur-sm p-2 rounded-xl border border-white/10">
          {HOTBAR.map((t, i) => (
            <HotbarSlot key={t} type={t} index={i} active={i === hotbarIdx} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HotbarSlot({ type, index, active }: { type: BlockType; index: number; active: boolean }) {
  const hex = BLOCKS[type].color;
  const color = '#' + hex.toString(16).padStart(6, '0');
  const topColor = lighten(hex, 0.15);
  const sideColor = darken(hex, 0.15);
  return (
    <div
      className={
        'relative w-14 h-14 rounded-lg flex items-end justify-center pb-1 transition-all ' +
        (active
          ? 'ring-2 ring-white bg-black/70 -translate-y-1 shadow-lg'
          : 'bg-black/40 border border-white/10')
      }
    >
      {/* 3D 方块图标 */}
      <div className="relative w-8 h-8 mt-1" style={{ perspective: '120px' }}>
        <div
          className="absolute inset-0"
          style={{
            transform: 'rotateX(-20deg) rotateY(35deg)',
            transformStyle: 'preserve-3d',
            width: '100%',
            height: '100%',
          }}
        >
          <div
            className="absolute"
            style={{
              width: '100%',
              height: '100%',
              background: topColor,
              transform: 'translateZ(16px)',
              border: '1px solid rgba(0,0,0,0.35)',
            }}
          />
          <div
            className="absolute"
            style={{
              width: '100%',
              height: '100%',
              background: sideColor,
              transform: 'rotateY(-90deg) translateZ(16px)',
              border: '1px solid rgba(0,0,0,0.35)',
            }}
          />
          <div
            className="absolute"
            style={{
              width: '100%',
              height: '100%',
              background: color,
              transform: 'rotateX(90deg) translateZ(16px)',
              border: '1px solid rgba(0,0,0,0.35)',
            }}
          />
        </div>
      </div>
      <div className="absolute top-0.5 left-1 text-[10px] font-bold text-white/80">{index + 1}</div>
      <div className="absolute bottom-0.5 w-full text-center text-[9px] text-white/90 font-medium truncate">
        {BLOCKS[type].label}
      </div>
    </div>
  );
}

function lighten(hex: number, amount: number) {
  const r = Math.min(255, Math.floor(((hex >> 16) & 0xff) * (1 + amount)));
  const g = Math.min(255, Math.floor(((hex >> 8) & 0xff) * (1 + amount)));
  const b = Math.min(255, Math.floor((hex & 0xff) * (1 + amount)));
  return `rgb(${r}, ${g}, ${b})`;
}
function darken(hex: number, amount: number) {
  const r = Math.max(0, Math.floor(((hex >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((hex >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((hex & 0xff) * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
}
