"""个人中心:用户信息/会员/进度/勋章/退出"""
from __future__ import annotations

from PySide6.QtCore import Qt, QSize, Signal
from PySide6.QtGui import QFont
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QFrame,
    QScrollArea, QGridLayout, QMessageBox,
)

from app.core.logger import get_logger
from app.core.models import Medal
from app.services.progress_service import ProgressService
from app.services.user_service import UserService
from app.ui.widgets.medal_widget import MedalCard

log = get_logger(__name__)


class ProfilePage(QWidget):
    logoutRequested = Signal()
    vipActivateRequested = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._build()
        self.refresh()

    def _build(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(20, 20, 20, 20)
        root.setSpacing(16)

        # 头部
        head = QHBoxLayout()
        self.nick_label = QLabel("未登录")
        self.nick_label.setStyleSheet("font-size:24px; font-weight:bold; color:#3B2C1E;")
        head.addWidget(self.nick_label)
        self.vip_label = QLabel("")
        self.vip_label.setStyleSheet(
            "background:#F0A03C; color:white; padding:4px 12px; border-radius:12px; font-weight:bold;"
        )
        head.addSpacing(8)
        head.addWidget(self.vip_label)
        head.addStretch()

        logout_btn = QPushButton("退出登录")
        logout_btn.setObjectName("SecondaryButton")
        logout_btn.clicked.connect(self._do_logout)
        head.addWidget(logout_btn)
        root.addLayout(head)

        # 邮箱
        self.email_label = QLabel("")
        self.email_label.setObjectName("StatusText")
        root.addWidget(self.email_label)

        # 数据
        stats = QHBoxLayout()
        self.finished_label = QLabel("已完成: 0")
        self.medals_label = QLabel("勋章: 0")
        self.words_label = QLabel("查词: 0")
        for lab in (self.finished_label, self.medals_label, self.words_label):
            lab.setStyleSheet("font-size:16px; color:#5C401B;")
            stats.addWidget(lab)
        stats.addStretch()

        vip_btn = QPushButton("✨ 激活 VIP(本地试用)")
        vip_btn.setObjectName("PrimaryButton")
        vip_btn.clicked.connect(self._do_activate_vip)
        stats.addWidget(vip_btn)
        root.addLayout(stats)

        # 勋章墙
        title = QLabel("🏅 我的勋章")
        title.setStyleSheet("font-size:18px; font-weight:bold; color:#3B2C1E; margin-top:8px;")
        root.addWidget(title)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setMinimumHeight(280)
        self.medal_host = QWidget()
        self.medal_grid = QGridLayout(self.medal_host)
        self.medal_grid.setSpacing(12)
        self.medal_grid.setAlignment(Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignLeft)
        scroll.setWidget(self.medal_host)
        root.addWidget(scroll, 1)

        # 提示
        tip = QLabel("完成绘本可获得勋章。点击'激活 VIP'可临时获得会员标识(本地测试用)。")
        tip.setStyleSheet("color:#8A734A; font-size:12px;")
        tip.setWordWrap(True)
        root.addWidget(tip)

    def refresh(self) -> None:
        sess = UserService.current()
        if sess is None:
            self.nick_label.setText("未登录")
            self.email_label.setText("")
            self.vip_label.setVisible(False)
            return
        self.nick_label.setText(f"👤 {sess.nickname}")
        self.email_label.setText(f"邮箱: {sess.email}")
        if sess.is_vip:
            exp = sess.vip_expire_at.strftime("%Y-%m-%d") if sess.vip_expire_at else "永久"
            self.vip_label.setText(f"VIP 至 {exp}")
            self.vip_label.setVisible(True)
        else:
            self.vip_label.setVisible(False)

        finished = ProgressService.list_finished(sess.user_id)
        medals = ProgressService.list_medals(sess.user_id)
        self.finished_label.setText(f"已完成: {len(finished)}")
        self.medals_label.setText(f"勋章: {len(medals)}")

        # 重新渲染勋章
        while self.medal_grid.count():
            it = self.medal_grid.takeAt(0)
            w = it.widget() if it else None
            if w is not None:
                w.setParent(None)
                w.deleteLater()
        for i, m in enumerate(medals):
            card = MedalCard(m)
            self.medal_grid.addWidget(card, i // 4, i % 4)

    def _do_logout(self) -> None:
        UserService().logout()
        self.logoutRequested.emit()

    def _do_activate_vip(self) -> None:
        sess = UserService.current()
        if not sess:
            return
        UserService().set_vip(sess.user_id, days=365)
        QMessageBox.information(self, "激活成功", "已为你激活 365 天 VIP(本地试用)。")
        self.refresh()
