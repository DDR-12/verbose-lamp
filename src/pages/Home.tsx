// ===== 主页面：游戏画布 + UI 叠层 =====
import { useEffect } from 'react';
import GameCanvas from '../components/GameCanvas';
import StatusBar from '../components/StatusBar';
import HelpPanel from '../components/HelpPanel';
import Hotbar from '../components/Hotbar';
import DebugPanel from '../components/DebugPanel';
import StartScreen from '../components/StartScreen';
import OnScreenControls from '../components/OnScreenControls';
import { useGameStore } from '../game/store';
import { initAudioOnFirstInteraction } from '../game/audio';

export default function Home() {
  const hasStarted = useGameStore((s) => s.hasStarted);
  const saveMessage = useGameStore((s) => s.saveMessage);

  useEffect(() => {
    initAudioOnFirstInteraction();
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0a14] select-none font-sans text-white">
      <GameCanvas />
      {hasStarted && (
        <>
          <StatusBar />
          <HelpPanel />
          <Hotbar />
          <DebugPanel />
          <OnScreenControls />
        </>
      )}
      {saveMessage && (
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-lg bg-cyan-600/95 text-white font-semibold text-sm shadow-2xl border border-cyan-300/50 animate-pulse">
          {saveMessage}
        </div>
      )}
      <StartScreen />
    </div>
  );
}
