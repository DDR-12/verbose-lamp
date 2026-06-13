"""阅读页(核心)"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from PySide6.QtCore import Qt, QPoint, QRectF, QTimer, Signal
from PySide6.QtGui import QPixmap, QPainter, QColor, QPen, QFont, QCursor
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QFrame,
    QGraphicsView, QGraphicsScene, QGraphicsPixmapItem, QGraphicsRectItem,
    QMessageBox, QSizePolicy,
)

from app.core.logger import get_logger
from app.services.audio_service import AudioMode, get_audio_service
from app.services.book_service import BookService, PageInfo
from app.services.progress_service import ProgressService
from app.services.translate_service import TranslateService
from app.services.user_service import UserService
from app.ui.widgets.audio_player import AudioPlayerBar
from app.ui.widgets.word_popup import WordPopup

log = get_logger(__name__)


class ReaderPage(QWidget):
    backRequested = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._service = BookService()
        self._audio = get_audio_service()
        self._book_id: Optional[int] = None
        self._book_title: str = ""
        self._pages: list[PageInfo] = []
        self._page_index: int = 0
        self._auto_page: bool = True
        self._auto_timer = QTimer(self)
        self._auto_timer.setSingleShot(True)
        self._auto_timer.timeout.connect(self._on_auto_next)
        self._word_popup: Optional[WordPopup] = None
        self._build()
        # 绑定音频服务信号
        self._audio.pageFinished.connect(self._on_audio_finished)
        self._audio.positionChanged.connect(self._on_position)
        self._audio.durationChanged.connect(self._on_duration)

    # ---- 构造 ----
    def _build(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(12, 12, 12, 12)
        root.setSpacing(10)

        # 顶部条
        top = QHBoxLayout()
        back_btn = QPushButton("◀ 返回")
        back_btn.setObjectName("SecondaryButton")
        back_btn.clicked.connect(self._go_back)
        top.addWidget(back_btn)

        self.title_label = QLabel("—")
        self.title_label.setObjectName("BookTitle")
        self.title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        top.addWidget(self.title_label, 1)

        self.auto_btn = QPushButton("自动翻页:开")
        self.auto_btn.setObjectName("ToggleButton")
        self.auto_btn.setCheckable(True)
        self.auto_btn.setChecked(True)
        self.auto_btn.clicked.connect(self._toggle_auto)
        top.addWidget(self.auto_btn)

        self.recite_btn = QPushButton("🎤 跟读")
        self.recite_btn.setObjectName("SecondaryButton")
        self.recite_btn.clicked.connect(self._on_recite)
        top.addWidget(self.recite_btn)

        root.addLayout(top)

        # 阅读区(图片 + 点读热区)
        reader_frame = QFrame()
        reader_frame.setObjectName("ReaderPage")
        reader_frame.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        rf_lay = QVBoxLayout(reader_frame)
        rf_lay.setContentsMargins(8, 8, 8, 8)

        self.scene = QGraphicsScene(self)
        self.view = QGraphicsView(self.scene)
        self.view.setRenderHint(QPainter.RenderHint.Antialiasing)
        self.view.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
        self.view.setStyleSheet("background: #1A140E; border: none;")
        self.view.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.view.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.view.mousePressEvent = self._on_view_press
        self.view.wheelEvent = self._on_view_wheel
        self.pixmap_item = QGraphicsPixmapItem()
        self.scene.addItem(self.pixmap_item)
        rf_lay.addWidget(self.view, 1)

        # 文字层(英文/中文,放在图片下方)
        self.text_en_label = QLabel("")
        self.text_en_label.setStyleSheet(
            "color:#FFE9B8; font-size:18px; padding:8px 12px; background:rgba(0,0,0,0.4); border-radius:8px;"
        )
        self.text_en_label.setWordWrap(True)
        self.text_en_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.text_cn_label = QLabel("")
        self.text_cn_label.setStyleSheet(
            "color:#FFD986; font-size:14px; padding:4px 12px; background:rgba(0,0,0,0.3); border-radius:6px;"
        )
        self.text_cn_label.setWordWrap(True)
        self.text_cn_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        rf_lay.addWidget(self.text_en_label)
        rf_lay.addWidget(self.text_cn_label)

        root.addWidget(reader_frame, 1)

        # 翻页 + 进度
        nav = QHBoxLayout()
        nav.setSpacing(10)
        self.prev_btn = QPushButton("◀ 上一页")
        self.prev_btn.setObjectName("PageNavButton")
        self.prev_btn.clicked.connect(self.prev_page)
        nav.addWidget(self.prev_btn)

        self.page_label = QLabel("0/0")
        self.page_label.setObjectName("StatusText")
        self.page_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.page_label.setMinimumWidth(80)
        nav.addWidget(self.page_label)

        self.next_btn = QPushButton("下一页 ▶")
        self.next_btn.setObjectName("PageNavButton")
        self.next_btn.clicked.connect(self.next_page)
        nav.addWidget(self.next_btn)

        root.addLayout(nav)

        # 音频条
        self.audio_bar = AudioPlayerBar()
        self.audio_bar.modeChanged.connect(self._on_audio_mode_changed)
        root.addWidget(self.audio_bar)

    # ---- 加载 ----
    def load_book(self, book_id: int) -> None:
        self._book_id = book_id
        book = self._service.get_book(book_id)
        if not book:
            QMessageBox.warning(self, "错误", "未找到该绘本")
            self.backRequested.emit()
            return
        self._book_title = book.title
        self.title_label.setText(book.title)
        self._pages = self._service.list_pages(book_id)
        if not self._pages:
            QMessageBox.warning(self, "错误", "该绘本没有可读页面")
            self.backRequested.emit()
            return

        # 续读进度
        sess = UserService.current()
        if sess:
            prog = ProgressService.get_progress(sess.user_id, book_id)
            if prog and prog.last_page < len(self._pages):
                self._page_index = prog.last_page
            else:
                self._page_index = 0
        else:
            self._page_index = 0
        self._show_current_page()
        self._auto_play_current()

    # ---- 页面渲染 ----
    def _show_current_page(self) -> None:
        if not self._pages:
            return
        page = self._pages[self._page_index]
        # 图片
        if page.image_path and Path(page.image_path).exists():
            pix = QPixmap(str(page.image_path))
        else:
            pix = QPixmap(800, 600)
            pix.fill(QColor("#2A2018"))
        self.pixmap_item.setPixmap(
            pix.scaled(
                self.view.viewport().size(),
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation,
            )
        )
        self.scene.setSceneRect(QRectF(self.pixmap_item.pixmap().rect()))
        self.view.fitInView(self.scene.sceneRect(), Qt.AspectRatioMode.KeepAspectRatio)

        # 文字
        self.text_en_label.setText(page.text_en or "")
        self.text_cn_label.setText(page.text_cn or "")

        # 计数
        self.page_label.setText(f"{self._page_index + 1}/{len(self._pages)}")
        self.prev_btn.setEnabled(self._page_index > 0)
        self.next_btn.setEnabled(self._page_index < len(self._pages) - 1)

        # 保存进度
        sess = UserService.current()
        if sess and self._book_id is not None:
            ProgressService.save_progress(sess.user_id, self._book_id, self._page_index)
        # 绘制点读热区(可视化)
        self._draw_word_boxes(page)

    def _draw_word_boxes(self, page: PageInfo) -> None:
        # 清理旧热区
        for item in list(self.scene.items()):
            if isinstance(item, QGraphicsRectItem):
                self.scene.removeItem(item)
        if self._book_id is None:
            return
        words = self._service.list_words(self._book_id, page.index)
        for w in words:
            if w.bbox_x is None or w.bbox_y is None:
                continue
            rect = QRectF(
                w.bbox_x * self.pixmap_item.pixmap().width(),
                w.bbox_y * self.pixmap_item.pixmap().height(),
                (w.bbox_w or 0.1) * self.pixmap_item.pixmap().width(),
                (w.bbox_h or 0.1) * self.pixmap_item.pixmap().height(),
            )
            item = QGraphicsRectItem(rect)
            pen = QPen(QColor(240, 160, 60, 80))
            pen.setWidth(2)
            item.setPen(pen)
            item.setBrush(QColor(240, 160, 60, 30))
            item.setData(0, w.word)
            self.scene.addItem(item)

    def resizeEvent(self, ev) -> None:  # noqa: N802
        super().resizeEvent(ev)
        if self.pixmap_item.pixmap() and not self.pixmap_item.pixmap().isNull():
            self.view.fitInView(self.scene.sceneRect(), Qt.AspectRatioMode.KeepAspectRatio)

    # ---- 翻页 ----
    def next_page(self) -> None:
        if self._page_index < len(self._pages) - 1:
            self._page_index += 1
            self._show_current_page()
            self._auto_play_current()

    def prev_page(self) -> None:
        if self._page_index > 0:
            self._page_index -= 1
            self._show_current_page()
            self._auto_play_current()

    def _on_auto_next(self) -> None:
        if self._auto_page:
            if self._page_index < len(self._pages) - 1:
                self.next_page()
            else:
                # 阅读完成
                self._on_book_finished()

    def _auto_play_current(self) -> None:
        if not self._pages:
            return
        page = self._pages[self._page_index]
        path = self._pick_audio_path(page)
        if path and Path(path).exists():
            self._audio.play(Path(path))
        else:
            # 无音频 → 用 duration_ms 做静默自动翻页
            self._auto_timer.start(max(500, page.duration_ms))

    def _on_audio_finished(self) -> None:
        if self._auto_page:
            self._auto_timer.start(300)
            self._on_auto_next()

    def _on_book_finished(self) -> None:
        sess = UserService.current()
        if not sess or self._book_id is None:
            return
        ProgressService.save_progress(sess.user_id, self._book_id, self._page_index, completed=True)
        granted = ProgressService.check_and_grant_after_book(sess.user_id)
        if granted:
            names = "、".join(g.replace("_book", "").replace("_", "") for g in granted)
            QMessageBox.information(self, "🎉 获得勋章", f"恭喜!你获得了新勋章: {names}")

    def _on_position(self, pos_ms: int) -> None:
        dur = self._pages[self._page_index].duration_ms if self._pages else 0
        self.audio_bar.bind_position(pos_ms, dur)

    def _on_duration(self, dur_ms: int) -> None:
        self.audio_bar.update_duration(dur_ms)

    # ---- 音频模式 ----
    def _pick_audio_path(self, page: PageInfo) -> Optional[Path]:
        m = self._audio.mode
        if m == AudioMode.READ:
            return page.audio_read_path
        if m == AudioMode.SONG:
            return page.audio_song_path
        if m == AudioMode.FOLLOW:
            return page.audio_follow_path
        return page.audio_read_path

    def _on_audio_mode_changed(self, _mode: str) -> None:
        if self._pages:
            self._auto_play_current()

    def _toggle_auto(self) -> None:
        self._auto_page = self.auto_btn.isChecked()
        self.auto_btn.setText(f"自动翻页:{'开' if self._auto_page else '关'}")
        if not self._auto_page:
            self._auto_timer.stop()

    # ---- 点读 ----
    def _on_view_press(self, ev) -> None:
        if ev.button() == Qt.MouseButton.LeftButton:
            scene_pos = self.view.mapToScene(ev.position().toPoint())
            # 命中热区?
            for item in self.scene.items(scene_pos):
                if isinstance(item, QGraphicsRectItem):
                    word = item.data(0)
                    if word:
                        self._on_word_clicked(word, scene_pos)
                        return
            # 翻页:点击图片左半 = 上一页,右半 = 下一页
            rect = self.view.viewport().rect()
            if ev.position().x() < rect.width() / 2:
                self.prev_page()
            else:
                self.next_page()

    def _on_view_wheel(self, ev) -> None:
        if ev.angleDelta().y() > 0:
            self.prev_page()
        else:
            self.next_page()

    def _on_word_clicked(self, word: str, scene_pos: QPoint) -> None:
        if self._book_id is None or not self._pages:
            return
        page = self._pages[self._page_index]
        info = TranslateService.lookup_in_book(word, self._book_id, page.index)
        if not info:
            QMessageBox.information(self, "未找到", f"未找到单词: {word}")
            return
        # 播放点读音
        if info.audio_path:
            ap = Path(info.audio_path)
            if not ap.is_absolute():
                from app import config
                ap = config.ASSETS_DIR / info.audio_path
            if ap.exists():
                self._audio.play_word(ap)
        # 弹窗
        if self._word_popup is not None:
            self._word_popup.close()
        self._word_popup = WordPopup(info, self)
        global_pos = self.view.mapToGlobal(self.view.mapFromScene(scene_pos))
        self._word_popup.move(global_pos + QPoint(20, 20))
        self._word_popup.show()

        # 触发勋章
        sess = UserService.current()
        if sess:
            ProgressService.grant_medal(sess.user_id, "first_word")

    # ---- 跟读(占位) ----
    def _on_recite(self) -> None:
        sess = UserService.current()
        if not sess or self._book_id is None:
            return
        from app.services.record_service import RecordService
        RecordService.start(sess.user_id, self._book_id, self._page_index)
        QMessageBox.information(self, "跟读", "录音已开始(占位实现)。\n实际录音功能依赖 pyaudio。")

    def _go_back(self) -> None:
        self._audio.stop()
        self._auto_timer.stop()
        self.backRequested.emit()
