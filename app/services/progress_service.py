"""阅读进度/勋章服务"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.core.database import session_scope
from app.core.logger import get_logger
from app.core.models import Book, Medal, ReadingProgress

log = get_logger(__name__)


# 勋章规则
MEDAL_RULES = {
    "first_book": {"name": "启蒙新星", "desc": "完成第一本绘本"},
    "five_books": {"name": "小书虫", "desc": "完成 5 本绘本"},
    "ten_books": {"name": "阅读达人", "desc": "完成 10 本绘本"},
    "first_word": {"name": "词汇新手", "desc": "查询第一个单词翻译"},
    "favorite_3": {"name": "收藏家", "desc": "收藏 3 本绘本"},
}


class ProgressService:
    @staticmethod
    def save_progress(user_id: int, book_id: int, last_page: int, completed: bool = False) -> None:
        with session_scope() as sess:
            stmt = select(ReadingProgress).where(
                ReadingProgress.user_id == user_id,
                ReadingProgress.book_id == book_id,
            )
            row = sess.scalar(stmt)
            if row is None:
                row = ReadingProgress(
                    user_id=user_id, book_id=book_id, last_page=last_page, completed=completed
                )
                sess.add(row)
            else:
                row.last_page = max(row.last_page, last_page)
                row.last_read_at = datetime.utcnow()
                if completed:
                    row.completed = True

    @staticmethod
    def get_progress(user_id: int, book_id: int) -> Optional[ReadingProgress]:
        with session_scope() as sess:
            return sess.scalar(
                select(ReadingProgress).where(
                    ReadingProgress.user_id == user_id,
                    ReadingProgress.book_id == book_id,
                )
            )

    @staticmethod
    def list_finished(user_id: int) -> list[Book]:
        with session_scope() as sess:
            stmt = (
                select(Book)
                .join(ReadingProgress, ReadingProgress.book_id == Book.id)
                .where(ReadingProgress.user_id == user_id, ReadingProgress.completed == True)  # noqa: E712
            )
            return list(sess.scalars(stmt).all())

    @staticmethod
    def grant_medal(user_id: int, code: str) -> bool:
        """返回是否新增勋章(True 表示首次获得)"""
        info = MEDAL_RULES.get(code)
        if not info:
            return False
        with session_scope() as sess:
            existing = sess.scalar(
                select(Medal).where(Medal.user_id == user_id, Medal.medal_code == code)
            )
            if existing:
                return False
            sess.add(Medal(user_id=user_id, medal_code=code, medal_name=info["name"]))
            log.info("授予勋章 [%s] %s", code, info["name"])
            return True

    @staticmethod
    def list_medals(user_id: int) -> list[Medal]:
        with session_scope() as sess:
            return list(
                sess.scalars(
                    select(Medal).where(Medal.user_id == user_id).order_by(Medal.earned_at.desc())
                ).all()
            )

    @staticmethod
    def check_and_grant_after_book(user_id: int) -> list[str]:
        """阅读完一本后,根据规则批量授予勋章,返回新增的 code 列表"""
        granted: list[str] = []
        finished = ProgressService.list_finished(user_id)
        n = len(finished)
        if n >= 1 and ProgressService.grant_medal(user_id, "first_book"):
            granted.append("first_book")
        if n >= 5 and ProgressService.grant_medal(user_id, "five_books"):
            granted.append("five_books")
        if n >= 10 and ProgressService.grant_medal(user_id, "ten_books"):
            granted.append("ten_books")
        return granted
