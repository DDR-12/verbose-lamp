// ===== 渲染器选择：3D 还是 2D =====
// 统一封装：自动选择 3D/2D，并暴露引擎实例到 window.__mc

import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/engine';
import { useGameStore, gameActions } from '../game/store';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const hasStarted = useGameStore((s) => s.hasStarted);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!hasStarted) return; // 等用户点开始
    let engine: GameEngine | null = null;
    try {
      const slot = useGameStore.getState().pendingSlot;
      engine = new GameEngine(containerRef.current, slot);
      engineRef.current = engine;
      setReady(true);
    } catch (err: any) {
      gameActions.setError(err?.message || '引擎创建失败');
      console.error('[MC] 引擎创建失败:', err);
    }
    return () => {
      engine?.dispose();
      engineRef.current = null;
    };
  }, [hasStarted]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ zIndex: 0, cursor: 'crosshair' }}
    />
  );
}
