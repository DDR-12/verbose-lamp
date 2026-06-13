"""登录页(支持游客一键登录 / 注册 / 普通登录)"""
from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QPushButton,
    QFrame, QMessageBox,
)

from app.core.logger import get_logger
from app.services.user_service import UserService

log = get_logger(__name__)


class LoginPage(QWidget):
    loginSucceeded = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._users = UserService()
        self._build()

    def _build(self) -> None:
        outer = QVBoxLayout(self)
        outer.setAlignment(Qt.AlignmentFlag.AlignCenter)

        card = QFrame()
        card.setObjectName("WordPopup")
        card.setFixedSize(440, 460)
        outer.addWidget(card)

        v = QVBoxLayout(card)
        v.setContentsMargins(30, 30, 30, 30)
        v.setSpacing(12)

        title = QLabel("📚 English Book Reader")
        title.setStyleSheet("font-size:26px; font-weight:bold; color:#F0A03C;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        v.addWidget(title)

        sub = QLabel("本地英语绘本学习")
        sub.setStyleSheet("color:#6B4A1F;")
        sub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        v.addWidget(sub)

        v.addSpacing(8)

        self.email_edit = QLineEdit()
        self.email_edit.setPlaceholderText("邮箱")
        self.email_edit.setText("guest@local")
        v.addWidget(self.email_edit)

        self.pw_edit = QLineEdit()
        self.pw_edit.setPlaceholderText("密码")
        self.pw_edit.setEchoMode(QLineEdit.EchoMode.Password)
        self.pw_edit.setText("guest123")
        v.addWidget(self.pw_edit)

        v.addSpacing(8)

        login_btn = QPushButton("登录")
        login_btn.setObjectName("PrimaryButton")
        login_btn.clicked.connect(self._do_login)
        v.addWidget(login_btn)

        reg_btn = QPushButton("注册新账户")
        reg_btn.setObjectName("SecondaryButton")
        reg_btn.clicked.connect(self._do_register)
        v.addWidget(reg_btn)

        v.addSpacing(6)

        guest_btn = QPushButton("🎈 游客一键体验")
        guest_btn.setObjectName("SecondaryButton")
        guest_btn.clicked.connect(self._do_guest)
        v.addWidget(guest_btn)

        hint = QLabel("提示:首次启动可使用游客账户,无需注册。")
        hint.setStyleSheet("color:#8A734A; font-size:12px;")
        hint.setAlignment(Qt.AlignmentFlag.AlignCenter)
        hint.setWordWrap(True)
        v.addWidget(hint)

    # ---- 槽 ----
    def _do_login(self) -> None:
        try:
            sess = self._users.login(self.email_edit.text().strip(), self.pw_edit.text())
            self._users.login_as(sess)
            self.loginSucceeded.emit()
        except Exception as e:  # noqa: BLE001
            QMessageBox.warning(self, "登录失败", str(e))

    def _do_register(self) -> None:
        email = self.email_edit.text().strip()
        pw = self.pw_edit.text()
        if "@" not in email or len(pw) < 6:
            QMessageBox.warning(self, "注册失败", "邮箱格式错误或密码太短(>=6 位)")
            return
        try:
            sess = self._users.register(email, pw)
            self._users.login_as(sess)
            self.loginSucceeded.emit()
        except Exception as e:  # noqa: BLE001
            QMessageBox.warning(self, "注册失败", str(e))

    def _do_guest(self) -> None:
        sess = self._users.login_guest()
        self._users.login_as(sess)
        self.loginSucceeded.emit()
