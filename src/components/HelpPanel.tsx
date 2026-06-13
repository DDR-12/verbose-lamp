// ===== 操作说明 =====
export default function HelpPanel() {
  return (
    <div className="pointer-events-none absolute top-3 right-3 z-30 text-right text-[11px] leading-relaxed bg-black/45 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 max-w-[180px]">
      <div className="text-white/90 font-bold mb-1">操作</div>
      <div><kbd className="kbd">WASD</kbd> 移动</div>
      <div><kbd className="kbd">方向键</kbd> 转视角</div>
      <div><kbd className="kbd">Space</kbd> 跳 / 飞高</div>
      <div><kbd className="kbd">Shift</kbd> 飞低</div>
      <div><kbd className="kbd">F</kbd> 走路/飞行</div>
      <div><kbd className="kbd">左键按住</kbd> 破坏</div>
      <div><kbd className="kbd">右键</kbd> 放置</div>
      <div><kbd className="kbd">1-9 / 滚轮</kbd> 切槽</div>
    </div>
  );
}
