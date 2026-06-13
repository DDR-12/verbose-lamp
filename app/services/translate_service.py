"""翻译服务:本地词库 + 数据库兜底"""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import select

from app import config
from app.core.database import session_scope
from app.core.logger import get_logger
from app.core.models import Word

log = get_logger(__name__)


@dataclass
class WordInfo:
    word: str
    phonetic: Optional[str] = None
    translation: Optional[str] = None
    example: Optional[str] = None
    audio_path: Optional[str] = None


class TranslateService:
    _cache: dict[str, WordInfo] = {}

    @classmethod
    def load_cache(cls) -> None:
        if cls._cache:
            return
        path = config.WORD_DICT_JSON
        if not path.exists():
            log.warning("未找到词库 %s,翻译将仅依赖 DB", path)
            return
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for k, v in data.items():
            cls._cache[k.lower()] = WordInfo(
                word=k,
                phonetic=v.get("phonetic"),
                translation=v.get("translation"),
                example=v.get("example"),
            )
        log.info("本地词库已加载: %d 条", len(cls._cache))

    @classmethod
    def lookup(cls, word: str) -> Optional[WordInfo]:
        word = (word or "").strip().lower()
        if not word:
            return None
        if not cls._cache:
            cls.load_cache()
        if word in cls._cache:
            return cls._cache[word]
        # 兜底查 DB(words 表)
        with session_scope() as sess:
            row = sess.scalar(select(Word).where(Word.word == word))
            if row:
                return WordInfo(
                    word=row.word,
                    phonetic=row.phonetic,
                    translation=row.translation,
                    example=row.example_sentence,
                    audio_path=row.audio_path,
                )
        return None

    @classmethod
    def lookup_in_book(cls, word: str, book_id: int, page_index: int) -> Optional[WordInfo]:
        """优先查当前书页词库"""
        word = (word or "").strip().lower()
        with session_scope() as sess:
            stmt = select(Word).where(
                Word.book_id == book_id, Word.page_index == page_index
            )
            for row in sess.scalars(stmt):
                if row.word.lower() == word:
                    return WordInfo(
                        word=row.word,
                        phonetic=row.phonetic,
                        translation=row.translation,
                        example=row.example_sentence,
                        audio_path=row.audio_path,
                    )
        return cls.lookup(word)
