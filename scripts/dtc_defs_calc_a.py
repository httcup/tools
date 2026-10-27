#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""DTC 电商计算器定义（一）：费用、单位经济、定价与毛利。

字段格式：(id, 标签, 默认值) 数字输入；(id, 标签, 默认值, {'opts': {...}}) 下拉。
calc 是 JS 函数源码：接收 v（输入值对象），返回结果行数组
[标签, 值, 类型]，类型：money / num / int / pct / str / head / table。
"""

TOOLS = []


def t(slug, name, desc, long, keys, icon, fields, calc, note=""):
    TOOLS.append(dict(slug=slug, name=name, desc=desc, long=long, keys=keys,
                      icon=icon, note=note, fields=fields, calc=calc))


# ---------------------------------------------------------------- 单位经济
t("shopify-stripe-fee-profit-margin-calculator", "订单利润率与手续费估算器",
  "扣除商品、履约、支付与广告成本后的订单贡献利润。",
  "输入售价、商品成本、履约费用、支付与平台费率、单笔广告费，估算每单贡献利润与利润率，并给出可承受 CPA 与盈亏平衡 ROAS。",
  "利润率 手续费 贡献利润 CPA ROAS shopify stripe 电商",
  "calc",
  [("price", "售价（元）", 199), ("cost", "商品成本（元）", 60), ("ship", "运费与履约（元）", 12),
   ("payRate", "支付费率（%）", 2.9), ("payFixed", "支付单笔固定费（元）", 0.3),
   ("platRate", "平台交易费率（%）", 0.6), ("ad", "单笔广告费（元）", 30), ("other", "其他成本（元）", 0)],
  """function (v) {
    var fee = v.price * v.payRate / 100 + v.payFixed + v.price * v.platRate / 100;
    var preAd = v.price - v.cost - v.ship - fee - v.other;
    var profit = preAd - v.ad;
    var cpa = preAd;
    var roas = cpa > 0 ? v.price / cpa : Infinity;
    return [
      ['支付与平台费合计', fee, 'money'],
      ['广告前贡献利润', preAd, 'money'],
      ['每单贡献利润（扣广告）', profit, 'money'],
      ['订单利润率', v.price > 0 ? profit / v.price * 100 : 0, 'pct'],
      ['可承受 CPA 上限', cpa, 'money'],
      ['盈亏平衡 ROAS', roas, 'num']
    ];
  }""",
  "盈亏平衡 ROAS = 售价 ÷ 广告前贡献利润；广告花费低于此值即盈利。")

t("break-even-roas-calculator", "盈亏平衡 ROAS 计算器",
  "算出覆盖成本的最低广告回报率与 CPA 上限。",
  "根据售价、商品成本、配送费用与支付网关费率，计算盈亏平衡 ROAS、可承受 CPA 上限与广告前利润率。",
  "ROAS CPA 盈亏平衡 广告 投放",
  "target",
  [("price", "售价（元）", 199), ("cost", "商品成本（元）", 60), ("ship", "配送费用（元）", 12),
   ("payRate", "支付费率（%）", 2.9), ("payFixed", "支付单笔固定费（元）", 0.3)],
  """function (v) {
    var fee = v.price * v.payRate / 100 + v.payFixed;
    var preAd = v.price - v.cost - v.ship - fee;
    return [
      ['支付费合计', fee, 'money'],
      ['广告前每单利润', preAd, 'money'],
      ['广告前利润率', v.price > 0 ? preAd / v.price * 100 : 0, 'pct'],
      ['可承受 CPA 上限', preAd, 'money'],
      ['盈亏平衡 ROAS', preAd > 0 ? v.price / preAd : Infinity, 'num'],
      ['当前广告打平所需客单', preAd > 0 ? 0 : NaN, 'money']
    ].filter(function (r) { return isFinite(r[1]); });
  }""",
  "实际 ROAS 高于盈亏平衡 ROAS 才有利润；建议再留出退款与损耗空间。")

t("stripe-payment-gateway-fee-calculator", "Stripe 手续费计算器",
  "估算收款手续费与扣费后到账金额。",
  "按 Stripe / PayPal Checkout 常见的百分比加固定费模式，估算收款手续费、扣费后金额，以及要实收指定金额所需的最低收费。",
  "stripe paypal 手续费 支付网关 收款",
  "coins",
  [("amount", "收款金额（元）", 100), ("rate", "费率（%）", 2.9), ("fixed", "单笔固定费（元）", 0.3),
   ("target", "目标实收金额（元，选填）", 0)],
  """function (v) {
    var fee = v.amount * v.rate / 100 + v.fixed;
    var rows = [['手续费', fee, 'money'], ['扣费后到账', v.amount - fee, 'money'],
                ['有效费率', v.amount > 0 ? fee / v.amount * 100 : 0, 'pct']];
    if (v.target > 0) {
      var gross = (v.target + v.fixed) / (1 - v.rate / 100);
      rows.push(['实收 ' + v.target + ' 元需收取', gross, 'money']);
    }
    return rows;
  }""",
  "费率按「百分比 + 单笔固定费」模型；跨境卡组织附加费请另行叠加。")

t("cross-border-landed-cost-calculator", "跨境到岸总成本计算器",
  "把头程、关税与杂费摊到每件商品。",
  "将工厂货价、头程运费、保险杂费、关税、可选进口增值税与本地履约费，按采购数量摊到每件商品，得到到岸单位成本。",
  "到岸成本 头程运费 关税 landed cost 采购",
  "globe",
  [("unit", "工厂单价（元）", 30), ("freight", "头程总运费（元）", 800), ("qty", "采购数量（件）", 200),
   ("ins", "保险与杂费（元）", 100), ("dutyRate", "关税税率（%）", 8), ("vatRate", "进口增值税（%）", 0),
   ("fulfill", "本地履约费（元/件）", 12)],
  """function (v) {
    var q = v.qty > 0 ? v.qty : 1;
    var perFreight = v.freight / q, perIns = v.ins / q;
    var base = v.unit + perFreight + perIns;
    var duty = base * v.dutyRate / 100;
    var vat = (base + duty) * v.vatRate / 100;
    var landed = base + duty + vat + v.fulfill;
    return [
      ['每件分摊运费', perFreight, 'money'],
      ['每件分摊保险杂费', perIns, 'money'],
      ['每件关税', duty, 'money'],
      ['每件进口增值税', vat, 'money'],
      ['head', '每件到岸总成本', 'head'],
      ['到岸单位成本', landed, 'money']
    ];
  }""",
  "到岸成本是定价、保本价与批发价的基准，建议随汇率与运价定期复核。")

t("us-import-duty-calculator", "美国进口关税计算器",
  "按从价税率估算美国进口关税。",
  "根据完税价格与综合从价税率估算美国进口关税与含税总成本。工具不查询税率、不判定商品归类，税率请以报关行核实为准。",
  "美国 关税 进口 import duty",
  "scale",
  [("value", "完税价格（元）", 1000), ("rate", "综合从价税率（%）", 12), ("other", "报关与其他杂费（元）", 0)],
  """function (v) {
    var duty = v.value * v.rate / 100;
    return [['关税', duty, 'money'], ['报关与杂费', v.other, 'money'],
            ['含税总成本', v.value + duty + v.other, 'money'],
            ['有效税率', v.value > 0 ? (duty + v.other) / v.value * 100 : 0, 'pct']];
  }""",
  "完税价格通常按货值 + 运费 + 保险计算；税率请以 HTS 归类核实结果为准。")

t("shopify-break-even-price-calculator", "保本售价计算器",
  "覆盖全部成本所需的最低售价。",
  "根据商品、履约、支付、平台与其他单件成本，计算保本售价；再按目标利润率倒推建议售价。",
  "保本价 定价 成本 加价",
  "percent",
  [("cost", "商品成本（元）", 60), ("ship", "履约与运费（元）", 12),
   ("payRate", "支付费率（%）", 2.9), ("platRate", "平台交易费率（%）", 0.6),
   ("fixed", "单件其他固定成本（元）", 0), ("targetMargin", "目标利润率（%，选填）", 0)],
  """function (v) {
    var feeRate = (v.payRate + v.platRate) / 100;
    var vc = v.cost + v.ship + v.fixed;
    var rows = [['变动成本合计', vc, 'money']];
    var be = vc / (1 - feeRate);
    rows.push(['保本售价', be, 'money']);
    var keep = 1 - feeRate - v.targetMargin / 100;
    if (v.targetMargin > 0 && keep > 0) rows.push(['目标利润率 ' + v.targetMargin + '% 售价', vc / keep, 'money']);
    return rows;
  }""",
  "售价低于保本价时，卖得越多亏得越多；先用保本价再做心理定价。")

t("markup-vs-margin-calculator", "加价率与利润率换算器",
  "在成本、加价率、利润率与售价之间换算。",
  "输入成本与加价率得到售价与利润率；同时给出想达到某利润率所需的加价率，看清两个百分比的区别。",
  "加价率 利润率 markup margin 换算",
  "percent",
  [("cost", "成本（元）", 60), ("markup", "加价率（%）", 67), ("wantMargin", "目标利润率（%）", 40)],
  """function (v) {
    var price = v.cost * (1 + v.markup / 100);
    var profit = price - v.cost;
    var margin = price > 0 ? profit / price * 100 : 0;
    var needMarkup = v.wantMargin < 100 ? v.wantMargin / (100 - v.wantMargin) * 100 : Infinity;
    var rows = [['售价', price, 'money'], ['单件利润', profit, 'money'],
                ['对应利润率', margin, 'pct'],
                ['利润率 ' + v.wantMargin + '% 所需加价率', needMarkup, 'pct']];
    return rows;
  }""",
  "加价率按成本计算、利润率按售价计算：加价 50% 只相当于利润率 33.3%。")

t("target-profit-pricing-calculator", "目标利润定价计算器",
  "从利润目标反推所需售价。",
  "输入月利润目标、固定成本、计划销量与单件变动成本，反推达标售价，并用敏感性表展示不同销量下的价格变化。",
  "目标利润 定价 反推",
  "target",
  [("target", "月利润目标（元）", 20000), ("fixed", "月固定成本（元）", 8000),
   ("units", "计划月销量（单）", 500), ("varCost", "单件变动成本（元）", 45),
   ("feeRate", "支付与平台费率（%）", 3.5)],
  """function (v) {
    var fr = v.feeRate / 100;
    var rows = [];
    [0.5, 0.8, 1, 1.2, 1.5].forEach(function (m) {
      var u = v.units * m;
      var p = (v.fixed + v.target) / u / (1 - fr) + v.varCost / (1 - fr);
      rows.push([u + ' 单时所需售价', p, 'money']);
    });
    return [['计划销量 ' + v.units + ' 单的建议售价', rows[2][1], 'money'],
            ['head', '销量敏感性', 'head']].concat(rows);
  }""",
  "销量不达预期时，同样利润目标需要更高售价；对照敏感性表预留调价空间。")

t("shopify-wholesale-pricing-calculator", "批发定价计算器",
  "算批发底价与零售商毛利空间。",
  "根据到岸单位成本、品牌目标贡献利润率与零售商目标毛利，计算批发底价与建议零售价，并核对最小起订量订单经济性。",
  "批发价 零售价 MOQ 经销",
  "tag",
  [("landed", "到岸单位成本（元）", 45), ("brandMargin", "品牌目标贡献利润率（%）", 50),
   ("retailMargin", "零售商目标毛利（%）", 40), ("moq", "最小起订量（件）", 100)],
  """function (v) {
    var whole = v.landed / (1 - v.brandMargin / 100);
    var retail = whole / (1 - v.retailMargin / 100);
    var moqProfit = (whole - v.landed) * v.moq;
    return [['批发底价', whole, 'money'], ['建议零售价', retail, 'money'],
            ['零售毛利空间', retail - whole, 'money'],
            ['MOQ ' + v.moq + ' 件的订单毛利', moqProfit, 'money']];
  }""",
  "批发价低于「到岸成本 ÷（1 − 目标利润率）」就会亏本供货。")

t("quantity-break-pricing-calculator", "阶梯定价计算器",
  "最多六档阶梯价的利润对比。",
  "为多件优惠设置最多六档阶梯价，逐档对比单件利润与利润率，并提示价格倒挂或低于成本的档位。",
  "阶梯价 多件优惠 数量折扣",
  "chart",
  [("cost", "单件成本（元）", 35),
   ("q1", "档 1 数量", 1), ("p1", "档 1 单价（元）", 99),
   ("q2", "档 2 数量", 2), ("p2", "档 2 单价（元）", 89),
   ("q3", "档 3 数量", 3), ("p3", "档 3 单价（元）", 79),
   ("q4", "档 4 数量（0 跳过）", 0), ("p4", "档 4 单价（元）", 0),
   ("q5", "档 5 数量（0 跳过）", 0), ("p5", "档 5 单价（元）", 0),
   ("q6", "档 6 数量（0 跳过）", 0), ("p6", "档 6 单价（元）", 0)],
  """function (v) {
    var rows = [['数量', '单价', '单件利润', '利润率', '状态']];
    var prev = Infinity;
    [[v.q1, v.p1], [v.q2, v.p2], [v.q3, v.p3], [v.q4, v.p4], [v.q5, v.p5], [v.q6, v.p6]].forEach(function (d) {
      if (d[0] <= 0 || d[1] <= 0) return;
      var profit = d[1] - v.cost;
      var margin = d[1] > 0 ? profit / d[1] * 100 : 0;
      var flag = profit <= 0 ? '低于成本' : (d[1] > prev ? '价格倒挂' : 'OK');
      prev = d[1];
      rows.push([d[0] + ' 件', d[1], profit.toFixed(2), margin.toFixed(1) + '%', flag]);
    });
    return [['head', '阶梯档位', 'head'], ['table', { head: rows[0], rows: rows.slice(1) }, 'table']];
  }""",
  "倒挂指高档数量单价反而高于低档，会被顾客薅羊毛；低于成本的档位会直接亏损。")

t("gross-margin-calculator-with-shipping", "含运费毛利计算器",
  "把运费补贴也算进毛利。",
  "输入到岸成本、售价、折扣、运费补贴与支付费率，分别计算毛利率、加价率与扣完运费后的单件贡献。",
  "毛利 运费 折扣 贡献",
  "percent",
  [("landed", "到岸成本（元）", 75), ("price", "售价（元）", 199), ("discount", "折扣（%）", 10),
   ("shipSub", "每单运费补贴（元）", 8), ("payRate", "支付费率（%）", 2.9)],
  """function (v) {
    var net = v.price * (1 - v.discount / 100);
    var cogs = v.landed + v.shipSub;
    var fee = net * v.payRate / 100;
    var profit = net - cogs - fee;
    return [['折后成交价', net, 'money'], ['商品+运费成本', cogs, 'money'],
            ['支付费', fee, 'money'], ['单件毛利', profit, 'money'],
            ['毛利率', net > 0 ? profit / net * 100 : 0, 'pct'],
            ['成本加价率', cogs > 0 ? profit / cogs * 100 : 0, 'pct']];
  }""",
  "包邮不是免费的：运费补贴应计入成本侧，毛利率会明显低于不包邮口径。")

t("shopify-net-profit-calculator", "店铺净利润计算器",
  "按月核算店铺净利润。",
  "按月销售额核算商品成本、履约、支付与平台费、广告、退款与税费后的净利润，并给出净利润率。",
  "净利润 月度 利润率 shopify",
  "chart",
  [("revenue", "月销售额（元）", 50000), ("cogsRate", "商品成本率（%）", 45), ("shipRate", "履约运费率（%）", 12),
   ("payRate", "支付与交易费率（%）", 3.2), ("platformFee", "平台月租与固定费（元）", 320),
   ("ad", "广告支出（元）", 8000), ("refundRate", "退款率（%）", 5), ("taxRate", "综合税率（%）", 0)],
  """function (v) {
    var refund = v.revenue * v.refundRate / 100;
    var preTax = v.revenue * (1 - v.cogsRate / 100 - v.shipRate / 100 - v.payRate / 100)
      - v.platformFee - v.ad - refund;
    var net = preTax * (1 - v.taxRate / 100);
    return [['退款金额', refund, 'money'], ['税前利润', preTax, 'money'], ['净利润', net, 'money'],
            ['净利润率', v.revenue > 0 ? net / v.revenue * 100 : 0, 'pct'],
            ['税后月利润', net, 'money']];
  }""",
  "各费率建议取对账单实付口径，而不是支付渠道标称费率。")

t("bundle-bogo-profit-calculator", "组合装与买一赠一利润计算器",
  "核算组合装 / BOGO 的每单贡献。",
  "选择组合装或买一赠一模式，输入单件售价与成本、组合价格、履约、支付与广告成本，核算每种促销形态扣除全部成本后的贡献利润。",
  "组合装 买一赠一 BOGO bundle 促销 利润",
  "cart",
  [("mode", "促销形态", "bogo", {'opts': {'bogo': '买一赠一（第二件 0 元）', 'bundle': '组合装（N 件一口价）'}}),
   ("price", "单件售价（元）", 99), ("cost", "单件商品成本（元）", 30),
   ("n", "组合装件数", 3), ("bundlePrice", "组合装一口价（元）", 249),
   ("ship", "履约与运费（元/单）", 12), ("payRate", "支付费率（%）", 2.9), ("ad", "单笔广告费（元）", 30)],
  """function (v) {
    var rev, cogs;
    if (v.mode === 'bundle') { rev = v.bundlePrice; cogs = v.cost * v.n; }
    else { rev = v.price; cogs = v.cost * 2; }
    var fee = rev * v.payRate / 100;
    var profit = rev - cogs - v.ship - fee - v.ad;
    var unitAvg = (v.mode === 'bundle' ? v.n : 2);
    return [['单笔收入', rev, 'money'], ['商品成本合计', cogs, 'money'],
            ['支付费', fee, 'money'], ['每单贡献利润', profit, 'money'],
            ['折算单件利润', unitAvg > 0 ? profit / unitAvg : 0, 'money'],
            ['贡献利润率', rev > 0 ? profit / rev * 100 : 0, 'pct']];
  }""",
  "买一赠一的真实成本是送出那一件的商品成本，而不是售价的一半。")

t("discount-margin-impact-calculator", "折扣利润影响计算器",
  "打折后每单利润与所需订单量。",
  "输入原价、折扣力度、成本与费率，计算折后每单贡献利润，以及要维持原总利润需要增加多少订单。",
  "折扣 打折 利润影响 订单量",
  "percent",
  [("price", "原价（元）", 199), ("discount", "折扣（%）", 20), ("cost", "商品与履约成本（元）", 80),
   ("feeRate", "支付与平台费率（%）", 3.5), ("orders", "当前月订单量", 1000)],
  """function (v) {
    var oldP = v.price, newP = v.price * (1 - v.discount / 100);
    var oldU = oldP - v.cost - oldP * v.feeRate / 100;
    var newU = newP - v.cost - newP * v.feeRate / 100;
    var need = newU > 0 ? Math.ceil(v.orders * oldU / newU) : Infinity;
    var rows = [['折后成交价', newP, 'money'], ['原每单利润', oldU, 'money'],
                ['折后每单利润', newU, 'money'], ['每单利润变化', newU - oldU, 'money'],
                ['维持总利润需订单量', need, 'int'],
                ['需增长', isFinite(need) && v.orders > 0 ? (need / v.orders - 1) * 100 : 0, 'pct']];
    return rows.filter(function (r) { return isFinite(r[1]); });
  }""",
  "折扣 20% 时若毛利率只有 25%，订单量要翻数倍才能补回利润，慎打深折。")

t("coupon-profitability-calculator", "优惠券利润计算器",
  "优惠券活动的净影响与保本条件。",
  "输入使用率、转化率变化、客单与贡献利润率，测算优惠券的成本、带来的增量订单与净影响，并给出保本增量订单数。",
  "优惠券 coupon 活动 增量",
  "tag",
  [("sessions", "活动覆盖访客数", 5000), ("convNo", "无券转化率（%）", 2.0), ("convWith", "有券转化率（%）", 2.5),
   ("aov", "客单价（元）", 180), ("cmRate", "贡献利润率（%）", 35), ("coupon", "每单券额（元）", 20),
   ("fixed", "活动固定成本（元）", 500)],
  """function (v) {
    var oNo = v.sessions * v.convNo / 100, oWith = v.sessions * v.convWith / 100;
    var inc = oWith - oNo;
    var extraCm = inc * v.aov * v.cmRate / 100;
    var couponCost = oWith * v.coupon;
    var net = extraCm - couponCost - v.fixed;
    var beOrders = (v.aov * v.cmRate / 100) > 0 ? (couponCost + v.fixed) / (v.aov * v.cmRate / 100) : Infinity;
    var rows = [['无券订单', oNo, 'int'], ['有券订单', oWith, 'int'], ['增量订单', inc, 'int'],
                ['增量贡献', extraCm, 'money'], ['券额总成本', couponCost, 'money'],
                ['净影响', net, 'money']];
    if (isFinite(beOrders)) rows.push(['保本增量订单', Math.ceil(beOrders), 'int']);
    return rows;
  }""",
  "把本来就会下单的顾客也发了券，是优惠券亏钱的常见原因，尽量圈定新客或沉睡客。")

t("free-shipping-threshold-calculator", "包邮门槛计算器",
  "算不亏本的包邮门槛与购物车文案。",
  "根据客单价、每单运费与毛利率，测算保本包邮门槛，并预览购物车提示文案。",
  "包邮 免运费 门槛 free shipping",
  "truck",
  [("aov", "当前客单价（元）", 85), ("ship", "每单运费（元）", 8), ("marginRate", "商品毛利率（%）", 40),
   ("lift", "目标客单提升（%）", 15)],
  """function (v) {
    var t = v.marginRate > 0 ? v.aov + v.ship * 100 / v.marginRate : v.aov;
    var nice = Math.ceil(t / 5) * 5;
    var extra = t - v.aov;
    return [['保本包邮门槛', t, 'money'], ['建议对外门槛（取整）', nice, 'money'],
            ['顾客需再加购', extra, 'money'],
            ['目标提升后客单', v.aov * (1 + v.lift / 100), 'money']];
  }""",
  "对外门槛略高于保本值（如取整到 5 / 10 元），既能盖住运费又更好看。")

t("shipping-rate-markup-calculator", "运费加价计算器",
  "按成本设定客户运费并看补贴。",
  "输入运费成本与加价率或目标利润率，计算向顾客收取的运费、单均利润或品牌补贴，以及月度影响。",
  "运费 加价 补贴 shipping",
  "truck",
  [("shipCost", "每单运费成本（元）", 12), ("markup", "运费加价率（%）", 20),
   ("orders", "月订单量", 300)],
  """function (v) {
    var charged = v.shipCost * (1 + v.markup / 100);
    var per = charged - v.shipCost;
    return [['向顾客收取', charged, 'money'], ['每单利润', per, 'money'],
            ['每单品牌补贴', per, 'money'],
            ['月度合计', per * v.orders, 'money']];
  }""",
  "结果行中「每单利润」为正即加价盈利；为负时看「每单品牌补贴」了解每单让利多少。")

t("shipping-cost-per-order-calculator", "单均运费计算器",
  "把附加费合成真实单均运费。",
  "把承运商基础运费、燃油附加、住宅附加、折扣与包材合成单均运费，并对照客单价看占比。",
  "运费 燃油附加 住宅附加 单均",
  "truck",
  [("base", "基础运费（元）", 15), ("fuel", "燃油附加（%）", 12), ("residential", "住宅附加费（元）", 4),
   ("discount", "账户折扣（%）", 10), ("packaging", "包材与操作费（元）", 2), ("aov", "客单价（元）", 180)],
  """function (v) {
    var withFuel = v.base * (1 + v.fuel / 100) + v.residential;
    var carrier = withFuel * (1 - v.discount / 100);
    var per = carrier + v.packaging;
    return [['加燃油与住宅附加后', withFuel, 'money'], ['折扣后承运费', carrier, 'money'],
            ['单均运费（含包材）', per, 'money'], ['占客单价比例', v.aov > 0 ? per / v.aov * 100 : 0, 'pct']];
  }""",
  "燃油附加每月浮动，建议用上月账单的实际值回填。")

t("dimensional-weight-calculator", "体积重计算器",
  "算包裹计费重，避免运费惊吓。",
  "根据包裹尺寸与承运商 divisor 计算体积重，与实际重量比较后给出计费重量。",
  "体积重 抛货 计费重 dimensional weight",
  "box",
  [("l", "长（cm）", 30), ("w", "宽（cm）", 20), ("h", "高（cm）", 15),
   ("divisor", "Divisor", 8000, {'opts': {'5000': '5000（国际快递常用）', '6000': '6000', '8000': '8000（专线常用）', '12000': '12000'}}),
   ("actual", "实际重量（kg）", 1.2)],
  """function (v) {
    var vol = v.l * v.w * v.h / v.divisor;
    var bill = Math.max(vol, v.actual);
    return [['体积重', vol, 'num'], ['实际重量', v.actual, 'num'],
            ['计费重量', bill, 'num'],
            ['是否抛货', vol > v.actual ? '是（按体积重计费）' : '否（按实重计费）', 'str']];
  }""",
  "同一包裹不同承运商 divisor 不同，比价时务必统一口径。")

# ---------------------------------------------------------------- 退款与售后
t("ecommerce-return-cost-calculator", "退货成本与利润影响计算器",
  "估算退货率对一段订单的贡献侵蚀。",
  "输入订单量、客单价、退货率、来回运费、处理成本、可再售比例与商品成本率，估算退货对总贡献利润的影响。",
  "退货 退货率 售后 贡献利润",
  "refresh",
  [("orders", "订单量", 500), ("aov", "客单价（元）", 180), ("returnRate", "退货率（%）", 8),
   ("shipBoth", "来回运费（元）", 16), ("handling", "处理人工（元/单）", 6),
   ("restock", "可再售比例（%）", 70), ("cogsRate", "商品成本率（%）", 45)],
  """function (v) {
    var returns = v.orders * v.returnRate / 100;
    var lost = v.returnRate / 100 * (v.aov * v.cogsRate / 100 * (1 - v.restock / 100));
    var perOrder = v.returnRate / 100 * (v.shipBoth + v.handling) + lost;
    var total = perOrder * v.orders;
    return [['预计退货单数', returns, 'int'], ['每单期望退货成本', perOrder, 'money'],
            ['本期退货总成本', total, 'money'],
            ['占销售额比例', v.orders > 0 ? total / (v.orders * v.aov) * 100 : 0, 'pct']];
  }""",
  "不可再售的商品损失按成本价计；若走海外仓销毁还要加处置费。")

t("refund-loss-calculator", "退款损失计算器",
  "单笔退款的真实现金影响。",
  "核算一笔退款中支付手续费损失、已付运费、重新上架人工与商品成本回收情况，得到净现金损失。",
  "退款 损失 手续费 refund",
  "refresh",
  [("refund", "退款金额（元）", 199), ("payRate", "支付费率（%）", 2.9), ("payFixed", "支付单笔固定费（元）", 0.3),
   ("shipPaid", "已产生运费（元）", 10), ("restock", "重新上架人工（元）", 5),
   ("cogs", "商品成本（元）", 60), ("recover", "商品回收情况", "yes", {'opts': {'yes': '可再售（回收商品价值）', 'no': '不可再售（货损）'}})],
  """function (v) {
    var feeKept = v.refund * v.payRate / 100 + v.payFixed;
    var goods = v.recover === 'yes' ? 0 : v.cogs;
    var loss = feeKept + v.shipPaid + v.restock + goods;
    return [['不退的手续费', feeKept, 'money'], ['运费损失', v.shipPaid, 'money'],
            ['重新上架人工', v.restock, 'money'], ['商品货损', goods, 'money'],
            ['单笔净损失', loss, 'money'],
            ['占退款金额', v.refund > 0 ? loss / v.refund * 100 : 0, 'pct']];
  }""",
  "多数网关退款不退手续费，这笔「看不见的钱」在退款量大时非常可观。")

t("exchange-vs-refund-cost-calculator", "换货与退款成本对比计算器",
  "一次售后走换货还是退款更划算。",
  "对比每次换货的净成本与直接退款的损失，结合月度售后量估算期望成本差异与保本保留贡献。",
  "换货 退款 售后 exchange refund",
  "refresh",
  [("aov", "客单价（元）", 180), ("cmRate", "贡献利润率（%）", 35), ("payRate", "支付费率（%）", 2.9),
   ("shipBack", "退款来回运费（元）", 10), ("exShip", "换货运费（元）", 12), ("handling", "单次处理人工（元）", 5),
   ("cases", "月均售后单数", 40), ("exShare", "预计可转换单占比（%）", 40)],
  """function (v) {
    var refundLoss = v.aov * v.cmRate / 100 + v.aov * v.payRate / 100 + v.shipBack + v.handling;
    var exCost = v.exShip + v.handling;
    var saved = (refundLoss - exCost) * v.cases * v.exShare / 100;
    return [['一次退款净损失', refundLoss, 'money'], ['一次换货净成本', exCost, 'money'],
            ['每次转换可省', refundLoss - exCost, 'money'],
            ['按当前占比月度可省', saved, 'money']];
  }""",
  "换货能保住收入与贡献利润；前提是换出商品质检合格、二次退货率不高。")

# ---------------------------------------------------------------- 转化与增长
t("ecommerce-conversion-rate-calculator", "电商转化率计算器",
  "五步漏斗找最大流失环节。",
  "输入访客、商详、加购、结算与成交人数，计算各环节转化率，找出流失最严重的一步，并估算达成目标订单所需流量。",
  "转化率 漏斗 conversion 流失",
  "target",
  [("visitors", "访客数", 10000), ("viewed", "浏览商品页", 6000), ("cart", "加入购物车", 1200),
   ("checkout", "进入结算", 600), ("orders", "成交订单", 220), ("target", "目标订单数", 300)],
  """function (v) {
    var steps = [['访问→商详', v.visitors, v.viewed], ['商详→加购', v.viewed, v.cart],
                 ['加购→结算', v.cart, v.checkout], ['结算→成交', v.checkout, v.orders]];
    var rows = [['整体转化率', v.visitors > 0 ? v.orders / v.visitors * 100 : 0, 'pct']];
    var worst = null, worstRate = Infinity;
    steps.forEach(function (s) {
      var r = s[1] > 0 ? s[2] / s[1] * 100 : 0;
      if (r < worstRate) { worstRate = r; worst = s[0]; }
      rows.push([s[0], r, 'pct']);
    });
    rows.push(['最薄弱环节', worst || '—', 'str']);
    if (v.orders > 0) rows.push(['达成 ' + v.target + ' 单需访客', Math.ceil(v.visitors * v.target / v.orders), 'int']);
    return rows;
  }""",
  "先修最薄弱的一环再谈加预算：漏斗里提升 1 个百分点的价值远超加倍投放。")

t("aov-revenue-per-visitor-calculator", "客单价与访客收入计算器",
  "算 RPV 并分渠道对比。",
  "按渠道输入访客数、转化率与客单价，计算各渠道收入、客单价与访客收入（RPV），并汇总加权总值。",
  "客单价 aov rpv 访客价值 渠道",
  "chart",
  [("s1", "渠道 A 访客", 6000), ("c1", "渠道 A 转化率（%）", 2.5), ("a1", "渠道 A 客单（元）", 200),
   ("s2", "渠道 B 访客", 3000), ("c2", "渠道 B 转化率（%）", 1.8), ("a2", "渠道 B 客单（元）", 150),
   ("s3", "渠道 C 访客（0 跳过）", 1000), ("c3", "渠道 C 转化率（%）", 2.0), ("a3", "渠道 C 客单（元）", 160)],
  """function (v) {
    var rows = [['渠道', '访客', '订单', '收入', '客单价', 'RPV']];
    var ts = 0, to = 0, trev = 0;
    [[v.s1, v.c1, v.a1, 'A'], [v.s2, v.c2, v.a2, 'B'], [v.s3, v.c3, v.a3, 'C']].forEach(function (d) {
      if (d[0] <= 0) return;
      var o = d[0] * d[1] / 100, rev = o * d[2];
      ts += d[0]; to += o; trev += rev;
      rows.push(['渠道 ' + d[3], d[0], o.toFixed(1), rev.toFixed(0), d[2], (rev / d[0]).toFixed(2)]);
    });
    var out = [['加权客单价', to > 0 ? trev / to : 0, 'money'],
               ['综合 RPV', ts > 0 ? trev / ts : 0, 'money'],
               ['head', '分渠道明细', 'head'], ['table', { head: rows[0], rows: rows.slice(1) }, 'table']];
    return out;
  }""",
  "RPV = 收入 ÷ 访客，是同时反映转化与客单的综合指标，适合跨渠道比较。")

TOOLS
