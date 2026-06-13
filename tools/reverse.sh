#!/usr/bin/env bash
# APK 逆向脚本
# 用法: bash tools/reverse.sh <apk_filename>
set -e

APK_FILE="${1:-有声英语绘本_full_2.6.20_1533.apk}"
WORKSPACE="$(cd "$(dirname "$0")/.." && pwd)"
APK_PATH="$WORKSPACE/source/$APK_FILE"

if [ ! -f "$APK_PATH" ]; then
    echo "❌ 找不到 APK: $APK_PATH"
    echo "请将 APK 上传至 $WORKSPACE/source/ 后重试"
    exit 1
fi

mkdir -p "$WORKSPACE/reverse"

echo "[1/3] apktool 解包..."
java -jar "$WORKSPACE/tools/apktool.jar" d "$APK_PATH" -o "$WORKSPACE/reverse/apktool_out" -f

echo "[2/3] jadx 反编译 Java 源码..."
"$WORKSPACE/tools/jadx/bin/jadx" -d "$WORKSPACE/reverse/jadx_out" "$APK_PATH"

echo "[3/3] 抽取 assets 资源..."
mkdir -p "$WORKSPACE/assets_extracted"
cp -r "$WORKSPACE/reverse/apktool_out/assets/." "$WORKSPACE/assets_extracted/" 2>/dev/null || true

echo "✅ 逆向完成"
echo ""
echo "关键目录:"
echo "  资源文件: $WORKSPACE/reverse/apktool_out/assets/"
echo "  Java 源码: $WORKSPACE/reverse/jadx_out/sources/"
echo "  Manifest: $WORKSPACE/reverse/apktool_out/AndroidManifest.xml"
