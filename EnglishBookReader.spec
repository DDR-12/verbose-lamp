# PyInstaller spec for English Book Reader
# 用法: pyinstaller EnglishBookReader.spec --noconfirm
# -*- mode: python ; coding: utf-8 -*-

import os
from pathlib import Path

block_cipher = None

# 资源收集
datas = [
    ("app/ui/resources", "app/ui/resources"),
    ("app/data", "app/data"),
    ("assets_extracted", "assets_extracted"),
]

# PySide6 隐藏导入
hiddenimports = [
    "PySide6.QtMultimedia",
    "PySide6.QtMultimediaWidgets",
    "PySide6.QtSvg",
    "PySide6.QtSvgWidgets",
    "PySide6.QtPrintSupport",
    "sqlalchemy.dialects.sqlite",
    "PIL.Image",
    "PIL.ImageDraw",
    "PIL.ImageFont",
]

# 排除无用模块
excludes = [
    "tkinter",
    "PySide6.Qt3DCore",
    "PySide6.Qt3DRender",
    "PySide6.QtBluetooth",
    "PySide6.QtCharts",
    "PySide6.QtDataVisualization",
    "PySide6.QtLocation",
    "PySide6.QtPositioning",
    "PySide6.QtSensors",
    "PySide6.QtSerialPort",
    "PySide6.QtTest",
    "PySide6.QtWebChannel",
    "PySide6.QtWebEngineCore",
    "PySide6.QtWebEngineWidgets",
    "PySide6.QtWebSockets",
    "PySide6.QtXml",
    "PySide6.QtQml",
    "PySide6.QtQuick",
    "PySide6.QtQuick3D",
    "numpy.tests",
    "pandas",
    "matplotlib",
]


a = Analysis(
    ["main.py"],
    pathex=[str(Path.cwd())],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="EnglishBookReader",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,            # 窗口应用,无控制台
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,               # 后续可加 app.ico
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="EnglishBookReader",
)
