// ===== 渲染器选择：3D 还是 2D =====
// 引擎在挂载时立即创建（paused），StartScreen 显示期间 paused=true，
// 点开始按钮后调 engine.start() 解除暂停。这样避免 React 状态机与引擎创建的竞态。

import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/engine';
import { useGameStore, gameActions } from '../game/store';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    if (engineRef.current) return; // 已经创建过
    try {
      const slot = useGameStore.getState().pendingSlot;
      const engine = new GameEngine(containerRef.current, slot);
      engineRef.current = engine;
      setReady(true);
      console.log('[MC] GameCanvas 引擎已就绪');
    } catch (err: any) {
      gameActions.setError(err?.message || '引擎创建失败');
      console.error('[MC] 引擎创建失败:', err);
    }
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ zIndex: 0, cursor: 'crosshair' }}
    />
  );
}
