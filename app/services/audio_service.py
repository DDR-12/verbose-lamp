"""音频服务:朗读/歌唱/跟读三种模式播放

基于 PySide6 的 QMediaPlayer。提供信号以便 UI 同步。
"""
from __future__ import annotations

from enum import Enum
from pathlib import Path
from typing import Optional

from PySide6.QtCore import QObject, QUrl, Signal, QTimer

from app import config
from app.core.logger import get_logger

log = get_logger(__name__)


class AudioMode(str, Enum):
    READ = "read"     # 朗读版
    SONG = "song"     # 歌唱版
    FOLLOW = "follow"  # 跟读版


class AudioService(QObject):
    """全局音频服务(QObject,单例)"""

    _instance: Optional["AudioService"] = None

    stateChanged = Signal(str)            # playing/paused/stopped
    modeChanged = Signal(str)             # AudioMode.value
    positionChanged = Signal(int)         # ms
    durationChanged = Signal(int)         # ms
    pageFinished = Signal()               # 当前音频播放完毕(用于自动翻页)
    errorOccurred = Signal(str)

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        super().__init__()
        self._initialized = True

        from PySide6.QtMultimedia import QAudioOutput, QMediaPlayer

        self._player = QMediaPlayer()
        self._audio_out = QAudioOutput()
        self._audio_out.setVolume(config.AUDIO_DEFAULT_VOLUME)
        self._player.setAudioOutput(self._audio_out)
        self._player.setLoops(1)

        self._player.playbackStateChanged.connect(self._on_state_changed)
        self._player.positionChanged.connect(self._on_position)
        self._player.durationChanged.connect(self._on_duration)
        self._player.mediaStatusChanged.connect(self._on_media_status)
        self._player.errorOccurred.connect(lambda e: self.errorOccurred.emit(str(e)))

        self._mode: AudioMode = AudioMode.READ
        self._current_path: Optional[Path] = None
        self._position_timer = QTimer()
        self._position_timer.setInterval(50)
        self._position_timer.timeout.connect(self._tick)
        self._last_emitted_pos = 0

    # ---- 模式控制 ----
    @property
    def mode(self) -> AudioMode:
        return self._mode

    def set_mode(self, mode: AudioMode) -> None:
        if mode == self._mode:
            return
        self.stop()
        self._mode = mode
        self.modeChanged.emit(mode.value)
        log.info("切换音频模式: %s", mode.value)

    # ---- 播放控制 ----
    def play(self, path: Path) -> None:
        if path is None or not Path(path).exists():
            log.warning("音频文件不存在: %s", path)
            self.errorOccurred.emit(f"音频文件不存在: {path}")
            return
        url = QUrl.fromLocalFile(str(Path(path).resolve()))
        if self._player.source() != url:
            self._player.setSource(url)
        self._current_path = Path(path)
        self._player.play()
        log.info("播放: %s", path.name)

    def stop(self) -> None:
        if self._player.playbackState() != 0:  # not StoppedState
            self._player.stop()
        self._position_timer.stop()
        self._current_path = None

    def pause(self) -> None:
        if self._player.isPlaying():
            self._player.pause()

    def resume(self) -> None:
        if self._player.source().isValid():
            self._player.play()

    def set_volume(self, v: float) -> None:
        v = max(0.0, min(1.0, v))
        self._audio_out.setVolume(v)

    def is_playing(self) -> bool:
        return self._player.isPlaying()

    # ---- 信号回调 ----
    def _on_state_changed(self, state) -> None:
        from PySide6.QtMultimedia import QMediaPlayer
        s = "stopped"
        if state == QMediaPlayer.PlaybackState.PlayingState:
            s = "playing"
            self._position_timer.start()
        elif state == QMediaPlayer.PlaybackState.PausedState:
            s = "paused"
            self._position_timer.stop()
        else:
            self._position_timer.stop()
        self.stateChanged.emit(s)

    def _on_position(self, pos: int) -> None:
        self._last_emitted_pos = pos
        self.positionChanged.emit(pos)

    def _on_duration(self, dur: int) -> None:
        self.durationChanged.emit(dur)

    def _on_media_status(self, status) -> None:
        from PySide6.QtMultimedia import QMediaPlayer
        if status == QMediaPlayer.MediaStatus.EndOfMedia:
            self.pageFinished.emit()

    def _tick(self) -> None:
        # 某些后端不主动发 positionChanged,这里兜底
        try:
            pos = self._player.position()
            if pos != self._last_emitted_pos:
                self._on_position(pos)
        except Exception:  # noqa: BLE001
            pass

    # ---- 给点读模式用 ----
    def play_word(self, path: Path) -> None:
        if path is None or not Path(path).exists():
            log.warning("点读音频不存在: %s", path)
            return
        self.play(Path(path))


def get_audio_service() -> AudioService:
    return AudioService()
