// ===== Web Audio 音效合成 =====

class Audio {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        this.enabled = false;
        return null;
      }
    }
    if (this.ctx!.state === 'suspended') {
      this.ctx!.resume();
    }
    return this.ctx;
  }

  setEnabled(v: boolean) { this.enabled = v; }
  isEnabled() { return this.enabled; }

  /** 单音播放 */
  play(freq: number, duration = 0.1, type: OscillatorType = 'square', volume = 0.1) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || freq <= 0) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  break(freq: number) {
    // 破坏音：低频 + 短促
    this.play(freq, 0.12, 'square', 0.12);
    setTimeout(() => this.play(freq * 1.5, 0.08, 'square', 0.08), 40);
  }

  place(freq: number = 440) {
    // 放置音：清脆
    this.play(freq, 0.06, 'triangle', 0.1);
    setTimeout(() => this.play(freq * 1.3, 0.04, 'triangle', 0.08), 30);
  }

  jump() {
    this.play(220, 0.1, 'sine', 0.08);
    setTimeout(() => this.play(440, 0.06, 'sine', 0.06), 50);
  }

  step() {
    this.play(80, 0.04, 'triangle', 0.04);
  }

  /** 切换飞行/走路 */
  swoosh() {
    this.play(660, 0.08, 'sine', 0.1);
    setTimeout(() => this.play(880, 0.06, 'sine', 0.08), 30);
  }
}

export const audio = new Audio();

// 首次用户交互时启动 AudioContext（浏览器策略要求）
export function initAudioOnFirstInteraction() {
  const handler = () => {
    audio.setEnabled(true);
    window.removeEventListener('click', handler);
    window.removeEventListener('keydown', handler);
  };
  window.addEventListener('click', handler);
  window.addEventListener('keydown', handler);
}
