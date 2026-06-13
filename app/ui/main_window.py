"""主窗口:左侧导航 + 右侧 QStackedWidget 切换 4 个页面"""
from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtGui import QFont, QIcon, QKeySequence, QShortcut
from PySide6.QtWidgets import (
    QMainWindow, QFrame, QStackedWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QWidget, QLabel, QButtonGroup, QStatusBar, QMessageBox
)

from app import config
from app.core.logger import get_logger
from app.services.user_service import UserService
from app.ui.pages.library_page import LibraryPage
from app.ui.pages.login_page import LoginPage
from app.ui.pages.profile_page import ProfilePage
from app.ui.pages.reader_page import ReaderPage

log = get_logger(__name__)


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle(config.WINDOW_TITLE)
        self.resize(*config.DEFAULT_WINDOW_SIZE)
        self.setMinimumSize(*config.WINDOW_MIN_SIZE)

        self._current_user_label: QLabel | None = None
        self._build()
        self._install_shortcuts()

        # 状态:未登录 → 显示登录页
        if UserService.current() is None:
            self._nav_buttons[0].setEnabled(False)
            self._nav_buttons[1].setEnabled(False)
            self._nav_buttons[2].setEnabled(False)
            self.stack.setCurrentWidget(self.login_page)

    # ---- UI ----
    def _build(self) -> None:
        central = QWidget()
        self.setCentralWidget(central)
        root = QHBoxLayout(central)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # 左侧导航
        sidebar = QFrame()
        sidebar.setObjectName("Sidebar")
        sidebar.setFixedWidth(200)
        sl = QVBoxLayout(sidebar)
        sl.setContentsMargins(8, 24, 8, 12)
        sl.setSpacing(6)

        logo = QLabel("📚 EBR")
        logo.setStyleSheet(
            "font-size:24px; font-weight:bold; color:#F0A03C; padding:0 8px 12px 8px;"
        )
        sl.addWidget(logo)

        self._nav_group = QButtonGroup(self)
        self._nav_group.setExclusive(True)
        self._nav_buttons: list[QPushButton] = []
        for i, (text, _) in enumerate(
            (("📖 绘本库", "library"), ("👤 我的", "profile"), ("🔍 搜索", "library"))
        ):
            btn = QPushButton(text)
            btn.setObjectName("NavButton")
            btn.setCheckable(True)
            btn.clicked.connect(lambda _=False, idx=i: self._nav_to(idx))
            self._nav_group.addButton(btn)
            self._nav_buttons.append(btn)
            sl.addWidget(btn)

        sl.addStretch()

        # 用户信息
        user_box = QFrame()
        user_box.setStyleSheet(
            "background:#FFF1D6; border-radius:8px; padding:8px;"
        )
        ul = QVBoxLayout(user_box)
        ul.setContentsMargins(8, 8, 8, 8)
        ul.setSpacing(2)
        self._current_user_label = QLabel("未登录")
        self._current_user_label.setStyleSheet("font-weight:bold; color:#3B2C1E;")
        ul.addWidget(self._current_user_label)
        self._role_label = QLabel("")
        self._role_label.setStyleSheet("font-size:11px; color:#6B4A1F;")
        ul.addWidget(self._role_label)
        sl.addWidget(user_box)

        root.addWidget(sidebar)

        # 右侧 stacked
        self.stack = QStackedWidget()
        self.login_page = LoginPage()
        self.library_page = LibraryPage()
        self.profile_page = ProfilePage()
        self.reader_page = ReaderPage()

        self.login_page.loginSucceeded.connect(self._on_login_ok)
        self.library_page.bookSelected.connect(self._open_book)
        self.profile_page.logoutRequested.connect(self._on_logout)
        self.reader_page.backRequested.connect(self._back_to_library)

        for w in (self.login_page, self.library_page, self.profile_page, self.reader_page):
            self.stack.addWidget(w)
        root.addWidget(self.stack, 1)

        # 状态栏
        self.setStatusBar(QStatusBar())
        self.statusBar().showMessage("就绪")

    def _install_shortcuts(self) -> None:
        QShortcut(QKeySequence("F11"), self, self._toggle_fullscreen)
        QShortcut(QKeySequence("Ctrl+Q"), self, self.close)
        QShortcut(QKeySequence("Left"), self, lambda: self.reader_page.prev_page())
        QShortcut(QKeySequence("Right"), self, lambda: self.reader_page.next_page())

    # ---- 导航 ----
    def _nav_to(self, idx: int) -> None:
        if idx == 0:
            self.stack.setCurrentWidget(self.library_page)
        elif idx == 1:
            self.stack.setCurrentWidget(self.profile_page)
            self.profile_page.refresh()
        else:
            # 搜索:切到 library 并聚焦搜索框
            self.stack.setCurrentWidget(self.library_page)
            self.library_page.search_edit.setFocus()

    def _open_book(self, book_id: int) -> None:
        if UserService.current() is None:
            self.stack.setCurrentWidget(self.login_page)
            return
        self.reader_page.load_book(book_id)
        self.stack.setCurrentWidget(self.reader_page)
        for btn in self._nav_buttons:
            btn.setChecked(False)

    def _back_to_library(self) -> None:
        self.stack.setCurrentWidget(self.library_page)
        self._nav_buttons[0].setChecked(True)
        self.library_page._refresh_books()

    # ---- 用户状态 ----
    def _on_login_ok(self) -> None:
        for btn in self._nav_buttons:
            btn.setEnabled(True)
        sess = UserService.current()
        if sess:
            self._current_user_label.setText(sess.nickname)
            self._role_label.setText("VIP 用户" if sess.is_vip else "普通用户")
        self.stack.setCurrentWidget(self.library_page)
        self._nav_buttons[0].setChecked(True)
        self.statusBar().showMessage(f"欢迎,{sess.nickname if sess else '游客'}!", 3000)

    def _on_logout(self) -> None:
        self._current_user_label.setText("未登录")
        self._role_label.setText("")
        for btn in self._nav_buttons:
            btn.setEnabled(False)
        self.stack.setCurrentWidget(self.login_page)
        self.statusBar().showMessage("已退出", 2000)

    # ---- 杂项 ----
    def _toggle_fullscreen(self) -> None:
        if self.isFullScreen():
            self.showNormal()
        else:
            self.showFullScreen()

    def closeEvent(self, ev) -> None:  # noqa: N802
        if QMessageBox.question(self, "退出", "确定要退出吗?") == QMessageBox.StandardButton.Yes:
            ev.accept()
        else:
            ev.ignore()
