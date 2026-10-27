# Markdown 转 Word：把 AI 回答存成 .docx

把 AI 回答或 Markdown 文本粘贴进来，或导入 .md / .txt 文件，选好字体、字号、行距和页边距，预览后下载 .docx。多级标题、列表、基础表格和常见 LaTeX 公式（`$…$`、`$$…$$`、`\(…\)`、`\[…\]`）都会转成 Word 原生结构，下载后可以在 Word、WPS、Pages 里继续编辑。

页面地址：https://httcup.github.io/tools/md-to-word/

## 怎么用

1. 复制 AI 回答里的 Markdown 原文（不是截图），粘贴到左侧输入区，或点「载入示例」看效果。
2. 在上方选字体、字号、行距、页边距，需要的话勾选正文首行缩进。
3. 检查右侧预览和底部提示，点「下载 Word」（或按 Ctrl / Cmd + S）。

## 能力与限制

- 标题、嵌套列表、管道表格、引用、围栏代码块按 Word 原生样式转换。
- 常见 LaTeX 公式转成 Word 公式对象（OMML），可以继续编辑；认不出的语法按原样保留并给出提示。
- 不访问内容里的图片地址，图片按「［图片：说明］」保留位置提示。
- 转换完全在浏览器本地完成：不发起网络请求、不上传正文、不保存草稿，刷新或关闭页面内容即消失。

## 相关工具

- [图片合成 PDF](https://httcup.github.io/tools/images-to-pdf/)
- [PDF 合并与拆分](https://httcup.github.io/tools/merge-pdf/)
- [文本比对](https://httcup.github.io/tools/text-diff/)
