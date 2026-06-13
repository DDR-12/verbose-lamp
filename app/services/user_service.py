"""用户服务:注册/登录/会员/游客"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select

from app.core.database import session_scope
from app.core.logger import get_logger
from app.core.models import User

log = get_logger(__name__)


# ---- 密码哈希(PBKDF2-HMAC-SHA256) ----
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return f"pbkdf2$120000${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iter_s, salt, digest = stored.split("$")
        if algo != "pbkdf2":
            return False
        check = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), salt.encode(), int(iter_s)
        ).hex()
        return hmac.compare_digest(check, digest)
    except Exception:  # noqa: BLE001
        return False


@dataclass
class UserSession:
    user_id: int
    email: str
    nickname: str
    is_vip: bool
    vip_expire_at: Optional[datetime]


class UserService:
    """全局当前用户(单例模式)"""

    _instance: Optional["UserService"] = None
    _current: Optional[UserSession] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    # ---- CRUD ----
    def register(self, email: str, password: str, nickname: str | None = None) -> UserSession:
        with session_scope() as sess:
            if sess.scalar(select(User).where(User.email == email)):
                raise ValueError(f"邮箱 {email} 已被注册")
            user = User(
                email=email,
                password_hash=hash_password(password),
                nickname=nickname or email.split("@")[0],
            )
            sess.add(user)
            sess.flush()
            log.info("注册成功: %s", email)
            return self._to_session(user)

    def login(self, email: str, password: str) -> UserSession:
        with session_scope() as sess:
            user = sess.scalar(select(User).where(User.email == email))
            if not user or not verify_password(password, user.password_hash):
                raise ValueError("邮箱或密码错误")
            return self._to_session(user)

    def login_guest(self) -> UserSession:
        """直接登录内置游客账户(便于本地试用)"""
        with session_scope() as sess:
            guest = sess.scalar(select(User).where(User.email == "guest@local"))
            if not guest:
                # 兜底:游客账户不存在则注册
                from app.core.migration import seed_initial_data
                seed_initial_data()
                guest = sess.scalar(select(User).where(User.email == "guest@local"))
            assert guest is not None
            return self._to_session(guest)

    def set_vip(self, user_id: int, days: int = 365) -> None:
        with session_scope() as sess:
            user = sess.get(User, user_id)
            if not user:
                return
            user.is_vip = True
            user.vip_expire_at = datetime.utcnow() + timedelta(days=days)

    # ---- 会话 ----
    @classmethod
    def current(cls) -> Optional[UserSession]:
        return cls._current

    def login_as(self, sess: UserSession) -> None:
        type(self)._current = sess
        log.info("已登录: %s", sess.email)

    def logout(self) -> None:
        type(self)._current = None
        log.info("已退出登录")

    # ---- helpers ----
    @staticmethod
    def _to_session(user: User) -> UserSession:
        return UserSession(
            user_id=user.id,
            email=user.email,
            nickname=user.nickname or user.email,
            is_vip=bool(user.is_vip)
            and (user.vip_expire_at is None or user.vip_expire_at > datetime.utcnow()),
            vip_expire_at=user.vip_expire_at,
        )
