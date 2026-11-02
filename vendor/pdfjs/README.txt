pdf.js 3.11.174（Mozilla，Apache License 2.0）
https://github.com/mozilla/pdf.js

这里存的是官方发布包的 build/pdf.min.js 与 build/pdf.worker.min.js，未做改动。
两个文件都完整保留了文件头里的 @licstart / @licend 许可声明。

本站用它在浏览器里解析并渲染 PDF，供「PDF 转图片 / Word / PPT / 网页」几个工具使用。
运行时不联网：worker 从本站同一路径加载，字体与图像解码全部在本机完成。

升级步骤：从 https://cdnjs.cloudflare.com/ajax/libs/pdf.js/<版本>/ 取两个同名文件覆盖，
然后改 js/pdf-kit.js 里的 PDFJS_PATH / WORKER_PATH（如文件名变了）。
