"""绘本卡片模型 + 委托(QListView IconMode)"""
from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QSize, Qt, QAbstractListModel, QModelIndex
from PySide6.QtGui import QPixmap, QColor, QFont
from PySide6.QtWidgets import QStyledItemDelegate, QStyleOptionViewItem, QApplication

from app.services.book_service import BookSummary
from app import config


class BookListModel(QAbstractListModel):
    BookRole = Qt.ItemDataRole.UserRole + 1

    def __init__(self, books: list[BookSummary] | None = None, parent=None):
        super().__init__(parent)
        self._books: list[BookSummary] = books or []

    def set_books(self, books: list[BookSummary]) -> None:
        self.beginResetModel()
        self._books = books
        self.endResetModel()

    def rowCount(self, parent=QModelIndex()) -> int:  # noqa: B008
        return 0 if parent.isValid() else len(self._books)

    def data(self, index: QModelIndex, role: int = Qt.ItemDataRole.DisplayRole):
        if not index.isValid() or index.row() >= len(self._books):
            return None
        book = self._books[index.row()]
        if role == self.BookRole:
            return book
        if role == Qt.ItemDataRole.DisplayRole:
            return book.title
        if role == Qt.ItemDataRole.ToolTipRole:
            return book.description or book.title
        return None


class BookCardDelegate(QStyledItemDelegate):
    """在 QListView IconMode 下绘制绘本卡片"""

    CARD_W = 200
    CARD_H = 260

    def sizeHint(self, option: QStyleOptionViewItem, index: QModelIndex) -> QSize:  # noqa: D401
        return QSize(self.CARD_W, self.CARD_H)

    def paint(self, painter, option: QStyleOptionViewItem, index: QModelIndex) -> None:
        book: BookSummary = index.data(BookListModel.BookRole)
        if book is None:
            return

        painter.save()
        rect = option.rect

        # 背景卡片
        bg_color = QColor("#FFFFFF")
        if option.state & QStyleOptionViewItem.StateFlag.State_Selected:
            bg_color = QColor("#FFF1D6")
        painter.setBrush(bg_color)
        painter.setPen(QColor("#F0A03C") if option.state & QStyleOptionViewItem.StateFlag.State_Selected
                       else QColor("#F0C75A"))
        painter.drawRoundedRect(rect.adjusted(2, 2, -2, -2), 12, 12)

        # 封面图
        cover_rect = rect.adjusted(14, 14, -14, -120)
        cover_pix: QPixmap | None = None
        if book.cover_path:
            cp = Path(book.cover_path)
            if not cp.is_absolute():
                cp = config.ASSETS_DIR / book.cover_path
            if cp.exists():
                cover_pix = QPixmap(str(cp))
        if cover_pix is None:
            cover_pix = QPixmap(cover_rect.size())
            cover_pix.fill(QColor("#F0E0B0"))
        painter.drawPixmap(cover_rect, cover_pix.scaled(
            cover_rect.size(), Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        ))

        # 标题
        title_rect = rect.adjusted(14, cover_rect.height() + 18, -14, -60)
        painter.setPen(QColor("#3B2C1E"))
        f = QFont(option.font)
        f.setBold(True)
        f.setPointSize(11)
        painter.setFont(f)
        painter.drawText(title_rect, Qt.TextFlag.TextWordWrap, book.title)

        # 副信息(分类/年龄)
        sub_rect = rect.adjusted(14, title_rect.bottom() + 4, -14, -32)
        painter.setPen(QColor("#6B4A1F"))
        f2 = QFont(option.font)
        f2.setPointSize(9)
        painter.setFont(f2)
        sub = f"{book.category or ''} · {book.age_range or ''} · {book.total_pages}页"
        painter.drawText(sub_rect, Qt.TextFlag.TextSingleLine, sub)

        # VIP 角标
        if book.is_vip_only:
            vip_rect = rect.adjusted(rect.width() - 50, 8, -8, -rect.height() + 30)
            painter.setBrush(QColor("#F0A03C"))
            painter.setPen(Qt.PenStyle.NoPen)
            painter.drawRoundedRect(vip_rect, 6, 6)
            painter.setPen(QColor("white"))
            vf = QFont(option.font)
            vf.setBold(True)
            vf.setPointSize(8)
            painter.setFont(vf)
            painter.drawText(vip_rect, Qt.AlignmentFlag.AlignCenter, "VIP")

        painter.restore()
