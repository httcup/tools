# Local WebTools 本地工具箱

一个注重隐私的纯前端本地工具箱。无需注册、打开即用，所有文件与文本处理均在浏览器本地完成，数据不会上传到任何服务器。

部署地址：`https://httcup.github.io/tools/`

## 功能总览

首页为全中文导航（支持搜索、分类筛选、收藏），共收录 **140 个工具**：

| 分类 | 数量 | 来源 |
|------|------|------|
| 图片 | 19 | 移植自 [httcup/tools](https://github.com/httcup/tools)（MIT / 文字 CC BY 4.0） |
| 视频与动画 | 14 | 同上 |
| 文档与音频 | 14 | 同上 |
| 文本、编码与密码 | 13 | 同上 |
| 连接设备 | 5 | 同上 |
| 计算与实用 | 11 | 本仓库新增（`scripts/build_batch_tools.py` 生成） |
| Shopify/DTC电商工具 | 53 | 本仓库新增（`scripts/build_dtc_tools.py` 生成） |
| 本地快用 | 11 | 本仓库原有工具（`quick/`） |

- **Shopify/DTC电商工具**（53 个）：订单利润率、盈亏平衡 ROAS、到岸成本、退货与退款损失、库存补货/EOQ/安全库存、LTV/CAC/MER、Etsy/TikTok/Amazon/WooCommerce 平台费对比、JSON-LD 生成器、商品 CSV 与 Google Feed 检查器等，参考 dtcstackhq 工具清单自研实现，未复制第三方代码。
- **Markdown 转 Word**（`md-to-word/`）：粘贴 AI 回答或 Markdown，本地生成可编辑 .docx，LaTeX 公式转 Word 公式对象，无需任何依赖。
- **计算与实用**（11 个）：BMI、房贷、百分比、复利、日期天数、年龄、打折、单位换算、时区换算、文字转语音、在线录音；另有删除重复行、删除换行、文本排序、随机抽签（文本类）与图片格式转换（图片类）。
- **本地快用**（`/quick/`）：Base64、URL、HTML 实体、Hex 编解码，MD5/SHA 哈希，UUID，随机密码，时间戳，JSON 格式化，文本统计，大小写转换。支持 `quick/#base64` 这类深链接。
- 每个移植工具保留了原站的独立页面、离线缓存（Service Worker）与「本地处理」实时核对面板。
- 指南文档位于 `guides/`，站点元数据（sitemap / feed / llms.txt / robots）已按新路径重新生成。
- 全站默认简体中文（`lang="zh-CN"`），已移除多语言切换与对应语言副本。

## 技术说明

- 纯静态站点：HTML + CSS + 原生 JavaScript，无任何构建依赖
- 哈希计算使用 Web Crypto API（SHA 系列）与标准 MD5 实现
- 随机数全部来自 `crypto.getRandomValues`，安全可靠
- 所有计算在浏览器本地完成，无远程接口、无埋点、无追踪

## 部署方法

- **Cloudflare Pages**：站点源码直接放在仓库根目录，Cloudflare Pages 连接本仓库即可部署（自定义域名 tools.xhxh.vip）。
- **GitHub Pages**：Settings → Pages → Deploy from branch → main / root，同样直接生效。
- 页面内资源引用全部为相对路径，根域名部署与 `/tools/` 子路径部署均可正常工作。

本地预览（必须走 http，直接双击打开无法加载 JS 模块）：

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 目录结构

```
.
├── index.html        # 全中文导航首页（搜索 / 分类 / 收藏）
├── css/ js/          # 首页样式与交互
├── quick/            # 本仓库原有的 11 个本地小工具
├── <slug>/           # 59 个移植工具，每个一个独立目录
├── guides/           # 使用指南
├── site.css          # 工具页与指南页共用样式
├── lang.js 等        # 工具页共享脚本
└── sitemap.xml / feed.xml / llms.txt / robots.txt
```

## 隐私声明

本项目不收集任何数据。所有输入输出都只存在于您的浏览器内存中，关闭页面即消失。连接设备类工具（对讲机、远程摄像头等）会在页面上明确说明其连接方式。

## 维护脚本

`scripts/` 目录包含站点的移植与生成脚本（不参与部署）：

- `port.py` — 从 tools 站点构建产物复制并改写路径
- `extract.py` / `build_hub.py` — 提取工具清单并生成首页
- `build_meta.py` — 生成 sitemap / feed / llms.txt / manifest
- `translate.py` — 界面短语汉化
- `check_links.py` — 检查全站本地引用是否完整
