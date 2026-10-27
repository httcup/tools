# scripts

移植与生成脚本。`port.py` 需要 tools 站点的构建产物（仓库以分卷 zip 形式存放于
github.com/httcup/tools，合并解压后把 site-root 路径传入脚本）。

- `port.py <目标目录>` — 复制中文页面并改写 `/tools/` → `../`
- `extract.py` — 从原首页提取 59 个工具的名称/描述/图标 → port/tools.json
- `build_hub.py` — 生成全中文导航首页 index.html
- `build_meta.py` — 生成 sitemap.xml / feed.xml / llms.txt / robots.txt / manifest.json
- `translate.py <目标目录>` — 界面短语汉化
- `check_links.py <目标目录>` — 检查全站本地引用完整性
