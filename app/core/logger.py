"""核心层:日志"""
from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

from app import config


def get_logger(name: str = "ebr") -> logging.Logger:
    """获取统一 logger

    - 输出到 stdout 与文件 logs/ebr.log(滚动,5MB×3)
    - 级别由 config.LOG_LEVEL 控制
    """
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(getattr(logging, config.LOG_LEVEL.upper(), logging.INFO))

    fmt = logging.Formatter(
        "[%(asctime)s] %(levelname)-7s %(name)s :: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    stream = logging.StreamHandler(sys.stdout)
    stream.setFormatter(fmt)
    logger.addHandler(stream)

    try:
        log_dir: Path = config.DATA_DIR / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_dir / "ebr.log", maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
        )
        file_handler.setFormatter(fmt)
        logger.addHandler(file_handler)
    except Exception as e:  # noqa: BLE001
        logger.warning("无法初始化文件日志: %s", e)

    logger.propagate = False
    return logger
