"""绘本服务:分类/搜索/详情/页/词"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app import config
from app.core.database import session_scope
from app.core.logger import get_logger
from app.core.models import Book, BookPage, Word

log = get_logger(__name__)


@dataclass
class BookSummary:
    id: int
    title: str
    title_en: Optional[str]
    category: Optional[str]
    age_range: Optional[str]
    difficulty: int
    cover_path: Optional[str]
    total_pages: int
    description: Optional[str]
    is_vip_only: bool


@dataclass
class PageInfo:
    index: int
    image_path: Path
    text_en: Optional[str]
    text_cn: Optional[str]
    audio_read_path: Optional[Path]
    audio_song_path: Optional[Path]
    audio_follow_path: Optional[Path]
    duration_ms: int


def _resolve(p: Optional[str]) -> Optional[Path]:
    if not p:
        return None
    # 绝对路径/相对 assets 的路径都解析
    candidate = Path(p)
    if not candidate.is_absolute():
        candidate = config.ASSETS_DIR / p
    return candidate


def _resolve_image(p: Optional[str]) -> Optional[Path]:
    path = _resolve(p)
    if path is None:
        return None
    if not path.exists():
        # 资源缺失时返回 None
        return None
    return path


def _resolve_audio(p: Optional[str]) -> Optional[Path]:
    path = _resolve(p)
    if path is None:
        return None
    if not path.exists():
        return None
    return path


class BookService:
    @staticmethod
    def list_categories() -> list[str]:
        """返回所有不重复的分类"""
        with session_scope() as sess:
            rows = sess.scalars(select(Book.category).distinct()).all()
        cats = [c for c in rows if c]
        # 固定顺序
        order = ["经典绘本", "牛津阅读树", "兰登", "廖彩杏", "I can read", "海尼曼", "国学"]
        head = [c for c in order if c in cats]
        tail = [c for c in cats if c not in order]
        return head + tail

    @staticmethod
    def list_books(category: Optional[str] = None, keyword: Optional[str] = None) -> list[BookSummary]:
        with session_scope() as sess:
            stmt = select(Book).order_by(Book.id)
            if category:
                stmt = stmt.where(Book.category == category)
            books = sess.scalars(stmt).all()
        result = []
        kw = (keyword or "").strip().lower()
        for b in books:
            if kw:
                hay = f"{b.title} {b.title_en or ''}".lower()
                if kw not in hay:
                    continue
            result.append(
                BookSummary(
                    id=b.id,
                    title=b.title,
                    title_en=b.title_en,
                    category=b.category,
                    age_range=b.age_range,
                    difficulty=b.difficulty,
                    cover_path=b.cover_path,
                    total_pages=b.total_pages,
                    description=b.description,
                    is_vip_only=b.is_vip_only,
                )
            )
        return result

    @staticmethod
    def get_book(book_id: int) -> Optional[Book]:
        with session_scope() as sess:
            stmt = select(Book).options(selectinload(Book.pages)).where(Book.id == book_id)
            return sess.scalar(stmt)

    @staticmethod
    def list_pages(book_id: int) -> list[PageInfo]:
        with session_scope() as sess:
            stmt = (
                select(BookPage)
                .where(BookPage.book_id == book_id)
                .order_by(BookPage.page_index)
            )
            pages = sess.scalars(stmt).all()
        return [
            PageInfo(
                index=p.page_index,
                image_path=_resolve_image(p.image_path) or _placeholder_image(book_id, p.page_index),
                text_en=p.text_en,
                text_cn=p.text_cn,
                audio_read_path=_resolve_audio(p.audio_read_path),
                audio_song_path=_resolve_audio(p.audio_song_path),
                audio_follow_path=_resolve_audio(p.audio_follow_path),
                duration_ms=p.duration_ms,
            )
            for p in pages
        ]

    @staticmethod
    def list_words(book_id: int, page_index: Optional[int] = None) -> list[Word]:
        with session_scope() as sess:
            stmt = select(Word).where(Word.book_id == book_id)
            if page_index is not None:
                stmt = stmt.where(Word.page_index == page_index)
            return list(sess.scalars(stmt).all())


def _placeholder_image(book_id: int, page_index: int) -> Path:
    """图片缺失时返回占位图(首次使用时用 PIL 动态生成)"""
    placeholder = config.IMAGES_DIR / "_placeholder" / f"book{book_id}_p{page_index}.png"
    if not placeholder.exists():
        placeholder.parent.mkdir(parents=True, exist_ok=True)
        try:
            from PIL import Image, ImageDraw, ImageFont

            img = Image.new("RGB", (1024, 768), color=(245, 234, 215))
            draw = ImageDraw.Draw(img)
            try:
                font = ImageFont.truetype(
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 56
                )
            except Exception:  # noqa: BLE001
                font = ImageFont.load_default()
            draw.rectangle([(20, 20), (1004, 748)], outline=(204, 145, 65), width=6)
            draw.text((80, 320), f"Book {book_id}", fill=(80, 60, 30), font=font)
            draw.text((80, 400), f"Page {page_index}", fill=(120, 90, 50), font=font)
            img.save(placeholder)
        except Exception as e:  # noqa: BLE001
            log.warning("生成占位图失败: %s", e)
    return placeholder
