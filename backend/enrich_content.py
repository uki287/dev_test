# 功能说明：加深产品与新闻内容（企业官网质感：多段落+小标题+列表+图文）。
# 与 generate_content.py 的区别：只 UPDATE 已有记录的内容字段，不新增数据；
# 幂等：description/content 已含「核心亮点」标记则跳过。
# 运行：cd backend && .venv/Scripts/python.exe enrich_content.py

import glob
import os
from datetime import datetime, timezone

from app.db.session import get_db_session
from app.models.content import Product, ProductCategory, ProductSeries, News

db = get_db_session()

UPLOADS = sorted(os.path.basename(p) for p in glob.glob("uploads/*") if os.path.isfile(p))
n_up = len(UPLOADS)


def img(i: int) -> str:
    return "/uploads/" + UPLOADS[i % n_up]


# ---------------- 1. 产品描述加深 ----------------
# 按 product_code 匹配；模板按 系列+分类 差异化，产品名定制首段
def product_desc(name: str, series: str, category: str, spec: dict | None, img_i: int) -> str:
    spec = spec or {}
    highlights = "".join(
        f"<li><strong>{k}：</strong>{v}</li>" for k, v in list(spec.items())[:4]
    ) or "<li>全屋联动，场景随心</li>"
    scene = {
        "客厅": "无论是归家时的自动亮灯，还是观影时的氛围切换，都能一键完成，让客厅成为全家最松弛的空间。",
        "卧室": "在卧室场景中，柔和不刺眼的光线、安静的环境联动，帮助您更快进入深度睡眠，醒来元气满满。",
        "厨房": "厨房场景下，安全与便捷并重：湿手免触、忘关提醒、烟雾预警，让一日三餐都安心无忧。",
        "卫浴": "卫浴空间从此告别湿冷与焦虑：提前预热、漏水秒报、镜面防雾，细节之处皆是体贴。",
        "书房": "书房是专注力的主场：自动感光、专注模式、情景一键切换，让每一次阅读与办公都更高效。",
    }.get(category, "无论身处哪个空间，它都能无缝融入您的日常，带来恰到好处的智能体验。")
    return (
        f"<h3>产品简介</h3><p>{name}是{series}系列面向{category}空间打造的一款智能产品，"
        f"延续了 TP 智能家居「以人为本、极简优雅」的设计理念，将专业级功能收进克制的外观之中，"
        f"与各类家居风格自然相融。</p>"
        f"<h3>核心亮点</h3><ul>{highlights}</ul>"
        f"<p><img src=\"{img(img_i)}\" alt=\"{name} 实景展示\" width=\"100%\"/></p>"
        f"<h3>适用场景</h3><p>{scene}</p>"
        f"<p>搭配 App 与语音助手使用，可进一步解锁定时、联动与情景编排能力；"
        f"接入 Matter / 米家等主流生态后，更可与全屋设备自由组合，构建真正懂你的智能空间。</p>"
    )

products = db.query(Product).filter(Product.deleted_at.is_(None), Product.pub_status == "on_shelf").all()
# 系列/分类名称映射（模型未定义 relationship，直接查表）
series_map = {s.id: s.name for s in db.query(ProductSeries).filter(ProductSeries.deleted_at.is_(None)).all()}
cat_map = {c.id: c.name for c in db.query(ProductCategory).filter(ProductCategory.deleted_at.is_(None)).all()}
p_done = p_skip = 0
for p in products:
    if p.description and "核心亮点" in p.description:
        p_skip += 1
        continue
    series = series_map.get(p.series_id, "")
    category = cat_map.get(p.category_id, "")
    p.description = product_desc(p.name, series, category, p.spec, p.sort * 2)
    p.update_at = "admin"
    p_done += 1
db.commit()
print(f"products enriched: {p_done}, skipped(already): {p_skip}")


# ---------------- 2. 新闻正文加深 ----------------
def news_content(title: str, summary: str, img_i: int, is_company: bool) -> str:
    if is_company:
        return (
            f"<p>{summary}</p>"
            f"<h3>现场直击</h3><p>在活动现场，TP智能家居的展区吸引了大量观众驻足体验。"
            f"从一键离家、归家照明到语音控制窗帘，流畅的联动演示让「全屋智能」不再只是概念。</p>"
            f"<p><img src=\"{img(img_i)}\" alt=\"{title} 现场图片\" width=\"100%\"/></p>"
            f"<h3>未来布局</h3><p>公司相关负责人表示，将持续加大研发投入，围绕空间智能化、适老化与绿色节能三大方向，"
            f"把更可靠、更易用的智能体验带给更多家庭。更多合作动态与新品信息，欢迎关注 TP智能家居官方渠道。</p>"
        )
    return (
        f"<p>{summary}</p>"
        f"<h3>行业观察</h3><p>业内分析认为，技术迭代与消费升级正在同步推动行业从单品智能走向空间智能。"
        f"协议互通、端侧 AI、节能策略等关键词，成为本轮增长的核心驱动力。</p>"
        f"<p><img src=\"{img(img_i)}\" alt=\"{title} 配图\" width=\"100%\"/></p>"
        f"<h3>趋势研判</h3><p>展望未来，安全、健康与节能仍将是家庭智能化的主旋律；"
        f"谁能把复杂的技术转化为无感的体验，谁就将在新一轮竞争中占据主动。</p>"
        f"<p>TP智能家居将持续跟踪行业动向，第一时间为您解读前沿趋势与实用方案。</p>"
    )

news_list = db.query(News).filter(News.deleted_at.is_(None)).all()
n_done = n_skip = 0
for n in news_list:
    if n.content and "行业观察" in n.content or (n.content and "现场直击" in n.content):
        n_skip += 1
        continue
    n.content = news_content(n.title, n.summary or "", (n.sort or 0) * 3, n.category == "company")
    n.update_at = "admin"
    n_done += 1
db.commit()
print(f"news enriched: {n_done}, skipped(already): {n_skip}")

# ---------------- 验证 ----------------
print(f"FINAL -> products:{len(products)}  news:{len(news_list)}")
db.close()
