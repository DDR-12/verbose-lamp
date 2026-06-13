#!/usr/bin/env bash
# 逆向工具安装脚本(用户上传 APK 后执行)
# 用法: bash tools/install_tools.sh
set -e

cd "$(dirname "$0")"
mkdir -p .

echo "[1/3] 下载 apktool..."
if [ ! -s apktool.jar ] || ! unzip -t apktool.jar >/dev/null 2>&1; then
    rm -f apktool.jar
    curl -L --connect-timeout 30 --max-time 1200 -o apktool.jar \
        "https://github.com/iBotPeaches/Apktool/releases/download/v2.9.3/apktool_2.9.3.jar"
fi
java -jar apktool.jar --version

echo "[2/3] 下载 jadx..."
if [ ! -d jadx ] || [ ! -x jadx/bin/jadx ]; then
    rm -rf jadx jadx.zip
    curl -L --connect-timeout 30 --max-time 1200 -o jadx.zip \
        "https://github.com/skylot/jadx/releases/download/v1.5.0/jadx-1.5.0.zip"
    unzip -q -o jadx.zip -d jadx
fi
jadx/bin/jadx --version

echo "[3/3] 工具就绪 ✅"
echo ""
echo "下一步:把 APK 上传到 source/ 目录,然后执行"
echo "  bash tools/reverse.sh \"有声英语绘本_full_2.6.20_1533.apk\""
