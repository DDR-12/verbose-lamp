"""应用入口

启动流程:
1. 加载 QSS 主题
2. 灌库 + 游客账户
3. 创建主窗口
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from app import config


def _load_qss(app) -> None:
    qss_path = config.STYLES_DIR / "main.qss"
    if qss_path.exists():
        app.setStyleSheet(qss_path.read_text(encoding="utf-8"))


def main() -> int:
    # 在非 macOS 的情况下,使用 Fusion 风格在 Windows 上观感更统一
    from PySide6.QtWidgets import QApplication
    from PySide6.QtCore import Qt

    QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
    QApplication.setHighDpiScaleFactorRoundingPolicy(
        Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
    )

    app = QApplication(sys.argv)
    app.setApplicationName(config.__app_name__)
    app.setOrganizationName("EBR")

    _load_qss(app)

    # 初始化数据(灌库 / 默认游客)
    from app.core.migration import seed_initial_data
    try:
        seed_initial_data()
    except Exception as e:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        print(f"[FATAL] 初始化数据失败: {e}")
        return 1

    # 启动音频服务
    from app.services.audio_service import get_audio_service
    get_audio_service()

    from app.ui.main_window import MainWindow
    win = MainWindow()
    win.show()

    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
