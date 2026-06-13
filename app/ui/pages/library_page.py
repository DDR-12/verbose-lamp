"""绘本库页:左侧分类 + 右侧网格 + 搜索"""
from __future__ import annotations

from PySide6.QtCore import Qt, QSize, Signal
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import (
    QWidget, QHBoxLayout, QVBoxLayout, QListWidget, QListView, QLineEdit,
    QLabel, QStackedWidget, QFrame, QPushButton,
)

from app.core.logger import get_logger
from app.services.book_service import BookService, BookSummary
from app.ui.widgets.book_card import BookListModel, BookCardDelegate

log = get_logger(__name__)


class LibraryPage(QWidget):
    bookSelected = Signal(int)  # book_id

    def __init__(self, parent=None):
        super().__init__(parent)
        self._service = BookService()
        self._current_category: str | None = None
        self._keyword: str = ""
        self._build()
        self._load_categories()
        self._refresh_books()

    def _build(self) -> None:
        root = QHBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # 左侧分类
        sidebar = QFrame()
        sidebar.setObjectName("Sidebar")
        sidebar.setFixedWidth(220)
        sl = QVBoxLayout(sidebar)
        sl.setContentsMargins(12, 20, 12, 12)
        sl.setSpacing(8)

        title = QLabel("分类")
        title.setStyleSheet("font-size:18px; font-weight:bold; color:#5C401B; padding:4px 8px;")
        sl.addWidget(title)

        self.cat_list = QListWidget()
        self.cat_list.setObjectName("CategoryList")
        self.cat_list.itemSelectionChanged.connect(self._on_category_changed)
        sl.addWidget(self.cat_list, 1)

        root.addWidget(sidebar)

        # 右侧
        right = QWidget()
        rl = QVBoxLayout(right)
        rl.setContentsMargins(20, 16, 20, 16)
        rl.setSpacing(12)

        # 顶部条
        top = QHBoxLayout()
        top.setSpacing(12)
        page_title = QLabel("📚 绘本库")
        page_title.setStyleSheet("font-size:22px; font-weight:bold; color:#3B2C1E;")
        top.addWidget(page_title)
        top.addStretch()

        self.search_edit = QLineEdit()
        self.search_edit.setPlaceholderText("🔍 搜索绘本(支持中英文)")
        self.search_edit.setFixedWidth(320)
        self.search_edit.textChanged.connect(self._on_search_changed)
        top.addWidget(self.search_edit)

        rl.addLayout(top)

        # 网格
        self.grid = QListView()
        self.grid.setObjectName("BookGrid")
        self.grid.setViewMode(QListView.ViewMode.IconMode)
        self.grid.setIconSize(QSize(180, 200))
        self.grid.setResizeMode(QListView.ResizeMode.Adjust)
        self.grid.setGridSize(QSize(220, 280))
        self.grid.setMovement(QListView.Movement.Static)
        self.grid.setSpacing(14)
        self.grid.setUniformItemSizes(True)
        self.grid.doubleClicked.connect(self._on_double_clicked)

        self.model = BookListModel()
        self.grid.setModel(self.model)
        self.delegate = BookCardDelegate()
        self.grid.setItemDelegate(self.delegate)

        rl.addWidget(self.grid, 1)

        # 状态
        self.status_label = QLabel("")
        self.status_label.setObjectName("StatusText")
        rl.addWidget(self.status_label)

        root.addWidget(right, 1)

    def _load_categories(self) -> None:
        self.cat_list.addItem(QListWidgetItem_All())
        for cat in self._service.list_categories():
            item = QListWidgetItem_Cat(cat)
            self.cat_list.addItem(item)
        self.cat_list.setCurrentRow(0)

    def _on_category_changed(self) -> None:
        item = self.cat_list.currentItem()
        if item is None:
            return
        self._current_category = getattr(item, "category", None)
        self._refresh_books()

    def _on_search_changed(self, text: str) -> None:
        self._keyword = text
        self._refresh_books()

    def _refresh_books(self) -> None:
        books = self._service.list_books(self._current_category, self._keyword)
        self.model.set_books(books)
        self.status_label.setText(f"共 {len(books)} 本绘本")

    def _on_double_clicked(self, index) -> None:
        book: BookSummary = index.data(BookListModel.BookRole)
        if book is not None:
            self.bookSelected.emit(book.id)


# ---- 分类列表项 ----
from PySide6.QtWidgets import QListWidgetItem  # noqa: E402


class QListWidgetItem_All(QListWidgetItem):
    def __init__(self):
        super().__init__("全部")
        self.category = None


class QListWidgetItem_Cat(QListWidgetItem):
    def __init__(self, cat: str):
        super().__init__(cat)
        self.category = cat
