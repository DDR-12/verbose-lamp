"""勋章 widget"""
from __future__ import annotations

from datetime import datetime

from PySide6.QtCore import Qt
from PySide6.QtGui import QPixmap, QColor, QFont
from PySide6.QtWidgets import QFrame, QVBoxLayout, QLabel

from app.core.models import Medal


class MedalCard(QFrame):
    def __init__(self, medal: Medal, parent=None):
        super().__init__(parent)
        self.setObjectName("MedalCard")
        self.setFixedSize(160, 180)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(10, 14, 10, 10)
        layout.setSpacing(4)
        layout.setAlignment(Qt.AlignmentFlag.AlignHCenter)

        # 圆形勋章占位
        pix = QPixmap(80, 80)
        pix.fill(Qt.GlobalColor.transparent)
        from PySide6.QtGui import QPainter, QBrush
        p = QPainter(pix)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        p.setBrush(QBrush(QColor("#F0A03C")))
        p.setPen(QColor("#C7711A"))
        p.drawEllipse(4, 4, 72, 72)
        p.setPen(QColor("white"))
        f = QFont()
        f.setBold(True)
        f.setPointSize(20)
        p.setFont(f)
        p.drawText(pix.rect(), Qt.AlignmentFlag.AlignCenter, "★")
        p.end()

        icon = QLabel()
        icon.setPixmap(pix)
        icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(icon)

        name = QLabel(medal.medal_name or medal.medal_code)
        name.setObjectName("MedalName")
        name.setAlignment(Qt.AlignmentFlag.AlignCenter)
        name.setWordWrap(True)
        layout.addWidget(name)

        if medal.earned_at:
            d = medal.earned_at.strftime("%Y-%m-%d")
            date = QLabel(d)
            date.setObjectName("MedalDate")
            date.setAlignment(Qt.AlignmentFlag.AlignCenter)
            layout.addWidget(date)
