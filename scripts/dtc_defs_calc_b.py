#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""DTC 电商计算器定义（二）：库存运营、广告投放、平台费用与留存。"""

TOOLS = []


def t(slug, name, desc, long, keys, icon, fields, calc, note=""):
    TOOLS.append(dict(slug=slug, name=name, desc=desc, long=long, keys=keys,
                      icon=icon, note=note, fields=fields, calc=calc))


# ---------------------------------------------------------------- 库存与运营
t("inventory-reorder-planner", "库存补货计划器",
  "按日销与提前期算覆盖天数与补货量。",
  "输入单个 SKU 的日销量、当前库存、在途数量与供应商提前期，估算库存覆盖天数、补货点、建议补货量与所需采购资金。",
  "补货 库存 覆盖天数 reorder 提前期",
  "box",
  [("daily", "日均销量（件/天）", 5), ("stock", "当前库存（件）", 120), ("incoming", "在途数量（件）", 0),
   ("leadTime", "供应商提前期（天）", 10), ("safetyDays", "安全库存天数", 3), ("unitCost", "采购单价（元）", 30)],
  """function (v) {
    var cover = v.daily > 0 ? v.stock / v.daily : Infinity;
    var rop = v.daily * (v.leadTime + v.safetyDays);
    var need = rop - v.stock - v.incoming;
    var qty = Math.max(0, Math.ceil(need));
    var rows = [['库存覆盖天数', cover, 'num'],
                ['缺货倒计时', cover, 'num'],
                ['补货点（ROP）', rop, 'int'],
                ['建议补货量', qty, 'int']];
    if (isFinite(cover)) rows.push(['预计缺货日期', new Date(Date.now() + cover * 86400000).toISOString().slice(0, 10), 'str']);
    rows.push(['采购资金需求', qty * v.unitCost, 'money']);
    return rows.filter(function (r) { return isFinite(r[1]); });
  }""",
  "补货点 = 日销 ×（提前期 + 安全天数）；库存低于补货点就应下单。")

t("bulk-sku-profit-auditor", "SKU 利润体检器",
  "单 SKU 的贡献利润与广告空间。",
  "输入单个 SKU 的售价、成本、履约、费率与广告，核算贡献利润、广告空间、盈亏平衡 ROAS 与达到目标利润率所需售价。",
  "SKU 利润 体检 贡献 adspace",
  "calc",
  [("price", "售价（元）", 199), ("cost", "商品成本（元）", 60), ("ship", "履约与运费（元）", 12),
   ("feeRate", "支付与平台费率（%）", 3.5), ("ad", "当前单笔广告费（元）", 40),
   ("targetMargin", "目标贡献利润率（%）", 20)],
  """function (v) {
    var fee = v.price * v.feeRate / 100;
    var contrib = v.price - v.cost - v.ship - fee;
    var keep = 1 - v.feeRate / 100 - v.targetMargin / 100;
    var rows = [['支付与平台费', fee, 'money'], ['每单贡献利润', contrib, 'money'],
                ['贡献利润率', v.price > 0 ? contrib / v.price * 100 : 0, 'pct'],
                ['广告空间（可承受 CPA）', contrib, 'money'],
                ['盈亏平衡 ROAS', contrib > 0 ? v.price / contrib : Infinity, 'num'],
                ['当前广告后利润', contrib - v.ad, 'money']];
    if (keep > 0) rows.push(['目标利润率 ' + v.targetMargin + '% 售价', (v.cost + v.ship) / keep, 'money']);
    return rows.filter(function (r) { return isFinite(r[1]); });
  }""",
  "广告空间 = 贡献利润，是这只 SKU 在不亏本前提下能出的最高 CPC 类成本。")

t("safety-stock-calculator", "安全库存计算器",
  "按服务水平算安全库存与补货点。",
  "根据平均日需求、需求波动、供应商提前期及其波动和目标服务水平，计算安全库存量与补货点。",
  "安全库存 服务水平 波动 提前期",
  "box",
  [("avgDaily", "平均日需求（件）", 20), ("sigmaD", "日需求标准差", 6),
   ("leadTime", "平均提前期（天）", 14), ("sigmaLT", "提前期标准差（天）", 2),
   ("service", "目标周期服务水平", "95", {'opts': {'90': '90%', '95': '95%', '97.5': '97.5%', '99': '99%', '99.9': '99.9%'}})],
  """function (v) {
    var z = { '90': 1.28, '95': 1.65, '97.5': 1.96, '99': 2.33, '99.9': 3.09 }[v.service] || 1.65;
    var ss = z * Math.sqrt(v.leadTime * v.sigmaD * v.sigmaD + v.avgDaily * v.avgDaily * v.sigmaLT * v.sigmaLT);
    var rop = v.avgDaily * v.leadTime + ss;
    return [['服务水平系数 z', z, 'num'], ['安全库存', Math.ceil(ss), 'int'],
            ['补货点（ROP）', Math.ceil(rop), 'int'],
            ['提前期内的期望需求', v.avgDaily * v.leadTime, 'int']];
  }""",
  "服务水平每提高一档，安全库存增长明显；99.9% 通常只给爆款主力 SKU。")

t("inventory-days-of-supply-calculator", "库存覆盖天数计算器",
  "可用库存还能撑多少天。",
  "扣除已承诺库存与安全库存后，计算单个 SKU 的净可用天数、预计缺货时间，以及补齐提前期所需采购量。",
  "覆盖天数 days of supply 缺货",
  "clock",
  [("stock", "当前库存（件）", 300), ("committed", "已承诺/未发货（件）", 40),
   ("safety", "安全库存（件）", 60), ("daily", "日均销量（件）", 12), ("leadTime", "提前期（天）", 7)],
  """function (v) {
    var avail = v.stock - v.committed;
    var net = avail - v.safety;
    var days = v.daily > 0 ? net / v.daily : Infinity;
    var outDays = v.daily > 0 ? avail / v.daily : Infinity;
    var need = Math.max(0, Math.ceil(v.daily * v.leadTime + v.safety - net));
    var rows = [['可用库存', avail, 'int'], ['净可用（扣安全库存）', net, 'int'],
                ['净覆盖天数', days, 'num'], ['完全缺货天数', outDays, 'num']];
    if (isFinite(days)) rows.push(['预计缺货日期', new Date(Date.now() + outDays * 86400000).toISOString().slice(0, 10), 'str']);
    rows.push(['补齐提前期需采购', need, 'int']);
    return rows.filter(function (r) { return isFinite(r[1]); });
  }""",
  "净覆盖天数扣除了安全库存，跌破 0 意味着已侵入安全水位，应立即下单。")

t("reorder-point-calculator", "季节化补货点计算器",
  "按季节系数调整的补货点。",
  "按季节系数放大日需求后，计算单个 SKU 的补货点、目标库存与建议采购量，适合旺季备货。",
  "补货点 旺季 季节 备货",
  "clock",
  [("daily", "平日均销量（件）", 15), ("season", "季节系数", 1.2),
   ("leadTime", "提前期（天）", 10), ("safetyDays", "安全库存天数", 4),
   ("stock", "当前库存（件）", 100), ("incoming", "在途数量（件）", 0)],
  """function (v) {
    var adj = v.daily * v.season;
    var rop = adj * (v.leadTime + v.safetyDays);
    var order = Math.max(0, Math.ceil(rop - v.stock - v.incoming));
    return [['季节调整后日销', adj, 'num'], ['补货点（ROP）', Math.ceil(rop), 'int'],
            ['建议采购量', order, 'int'],
            ['当前是否应下单', (v.stock + v.incoming) <= rop ? '是（已低于补货点）' : '否', 'str']];
  }""",
  "季节系数 = 旺季日销 ÷ 平日销；备货高峰一般再上浮 10%–20%。")

t("eoq-calculator", "EOQ 经济订货批量计算器",
  "订多少次、订多少最划算。",
  "计算经济订货批量（EOQ）、年订货次数、平均库存与订货加持有的总成本，并评估供应商 MOQ 带来的额外成本。",
  "eoq 经济订货批量 订货 库存",
  "box",
  [("demand", "年需求量（件）", 2400), ("orderCost", "单次订货成本（元）", 80),
   ("unitCost", "采购单价（元）", 30), ("holdingRate", "年持有成本率（%）", 25), ("moq", "供应商 MOQ（件，0 无）", 0)],
  """function (v) {
    var H = v.unitCost * v.holdingRate / 100;
    var eoq = H > 0 ? Math.sqrt(2 * v.demand * v.orderCost / H) : 0;
    var orders = eoq > 0 ? v.demand / eoq : 0;
    var avgInv = eoq / 2;
    var total = v.orderCost * orders + H * avgInv;
    var rows = [['经济订货批量（EOQ）', Math.ceil(eoq), 'int'],
                ['年订货次数', orders, 'num'],
                ['平均库存', avgInv, 'int'],
                ['年订货+持有总成本', total, 'money']];
    if (v.moq > 0 && v.moq > eoq) {
      var totalMoq = v.orderCost * (v.demand / v.moq) + H * (v.moq / 2);
      rows.push(['被 MOQ 顶到 ' + v.moq + ' 件', v.moq, 'int']);
      rows.push(['MOQ 额外成本', totalMoq - total, 'money']);
    }
    return rows;
  }""",
  "持有成本率通常取 20%–30%（资金 + 仓储 + 损耗）；MOQ 高于 EOQ 时会抬高总成本。")

t("inventory-carrying-cost-calculator", "库存持有成本计算器",
  "仓储、资金与损耗拆开算。",
  "拆分仓储租金、资金占用、保险、损耗与其他成本，计算年度与月度持有成本、持有成本率及单位库存成本。",
  "持有成本 仓储 资金占用 损耗",
  "coins",
  [("invValue", "平均库存价值（元）", 80000), ("rent", "年仓储租金（元）", 12000), ("insurance", "年保险（元）", 3000),
   ("shrinkRate", "年损耗率（%，占库存价值）", 1.5), ("capitalRate", "资金成本率（%）", 8),
   ("other", "年其他成本（元）", 2000), ("units", "平均库存件数", 1000)],
  """function (v) {
    var shrink = v.invValue * v.shrinkRate / 100;
    var capital = v.invValue * v.capitalRate / 100;
    var total = v.rent + v.insurance + shrink + capital + v.other;
    var rows = [['损耗成本', shrink, 'money'], ['资金占用成本', capital, 'money'],
                ['年持有总成本', total, 'money'], ['月均持有成本', total / 12, 'money'],
                ['持有成本率', v.invValue > 0 ? total / v.invValue * 100 : 0, 'pct']];
    if (v.units > 0) rows.push(['单件年持有成本', total / v.units, 'money']);
    return rows;
  }""",
  "持有成本率超过 25% 时，清滞销库存往往比继续压货更划算。")

t("stockout-cost-calculator", "缺货成本计算器",
  "断货几天会损失多少贡献。",
  "按日均需求、缺货天数与替代购买率，估算损失的订单、贡献利润与销售额，并给出低中高替代率区间。",
  "缺货 断货 损失 stockout",
  "chart",
  [("daily", "日均销量（件）", 15), ("days", "缺货天数", 5), ("cm", "单件贡献利润（元）", 40),
   ("subRate", "替代购买率（%）", 30), ("aov", "客单价（元）", 180)],
  """function (v) {
    var lost = v.daily * v.days;
    var lostCm = lost * v.cm;
    var recovered = lost * v.subRate / 100 * v.cm;
    var net = lostCm - recovered;
    var rows = [['损失订单数', lost, 'int'], ['损失贡献利润', lostCm, 'money'],
                ['替代购买挽回', recovered, 'money'], ['净损失', net, 'money'],
                ['损失销售额', lost * v.aov, 'money'],
                ['head', '替代率敏感性', 'head'],
                ['table', { head: ['替代率', '净损失'], rows: [[10 + '%', (lostCm - lost * 0.1 * v.cm).toFixed(0)], ['30%', net.toFixed(0)], ['50%', (lostCm - lost * 0.5 * v.cm).toFixed(0)]] }, 'table']];
    return rows;
  }""",
  "缺货的真实成本还包括搜索排名下滑与顾客流失，这里只算了可量化部分。")

t("break-even-sales-calculator", "盈亏销售额计算器",
  "覆盖固定成本要卖多少单。",
  "根据固定成本、客单价与贡献利润率，计算盈亏平衡所需订单量与销售额，以及达到目标利润的缺口。",
  "盈亏平衡 固定成本 保本销售额",
  "target",
  [("fixed", "月固定成本（元）", 12000), ("aov", "客单价（元）", 180),
   ("cmRate", "贡献利润率（%）", 40), ("target", "月目标利润（元）", 5000)],
  """function (v) {
    var cm = v.aov * v.cmRate / 100;
    var beOrders = cm > 0 ? v.fixed / cm : Infinity;
    var tOrders = cm > 0 ? (v.fixed + v.target) / cm : Infinity;
    var rows = [['单笔贡献', cm, 'money'],
                ['盈亏平衡订单量', Math.ceil(beOrders), 'int'],
                ['盈亏平衡销售额', beOrders * v.aov, 'money'],
                ['目标利润订单量', Math.ceil(tOrders), 'int'],
                ['距离盈亏还差订单', Math.ceil(Math.max(0, beOrders)), 'int']];
    return rows.filter(function (r) { return isFinite(r[1]); });
  }""",
  "先把固定成本压到「盈亏销售额 ÷ 计划销售额」合理区间，再谈增长。")

# ---------------------------------------------------------------- 广告与增长
t("blended-cac-calculator", "混合获客成本计算器",
  "各渠道合成混合 CAC 并对比。",
  "输入各渠道支出与新客数，计算混合 CAC 与分渠道 CAC，并检查首单贡献是否覆盖获客成本。",
  "cac 获客成本 新客 渠道",
  "target",
  [("s1", "渠道 A 支出（元）", 6000), ("n1", "渠道 A 新客", 150),
   ("s2", "渠道 B 支出（元）", 4000), ("n2", "渠道 B 新客", 120),
   ("s3", "渠道 C 支出（元，0 跳过）", 0), ("n3", "渠道 C 新客", 0),
   ("cm", "首单贡献利润（元）", 40)],
  """function (v) {
    var rows = [['渠道', '支出', '新客', 'CAC']];
    var ts = 0, tn = 0;
    [[v.s1, v.n1, 'A'], [v.s2, v.n2, 'B'], [v.s3, v.n3, 'C']].forEach(function (d) {
      if (d[0] <= 0) return;
      ts += d[0]; tn += d[1];
      rows.push(['渠道 ' + d[2], d[0], d[1], (d[1] > 0 ? (d[0] / d[1]).toFixed(2) : '—')]);
    });
    var blended = tn > 0 ? ts / tn : Infinity;
    var out = [['混合 CAC', blended, 'money'],
               ['首单贡献覆盖率', isFinite(blended) && blended > 0 ? v.cm / blended * 100 : 0, 'pct'],
               ['head', '分渠道 CAC', 'head'],
               ['table', { head: rows[0], rows: rows.slice(1) }, 'table']];
    return out.filter(function (r) { return isFinite(r[1]) || r[2] === 'table' || r[2] === 'head'; });
  }""",
  "首单贡献覆盖率超过 100% 说明首单就回本；不足时需要靠复购摊回 CAC。")

t("ltv-cac-calculator", "LTV 与 CAC 计算器",
  "客户终身价值与回本周期。",
  "按贡献利润口径计算客户终身价值（LTV）、LTV:CAC 比率，以及收回获客成本所需订单数与月数。",
  "ltv cac 终身价值 复购",
  "target",
  [("aov", "客单价（元）", 180), ("ordersPerYear", "年购买次数", 3), ("gmRate", "贡献利润率（%）", 55),
   ("years", "平均存续年数", 2), ("cac", "获客成本 CAC（元）", 80)],
  """function (v) {
    var annual = v.aov * v.ordersPerYear * v.gmRate / 100;
    var ltv = annual * v.years;
    var ratio = v.cac > 0 ? ltv / v.cac : Infinity;
    var payback = annual > 0 ? v.cac / annual * 12 : Infinity;
    var orders = annual > 0 ? v.cac / annual : Infinity;
    var rows = [['年贡献利润', annual, 'money'], ['客户终身价值 LTV', ltv, 'money'],
                ['LTV : CAC', isFinite(ratio) ? ratio.toFixed(2) + ' : 1' : '—', 'str'],
                ['回本所需订单数', orders, 'num'], ['回本月数', payback, 'num']];
    return rows.filter(function (r) { return isFinite(r[1]) || r[2] === 'str'; });
  }""",
  "健康的 DTC 店铺 LTV:CAC 一般 ≥ 3，且 12 个月内回本。")

t("roas-profit-calculator", "ROAS 利润计算器",
  "把 ROAS 换算成真实利润。",
  "输入广告支出、归因收入与各项成本率，计算贡献利润、广告后利润、盈亏 ROAS、CPA 与不同 ROAS 下的利润敏感性。",
  "roas 广告 利润 cpa",
  "chart",
  [("spend", "广告支出（元）", 5000), ("revenue", "归因收入（元）", 25000),
   ("cogsRate", "商品成本率（%）", 45), ("shipRate", "履约运费率（%）", 10),
   ("payRate", "支付与平台费率（%）", 3.2), ("aov", "客单价（元）", 180)],
  """function (v) {
    var rateSum = (v.cogsRate + v.shipRate + v.payRate) / 100;
    var cm = v.revenue * (1 - rateSum);
    var profit = cm - v.spend;
    var roas = v.spend > 0 ? v.revenue / v.spend : Infinity;
    var beRoas = 1 / (1 - rateSum);
    var orders = v.aov > 0 ? v.revenue / v.aov : 0;
    var rows = [['ROAS', roas, 'num'], ['贡献利润', cm, 'money'],
                ['广告后利润', profit, 'money'], ['盈亏 ROAS', beRoas, 'num'],
                ['订单数', orders, 'int'],
                ['CPA', orders > 0 ? v.spend / orders : 0, 'money']];
    if (v.spend > 0) {
      var m = roas / beRoas;
      rows.push(['安全边际（ROAS / 盈亏 ROAS）', m, 'num']);
    }
    return rows;
  }""",
  "ROAS 好看不代表赚钱：对比盈亏 ROAS 才知道真实盈亏。")

t("target-roas-calculator", "目标 ROAS 计算器",
  "从目标利润倒推投放红线。",
  "设定每单目标利润或目标利润率，倒推可承受 CPA、目标 ROAS 与月度广告预算，并给出与当前 ROAS 的差距。",
  "目标 roas cpa 预算",
  "target",
  [("aov", "客单价（元）", 180), ("cmRate", "贡献利润率（%）", 35),
   ("targetProfit", "每单目标利润（元）", 30), ("budget", "月广告预算（元）", 10000),
   ("currentRoas", "当前 ROAS（选填）", 0)],
  """function (v) {
    var cm = v.aov * v.cmRate / 100;
    var cpa = cm - v.targetProfit;
    var troas = cpa > 0 ? v.aov / cpa : Infinity;
    var orders = cpa > 0 ? v.budget / cpa : 0;
    var rows = [['每单贡献利润', cm, 'money'], ['可承受 CPA 上限', cpa, 'money'],
                ['目标 ROAS', troas, 'num'],
                ['预算内可买订单', Math.floor(orders), 'int'],
                ['预期收入', orders * v.aov, 'money']];
    if (v.currentRoas > 0) rows.push(['当前 ROAS 与目标差距', v.currentRoas - troas, 'num']);
    return rows.filter(function (r) { return isFinite(r[1]); });
  }""",
  "广告平台里的「目标 ROAS」填保守值（≥ 此处目标 ROAS），给退款与归因误差留余地。")

t("mer-calculator", "MER 营销效率计算器",
  "整体口径的营销效率比。",
  "用同期净收入对比付费媒体支出与总营销支出，计算 Blended ROAS、MER 与盈亏 MER。",
  "mer blended roas 营销效率",
  "chart",
  [("revenue", "同期净收入（元）", 120000), ("paid", "付费媒体支出（元）", 20000),
   ("totalMarketing", "总营销支出（元）", 26000), ("varRate", "变动成本率（%）", 65)],
  """function (v) {
    var mer = v.totalMarketing > 0 ? v.revenue / v.totalMarketing : Infinity;
    var blended = v.paid > 0 ? v.revenue / v.paid : Infinity;
    var beMer = v.varRate < 100 ? 100 / (100 - v.varRate) : Infinity;
    var rows = [['Blended ROAS', blended, 'num'], ['MER（总营销效率）', mer, 'num'],
                ['盈亏 MER', beMer, 'num']];
    if (isFinite(mer)) rows.push(['MER 与盈亏线差距', mer - beMer, 'num']);
    return rows.filter(function (r) { return isFinite(r[1]); });
  }""",
  "MER 把达人、联盟、代理费都算进分母，是评估整体投放效率的保守口径。")

# ---------------------------------------------------------------- 平台费用
t("amazon-fba-vs-fbm-profit-calculator", "FBA 与 FBM 利润对比计算器",
  "并排比较 FBA 与自发货运费利润。",
  "输入售价、商品成本、佣金率与两种履约方式的费用假设，并排比较 Amazon FBA 与 FBM 的费用、单件利润与利润率。",
  "fba fbm amazon 对比 履约 利润",
  "box",
  [("price", "售价（元）", 199), ("cost", "商品成本（元）", 60),
   ("refRate", "佣金率（%）", 15), ("minRef", "最低佣金（元）", 0.3),
   ("fbaFee", "FBA 配送费（元）", 18), ("fbaOther", "FBA 仓储摊销（元）", 1.5),
   ("fbmShip", "FBM 自发货运费（元）", 15), ("fbmPack", "FBM 包材与人工（元）", 3)],
  """function (v) {
    var ref = Math.max(v.price * v.refRate / 100, v.minRef);
    var fbaFees = ref + v.fbaFee + v.fbaOther;
    var fbmFees = ref + v.fbmShip + v.fbmPack;
    var fbaProfit = v.price - v.cost - fbaFees;
    var fbmProfit = v.price - v.cost - fbmFees;
    return [['head', 'FBA 与 FBM 并排对比', 'head'],
            ['table', { head: ['项目', 'FBA', 'FBM'], rows: [
              ['佣金', ref.toFixed(2), ref.toFixed(2)],
              ['履约与仓储', (v.fbaFee + v.fbaOther).toFixed(2), (v.fbmShip + v.fbmPack).toFixed(2)],
              ['费用合计', fbaFees.toFixed(2), fbmFees.toFixed(2)],
              ['单件利润', fbaProfit.toFixed(2), fbmProfit.toFixed(2)],
              ['利润率', (v.price > 0 ? fbaProfit / v.price * 100 : 0).toFixed(1) + '%', (v.price > 0 ? fbmProfit / v.price * 100 : 0).toFixed(1) + '%']
            ] }, 'table'],
            ['更划算的方式', fbaProfit >= fbmProfit ? 'FBA' : 'FBM', 'str']];
  }""",
  "FBA 还带来 Prime 标识与转化率提升；对比利润时也应考虑转化差异。")

t("etsy-fee-calculator", "Etsy 费用计算器",
  "拆解 Etsy 各项费用与净利润。",
  "拆解 Etsy 刊登费、交易费、支付费、站外广告费与 VAT，计算单笔订单净利润、利润率与有效费率。",
  "etsy 费用 佣金 利润",
  "coins",
  [("price", "售价（元）", 180), ("shipCharged", "向买家收的运费（元）", 10),
   ("listing", "刊登费（元）", 0.2), ("txnRate", "交易费率（%）", 6.5),
   ("payRate", "支付费率（%）", 3), ("payFixed", "支付固定费（元）", 0.25),
   ("offsite", "站外广告费率（%）", 12), ("cost", "商品+发出运费成本（元）", 70)],
  """function (v) {
    var gross = v.price + v.shipCharged;
    var fees = v.listing + gross * (v.txnRate + v.payRate + v.offsite) / 100 + v.payFixed;
    var net = gross - fees - v.cost;
    return [['订单总收入', gross, 'money'], ['Etsy 各项费用', fees, 'money'],
            ['有效费率', gross > 0 ? fees / gross * 100 : 0, 'pct'],
            ['净利润', net, 'money'], ['净利润率', gross > 0 ? net / gross * 100 : 0, 'pct']];
  }""",
  "站外广告费只对来源于 Etsy 广告的订单收取，可按店铺实际占比折算。")

t("tiktok-shop-fee-calculator", "TikTok Shop 费用计算器",
  "拆解 TikTok Shop 佣金与净利润。",
  "拆解 TikTok Shop 平台佣金、达人佣金、支付费、履约费与退款预留，计算单笔净利润与有效成本率。",
  "tiktok shop 佣金 费用 达人",
  "coins",
  [("price", "售价（元）", 150), ("commission", "平台佣金率（%）", 5), ("affiliate", "达人佣金率（%，0 无）", 10),
   ("payRate", "支付费率（%）", 1.5), ("fulfill", "履约运费（元）", 8),
   ("cost", "商品成本（元）", 50), ("reserve", "退款预留率（%）", 2)],
  """function (v) {
    var fees = v.price * (v.commission + v.affiliate + v.payRate + v.reserve) / 100 + v.fulfill;
    var net = v.price - fees - v.cost;
    return [['平台扣费合计', v.price * (v.commission + v.affiliate + v.payRate + v.reserve) / 100, 'money'],
            ['履约费', v.fulfill, 'money'], ['净利润', net, 'money'],
            ['净利润率', v.price > 0 ? net / v.price * 100 : 0, 'pct'],
            ['有效成本率', v.price > 0 ? (fees + v.cost) / v.price * 100 : 0, 'pct']];
  }""",
  "达人佣金只对达人带货订单发生；自播与商城订单可把该项设为 0。")

t("marketplace-fee-comparison-calculator", "平台费用对比计算器",
  "同一订单在四个平台的净收入。",
  "用同一订单样本对比 Shopify、Etsy、TikTok Shop 与 Amazon 的扣费与净收入，所有费率假设公开可调。",
  "平台对比 shopify etsy amazon tiktok 费用",
  "globe",
  [("price", "售价（元）", 180), ("cost", "商品+运费成本（元）", 70),
   ("shopPayRate", "Shopify 支付费率（%）", 2.9), ("shopFixed", "Shopify 固定费（元）", 0.3),
   ("etsyRate", "Etsy 综合费率（%）", 9.75), ("ttRate", "TikTok 综合佣金（%）", 6.5),
   ("amzRate", "Amazon 佣金率（%）", 15), ("amzFulfill", "Amazon 履约费（元）", 18)],
  """function (v) {
    var shop = v.price * v.shopPayRate / 100 + v.shopFixed;
    var etsy = v.price * v.etsyRate / 100 + 0.2;
    var tt = v.price * v.ttRate / 100;
    var amz = v.price * v.amzRate / 100 + v.amzFulfill;
    var rows = [['平台', '扣费', '净收入', '单件利润']];
    [['Shopify', shop], ['Etsy', etsy], ['TikTok Shop', tt], ['Amazon', amz]].forEach(function (d) {
      rows.push([d[0], d[1].toFixed(2), (v.price - d[1]).toFixed(2), (v.price - d[1] - v.cost).toFixed(2)]);
    });
    return [['head', '对比明细（费率均为可调假设）', 'head'],
            ['table', { head: rows[0], rows: rows.slice(1) }, 'table']];
  }""",
  "对比用的是同一费率假设；实际请按各平台后台账单口径回填后再决策。")

t("woocommerce-cost-calculator", "WooCommerce 成本计算器",
  "自建站每月真实运营成本。",
  "汇总主机、插件、维护与开发摊销，计算月度固定成本、每单摊销、运营利润与盈亏订单量。",
  "woocommerce 成本 主机 插件 自建站",
  "code",
  [("host", "主机月费（元）", 80), ("plugins", "插件年费（元）", 1200), ("maintenance", "维护月费（元）", 200),
   ("devAmort", "开发费年摊销（元）", 3000), ("orders", "月订单量", 300),
   ("aov", "客单价（元）", 180), ("payRate", "支付费率（%）", 2.9)],
  """function (v) {
    var fixed = v.host + v.plugins / 12 + v.maintenance + v.devAmort / 12;
    var perOrder = v.orders > 0 ? fixed / v.orders : 0;
    var revenue = v.orders * v.aov;
    var profit = revenue * (1 - v.payRate / 100) - fixed;
    var be = v.aov * (1 - v.payRate / 100) > 0 ? fixed / (v.aov * (1 - v.payRate / 100)) : Infinity;
    var rows = [['月度固定成本', fixed, 'money'], ['每单固定成本摊销', perOrder, 'money'],
                ['月收入（扣支付费）', revenue * (1 - v.payRate / 100), 'money'],
                ['月度利润（未计商品成本）', profit, 'money'],
                ['盈亏订单量（未计商品成本）', Math.ceil(be), 'int']];
    return rows.filter(function (r) { return isFinite(r[1]); });
  }""",
  "这里未计商品与履约成本；再加进「商品成本率」可得完整净利润。")

t("amazon-seller-fee-calculator", "Amazon 卖家费用计算器",
  "拆解 Amazon 佣金与 FBA 费用。",
  "拆解 Amazon 佣金（含最低佣金）、FBA 履约、月仓储摊销与入库移除费用，计算单件净利润与利润率。",
  "amazon fba 佣金 履约 fee",
  "box",
  [("price", "售价（元）", 199), ("cost", "商品成本（元）", 60),
   ("refRate", "佣金率（%）", 15), ("minRef", "最低佣金（元）", 0.3),
   ("fba", "FBA 配送费（元）", 18), ("storage", "月仓储摊销（元）", 1.5), ("inbound", "入库/移除摊销（元）", 0.5)],
  """function (v) {
    var ref = Math.max(v.price * v.refRate / 100, v.minRef);
    var fees = ref + v.fba + v.storage + v.inbound;
    var net = v.price - fees - v.cost;
    return [['佣金', ref, 'money'], ['FBA 与仓储合计', v.fba + v.storage + v.inbound, 'money'],
            ['费用合计', fees, 'money'], ['单件净利润', net, 'money'],
            ['净利润率', v.price > 0 ? net / v.price * 100 : 0, 'pct']];
  }""",
  "旺季仓储费会上浮，且低货值商品常被最低佣金吃掉利润，定价时留意。")

# ---------------------------------------------------------------- 留存与订阅
t("subscription-ltv-calculator", "订阅 LTV 计算器",
  "订阅模式的客户终身价值。",
  "按月度贡献与流失率计算订阅 LTV（无限期与设定观察期两种口径），并给出 CAC 回本月数与流失率敏感性。",
  "订阅 ltv churn 流失 复购",
  "refresh",
  [("price", "月订阅价（元）", 99), ("cogs", "每月履约与服务成本（元）", 25),
   ("churn", "月流失率（%）", 8), ("cac", "获客成本（元）", 120), ("months", "观察期（月）", 12)],
  """function (v) {
    var c = v.price - v.cogs;
    var r = v.churn / 100;
    var ltvInf = r > 0 ? c / r : Infinity;
    var ltvN = r > 0 ? c * (1 - Math.pow(1 - r, v.months)) / r : c * v.months;
    var payback = c > 0 ? v.cac / c : Infinity;
    var rows = [['每月贡献', c, 'money'], ['平均存续月数', r > 0 ? 1 / r : Infinity, 'num'],
                ['LTV（观察期 ' + v.months + ' 月）', ltvN, 'money'],
                ['LTV（无限期口径）', ltvInf, 'money'],
                ['LTV : CAC', isFinite(ltvInf) && v.cac > 0 ? (ltvInf / v.cac).toFixed(2) + ' : 1' : '—', 'str']];
    if (isFinite(payback)) rows.push(['CAC 回本月数', payback, 'num']);
    return rows.filter(function (r2) { return isFinite(r2[1]) || r2[2] === 'str'; });
  }""",
  "月流失率 8% 意味着平均存续约 12.5 个月；churn 翻倍，LTV 直接减半。")

t("repeat-purchase-rate-calculator", "复购率与留存计算器",
  "复购率、流失率与复购收入。",
  "根据期内总客户与复购客户数计算复购率与流失率，并按复购客户的年均订单数估算复购带来的收入。",
  "复购率 留存 流失 repeat",
  "refresh",
  [("total", "期内客户总数", 5000), ("repeat", "其中复购客户数", 1350),
   ("ordersPerRepeat", "复购客户年均订单数", 2.4), ("aov", "客单价（元）", 180)],
  """function (v) {
    var rpr = v.total > 0 ? v.repeat / v.total * 100 : 0;
    var churn = 100 - rpr;
    var extraRevenue = v.repeat * v.ordersPerRepeat * v.aov;
    return [['复购率', rpr, 'pct'], ['客户流失率', churn, 'pct'],
            ['复购客户贡献订单', v.repeat * v.ordersPerRepeat, 'int'],
            ['复购贡献年收入', extraRevenue, 'money'],
            ['复购收入占比参考', v.total > 0 ? extraRevenue / (v.total * v.aov) * 100 : 0, 'pct']];
  }""",
  "复购率的口径（期内 / 同期 cohort）要前后一致，否则趋势没有意义。")

t("shopify-transaction-fee-calculator", "Shopify 平台费计算器",
  "对比各套餐的月费与交易费。",
  "按订单量、客单价与支付方式，对比 Shopify Basic / Shopify / Advanced 三档套餐的月费、第三方交易费与支付处理费。",
  "shopify 套餐 平台费 交易费 transaction",
  "coins",
  [("orders", "月订单量", 300), ("aov", "客单价（元）", 180),
   ("thirdRate", "第三方网关附加费率（%）", 2.0, {'opts': {'2.0': '2.0%（Basic）', '1.0': '1.0%（Shopify）', '0.5': '0.5%（Advanced）'}}),
   ("useShopifyPay", "是否用 Shopify Payments", "yes", {'opts': {'yes': '是（仅支付处理费）', 'no': '否（另加第三方交易费）'}})],
  """function (v) {
    var gmv = v.orders * v.aov;
    var pay = gmv * 0.029 + v.orders * 0.3;
    var plans = [['Basic', 39, 2.0], ['Shopify', 105, 1.0], ['Advanced', 399, 0.5]];
    var rows = [['套餐', '月租($)', '交易费($)', '支付处理费($)', '月总费用($)']];
    plans.forEach(function (p) {
      var extra = v.useShopifyPay === 'yes' ? 0 : gmv * p[2] / 100;
      rows.push([p[0], p[1], extra.toFixed(0), pay.toFixed(0), (p[1] + extra + pay).toFixed(0)]);
    });
    return [['月 GMV', gmv, 'money'], ['支付处理费估算', pay, 'money'],
            ['head', '套餐对比（月费率为官方美元价）', 'head'],
            ['table', { head: rows[0], rows: rows.slice(1) }, 'table']];
  }""",
  "用 Shopify Payments 时没有第三方交易费，多数店铺先比较这条线就够。")
