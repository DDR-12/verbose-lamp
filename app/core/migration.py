"""种子数据灌库

从 assets_extracted/metadata/books.json 灌入 books/book_pages/words。
若 JSON 不存在,使用内置 demo 绘本占位。
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select

from app import config
from app.core.database import get_engine, init_db, session_scope
from app.core.logger import get_logger
from app.core.models import Book, BookPage, User, Word

log = get_logger(__name__)


def _demo_books() -> list[dict[str, Any]]:
    """当 metadata 缺失时的内置 demo 数据"""
    demo = [
        {
            "id": 1,
            "title": "The Very Hungry Caterpillar",
            "title_en": "The Very Hungry Caterpillar",
            "category": "经典绘本",
            "age_range": "3-5",
            "difficulty": 2,
            "cover": "covers/caterpillar.jpg",
            "description": "一只很饿很饿的小毛毛虫的成长故事。",
            "pages": [
                {
                    "index": 1,
                    "image": "books/caterpillar/p1.jpg",
                    "text_en": "In the light of the moon a little egg lay on a leaf.",
                    "text_cn": "在月光下,一片叶子上躺着一颗小小的蛋。",
                    "duration_ms": 4500,
                },
                {
                    "index": 2,
                    "image": "books/caterpillar/p2.jpg",
                    "text_en": "One Sunday morning the warm sun came up and - pop! - out of the egg came a tiny and very hungry caterpillar.",
                    "text_cn": "一个星期天的早晨,温暖的太阳升起来,啪!从蛋里爬出一只又小又饿的毛毛虫。",
                    "duration_ms": 6500,
                },
                {
                    "index": 3,
                    "image": "books/caterpillar/p3.jpg",
                    "text_en": "He started to look for some food.",
                    "text_cn": "他开始寻找食物。",
                    "duration_ms": 3000,
                },
            ],
            "words": [
                {"page": 1, "word": "moon", "phonetic": "/muːn/", "translation": "月亮",
                 "example": "The moon is bright.", "bbox": (0.1, 0.05, 0.3, 0.2)},
                {"page": 1, "word": "leaf", "phonetic": "/liːf/", "translation": "叶子",
                 "example": "A green leaf.", "bbox": (0.4, 0.6, 0.3, 0.2)},
                {"page": 2, "word": "Sunday", "phonetic": "/ˈsʌndeɪ/", "translation": "星期日",
                 "example": "See you on Sunday.", "bbox": (0.1, 0.1, 0.4, 0.2)},
                {"page": 2, "word": "caterpillar", "phonetic": "/ˈkætərpɪlər/", "translation": "毛毛虫",
                 "example": "A hungry caterpillar.", "bbox": (0.5, 0.6, 0.4, 0.3)},
            ],
        },
        {
            "id": 2,
            "title": "Brown Bear, Brown Bear, What Do You See?",
            "title_en": "Brown Bear, Brown Bear, What Do You See?",
            "category": "经典绘本",
            "age_range": "2-4",
            "difficulty": 1,
            "cover": "covers/brown_bear.jpg",
            "description": "艾瑞·卡尔的经典重复句式绘本。",
            "pages": [
                {
                    "index": 1,
                    "image": "books/brown_bear/p1.jpg",
                    "text_en": "Brown bear, brown bear, what do you see?",
                    "text_cn": "棕熊,棕熊,你看到了什么?",
                    "duration_ms": 4000,
                },
                {
                    "index": 2,
                    "image": "books/brown_bear/p2.jpg",
                    "text_en": "I see a red bird looking at me.",
                    "text_cn": "我看到一只红色的鸟在看着我。",
                    "duration_ms": 3500,
                },
            ],
            "words": [
                {"page": 1, "word": "brown", "phonetic": "/braʊn/", "translation": "棕色",
                 "example": "A brown bear.", "bbox": (0.1, 0.1, 0.3, 0.2)},
                {"page": 1, "word": "bear", "phonetic": "/beər/", "translation": "熊",
                 "example": "Big bear.", "bbox": (0.5, 0.1, 0.3, 0.2)},
                {"page": 2, "word": "red", "phonetic": "/red/", "translation": "红色",
                 "example": "A red bird.", "bbox": (0.1, 0.1, 0.3, 0.2)},
                {"page": 2, "word": "bird", "phonetic": "/bɜːrd/", "translation": "鸟",
                 "example": "The bird sings.", "bbox": (0.5, 0.1, 0.3, 0.2)},
            ],
        },
        {
            "id": 3,
            "title": "Goodnight Moon",
            "title_en": "Goodnight Moon",
            "category": "经典绘本",
            "age_range": "2-4",
            "difficulty": 1,
            "cover": "covers/goodnight_moon.jpg",
            "description": "温馨的睡前绘本。",
            "pages": [
                {
                    "index": 1,
                    "image": "books/goodnight_moon/p1.jpg",
                    "text_en": "In the great green room, there was a telephone, and a red balloon.",
                    "text_cn": "在绿色的大房间里,有一部电话和一个红色的气球。",
                    "duration_ms": 5000,
                },
            ],
            "words": [
                {"page": 1, "word": "moon", "phonetic": "/muːn/", "translation": "月亮",
                 "example": "Goodnight moon.", "bbox": (0.1, 0.1, 0.3, 0.2)},
                {"page": 1, "word": "balloon", "phonetic": "/bəˈluːn/", "translation": "气球",
                 "example": "Red balloon.", "bbox": (0.5, 0.5, 0.3, 0.3)},
            ],
        },
        {
            "id": 4,
            "title": "牛津阅读树 Level 1: The Picnic",
            "title_en": "Oxford Reading Tree 1: The Picnic",
            "category": "牛津阅读树",
            "age_range": "4-6",
            "difficulty": 2,
            "cover": "covers/ort_picnic.jpg",
            "description": "Kipper 一家的野餐故事。",
            "pages": [
                {
                    "index": 1,
                    "image": "books/ort_picnic/p1.jpg",
                    "text_en": "Dad and Chip went on a picnic.",
                    "text_cn": "爸爸和 Chip 去野餐。",
                    "duration_ms": 3800,
                },
            ],
            "words": [
                {"page": 1, "word": "picnic", "phonetic": "/ˈpɪknɪk/", "translation": "野餐",
                 "example": "Family picnic.", "bbox": (0.1, 0.1, 0.4, 0.2)},
            ],
        },
        {
            "id": 5,
            "title": "海尼曼 GK: At the Market",
            "title_en": "Heinemann GK: At the Market",
            "category": "海尼曼",
            "age_range": "3-5",
            "difficulty": 2,
            "cover": "covers/heinemann_market.jpg",
            "description": "在市场里的常用词汇。",
            "pages": [
                {
                    "index": 1,
                    "image": "books/heinemann_market/p1.jpg",
                    "text_en": "I can see the apples. I can see the eggs.",
                    "text_cn": "我能看到苹果。我能看到鸡蛋。",
                    "duration_ms": 4000,
                },
            ],
            "words": [
                {"page": 1, "word": "market", "phonetic": "/ˈmɑːrkɪt/", "translation": "市场",
                 "example": "At the market.", "bbox": (0.1, 0.1, 0.3, 0.2)},
                {"page": 1, "word": "apple", "phonetic": "/ˈæpl/", "translation": "苹果",
                 "example": "An apple a day.", "bbox": (0.4, 0.4, 0.3, 0.3)},
            ],
        },
        {
            "id": 6,
            "title": "兰登 Step 1: Big Egg",
            "title_en": "Random House Step 1: Big Egg",
            "category": "兰登",
            "age_range": "4-6",
            "difficulty": 3,
            "cover": "covers/random_big_egg.jpg",
            "description": "兰登分级阅读第一阶段。",
            "pages": [
                {
                    "index": 1,
                    "image": "books/random_big_egg/p1.jpg",
                    "text_en": "Look at the big egg.",
                    "text_cn": "看这个大鸡蛋。",
                    "duration_ms": 3000,
                },
            ],
            "words": [
                {"page": 1, "word": "egg", "phonetic": "/eɡ/", "translation": "鸡蛋",
                 "example": "A big egg.", "bbox": (0.3, 0.3, 0.4, 0.4)},
            ],
        },
    ]
    return demo


def _word_dict() -> dict[str, dict[str, str]]:
    """本地词库(供 translate_service 使用)"""
    return {
        "moon": {"phonetic": "/muːn/", "translation": "月亮",
                 "example": "The moon is bright at night."},
        "leaf": {"phonetic": "/liːf/", "translation": "叶子",
                 "example": "A green leaf on the tree."},
        "caterpillar": {"phonetic": "/ˈkætərpɪlər/", "translation": "毛毛虫",
                        "example": "The caterpillar eats leaves."},
        "bear": {"phonetic": "/beər/", "translation": "熊",
                 "example": "Brown bear in the forest."},
        "red": {"phonetic": "/red/", "translation": "红色",
                "example": "A red apple."},
        "bird": {"phonetic": "/bɜːrd/", "translation": "鸟",
                 "example": "A bird in the sky."},
        "brown": {"phonetic": "/braʊn/", "translation": "棕色",
                  "example": "Brown hair."},
        "sunday": {"phonetic": "/ˈsʌndeɪ/", "translation": "星期日",
                   "example": "On Sunday we rest."},
        "picnic": {"phonetic": "/ˈpɪknɪk/", "translation": "野餐",
                   "example": "Let's have a picnic."},
        "balloon": {"phonetic": "/bəˈluːn/", "translation": "气球",
                    "example": "A red balloon."},
        "market": {"phonetic": "/ˈmɑːrkɪt/", "translation": "市场",
                   "example": "Go to the market."},
        "apple": {"phonetic": "/ˈæpl/", "translation": "苹果",
                  "example": "I like apples."},
        "egg": {"phonetic": "/eɡ/", "translation": "鸡蛋",
                "example": "A boiled egg."},
    }


def seed_initial_data() -> None:
    """主入口:首次启动时灌库"""
    init_db()

    # 1. 写 word_dict.json
    config.METADATA_DIR.mkdir(parents=True, exist_ok=True)
    word_path = config.WORD_DICT_JSON
    if not word_path.exists():
        with open(word_path, "w", encoding="utf-8") as f:
            json.dump(_word_dict(), f, ensure_ascii=False, indent=2)
        log.info("已生成词库: %s", word_path)

    # 2. 加载绘本数据
    if config.BOOKS_SEED_JSON.exists():
        with open(config.BOOKS_SEED_JSON, "r", encoding="utf-8") as f:
            books = json.load(f)
        log.info("从 %s 读取 %d 本绘本", config.BOOKS_SEED_JSON, len(books))
    else:
        books = _demo_books()
        log.info("使用内置 demo 绘本 (%d 本)", len(books))
        with open(config.BOOKS_SEED_JSON, "w", encoding="utf-8") as f:
            json.dump(books, f, ensure_ascii=False, indent=2)

    # 3. 灌库
    with session_scope() as sess:
        existing = sess.scalar(select(Book).limit(1))
        if existing:
            log.info("数据库已有数据,跳过灌库")
            return
        for b in books:
            book = Book(
                id=b.get("id"),
                title=b["title"],
                title_en=b.get("title_en"),
                category=b.get("category"),
                age_range=b.get("age_range"),
                difficulty=b.get("difficulty", 1),
                cover_path=b.get("cover"),
                description=b.get("description"),
                resource_dir=b.get("resource_dir"),
                total_pages=len(b.get("pages", [])),
            )
            sess.add(book)
            sess.flush()
            for p in b.get("pages", []):
                sess.add(
                    BookPage(
                        book_id=book.id,
                        page_index=p["index"],
                        image_path=p["image"],
                        text_en=p.get("text_en"),
                        text_cn=p.get("text_cn"),
                        duration_ms=p.get("duration_ms", 4000),
                    )
                )
            for w in b.get("words", []):
                bbox = w.get("bbox") or (None, None, None, None)
                sess.add(
                    Word(
                        book_id=book.id,
                        page_index=w.get("page"),
                        word=w["word"],
                        phonetic=w.get("phonetic"),
                        translation=w.get("translation"),
                        example_sentence=w.get("example"),
                        bbox_x=bbox[0], bbox_y=bbox[1], bbox_w=bbox[2], bbox_h=bbox[3],
                    )
                )

        # 4. 创建默认游客账户
        guest = sess.scalar(select(User).where(User.email == "guest@local"))
        if not guest:
            import hashlib, secrets
            salt = secrets.token_hex(16)
            pw = "guest123"
            ph = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100_000).hex()
            sess.add(
                User(
                    email="guest@local",
                    password_hash=f"pbkdf2$100000${salt}${ph}",
                    nickname="游客",
                    is_vip=True,
                    vip_expire_at=datetime.utcnow() + timedelta(days=365),
                )
            )
            log.info("已创建默认游客账户: guest@local / guest123")

    log.info("种子数据写入完成")


if __name__ == "__main__":
    seed_initial_data()
