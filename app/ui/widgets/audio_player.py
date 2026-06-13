"""音频控制条 widget"""
from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QWidget, QHBoxLayout, QPushButton, QSlider, QLabel, QButtonGroup
)

from app.services.audio_service import AudioMode, get_audio_service


class AudioPlayerBar(QWidget):
    """阅读页底部音频条:模式切换 / 播放暂停 / 进度"""

    modeChanged = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("ReaderToolbar")
        self._audio = get_audio_service()
        self._build()
        self._audio.stateChanged.connect(self._on_state)
        self._audio.modeChanged.connect(self._on_mode)

    def _build(self) -> None:
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 8, 12, 8)
        layout.setSpacing(10)

        # 模式按钮组
        self._group = QButtonGroup(self)
        self._group.setExclusive(True)
        self._btn_read = QPushButton("📖 朗读")
        self._btn_song = QPushButton("🎵 歌唱")
        self._btn_follow = QPushButton("🎤 跟读")
        for btn, mode in (
            (self._btn_read, AudioMode.READ),
            (self._btn_song, AudioMode.SONG),
            (self._btn_follow, AudioMode.FOLLOW),
        ):
            btn.setObjectName("ModeButton")
            btn.setCheckable(True)
            btn.clicked.connect(lambda _=False, m=mode: self._set_mode(m))
            self._group.addButton(btn)
            layout.addWidget(btn)
        self._btn_read.setChecked(True)

        layout.addSpacing(20)

        # 播放/暂停
        self._btn_play = QPushButton("▶ 播放")
        self._btn_play.setObjectName("PrimaryButton")
        self._btn_play.clicked.connect(self._toggle_play)
        layout.addWidget(self._btn_play)

        # 进度
        self._lbl_pos = QLabel("00:00")
        self._lbl_pos.setObjectName("StatusText")
        layout.addWidget(self._lbl_pos)
        self._slider = QSlider(Qt.Orientation.Horizontal)
        self._slider.setRange(0, 1000)
        self._slider.sliderMoved.connect(self._on_slider_moved)
        self._slider.sliderPressed.connect(self._on_slider_pressed)
        self._slider.sliderReleased.connect(self._on_slider_released)
        layout.addWidget(self._slider, 1)
        self._lbl_dur = QLabel("00:00")
        self._lbl_dur.setObjectName("StatusText")
        layout.addWidget(self._lbl_dur)

    def _set_mode(self, mode: AudioMode) -> None:
        self._audio.set_mode(mode)
        self.modeChanged.emit(mode.value)

    def _toggle_play(self) -> None:
        if self._audio.is_playing():
            self._audio.pause()
        else:
            self._audio.resume()

    def _on_state(self, s: str) -> None:
        if s == "playing":
            self._btn_play.setText("⏸ 暂停")
        else:
            self._btn_play.setText("▶ 播放")

    def _on_mode(self, mode_value: str) -> None:
        for btn, m in (
            (self._btn_read, AudioMode.READ),
            (self._btn_song, AudioMode.SONG),
            (self._btn_follow, AudioMode.FOLLOW),
        ):
            if m.value == mode_value:
                btn.setChecked(True)
                break

    def bind_position(self, pos_ms: int, dur_ms: int) -> None:
        if self._slider.isSliderDown():
            return
        self._slider.setValue(int(pos_ms / max(dur_ms, 1) * 1000))
        self._lbl_pos.setText(self._fmt(pos_ms))
        self._lbl_dur.setText(self._fmt(dur_ms))

    def _on_slider_pressed(self) -> None:
        self._seeking = True

    def _on_slider_moved(self, val: int) -> None:
        # 仅 UI 反馈,松手再 seek
        if hasattr(self, "_seeking") and self._seeking:
            self._lbl_pos.setText(self._fmt(int(val / 1000 * (self._slider.maximum() and self._last_dur or 0))))

    def _on_slider_released(self) -> None:
        self._seeking = False

    def update_duration(self, dur_ms: int) -> None:
        self._last_dur = dur_ms
        self._lbl_dur.setText(self._fmt(dur_ms))

    @staticmethod
    def _fmt(ms: int) -> str:
        s = max(0, int(ms / 1000))
        return f"{s // 60:02d}:{s % 60:02d}"
