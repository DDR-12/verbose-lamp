"""应用全局配置

负责解析资源/数据/外部存储的路径,提供只读配置对象。
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Optional


def _detect_base_dir() -> Path:
    """定位应用根目录(兼容源码运行与 PyInstaller 打包)"""
    # PyInstaller 解包目录
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    # 当前文件位于 /workspace/app/config.py → 父目录为 /workspace
    return Path(__file__).resolve().parent.parent


BASE_DIR: Path = _detect_base_dir()

# 资源/数据/外部存储目录
APP_DIR: Path = BASE_DIR / "app"
DATA_DIR: Path = APP_DIR / "data"
ASSETS_DIR: Path = BASE_DIR / "assets_extracted"
IMAGES_DIR: Path = ASSETS_DIR / "images"
AUDIO_DIR: Path = ASSETS_DIR / "audio"
METADATA_DIR: Path = ASSETS_DIR / "metadata"
USER_DATA_DIR: Path = DATA_DIR / "user_data"
UI_RESOURCES_DIR: Path = APP_DIR / "ui" / "resources"
ICONS_DIR: Path = UI_RESOURCES_DIR / "icons"
STYLES_DIR: Path = UI_RESOURCES_DIR / "styles"
FONTS_DIR: Path = UI_RESOURCES_DIR / "fonts"

# 数据库与种子文件
DB_PATH: Path = DATA_DIR / "app.db"
BOOKS_SEED_JSON: Path = METADATA_DIR / "books.json"
WORD_DICT_JSON: Path = METADATA_DIR / "word_dict.json"

# 用户数据外部存储(用户进度/收藏/勋章)
EXTERNAL_USER_DIR: Optional[Path] = None
if sys.platform == "win32":
    _appdata = os.environ.get("APPDATA")
    if _appdata:
        EXTERNAL_USER_DIR = Path(_appdata) / "EnglishBookReader"
elif sys.platform == "darwin":
    EXTERNAL_USER_DIR = Path.home() / "Library" / "Application Support" / "EnglishBookReader"
else:
    EXTERNAL_USER_DIR = Path.home() / ".english_book_reader"


# 应用行为
WINDOW_TITLE: str = "English Book Reader - 有声英语绘本"
WINDOW_MIN_SIZE = (1024, 720)
DEFAULT_WINDOW_SIZE = (1280, 800)

# 音频
AUDIO_SAMPLE_RATE = 44100
AUDIO_DEFAULT_VOLUME = 0.85

# 自动翻页默认间隔(秒);实际由页面 duration 决定
AUTO_PAGE_TICK_MS = 200

# 调试/日志
LOG_LEVEL: str = os.environ.get("EBR_LOG_LEVEL", "INFO")
DEV_MODE: bool = os.environ.get("EBR_DEV", "0") == "1"


def ensure_dirs() -> None:
    """确保所有数据/资源目录存在"""
    for p in (
        DATA_DIR,
        USER_DATA_DIR,
        METADATA_DIR,
        EXTERNAL_USER_DIR,
    ):
        if p is not None:
            p.mkdir(parents=True, exist_ok=True)
    if EXTERNAL_USER_DIR is not None:
        (EXTERNAL_USER_DIR / "recordings").mkdir(parents=True, exist_ok=True)


# 启动时建目录
ensure_dirs()
