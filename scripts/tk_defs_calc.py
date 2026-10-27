#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ToolKnit 批次定义（一）：声明式计算器（复用 DTC 计算器引擎）。"""

TOOLS = []


def t(slug, name, desc, long, keys, cat, icon, fields, calc, note=""):
    TOOLS.append(dict(slug=slug, name=name, desc=desc, long=long, keys=keys,
                      cat=cat, icon=icon, note=note, fields=fields, calc=calc))


t("tip-calculator", "小费计算器",
  "聚餐 AA 与小费一步算清。",
  "输入账单金额、小费比例与人数，算出小费、总额与每人应付，支持抹零取整。",
  "小费 tip aa 聚餐 分摊",
  "calc-utility", "coins",
  [("bill", "账单金额（元）", 380), ("tipRate", "小费比例（%）", 15, {'opts': {'0': '0%（不付小费）', '10': '10%', '12': '12%', '15': '15%（常用）', '18': '18%', '20': '20%'}}),
   ("people", "人数", 4), ("round", "每人取整", "none", {'opts': {'none': '不取整', 'up': '向上取整', 'near': '四舍五入'}})],
  """function (v) {
    var tip = v.bill * v.tipRate / 100;
    var total = v.bill + tip;
    var per = v.people > 0 ? total / v.people : 0;
    if (v.round === 'up') per = Math.ceil(per);
    if (v.round === 'near') per = Math.round(per);
    var paid = per * v.people;
    return [['小费', tip, 'money'], ['含小费总额', total, 'money'],
            ['每人应付', per, 'money'],
            ['按人数合计收到', paid, 'money'],
            ['抹零差额', paid - total, 'money']];
  }""",
  "国内多数情况不用付小费；出境游时部分国家服务费已含在账单里，先看账单再给。")

t("meeting-cost-calculator", "会议成本计算器",
  "一场会到底烧多少钱。",
  "按参会人数、平均时薪与会议时长估算单场会议的人力成本，并按每周会议频次推算月度与年度总成本。",
  "会议 成本 效率 meeting",
  "calc-utility", "target",
  [("people", "参会人数", 8), ("rate", "平均时薪（元）", 120), ("minutes", "会议时长（分钟）", 60),
   ("perWeek", "每周这类会议场次", 5)],
  """function (v) {
    var cost = v.people * v.rate * v.minutes / 60;
    return [['单场会议成本', cost, 'money'],
            ['每周成本', cost * v.perWeek, 'money'],
            ['每月成本（按 4.3 周）', cost * v.perWeek * 4.3, 'money'],
            ['年度成本', cost * v.perWeek * 52, 'money'],
            ['人均每小时', v.rate, 'money'],
            ['参会人年投入（小时）', v.people * v.minutes / 60 * v.perWeek * 52, 'num']];
  }""",
  "把「年度成本」念出来，是砍掉多余会议最有效的方式。")

t("time-tools-seconds-converter", "时间戳转换器",
  "时间戳与日期双向换算。",
  "在 Unix 时间戳（秒/毫秒）与日期时间之间双向换算，支持北京时间与 UTC 显示，并提供当前时间戳。",
  "时间戳 unix timestamp 转换",
  "time-focus", "clock",
  [("ts", "时间戳（秒或毫秒，自动识别）", 1760000000)],
  """function (v) {
    var ms = v.ts > 1e12 ? v.ts : (v.ts > 1e10 ? v.ts : v.ts * 1000);
    var d = new Date(ms);
    if (isNaN(d.getTime())) return [['无法识别的时间戳', '—', 'str']];
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var bj = new Date(ms + 8 * 3600000);
    var bjs = bj.getUTCFullYear() + '-' + pad(bj.getUTCMonth() + 1) + '-' + pad(bj.getUTCDate()) + ' ' + pad(bj.getUTCHours()) + ':' + pad(bj.getUTCMinutes()) + ':' + pad(bj.getUTCSeconds());
    var diff = (Date.now() - ms) / 1000;
    var rel = Math.abs(diff) < 60 ? '刚刚' :
      Math.abs(diff) < 3600 ? Math.round(Math.abs(diff) / 60) + ' 分钟' :
      Math.abs(diff) < 86400 ? Math.round(Math.abs(diff) / 3600) + ' 小时' :
      Math.round(Math.abs(diff) / 86400) + ' 天';
    rel = (diff >= 0 ? '过去 ' : '未来 ') + rel;
    return [['北京时间', bjs, 'str'], ['UTC', d.toISOString().replace('T', ' ').slice(0, 19), 'str'],
            ['毫秒时间戳', ms, 'int'], ['相对现在', rel, 'str'],
            ['星期', '日一二三四五六'[bj.getUTCDay()], 'str']];
  }""",
  "10 位是秒、13 位是毫秒，工具按位数自动识别；页面打开时即显示当前时间戳见下方说明。")
