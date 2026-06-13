"""SQLite 数据库封装

使用 SQLAlchemy 2.x 同步引擎;Qt UI 线程外可使用 ThreadPoolExecutor。
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app import config
from app.core.logger import get_logger

log = get_logger(__name__)

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    """惰性初始化 SQLite 引擎"""
    global _engine, _SessionLocal
    if _engine is not None:
        return _engine

    db_path = config.DB_PATH
    db_path.parent.mkdir(parents=True, exist_ok=True)

    _engine = create_engine(
        f"sqlite:///{db_path.as_posix()}",
        future=True,
        echo=False,
        connect_args={"check_same_thread": False, "timeout": 30},
    )

    @event.listens_for(_engine, "connect")
    def _enable_fk(dbapi_connection, _):  # noqa: ANN001
        cur = dbapi_connection.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA journal_mode=WAL")
        cur.close()

    _SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False, future=True)
    log.info("数据库引擎已就绪: %s", db_path)
    return _engine


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """事务作用域的 Session 上下文管理器"""
    if _SessionLocal is None:
        get_engine()
    assert _SessionLocal is not None
    sess = _SessionLocal()
    try:
        yield sess
        sess.commit()
    except Exception:
        sess.rollback()
        raise
    finally:
        sess.close()


def init_db(force: bool = False) -> None:
    """创建所有表(幂等)"""
    from app.core.models import Base  # 局部导入避免循环

    engine = get_engine()
    if force:
        log.warning("force=True, 删除并重建所有表")
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    log.info("数据表初始化完成")
