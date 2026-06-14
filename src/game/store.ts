// ===== Zustand 全局游戏状态 =====
import { create } from 'zustand';
import type { GameState } from './types';
import { DEFAULT_HOTBAR } from './hotbar';

export const useGameStore = create<GameState>(() => ({
  pos: { x: 4.5, y: 8, z: 4.5 },
  vel: { x: 0, y: 0, z: 0 },
  yaw: 0,
  pitch: -0.15,
  onGround: false,
  mode: 'walk',

  keys: new Set<string>(),
  pointerLocked: false,
  leftDown: false,

  hotbarIndex: 0,
  slots: DEFAULT_HOTBAR,

  breaking: null,
  highlight: null,
  renderer: 'none',
  frameCount: 0,
  dayTime: 6000,
  hasStarted: false,
  paused: false,
  error: null,
  saveMenuOpen: false,
  saveMessage: null,
}));

// 单独暴露 setters（避免循环依赖）
export const gameActions = {
  setPos: (x: number, y: number, z: number) => useGameStore.setState({ pos: { x, y, z } }),
  setVel: (x: number, y: number, z: number) => useGameStore.setState({ vel: { x, y, z } }),
  setYaw: (yaw: number) => useGameStore.setState({ yaw }),
  setPitch: (pitch: number) => useGameStore.setState({ pitch }),
  setOnGround: (v: boolean) => useGameStore.setState({ onGround: v }),
  setMode: (mode: 'walk' | 'fly') => useGameStore.setState({ mode }),
  toggleMode: () => useGameStore.setState((s) => ({ mode: s.mode === 'walk' ? 'fly' : 'walk' })),
  setHotbarIndex: (idx: number) => useGameStore.setState({ hotbarIndex: idx }),
  setBreaking: (b: GameState['breaking']) => useGameStore.setState({ breaking: b }),
  setHighlight: (h: GameState['highlight']) => useGameStore.setState({ highlight: h }),
  setRenderer: (r: GameState['renderer']) => useGameStore.setState({ renderer: r }),
  setFrameCount: (n: number) => useGameStore.setState({ frameCount: n }),
  setDayTime: (t: number) => useGameStore.setState({ dayTime: t }),
  setHasStarted: (v: boolean) => useGameStore.setState({ hasStarted: v }),
  setPaused: (v: boolean) => useGameStore.setState({ paused: v }),
  setError: (e: string | null) => useGameStore.setState({ error: e }),
  setSaveMenuOpen: (v: boolean) => useGameStore.setState({ saveMenuOpen: v }),
  setSaveMessage: (m: string | null) => useGameStore.setState({ saveMessage: m }),
  setPointerLocked: (v: boolean) => useGameStore.setState({ pointerLocked: v }),
  setLeftDown: (v: boolean) => useGameStore.setState({ leftDown: v }),
  addKey: (k: string) => {
    const s = useGameStore.getState();
    if (s.keys.has(k)) return;
    const next = new Set(s.keys);
    next.add(k);
    useGameStore.setState({ keys: next });
  },
  removeKey: (k: string) => {
    const s = useGameStore.getState();
    if (!s.keys.has(k)) return;
    const next = new Set(s.keys);
    next.delete(k);
    useGameStore.setState({ keys: next });
  },
};
