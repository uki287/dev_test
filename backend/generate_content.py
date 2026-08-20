# 功能说明：批量生成产品与新闻演示内容（复用现有 uploads 真实图，避免破图）。
# 仅用于内容填充/演示，生产数据请后台录入。

import glob
import os
from datetime import datetime, timezone

from app.db.session import get_db_session
from app.models.content import Product, News

db = get_db_session()

UPLOADS = sorted(os.path.basename(p) for p in glob.glob("uploads/*") if os.path.isfile(p))
n_up = len(UPLOADS)


def img(i: int) -> str:
    return "/uploads/" + UPLOADS[i % n_up]


def gallery(start: int, k: int = 3) -> list:
    return ["/uploads/" + UPLOADS[(start + j) % n_up] for j in range(k)]


# ---------------- 1. 清理新闻测试残留 ----------------
junk = db.get(News, 9)
if junk and junk.title.startswith("究竟是人性的流失"):
    junk.deleted_at = datetime.now(timezone.utc)
    junk.update_at = "admin"
    print("soft-deleted junk news #9")
else:
    print("news #9 not present or not junk, skip")

# ---------------- 2. 产品（5 空间 × 3 = 15） ----------------
# (category_id, series_id, code, name, price_desc, is_top, desc, spec)
products = [
    # 客厅(1)
    (1, 1, "TP-LV01", "悦光智能落地灯", "￥899 起", True,
     "<p>客厅氛围的核心光源。无极调光调色，2700K–6500K 全色温覆盖，支持语音与 App 双控，一键切换阅读、观影、聚会三种情景光。</p><p>铝合金灯杆纤细挺括，底座配重稳固，内置光线传感器可随自然光自动补光。</p>",
     {"功率": "18W", "色温": "2700K-6500K", "联控": "支持 Matter/米家", "材质": "铝合金+布艺"}),
    (1, 2, "TP-LV02", "看家智能摄像头 Pro", "￥399 起", False,
     "<p>2.5K 超清画质，水平 360° 全景巡航，AI 人形/宠物识别，异动即时推送。本地加密存储 + 云端双备份，隐私无忧。</p>",
     {"分辨率": "2560×1440", "视场角": "360°", "夜视": "全彩红外双模", "存储": "本地/云双备份"}),
    (1, 3, "TP-LV03", "全景智能中控面板", "门店咨询", False,
     "<p>客厅智能中枢，10.1 寸触控屏集成了灯光、影音、窗帘、空调的一站式控制，支持自定义情景与语音助手。</p>",
     {"屏幕": "10.1寸 IPS", "协议": "Zigbee3.0/蓝牙/Wi-Fi", "语音": "内置离线助手", "供电": "PoE/DC双模"}),
    # 卧室(2)
    (2, 1, "TP-BR01", "漫梦智能吸顶灯", "￥599 起", True,
     "<p>柔光护眼，无可视频闪，内置助眠模式，睡前渐暗引导入眠。晨间唤醒以模拟日出光线自然叫醒。</p>",
     {"功率": "36W", "显指": "Ra95", "模式": "助眠/唤醒/阅读", "调光": "0-100%无极"}),
    (2, 8, "TP-BR02", "眠境环境传感器", "￥199 起", False,
     "<p>实时监测卧室温湿度、空气质量与光照，联动空调、加湿器与新风，营造最佳睡眠微环境。</p>",
     {"监测": "温湿度/PM2.5/CO₂/光照", "联动": "空调/新风/加湿", "续航": "纽扣电池 1 年"}),
    (2, 3, "TP-BR03", "静音智能窗帘电机", "￥499 起", False,
     "<p>超静音轨道，定时开合与光线联动。起床模式自动拉开，观影模式一键闭合，支持手拉启动。</p>",
     {"噪音": "<25dB", "负载": "≤50kg", "控制": "App/遥控/语音", "供电": "插电/锂电"}),
    # 厨房(3)
    (3, 2, "TP-KT01", "厨安烟雾报警器", "￥159 起", True,
     "<p>光电式烟雾探测，厨房专用防误报算法，燃气泄漏与起火双预警，声光报警并推送手机。</p>",
     {"探测": "烟雾/燃气", "报警": "85dB声光", "联网": "Wi-Fi 直连", "续航": "电池 2 年"}),
    (3, 8, "TP-KT02", "厨下智能净水器", "￥1999 起", False,
     "<p>600G 大通量即滤即饮，TDS 实时数显，滤芯寿命智能提醒，App 远程查看水质报告。</p>",
     {"通量": "600G", "过滤": "RO反渗透", "显示": "TDS数显", "提醒": "滤芯寿命"}),
    (3, 3, "TP-KT03", "灶区智能感应开关", "￥129 起", False,
     "<p>挥手即控，湿手免触。联动烟机自动启停，忘关火超时提醒，让厨房更安全。</p>",
     {"方式": "挥手感应", "联动": "烟机/燃气阀", "防护": "IP44防水", "安装": "标准86底盒"}),
    # 卫浴(4)
    (4, 1, "TP-BT01", "暖域智能浴霸", "￥699 起", True,
     "<p>速热烘干、换气除雾一体，色温可调氛围灯。沐浴前 App 预热，出浴不冷。</p>",
     {"制热": "2800W", "换气": "≥200m³/h", "照明": "24W可调", "控制": "面板/App/语音"}),
    (4, 2, "TP-BT02", "水浸漏水传感器", "￥99 起", False,
     "<p>卫生间/阳台积水即时报警，联动机械手自动关阀，从源头杜绝泡水事故。</p>",
     {"探测": "水浸", "报警": "推送+声光", "联动": "机械手关阀", "防护": "IP67"}),
    (4, 8, "TP-BT03", "境尚智能魔镜", "￥1299 起", False,
     "<p>防雾美妆镜，内嵌天气、日程与音乐，洗漱间也能掌控全天信息，触控顺滑不沾指纹。</p>",
     {"屏幕": "21.5寸", "功能": "天气/音乐/日程", "防雾": "电热膜", "语音": "内置助手"}),
    # 书房(5)
    (5, 1, "TP-ST01", "护眼智能台灯 Max", "￥329 起", True,
     "<p>国AA级照度，自动感光调节，专注模式屏蔽干扰光。无频闪无蓝光危害，久读不累。</p>",
     {"照度": "国AA级", "显指": "Ra97", "感光": "自动", "色温": "2700-6500K"}),
    (5, 2, "TP-ST02", "学府智能门锁", "￥1099 起", False,
     "<p>3D 人脸+指纹+密码多重开锁，猫眼可视对讲，异常逗留抓拍推送，回家更安心。</p>",
     {"开锁": "人脸/指纹/密码/卡", "猫眼": "1080P可视", "供电": "锂电池", "防护": "C级锁芯"}),
    (5, 3, "TP-ST03", "知境情景控制面板", "￥259 起", False,
     "<p>书房一键情景：阅读、办公、休憩随心切换，联动灯光、插座与香薰，营造沉浸空间。</p>",
     {"情景": "4组自定义", "控制": "触控+App", "协议": "Zigbee3.0", "材质": "钢化玻璃"}),
]

created = []
for idx, (cat, ser, code, name, price, top, desc, spec) in enumerate(products):
    # 跳过已存在的同编号产品（幂等）
    if db.query(Product).filter(Product.product_code == code).first():
        print(f"skip existed product {code}")
        continue
    p = Product(
        category_id=cat, series_id=ser, product_code=code, name=name,
        description=desc, spec=spec, cover_image=img(idx * 3),
        images=gallery(idx * 3), pub_status="on_shelf", is_top=top,
        sort=idx, views=0, related_products=None, price_desc=price,
        is_activate=1, created_at="admin", update_at="admin",
    )
    db.add(p)
    db.flush()
    created.append(p)
db.commit()
print(f"inserted {len(created)} products")

# 关联搭配产品（同空间内互为 related，取同 category 的另外 1-2 个）
all_prod = db.query(Product).filter(Product.deleted_at.is_(None)).all()
by_cat = {}
for p in all_prod:
    by_cat.setdefault(p.category_id, []).append(p)
for p in all_prod:
    sibs = [x.id for x in by_cat.get(p.category_id, []) if x.id != p.id]
    if sibs:
        p.related_products = sibs[:2]
        p.update_at = "admin"
db.commit()
print("related_products filled")

# ---------------- 3. 新闻补充 ----------------
now = datetime.now(timezone.utc)


def add_news(cat, title, summary, content, cover_i, days_ago, top=False, source="TP智能家居", author="品牌中心"):
    # 幂等：按标题去重
    if db.query(News).filter(News.title == title, News.deleted_at.is_(None)).first():
        print(f"skip existed news: {title}")
        return
    pub = now - __import__("datetime").timedelta(days=days_ago)
    n = News(
        category=cat, title=title, cover_image=img(cover_i),
        images=gallery(cover_i), summary=summary, content=content,
        source=source, author=author, is_top=top, views=0, sort=days_ago,
        pub_status="published", published_at=pub, is_activate=1,
        created_at="admin", update_at="admin",
    )
    db.add(n)
    db.flush()


industry_news = [
    ("2026 全屋智能行业白皮书发布", "权威机构联合发布全屋智能行业白皮书，指出空间智能化进入“主动服务”阶段。",
     "<p>近日，多家权威研究机构联合发布《2026 全屋智能行业白皮书》。报告指出，智能家居正从“单品联动”迈向“空间主动服务”，设备开始基于用户习惯主动调节光环境与温控。</p><p>白皮书预计，未来三年全屋智能渗透率将显著提升，安全、健康、节能成为核心诉求。</p>", 5, 3, True),
    ("Matter 协议加速跨品牌互联", "Matter 1.4 落地，智能家居打破品牌壁垒迎来真正互通。",
     "<p>Matter 1.4 版本正式发布，进一步统一了照明、安防、家电的互联标准。消费者不再被单一生态绑定，混搭不同品牌设备成为常态。</p>", 8, 12, False),
    ("绿色节能成智能家居新焦点", "政策与市场双轮驱动，节能型智能设备销量同比增长超四成。",
     "<p>在“双碳”目标下，具备用电监测与自动节能策略的设备受到青睐。智能插座、环境传感器成为家庭减碳利器。</p>", 11, 22, False),
    ("银发经济催生适老化智能方案", "面向长者的安全看护类产品需求快速增长。",
     "<p>跌倒检测、远程照护、语音交互等适老化方案进入更多家庭，科技温度体现在细节之中。</p>", 14, 33, False),
    ("AI 大模型重塑家居交互体验", "本地大模型让离线语音助手更聪明，隐私与响应兼得。",
     "<p>端侧 AI 让语音助手摆脱云端依赖，指令理解更自然，断网也能控家，隐私更有保障。</p>", 17, 45, False),
]

company_news = [
    ("TP智能家居荣获年度创新设计奖", "凭借全景中控面板，公司斩获 2026 红点风格设计大奖。",
     "<p>在近日举办的年度设计盛典上，TP智能家居凭借“全景智能中控面板”摘得创新设计奖。评委盛赞其将复杂控制收敛为一屏的极简哲学。</p>", 1, 6, True),
    ("新一代中控屏发布会圆满落幕", "发布会现场座无虚席，三大情景方案惊艳亮相。",
     "<p>以“让家更懂你”为主题的发布会圆满举行。现场演示了晨起、归家、影音三大自动情景，引发热烈反响。</p>", 4, 15, False),
    ("智慧社区样板间正式开放", "首个全屋智能样板间落地，欢迎预约体验。",
     "<p>位于城南的体验中心正式开放，涵盖客厅、卧室、厨房、卫浴、书房五大空间的完整智能方案，支持预约到店体验。</p>", 7, 26, False),
    ("公司携手头部房企共建精装智能房", "战略签约落地，智能前装进入更多新盘。",
     "<p>公司与多家头部房企达成战略合作，将全屋智能作为精装交付标准，让智能从“后装”走向“前装”。</p>", 10, 38, False),
    ("TP 公益：智能守护独居老人", "向社区捐赠环境传感器与紧急呼叫设备。",
     "<p>公司发起“银龄守护”公益行动，为独居老人免费部署安全监测设备，用科技传递温度。</p>", 13, 52, False),
]

for t in industry_news:
    add_news("industry", *t)
for t in company_news:
    add_news("company", *t)
db.commit()

# ---------------- 验证 ----------------
np_ = db.query(Product).filter(Product.deleted_at.is_(None)).count()
ni = db.query(News).filter(News.deleted_at.is_(None), News.category == "industry").count()
nc = db.query(News).filter(News.deleted_at.is_(None), News.category == "company").count()
print(f"FINAL -> products:{np_}  news.industry:{ni}  news.company:{nc}")
db.close()
