"""录音服务(占位实现)"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Optional

from app import config
from app.core.logger import get_logger

log = get_logger(__name__)


class RecordService:
    """录音功能在 Windows 下的完整实现需要 pyaudio 等额外依赖。

    当前为占位实现:仅记录"开始录音"事件,不实际写文件。"""

    @staticmethod
    def start(user_id: int, book_id: int, page_index: int) -> Optional[Path]:
        if config.EXTERNAL_USER_DIR is None:
            return None
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        path = (
            config.EXTERNAL_USER_DIR
            / "recordings"
            / f"u{user_id}_b{book_id}_p{page_index}_{ts}.wav"
        )
        log.info("[占位] 录音开始: %s", path)
        return path

    @staticmethod
    def stop() -> None:
        log.info("[占位] 录音停止")
