# 计划:基于"有声英语绘本"APK 逆向开发 Windows 桌面学习应用

## 1. Summary(任务摘要)

参考 Android APK `有声英语绘本_full_2.6.20_1533.apk`(包名 `com.damon.englishbook`,厂商:温州英阅科技有限公司,232.76 MB)逆向开发一款 Windows 桌面应用,用于本地学习英语绘本,完全复刻原 APK 的核心功能。技术栈采用 **Python 3.11 + PySide6** 桌面 GUI + SQLite 本地数据库 + FFmpeg + Qt Multimedia 音频解码,实现全部功能的本地化复刻。

## 2. Current State Analysis(当前状态分析)

### 2.1 源码与工作目录现状
- **工作目录**:`/workspace`,目前仅有 `README.md`,无任何源码/配置文件
- **APK 文件位置**:`C:\Users\Administrator\Downloads\有声英语绘本_full_2.6.20_1533.apk`(Windows 路径,**尚未上传到沙箱**)
- **目标平台**:Windows 10/11 桌面(主),Linux 兼容为辅
- **沙箱环境**:Linux,无 GUI,无法直接运行 PySide6 程序进行实时预览,需用户在本地 Windows 验证

### 2.2 目标应用功能盘点(来自应用商店信息)
| 功能模块 | 描述 |
|---|---|
| 用户系统 | 邮箱+密码登录、会员(VIP)管理 |
| 绘本库 | 分类浏览(经典绘本、牛津阅读树、兰登、廖彩杏、I can read 饼干狗、海尼曼 GK、国学) |
| 绘本阅读 | 高清画面+音频同步播放、自动翻页、手动翻页 |
| 多音频版本 | 朗读版、歌唱版、跟读版(切换播放模式) |
| 点读模式 | 点击图片区域/文字播放对应音频;长按进入深度点读 |
| 单词翻译 | 长按单词弹出翻译与发音 |
| 录音跟读 | 麦克风录音对比原声(可选功能) |
| 学习记录 | 阅读进度、收藏、勋章、徽章 |
| 离线下载 | 绘本资源缓存到本地 |
| 分龄早教 | 2-6 岁分级阅读 |
| 趣味游戏 | 数学与逻辑游戏(可选,非核心) |
| 五步阅读法 | 赏→听→析→讲→创(导览) |

### 2.3 APK 逆向分析预估
APK 体积 232 MB,推测内部资源结构:
- `assets/`:绘本图片(JPG/PNG)、音频(MP3)、JSON 元数据
- `res/raw/`:原始音频
- `lib/`:可能的 Native 库(arm64-v8a、armeabi-v7a),Windows 移植无需
- `classes.dex`:Java/Kotlin 业务逻辑(可能含 ProGuard 混淆)
- `AndroidManifest.xml`:Activity/Service 列表
- `META-INF/`:签名
- 可能存在 `database/` 或本地 SQLite 模板

## 3. Proposed Changes(具体方案)

### 3.1 阶段一:APK 逆向与资产提取(待用户上传 APK)

**前置条件**:用户将 APK 上传至 `/workspace/source/有声英语绘本_full_2.6.20_1533.apk`

**步骤**:
1. **环境准备**(在沙箱中)
   ```bash
   # 安装反编译工具
   sudo apt-get install -y default-jre unzip ffmpeg
   # 下载 apktool 与 jadx
   mkdir -p /workspace/tools && cd /workspace/tools
   wget -q https://bitbucket.org/iBotPeaches/apktool/downloads/apktool_2.9.3.jar -O apktool.jar
   wget -q https://github.com/skylot/jadx/releases/download/v1.5.0/jadx-1.5.0.zip -O jadx.zip
   unzip -q jadx.zip -d jadx
   ```

2. **APK 解包**
   ```bash
   cd /workspace
   java -jar tools/apktool.jar d source/有声英语绘本_full_2.6.20_1533.apk -o reverse/apktool_out -f
   tools/jadx/bin/jadx -d reverse/jadx_out source/有声英语绘本_full_2.6.20_1533.apk
   ```

3. **资源分析** — 重点查看:
   - `reverse/apktool_out/AndroidManifest.xml`(主 Activity 与权限)
   - `reverse/apktool_out/assets/`(绘本图片、音频、元数据 JSON)
   - `reverse/apktool_out/res/`(UI 资源、字符串、布局)
   - `reverse/jadx_out/sources/com/damon/englishbook/`(业务逻辑)
   - 搜索关键词: `bookList`、`bookDetail`、`audio`、`read`、`point`、`translate`、`vip`、`download`

4. **资产抽取**(产出物存到 `/workspace/assets_extracted/`)
   - 复制所有 `assets/` 下图片/音频到 `assets_extracted/{books,images,audio}/`
   - 解析 `assets/*.json`(绘本元数据)整合成 `books.json`
   - 提取 `res/values/strings.xml` 中的中文文案

5. **关键报告产出**:`/workspace/reverse/REPORT.md` — 包含:
   - 资源结构图
   - 关键类/方法清单
   - 音频/图片命名规则
   - 数据库 schema 还原

### 3.2 阶段二:项目脚手架搭建

**目录结构**(新建):
```
/workspace/
├── README.md
├── requirements.txt
├── pyproject.toml
├── main.py                    # 程序入口
├── app/
│   ├── __init__.py
│   ├── config.py              # 路径与全局配置
│   ├── core/
│   │   ├── database.py        # SQLite 封装
│   │   ├── models.py          # 数据模型(绘本、用户、进度)
│   │   ├── migration.py       # 建表与初始数据
│   │   └── logger.py
│   ├── services/
│   │   ├── book_service.py    # 绘本 CRUD、搜索、分类
│   │   ├── audio_service.py   # 音频播放(朗读/歌唱/跟读)、音画同步
│   │   ├── user_service.py    # 登录、注册、会员
│   │   ├── progress_service.py# 阅读进度、勋章
│   │   ├── translate_service.py# 单词翻译(本地词库)
│   │   └── record_service.py  # 录音(可选)
│   ├── ui/
│   │   ├── main_window.py     # 主窗口
│   │   ├── pages/
│   │   │   ├── library_page.py    # 绘本库(分类+列表)
│   │   │   ├── reader_page.py     # 阅读页(翻页+音频+点读)
│   │   │   ├── profile_page.py    # 个人中心(会员/进度/勋章)
│   │   │   └── login_page.py      # 登录页
│   │   ├── widgets/
│   │   │   ├── book_card.py       # 绘本卡片
│   │   │   ├── audio_player.py    # 音频控制组件
│   │   │   ├── click_reader.py    # 点读热区
│   │   │   ├── word_popup.py      # 单词翻译弹窗
│   │   │   └── medal_widget.py    # 勋章展示
│   │   └── resources/
│   │       ├── icons/             # 图标
│   │       ├── styles/            # QSS 样式
│   │       └── fonts/             # 字体
│   └── data/
│       ├── app.db                 # SQLite 数据库
│       ├── books.json             # 绘本元数据
│       ├── word_dict.json         # 单词词库
│       └── user_data/             # 用户数据(进度/收藏)
└── assets_extracted/         # 阶段一抽出的资源(图片/音频)
    ├── images/
    ├── audio/
    └── metadata/
```

**依赖**(`requirements.txt`):
```
PySide6>=6.6.0
SQLAlchemy>=2.0
python-dotenv>=1.0
Pillow>=10.0
pydub>=0.25.1
SpeechRecognition>=3.10       # 可选,跟读评分
```

### 3.3 阶段三:数据库设计

**SQLite Schema**(`app/data/app.db`):

```sql
-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT,
    is_vip INTEGER DEFAULT 0,
    vip_expire_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 绘本书籍表
CREATE TABLE books (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    title_en TEXT,
    cover_path TEXT,
    category TEXT,           -- 经典绘本/牛津阅读树/兰登/...
    age_range TEXT,          -- 2-3/3-4/4-5/5-6
    difficulty INTEGER,      -- 1-5
    total_pages INTEGER,
    description TEXT,
    resource_dir TEXT,       -- 资源目录(图片+音频)
    is_vip_only INTEGER DEFAULT 0
);

-- 绘本页面
CREATE TABLE book_pages (
    id INTEGER PRIMARY KEY,
    book_id INTEGER REFERENCES books(id),
    page_index INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    text_en TEXT,
    text_cn TEXT,
    audio_read_path TEXT,    -- 朗读音频
    audio_song_path TEXT,    -- 歌唱音频
    audio_follow_path TEXT,  -- 跟读音频
    duration_ms INTEGER      -- 音频时长(用于自动翻页)
);

-- 单词(点读词库)
CREATE TABLE words (
    id INTEGER PRIMARY KEY,
    book_id INTEGER REFERENCES books(id),
    page_index INTEGER,
    word TEXT NOT NULL,
    phonetic TEXT,
    translation TEXT,
    example_sentence TEXT,
    bbox_x REAL, bbox_y REAL, bbox_w REAL, bbox_h REAL,  -- 热区坐标
    audio_path TEXT
);

-- 阅读进度
CREATE TABLE reading_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    book_id INTEGER REFERENCES books(id),
    last_page INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 收藏
CREATE TABLE favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    book_id INTEGER REFERENCES books(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 勋章
CREATE TABLE medals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    medal_code TEXT NOT NULL,
    medal_name TEXT,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 录音(可选,跟读功能)
CREATE TABLE recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    book_id INTEGER REFERENCES books(id),
    page_index INTEGER,
    file_path TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**初始化**:从 `assets_extracted/metadata/` 与逆向阶段产出的 `books.json` 灌入 books/book_pages/words 初始数据。

### 3.4 阶段四:核心模块实现

#### 3.4.1 主窗口与导航(`ui/main_window.py`)
- `QMainWindow` + `QStackedWidget` 切换 4 个页面
- 顶部导航栏:绘本库 / 阅读 / 我的
- 状态栏:当前用户、会员状态、当前播放
- 退出/最小化/全屏

#### 3.4.2 绘本库(`ui/pages/library_page.py`)
- 左侧分类列表(QListWidget):经典绘本、牛津阅读树、兰登、廖彩杏、I can read、海尼曼 GK、国学
- 右侧网格视图(自定义 QListView + IconMode)显示绘本卡片
- 搜索框(按书名/英文名模糊查询)
- 卡片显示:封面、标题、年龄标签、VIP 标识、下载状态
- 双击卡片进入阅读页

#### 3.4.3 阅读页(`ui/pages/reader_page.py`)— 核心
**布局**:
```
+----------------------------------+
|  [返回] 标题   朗读/歌唱/跟读   收藏 |
+----------------------------------+
|                                  |
|        绘本大图(QLabel)         |
|    (覆盖点读热区 QGraphicsView) |
|                                  |
+----------------------------------+
|  ◀  3/12  ▶  ▷ 进度条  ⏸  自动翻页 |
+----------------------------------+
```

**关键功能**:
1. **多音频版本切换**:顶部 RadioButton(朗读/歌唱/跟读),切换时 `QMediaPlayer` 重置
2. **声画同步 + 自动翻页**:
   - 启动定时器 `QTimer`,在播放时根据 `book_pages.duration_ms` 累计时间
   - 到时调用 `nextPage()` 翻页
   - 用户点击"自动翻页"按钮可关闭
3. **手动翻页**:左右箭头按钮、键盘 ← / →、鼠标滚轮
4. **点读模式**:
   - 维护 `words.bbox_*` 热区数据
   - 在 QGraphicsView 上叠加透明 QGraphicsRectItem
   - 鼠标点击命中热区 → 播放 `words.audio_path` + 弹出 `WordPopup`(翻译、音标、例句)
5. **深度点读**(长按):切换 mode 后点击图片任意位置 → 取最近词 + 重复播放
6. **进度保存**:每次翻页写入 `reading_progress`,完成时弹出勋章提示

#### 3.4.4 音频服务(`services/audio_service.py`)
- 封装 `QMediaPlayer` + `QAudioOutput`
- 队列管理:支持连续翻页连续播放
- 倍速控制(0.5x / 1.0x / 1.5x)
- 音量、循环模式
- 信号:`positionChanged`、`durationChanged`、`stateChanged`
- 通过 `QTimer(16ms)` 同步 UI 进度

#### 3.4.5 翻译服务(`services/translate_service.py`)
- 优先查本地 `word_dict.json`(从 APK 提取的词库)
- 未命中时调用本地 SQLite 词库表 `words`
- 兜底:集成 `translate` 库或离线 ICDict 数据(可选,体积大)
- 弹窗显示:音标、词性、中文、例句

#### 3.4.6 用户与会员(`services/user_service.py`)
- 注册/登录:密码 PBKDF2 哈希(`hashlib.pbkdf2_hmac`)
- 默认本地账户,无网络请求(本地学习定位)
- VIP 标志:启动时根据 `vip_expire_at` 校验
- 离线激活码入口(可选,模拟 VIP 试用)

#### 3.4.7 学习记录与勋章
- 进度:`reading_progress` 读写
- 勋章规则(示例):完成首本 →"启蒙新星";完成 5 本 →"小书虫";连续 7 天 →"坚持之星"
- 触发:阅读完成时 `progress_service.check_and_grant_medal()`

### 3.5 阶段五:UI 美化与可用性

- 童趣风格 QSS:大圆角、暖色调、明亮字体(思源黑体或系统中文字体)
- 动效:翻页用 `QPropertyAnimation`,卡片 hover 抬升
- 自适应:支持 1920x1080 / 1366x768 / 平板 16:10
- 托盘图标(`QSystemTrayIcon`):支持后台播放
- 键盘快捷键:Space 播放/暂停、← / → 翻页、F11 全屏

### 3.6 阶段六:打包与分发

- `PyInstaller` 打包为单 exe:
  ```bash
  pyinstaller --windowed --name "EnglishBookReader" \
    --add-data "app/data:app/data" \
    --add-data "assets_extracted:assets_extracted" \
    --icon "app/ui/resources/icons/app.ico" \
    main.py
  ```
- 资源(图片/音频)若超过 500MB,改为 `app/data/resources.zip` 首次启动解压
- 生成 `README.md` 简述使用方式

## 4. 关键文件清单(待创建/修改)

| 文件 | 操作 | 说明 |
|---|---|---|
| `/.trae/documents/this-plan.md` | 已创建 | 本计划 |
| `/source/有声英语绘本_full_2.6.20_1533.apk` | 待用户提供 | 逆向源 |
| `/reverse/REPORT.md` | 新建 | 逆向分析报告 |
| `/assets_extracted/**` | 新建 | 抽取的资源 |
| `/requirements.txt` | 新建 | Python 依赖 |
| `/pyproject.toml` | 新建 | 项目元数据 |
| `/main.py` | 新建 | 入口 |
| `/app/**` | 新建 | 全部源码 |
| `/README.md` | 改写 | 使用说明 |

## 5. Assumptions & Decisions(假设与决策)

1. **APK 未混淆或弱混淆**:基于普通商业 App,假设 ProGuard 默认配置,关键类名/方法名可读
2. **资源内嵌为主**:绘本图片/音频假设都在 `assets/` 目录(非云端下载),可本地抽取
3. **不联网**:本应用定位"本地学习",无在线功能,原 APK 的会员验证/在线绘本可忽略或标注"占位"
4. **录音功能降级**:PySide6 + Windows 需要额外音频处理库,默认实现为"占位按钮 + 提示",非阻塞主线
5. **趣味游戏模块不实现**:原 APK 的数学/逻辑游戏非核心,仅在导航中保留入口,标记"敬请期待"
6. **数据迁移策略**:用 `books.json` 灌库,确保从 APK 抽出的数据可重现
7. **跨平台兼容**:虽然目标是 Windows,但保持 Linux/Mac 可运行(开发期)

## 6. Verification Steps(验证步骤)

### 6.1 逆向阶段验证
- [ ] APK 解包成功,`AndroidManifest.xml` 可读
- [ ] jadx 输出包含 `com/damon/englishbook/*` 类
- [ ] `assets/` 目录能列出至少 10 本绘本资源
- [ ] 抽取的图片/音频文件能正常打开(PNG/JPG/MP3)

### 6.2 应用开发期验证
- [ ] `python main.py` 启动无报错(在 Windows 端)
- [ ] 主窗口显示 4 个页面入口
- [ ] 登录页可注册/登录,密码哈希校验通过
- [ ] 绘本库显示从 APK 抽取的绘本,分类筛选正常
- [ ] 阅读页加载封面与第一页图片
- [ ] 切换朗读/歌唱/跟读三模式,音频能播放
- [ ] 翻页 ←/→/按钮/滚轮 全部生效
- [ ] 自动翻页模式下,音频播完自动下一页
- [ ] 点读书页热区,弹出单词翻译
- [ ] 阅读完成时,勋章入库
- [ ] 数据库文件 `app.db` 在关闭时正常落盘

### 6.3 打包验证
- [ ] `dist/EnglishBookReader.exe` 能在 Windows 7/10/11 运行
- [ ] 双 exe 后首次启动自动创建 `app.db` 并灌入绘本数据
- [ ] 离线环境(无网)所有功能正常

### 6.4 边界与回归
- [ ] 无音频绘本不崩溃,降级为纯阅读
- [ ] 缺失封面时显示占位图
- [ ] 数据库损坏时自动备份并重建
- [ ] 大窗口/小窗口切换无 UI 错位

## 7. 风险与备选方案

| 风险 | 应对 |
|---|---|
| APK 强混淆无法还原类名 | 改为基于 UI 截图 + 资源结构推测 |
| 资源体积过大(232MB)导致打包失败 | 资源分卷,首启动按需解压;或拆分为可下载包 |
| ProGuard 字符串加密,JSON 解不开 | 通过图片文件命名规律 + 音频时长反推页面 |
| 用户未上传 APK | 切换为通用框架 + 内置示例绘本,确保应用骨架可用 |
| 录音/跟读评分 Windows 兼容问题 | 降级为占位,后续版本补 |
| PySide6 在 Windows 7 兼容性 | 文档注明最低支持 Windows 10 |

## 8. 实施顺序与里程碑

| 阶段 | 任务 | 阻塞条件 |
|---|---|---|
| M0 | 用户上传 APK | 必需 |
| M1 | APK 逆向 + 资源抽取 + 报告 | 依赖 M0 |
| M2 | 项目脚手架 + 数据库设计 | 无 |
| M3 | 绘本库 + 阅读页基础翻页 | 依赖 M1 的 books.json |
| M4 | 多音频播放 + 自动翻页 | 依赖 M1 的音频资源 |
| M5 | 点读 + 单词翻译 | 依赖 M1 的 words 数据 |
| M6 | 用户系统 + 会员 + 勋章 | 无 |
| M7 | UI 美化 + 快捷键 + 托盘 | 无 |
| M8 | PyInstaller 打包 + 自检 | 依赖 M2-M7 |
| M9 | 文档与交付 | 依赖 M8 |

> **注**:本计划在 M1 阶段(逆向分析)需等待用户提供 APK 至 `/workspace/source/`。在用户上传前,可以将 M2 阶段(项目脚手架)并行推进,以提升效率。
