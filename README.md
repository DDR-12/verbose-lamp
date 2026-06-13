# English Book Reader (有声英语绘本)

> 基于 Android APK `有声英语绘本 v2.6.20`(包名 `com.damon.englishbook`,厂商:温州英阅科技有限公司)逆向开发的 **Windows 桌面英语绘本学习应用**,完全本地运行,无需联网。

## 功能特性

| 模块 | 描述 |
|---|---|
| 用户系统 | 邮箱+密码注册登录、PBKDF2 密码哈希、内置游客账户、VIP 标识 |
| 绘本库 | 7 大分类(经典绘本/牛津阅读树/兰登/廖彩杏/I can read/海尼曼 GK/国学)、搜索、网格浏览 |
| 阅读体验 | 大图阅读、双语对照、左右翻页/键盘 ←→ / 滚轮 / 自动翻页 |
| 多音频模式 | 朗读版 / 歌唱版 / 跟读版 切换(QMediaPlayer) |
| 声画同步 | 音频播放完毕自动翻页,可关闭 |
| 点读模式 | 点击图片热区播放单词音频 + 弹出翻译弹窗(音标/翻译/例句) |
| 单词翻译 | 13 词本地词库 + 数据库兜底,支持按书页范围查询 |
| 学习记录 | 阅读进度、收藏、勋章系统(4 种勋章规则) |
| 童趣 UI | 暖色调、大圆角、F11 全屏、Space 播放/暂停 |

## 技术栈

- **GUI**:PySide6 6.6+(Qt 6,Windows 原生观感)
- **数据库**:SQLAlchemy 2.x + SQLite(WAL 模式,本地)
- **音频**:Qt Multimedia(FFmpeg 7.1 后端)
- **图像**:Pillow
- **密码**:hashlib PBKDF2-HMAC-SHA256 (120k 迭代)

## 项目结构

```
.
├── main.py                      # 入口
├── app/
│   ├── config.py                # 全局配置
│   ├── core/
│   │   ├── database.py          # SQLAlchemy 引擎
│   │   ├── models.py            # ORM 模型(User/Book/Page/Word/Progress/Favorite/Medal/Recording)
│   │   ├── logger.py            # 统一日志
│   │   └── migration.py         # 建表 + 灌库
│   ├── services/
│   │   ├── user_service.py      # 注册/登录/VIP
│   │   ├── book_service.py      # 绘本 CRUD/分类/搜索
│   │   ├── audio_service.py     # QMediaPlayer 封装
│   │   ├── progress_service.py  # 进度 + 勋章
│   │   ├── translate_service.py # 单词翻译
│   │   └── record_service.py    # 跟读录音(占位)
│   ├── ui/
│   │   ├── main_window.py       # 主窗口 + 4 页
│   │   ├── pages/
│   │   │   ├── login_page.py    # 登录
│   │   │   ├── library_page.py  # 绘本库
│   │   │   ├── reader_page.py   # 阅读页(核心)
│   │   │   └── profile_page.py  # 个人中心
│   │   ├── widgets/
│   │   │   ├── book_card.py     # 卡片模型 + 委托
│   │   │   ├── audio_player.py  # 音频条
│   │   │   ├── word_popup.py    # 翻译弹窗
│   │   │   └── medal_widget.py  # 勋章卡
│   │   └── resources/styles/main.qss  # 主题
│   └── data/                    # 运行时数据库 / 日志
├── assets_extracted/            # 绘本资源
│   ├── images/                  # 封面 + 内容页
│   ├── audio/                   # 音频(待 APK 抽取)
│   └── metadata/
│       ├── books.json           # 绘本元数据
│       └── word_dict.json       # 单词词库
├── tools/                       # 逆向工具脚本
│   ├── install_tools.sh         # 下载 apktool/jadx
│   └── reverse.sh               # 一键逆向 APK
├── source/                      # 放置 APK
├── reverse/                     # 逆向产物
├── pyproject.toml
├── requirements.txt
├── EnglishBookReader.spec       # PyInstaller 配置
└── build.sh                     # 打包脚本
```

## 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 运行
```bash
python main.py
```
首次启动会自动:
- 在 `app/data/app.db` 创建 SQLite 数据库
- 灌入 6 本内置 demo 绘本(占位图,可正常体验)
- 创建游客账户 `guest@local / guest123`(VIP 已激活)

### 3. 用户登录
- **游客一键体验**:直接进入
- **注册**:任意邮箱 + 6 位以上密码
- **登录**:内置游客账户或注册账户

### 4. 使用
1. 在绘本库左侧选分类,右侧双击绘本
2. 阅读页可点击图片上的橙色热区查看单词翻译
3. 底部音频条切换"朗读 / 歌唱 / 跟读"模式
4. "🎤 跟读" 按钮(占位,实际录音功能待补 pyaudio)
5. 阅读完一本后,在"我的"页面查看勋章

### 5. 替换为真实 APK 资源

**前提**:把 `有声英语绘本_full_2.6.20_1533.apk` 上传到 `source/` 目录

```bash
# 步骤 A: 安装逆向工具
bash tools/install_tools.sh

# 步骤 B: 一键逆向(产出 reverse/apktool_out 与 reverse/jadx_out)
bash tools/reverse.sh "有声英语绘本_full_2.6.20_1533.apk"

# 步骤 C: 把 assets/* 复制到 assets_extracted/
cp -r reverse/apktool_out/assets/* assets_extracted/

# 步骤 D: 重命名/调整 books.json 使其匹配资源路径
# 详见 reverse/REPORT.md(若已生成)

# 步骤 E: 重置数据库
rm -f app/data/app.db
python main.py   # 自动重新灌库
```

### 6. 打包 Windows EXE

在 Windows 上:
```bash
pip install pyinstaller
bash build.sh
# 产物: dist/EnglishBookReader/EnglishBookReader.exe
```

## 快捷键

| 键 | 功能 |
|---|---|
| ← / → | 上一页 / 下一页 |
| Space | 播放 / 暂停 |
| F11 | 全屏切换 |
| Ctrl+Q | 退出 |
| 鼠标滚轮 | 翻页 |
| 点击图片左/右半 | 上一页 / 下一页 |
| 点击橙色热区 | 单词点读 |

## 数据 Schema

详见 [app/core/models.py](app/core/models.py),对应计划文档中的 SQLite 表结构。

## 已知限制

1. **音频资源**:当前 demo 数据无音频文件,音频缺失时自动翻页按 `duration_ms` 静默倒计时,需用 APK 真实音频替换
2. **录音功能**:为占位实现,实际功能需安装 pyaudio + 评分算法
3. **趣味游戏模块**:原 APK 的数学/逻辑游戏未实现
4. **会员验证**:VIP 标识为本地逻辑,无在线校验

## 逆向分析

待用户上传 APK 后,详见:
- `tools/install_tools.sh` / `tools/reverse.sh` — 一键脚本
- `reverse/REPORT.md` — 资源结构与关键类分析

## 许可证

本项目仅供学习研究使用。原 APK 资源版权归 `温州英阅科技有限公司` 所有。
