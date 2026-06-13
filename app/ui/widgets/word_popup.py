"""单词翻译弹窗(点读模式触发)"""
from __future__ import annotations

from typing import Optional

from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QFont
from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QFrame
)

from app.services.translate_service import WordInfo


class WordPopup(QDialog):
    closed = Signal()

    def __init__(self, info: WordInfo, parent=None):
        super().__init__(parent)
        self.setObjectName("WordPopup")
        self.setWindowTitle("单词翻译")
        self.setModal(False)
        self.setWindowFlag(Qt.WindowType.FramelessWindowHint | Qt.WindowType.Tool)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self._build(info)

    def _build(self, info: WordInfo) -> None:
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        frame = QFrame()
        frame.setObjectName("WordPopup")
        outer.addWidget(frame)

        layout = QVBoxLayout(frame)
        layout.setContentsMargins(20, 16, 20, 16)
        layout.setSpacing(6)

        # 单词
        title = QLabel(info.word)
        title.setObjectName("WordTitle")
        layout.addWidget(title)

        # 音标
        if info.phonetic:
            ph = QLabel(info.phonetic)
            ph.setObjectName("WordPhonetic")
            layout.addWidget(ph)

        # 翻译
        if info.translation:
            tr = QLabel(f"译: {info.translation}")
            tr.setObjectName("WordTranslation")
            layout.addWidget(tr)

        # 例句
        if info.example:
            ex = QLabel(f"例: {info.example}")
            ex.setObjectName("WordExample")
            ex.setWordWrap(True)
            layout.addWidget(ex)

        # 按钮
        btn_row = QHBoxLayout()
        btn_row.setSpacing(8)
        speak_btn = QPushButton("🔊 朗读")
        speak_btn.setObjectName("SecondaryButton")
        speak_btn.clicked.connect(self._speak)
        btn_row.addWidget(speak_btn)
        btn_row.addStretch()
        close_btn = QPushButton("关闭")
        close_btn.setObjectName("SecondaryButton")
        close_btn.clicked.connect(self.close)
        btn_row.addWidget(close_btn)
        layout.addLayout(btn_row)

    def _speak(self) -> None:
        # 实际朗读由 ReaderPage 监听;此处仅触发信号可拓展
        self.closed.emit()

    def keyPressEvent(self, ev) -> None:  # noqa: N802
        if ev.key() == Qt.Key.Key_Escape:
            self.close()
        else:
            super().keyPressEvent(ev)
