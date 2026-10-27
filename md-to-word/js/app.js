/* 页面交互：解析 → 预览 → 下载。没有网络请求，没有本地存储。 */
(function () {
  'use strict';

  var AITW = window.AITW;
  var input = document.getElementById('input');
  var preview = document.getElementById('preview');
  var statsEl = document.getElementById('stats');
  var noticeEl = document.getElementById('notice');
  var downloadBtn = document.getElementById('download');
  var nameInput = document.getElementById('opt-name');
  var fileInput = document.getElementById('file');

  var optFont = document.getElementById('opt-font');
  var optSize = document.getElementById('opt-size');
  var optLine = document.getElementById('opt-line');
  var optMargin = document.getElementById('opt-margin');
  var optIndent = document.getElementById('opt-indent');

  var state = { blocks: [], stats: null, timer: 0, nameTouched: false, busy: false };

  var SAMPLE = [
    '# 大语言模型推理成本分析',
    '',
    '> 本文由 AI 生成，数据截至 2026 年 9 月。粘贴到这里是为了演示排版。',
    '',
    '## 一、结论先行',
    '',
    '推理成本主要由三部分构成：**显存占用**、*单次前向计算量*、以及批处理效率。',
    '',
    '- 显存占用决定单卡能塞下多大的模型',
    '- 计算量随序列长度线性增长，随层数线性增长',
    '  1. 注意力部分随上下文长度呈平方增长',
    '  2. 前馈部分与长度无关',
    '- 批处理把固定开销摊薄，但受限于显存',
    '',
    '## 二、关键公式',
    '',
    '单位 token 的浮点运算量可以粗略写成：',
    '',
    '$$ C \\approx 2 \\cdot N \\cdot P $$',
    '',
    '其中 $N$ 是参数量，$P$ 是 token 数。如果要做 KV 缓存，显存占用为：',
    '',
    '$$ M_{kv} = 2 \\cdot L \\cdot H \\cdot d \\cdot s \\cdot b \\cdot \\frac{1}{10^9} $$',
    '',
    '注意力计算量则随上下文长度 $s$ 变化：',
    '',
    '$$ A(s) = 4 \\cdot b \\cdot L \\cdot H \\cdot d \\cdot s^2 $$',
    '',
    '## 三、实测数据',
    '',
    '| 模型规模 | 单卡显存 | 吞吐（tok/s） | 成本（元/百万 token） |',
    '| --- | ---: | ---: | ---: |',
    '| 7B | 16 GB | 1,850 | 0.42 |',
    '| 13B | 32 GB | 960 | 0.78 |',
    '| 70B | 80 GB × 2 | 210 | 3.15 |',
    '',
    '## 四、一个最小的估算脚本',
    '',
    '```python',
    'def kv_cache_gb(layers, heads, head_dim, seq, batch=1, dtype_bytes=2):',
    '    return 2 * layers * heads * head_dim * seq * batch * dtype_bytes / 1024 ** 3',
    '',
    'print(kv_cache_gb(32, 32, 128, 8192))',
    '```',
    '',
    '## 五、注意',
    '',
    '1. 这里的数字是量级估算，不是基准测试结果',
    '2. 实际成本还要算上电费、网络和调度开销',
    '3. 长上下文场景下，KV 缓存经常比权重更吃显存',
    '',
    '---',
    '',
    '参考资料：[Attention Is All You Need](https://arxiv.org/abs/1706.03762)。'
  ].join('\n');

  function readOptions() {
    return {
      font: optFont.value,
      size: parseFloat(optSize.value),
      lineSpacing: parseFloat(optLine.value),
      marginCm: parseFloat(optMargin.value),
      indent: optIndent.checked,
      title: nameInput.value.trim() || '文档'
    };
  }

  function applyPaperStyle() {
    var opts = readOptions();
    preview.style.setProperty('--pv-font', '"' + opts.font + '", "Microsoft YaHei", "PingFang SC", sans-serif');
    preview.style.setProperty('--pv-size', (opts.size * 1.333).toFixed(2) + 'px');
    preview.style.setProperty('--pv-line', String(opts.lineSpacing));
    preview.style.setProperty('--pv-pad', (opts.marginCm * 12.6).toFixed(1) + 'px');
    preview.classList.toggle('indent', opts.indent);
  }

  function formatNumber(n) {
    return n.toLocaleString('zh-CN');
  }

  function updateStats() {
    var s = state.stats;
    if (!s || !state.blocks.length) {
      statsEl.textContent = '等待输入';
      noticeEl.hidden = true;
      return;
    }
    var parts = [formatNumber(s.chars) + ' 字'];
    if (s.formulas) parts.push(s.formulas + ' 个公式');
    if (s.tables) parts.push(s.tables + ' 张表');
    if (s.codeBlocks) parts.push(s.codeBlocks + ' 段代码');
    if (s.images) parts.push(s.images + ' 处图片转成文字');
    parts.push('约 ' + Math.max(1, Math.round(s.chars / 500)) + ' 页');
    statsEl.textContent = parts.join(' · ');

    var warnings = [];
    if (s.formulaErrors) {
      warnings.push(s.formulaErrors + ' 个公式语法没解析出来，Word 里会保留原始 LaTeX 文本，可以下载后手改。');
    }
    var unterminated = state.blocks.filter(function (b) { return b.type === 'math' && b.unterminated; });
    if (unterminated.length) warnings.push('有公式块没有找到结束的 $$，已按到文末处理。');
    if (warnings.length) {
      noticeEl.hidden = false;
      noticeEl.textContent = warnings.join(' ');
    } else {
      noticeEl.hidden = true;
    }
  }

  function render() {
    var text = input.value;
    var parsed = AITW.parseMarkdown(text);
    state.blocks = parsed.blocks;
    state.stats = parsed.stats;
    preview.innerHTML = AITW.renderPreview(parsed.blocks);
    updateStats();
    autoName(parsed.blocks);
  }

  function autoName(blocks) {
    if (state.nameTouched) return;
    var heading = null;
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].type === 'heading') { heading = blocks[i]; break; }
    }
    if (!heading) return;
    var text = (heading.inline || []).map(function (n) {
      return n.t === 'text' || n.t === 'code' ? n.v : (n.children ? n.children.map(function (c) { return c.v || ''; }).join('') : '');
    }).join('').trim();
    if (text) nameInput.value = text.slice(0, 60);
  }

  function scheduleRender() {
    clearTimeout(state.timer);
    state.timer = setTimeout(render, 120);
  }

  function setBusy(busy) {
    state.busy = busy;
    downloadBtn.disabled = busy;
    downloadBtn.textContent = busy ? '正在生成…' : '下载 Word';
  }

  async function download() {
    if (state.busy) return;
    if (!input.value.trim()) {
      input.focus();
      statsEl.textContent = '先粘贴点内容，再下载';
      return;
    }
    setBusy(true);
    try {
      render();
      var opts = readOptions();
      var result = await AITW.buildDocx({ blocks: state.blocks }, opts);
      var url = URL.createObjectURL(result.blob);
      var anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = AITW.safeFileName(opts.title);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      statsEl.textContent = '已生成 ' + anchor.download + ' · ' + Math.round(result.bytes.length / 1024) + ' KB';
    } catch (err) {
      noticeEl.hidden = false;
      noticeEl.textContent = '生成失败：' + (err && err.message ? err.message : '未知错误') + '。可以刷新页面再试一次。';
      if (window.console) console.error(err);
    } finally {
      setBusy(false);
    }
  }

  /* ---------- 事件 ---------- */

  input.addEventListener('input', scheduleRender);

  [optFont, optSize, optLine, optMargin, optIndent].forEach(function (el) {
    el.addEventListener('change', function () {
      applyPaperStyle();
    });
  });

  nameInput.addEventListener('input', function () { state.nameTouched = true; });

  downloadBtn.addEventListener('click', download);

  document.getElementById('sample').addEventListener('click', function () {
    state.nameTouched = false;
    input.value = SAMPLE;
    render();
    input.focus();
  });

  document.getElementById('clear').addEventListener('click', function () {
    input.value = '';
    state.nameTouched = false;
    nameInput.value = '文档';
    render();
    input.focus();
  });

  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    loadFile(file);
    fileInput.value = '';
  });

  function loadFile(file) {
    if (file.size > 8 * 1024 * 1024) {
      noticeEl.hidden = false;
      noticeEl.textContent = '这个文件超过 8 MB，浏览器里读得动，但预览会很慢。建议先精简内容。';
    }
    var reader = new FileReader();
    reader.onload = function () {
      input.value = String(reader.result || '');
      state.nameTouched = false;
      var base = file.name.replace(/\.(md|markdown|txt)$/i, '');
      if (base) { nameInput.value = base.slice(0, 60); state.nameTouched = true; }
      render();
    };
    reader.onerror = function () {
      noticeEl.hidden = false;
      noticeEl.textContent = '读不了这个文件，换个编码（UTF-8）再试试。';
    };
    reader.readAsText(file, 'utf-8');
  }

  var panel = document.querySelector('.panel-editor');
  ['dragenter', 'dragover'].forEach(function (type) {
    panel.addEventListener(type, function (evt) {
      evt.preventDefault();
      panel.style.borderColor = 'var(--accent)';
    });
  });
  ['dragleave', 'drop'].forEach(function (type) {
    panel.addEventListener(type, function (evt) {
      evt.preventDefault();
      panel.style.borderColor = '';
    });
  });
  panel.addEventListener('drop', function (evt) {
    var file = evt.dataTransfer && evt.dataTransfer.files && evt.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  document.addEventListener('keydown', function (evt) {
    if ((evt.metaKey || evt.ctrlKey) && evt.key.toLowerCase() === 's') {
      evt.preventDefault();
      download();
    }
  });

  /* 首屏：#sample 直接载入示例；否则留空提示 */

  if (location.hash === '#sample') {
    input.value = SAMPLE;
  }
  applyPaperStyle();
  if (input.value.trim()) render();
})();
