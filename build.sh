# 打包脚本
# 用法: bash build.sh
# 前提: pip install pyinstaller pillow
# 在 Windows 上需要先 activate venv

set -e
echo "[1/3] 清理旧产物..."
rm -rf build dist

echo "[2/3] PyInstaller 打包..."
pyinstaller EnglishBookReader.spec --noconfirm

echo "[3/3] 完成"
echo "产物: dist/EnglishBookReader/EnglishBookReader.exe (Windows)"
echo "     dist/EnglishBookReader/english-book-reader  (Linux/Mac)"
