# ============================================================
# 文件功能：种子数据脚本（Phase B）
# 说明：
#   - 初始化超管 / 三预置角色 / 18 权限码权限树 / 示例内容 / 脱敏示例业务数据；
#   - 审计字段统一以 'admin' 作为创建人/修改人（数据库设计文档 §5.3）；
#   - 开发期同时调用 Base.metadata.create_all 保证表存在（方案 §4.1 双库兼容）；
#   - 幂等：检测到超管已存在则跳过，可重复执行。
# 运行：python -m app.db.seed
# 权威依据：实施方案 Phase B 种子清单 + 数据库设计文档 §5.3。
# ============================================================
from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import engine, get_db_session
from app.models.auth import Department, SysPermission, SysRole, SysRolePermission, SysUser
from app.models.business import Appointment, Message
from app.models.content import (
    AboutInfo, AboutTimeline, Banner, CompanyInfo, Job, News, Product,
    ProductCategory, ProductSeries, SystemSettings,
)

ADMIN = "admin"  # 审计字段统一填充值


def _perms(db):
    """创建 18 个权限码（权限树），返回 {code: SysPermission}。"""
    # (code, name, type, sort) —— 7 区域通配(menu) + 8 具体动作(action) + 3 视图(action)
    specs = [
        ("banner:*", "轮播图管理", "menu", 10),
        ("series:*", "产品系列管理", "menu", 20),
        ("product:*", "产品管理", "menu", 30),
        ("news:*", "新闻管理", "menu", 40),
        ("job:*", "招聘管理", "menu", 50),
        ("about:*", "关于管理", "menu", 60),
        ("user:*", "管理员管理", "menu", 70),
        ("role:*", "角色管理", "menu", 80),
        ("setting:*", "系统设置", "menu", 90),
        ("upload:*", "上传权限", "menu", 100),
        ("appointment:view", "预约查看", "action", 110),
        ("appointment:handle", "预约处理", "action", 111),
        ("appointment:export", "预约导出", "action", 112),
        ("message:view", "留言查看", "action", 120),
        ("message:handle", "留言处理", "action", 121),
        ("message:export", "留言导出", "action", 122),
        ("log:view", "操作日志查看", "action", 130),
        ("stat:view", "数据统计查看", "action", 140),
    ]
    # 为避免与通配权限混淆，区域 menu 用原 code；动作节点的 menu 父级用同名前缀编码
    objs = {}
    for code, name, ptype, sort in specs:
        p = SysPermission(code=code, name=name, type=ptype, sort=sort,
                          created_at=ADMIN, update_at=ADMIN)
        db.add(p)
        objs[code] = p
    db.flush()
    return objs


def _roles(db, perms):
    """创建三预置角色并映射权限，返回 {code: SysRole}。"""
    mapping = {
        "super_admin": ("超级管理员", "拥有全部权限", list(perms.keys())),
        "content_editor": ("内容编辑", "内容类模块维护", [
            "banner:*", "series:*", "product:*", "news:*", "job:*", "about:*",
        ]),
        "operator": ("运营", "线索处理与统计查看", [
            "appointment:view", "appointment:handle", "appointment:export",
            "message:view", "message:handle", "message:export",
            "log:view", "stat:view",
        ]),
    }
    objs = {}
    for code, (name, desc, codes) in mapping.items():
        role = SysRole(code=code, name=name, description=desc,
                       created_at=ADMIN, update_at=ADMIN)
        db.add(role)
        db.flush()
        for c in codes:
            db.add(SysRolePermission(role_id=role.id, permission_id=perms[c].id,
                                     created_at=ADMIN, update_at=ADMIN))
        objs[code] = role
    return objs


def _admin(db, roles):
    """创建默认超级管理员（admin / admin123，强制改密）。"""
    u = SysUser(
        username="admin", password_hash=hash_password("admin123"),
        cn_name="超级管理员", role_id=roles["super_admin"].id,
        force_pwd=1, created_at=ADMIN, update_at=ADMIN,
    )
    db.add(u)
    return u


def _content(db):
    """示例内容数据：部门/分类/系列/产品/新闻/招聘/关于/公司信息/设置。"""
    # 部门：总公司 + 3 子部门（parent_id 自关联）
    hq = Department(dept_name="总公司", created_at=ADMIN, update_at=ADMIN)
    db.add(hq); db.flush()
    for name in ["市场部", "产品部", "运营部"]:
        db.add(Department(dept_name=name, parent_id=hq.id, created_at=ADMIN, update_at=ADMIN))

    # 产品空间分类（5）
    cats = {}
    for i, name in enumerate(["客厅", "卧室", "厨房", "卫浴", "书房"]):
        c = ProductCategory(name=name, sort=i * 10, created_at=ADMIN, update_at=ADMIN)
        db.add(c); db.flush(); cats[name] = c

    # 产品系列（3）
    series = {}
    for i, name in enumerate(["智能照明", "智能安防", "智能控制"]):
        s = ProductSeries(name=name, description=f"{name}系列示例", sort=i * 10,
                          created_at=ADMIN, update_at=ADMIN)
        db.add(s); db.flush(); series[name] = s

    # 轮播图（4）
    banners = [
        ("智能家居整体方案", "/products?series=lighting", 10),
        ("全屋智能照明", "/products?series=lighting", 20),
        ("智能安防守护", "/products?series=security", 30),
        ("智能控制中心", "/products?series=control", 40),
    ]
    for title, link, sort in banners:
        db.add(Banner(title=title, image=f"/uploads/banner-{sort}.jpg",
                      link_url=link, sort=sort, created_at=ADMIN, update_at=ADMIN))

    # 产品（12）：跨系列与分类
    product_defs = [
        ("TP-CL-001", "智能吸顶灯", "智能照明", "客厅", "on_shelf", True),
        ("TP-CL-002", "智能落地灯", "智能照明", "客厅", "on_shelf", False),
        ("TP-BR-001", "卧室氛围灯", "智能照明", "卧室", "on_shelf", False),
        ("TP-KT-001", "厨房操作灯", "智能照明", "厨房", "draft", False),
        ("TP-WS-001", "卫浴防雾灯", "智能照明", "卫浴", "off_shelf", False),
        ("TP-SF-001", "书房阅读灯", "智能照明", "书房", "on_shelf", False),
        ("TP-AF-001", "智能门锁", "智能安防", "卧室", "on_shelf", True),
        ("TP-AF-002", "可视门铃", "智能安防", "客厅", "on_shelf", False),
        ("TP-AF-003", "安防摄像头", "智能安防", "卫浴", "draft", False),
        ("TP-CT-001", "智能中控屏", "智能控制", "客厅", "on_shelf", True),
        ("TP-CT-002", "智能开关面板", "智能控制", "厨房", "on_shelf", False),
        ("TP-CT-003", "智能温控器", "智能控制", "书房", "on_shelf", False),
    ]
    products = []
    for i, (code, name, sname, cname, status, top) in enumerate(product_defs):
        p = Product(
            product_code=code, name=name,
            category_id=cats[cname].id, series_id=series[sname].id,
            pub_status=status, is_top=top, sort=i * 10, views=(i * 17) % 200,
            spec={"材质": "铝合金", "尺寸": "Φ300mm", "风格": "现代简约", "空间": cname},
            images=[f"/uploads/{code}-1.jpg", f"/uploads/{code}-2.jpg"],
            related_products=[], price_desc="价格面议，欢迎咨询",
            created_at=ADMIN, update_at=ADMIN,
        )
        db.add(p); db.flush(); products.append(p)
    # 给前两个产品各配 2 个搭配
    products[0].related_products = [products[6].id, products[9].id]
    products[1].related_products = [products[7].id, products[10].id]

    # 新闻（4）：2 行业 + 2 企业
    news_defs = [
        ("industry", "2026 智能家居行业趋势报告", "published"),
        ("industry", "全屋智能标准正式发布", "published"),
        ("company", "公司荣获年度创新设计奖", "published"),
        ("company", "新一代中控屏发布会回顾", "draft"),
    ]
    for i, (cat, title, status) in enumerate(news_defs):
        db.add(News(category=cat, title=title, summary=f"{title}摘要",
                    content=f"<p>{title}正文</p>", is_top=(i == 0),
                    pub_status=status, sort=i * 10, views=i * 31,
                    created_at=ADMIN, update_at=ADMIN))

    # 招聘（5）：行业 + 校园
    job_defs = [
        ("industry", "前端开发工程师", 3, "深圳", "campus@example.com"),
        ("industry", "硬件工程师", 2, "深圳", "campus@example.com"),
        ("campus", "产品实习生", 5, "上海", "campus@example.com"),
        ("campus", "视觉设计实习生", 2, "上海", "campus@example.com"),
        ("industry", "解决方案架构师", 1, "北京", "campus@example.com"),
    ]
    for i, (cat, title, count, loc, email) in enumerate(job_defs):
        db.add(Job(category=cat, title=title, count=count, location=loc,
                   email=email, sort=i * 10, created_at=ADMIN, update_at=ADMIN))

    # 关于子页（about_info）：公司简介（即"关于我们" D1）、品牌介绍、预约说明
    about_pages = {
        "company_intro": {"title": "关于我们", "blocks": [{"h": "企业简介", "p": "TP智能家居致力于全屋智能。"}]},
        "brand_intro": {"title": "品牌介绍", "blocks": [{"h": "品牌理念", "p": "让智能回归生活。"}]},
        "appointment_notice": {"title": "在线预约说明", "blocks": [{"h": "预约须知", "p": "请提前选择期望时间。"}]},
    }
    for key, val in about_pages.items():
        db.add(AboutInfo(page_key=key, content=val, created_at=ADMIN, update_at=ADMIN))

    # 发展历程 / 品牌历程时间轴
    timeline = [
        ("history", "2018", "公司成立", "TP智能家居品牌创立。"),
        ("history", "2021", "首款中控屏上市", "全屋智能控制中心发布。"),
        ("brand_history", "2019", "品牌升级", "确立暖金品牌视觉。"),
        ("brand_history", "2023", "国际设计奖", "获红点设计奖。"),
    ]
    for i, (t, year, title, desc) in enumerate(timeline):
        db.add(AboutTimeline(type=t, year=year, title=title, description=desc,
                             sort=i * 10, created_at=ADMIN, update_at=ADMIN))

    # 公司公共信息（company_info）
    company = {
        "address": "深圳市南山区科技园",
        "phone": "0755-88888888",
        "email": "contact@tp-smart.com",
        "business_hours": "周一至周日 9:00-18:00",
    }
    for k, v in company.items():
        db.add(CompanyInfo(info_key=k, info_value=v, created_at=ADMIN, update_at=ADMIN))

    # 网站设置（单行）
    db.add(SystemSettings(site_name="TP智能家居", icp="粤ICP备00000000号",
                          copyright="© 2026 TP智能家居", slider_interval=4,
                          created_at=ADMIN, update_at=ADMIN))


def _business(db):
    """脱敏示例业务数据：预约(6) / 留言(3)。手机号存明文，列表由接口脱敏。"""
    appts = [
        ("张三", "13800001111", "showroom", "pending"),
        ("李四", "13800002222", "factory", "confirmed"),
        ("王五", "13800003333", "showroom", "completed"),
        ("赵六", "13800004444", "factory", "cancelled"),
        ("钱七", "13800005555", "showroom", "pending"),
        ("孙八", "13800006666", "factory", "confirmed"),
    ]
    for i, (name, phone, atype, status) in enumerate(appts):
        db.add(Appointment(name=name, phone=phone, appt_type=atype,
                           appt_slot="morning" if i % 2 == 0 else "afternoon",
                           remark="示例预约", source_page="/about/appointment",
                           status=status, ip="127.0.0.1",
                           created_at=ADMIN, update_at=ADMIN))

    msgs = [
        ("周九", "13700001111", "product", "咨询智能门锁价格", "pending"),
        ("吴十", "13700002222", "cooperation", "寻求渠道合作", "processed"),
        ("郑十一", "13700003333", "aftersale", "中控屏售后咨询", "closed"),
    ]
    for name, phone, mtype, content, status in msgs:
        db.add(Message(name=name, phone=phone, type=mtype, content=content,
                       source_page="/contact", status=status, ip="127.0.0.1",
                       created_at=ADMIN, update_at=ADMIN))


def run_seed() -> None:
    """执行种子：建表（开发期）+ 幂等写入示例数据。"""
    # 开发期快速建表（方案 §4.1：双库兼容，SQLite 免迁移也能跑）
    Base.metadata.create_all(engine)

    db = get_db_session()
    try:
        # 幂等：超管已存在则跳过
        if db.query(SysUser).filter(SysUser.username == "admin").first():
            print("[seed] 检测到超管已存在，跳过种子。")
            return
        perms = _perms(db)
        roles = _roles(db, perms)
        _admin(db, roles)
        _content(db)
        _business(db)
        db.commit()
        print("[seed] 种子数据写入完成：超管 admin / 三角色 / 18 权限 / 示例内容 / 业务数据。")
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
