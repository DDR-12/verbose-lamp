"""ORM 模型定义(对应计划文档中的 schema)"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nickname: Mapped[Optional[str]] = mapped_column(String(64))
    is_vip: Mapped[bool] = mapped_column(Boolean, default=False)
    vip_expire_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    title_en: Mapped[Optional[str]] = mapped_column(String(255))
    cover_path: Mapped[Optional[str]] = mapped_column(String(512))
    category: Mapped[Optional[str]] = mapped_column(String(64))
    age_range: Mapped[Optional[str]] = mapped_column(String(16))
    difficulty: Mapped[int] = mapped_column(Integer, default=1)
    total_pages: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[Optional[str]] = mapped_column(Text)
    resource_dir: Mapped[Optional[str]] = mapped_column(String(512))
    is_vip_only: Mapped[bool] = mapped_column(Boolean, default=False)

    pages: Mapped[list["BookPage"]] = relationship(
        "BookPage", back_populates="book", cascade="all, delete-orphan"
    )


class BookPage(Base):
    __tablename__ = "book_pages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), nullable=False)
    page_index: Mapped[int] = mapped_column(Integer, nullable=False)
    image_path: Mapped[str] = mapped_column(String(512), nullable=False)
    text_en: Mapped[Optional[str]] = mapped_column(Text)
    text_cn: Mapped[Optional[str]] = mapped_column(Text)
    audio_read_path: Mapped[Optional[str]] = mapped_column(String(512))
    audio_song_path: Mapped[Optional[str]] = mapped_column(String(512))
    audio_follow_path: Mapped[Optional[str]] = mapped_column(String(512))
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)

    book: Mapped[Book] = relationship("Book", back_populates="pages")


class Word(Base):
    __tablename__ = "words"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), nullable=False)
    page_index: Mapped[Optional[int]] = mapped_column(Integer)
    word: Mapped[str] = mapped_column(String(128), nullable=False)
    phonetic: Mapped[Optional[str]] = mapped_column(String(64))
    translation: Mapped[Optional[str]] = mapped_column(String(255))
    example_sentence: Mapped[Optional[str]] = mapped_column(Text)
    bbox_x: Mapped[Optional[float]] = mapped_column(Float)
    bbox_y: Mapped[Optional[float]] = mapped_column(Float)
    bbox_w: Mapped[Optional[float]] = mapped_column(Float)
    bbox_h: Mapped[Optional[float]] = mapped_column(Float)
    audio_path: Mapped[Optional[str]] = mapped_column(String(512))


class ReadingProgress(Base):
    __tablename__ = "reading_progress"
    __table_args__ = (UniqueConstraint("user_id", "book_id", name="uq_user_book"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), nullable=False)
    last_page: Mapped[int] = mapped_column(Integer, default=0)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    last_read_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "book_id", name="uq_fav_user_book"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Medal(Base):
    __tablename__ = "medals"
    __table_args__ = (UniqueConstraint("user_id", "medal_code", name="uq_medal"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    medal_code: Mapped[str] = mapped_column(String(64), nullable=False)
    medal_name: Mapped[Optional[str]] = mapped_column(String(128))
    earned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Recording(Base):
    __tablename__ = "recordings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), nullable=False)
    page_index: Mapped[int] = mapped_column(Integer)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
