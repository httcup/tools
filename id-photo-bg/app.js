/* 证件照换底色：抠一次人像，之后换什么颜色都只是重新合成，不必再跑模型。
   预览用小图（够看清效果且滑块拖动跟得上），下载时才按原图尺寸算一遍。 */

import {
  hasWebgl, loadSegmenter, toCanvas, segmentWithModel, sampleBorder,
  segmentClassic, soften, composite, cleanTint, erode,
} from '../js/segment-kit.js';
import { stem, sayFail } from '../js/tool-ui.js';

const $ = (id) => document.getElementById(id);
const drop = $('drop');
const fileInput = $('file');
const statusEl = $('status');
const opts = $('opts');
const outCard = $('out');
const engineEl = $('engine');
const metaEl = $('meta');
const sumEl = $('sum');
const beforeCanvas = $('before');
const afterCanvas = $('after');
const pngBtn = $('png');
const jpgBtn = $('jpg');
const edgeInput = $('edge');
const edgeOut = $('edgeOut');
const transparentBox = $('transparent');
const cleanBox = $('clean');
const colorInput = $('color');
const swatches = $('swatches');

const PREVIEW_SIDE = 720;
const EXPORT_SIDE = 4096;

let source = null;
let fileName = 'photo';
let cutout = null;
let previewBase = null;
let color = '#ffffff';
let runToken = 0;
let timer = 0;

const say = (text) => { statusEl.textContent = text; };

/* 老 Safari 没有 createImageBitmap，退回 <img> + decode()。 */
async function readImage(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); } catch (error) { /* 走下面的兜底 */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 8000);
  }
}

function setBusy(busy) {
  drop.style.pointerEvents = busy ? 'none' : '';
  drop.style.opacity = busy ? '0.55' : '';
}

async function openFile(list) {
  const picked = list && list[0];
  if (!picked) return;
  if (!/^image\//.test(picked.type)) { say('这个文件不是图片，换一张试试。'); return; }

  const token = ++runToken;
  cutout = null;
  previewBase = null;
  opts.hidden = true;
  outCard.hidden = true;
  setBusy(true);
  say('正在读照片…');

  let image;
  try {
    image = await readImage(picked);
  } catch (error) {
    setBusy(false);
    sayFail(statusEl, '这张照片打不开：', error);
    return;
  }
  if (token !== runToken) return;

  source = image;
  fileName = stem(picked.name || 'photo');
  drawBefore();

  const work = toCanvas(image, 1024);
  const context = work.getContext('2d', { willReadFrequently: true });
  const pixels = context.getImageData(0, 0, work.width, work.height);

  let cut = null;
  if (hasWebgl()) {
    try {
      say('正在加载人像模型…');
      const segmenter = await loadSegmenter();
      if (token !== runToken) return;
      say('正在抠出人像…');
      cut = segmentWithModel(segmenter, work);
    } catch (error) {
      cut = null;
    }
  }
  if (token !== runToken) return;

  if (!cut) {
    say('这个浏览器关掉了 WebGL，只能用简化算法。');
    await new Promise((resolve) => setTimeout(resolve, 30));
    const classic = segmentClassic(pixels, { tolerance: 14 });
    cut = classic;
    cut.alpha = soften(classic.alpha, classic.width, classic.height, 1);
  }

  /* 旧底色要在这里采一次：去污和边缘色剔除都靠它。
     漏了这步就会拿默认白当旧底色，边缘反而被推出一道白边。 */
  cut.border = sampleBorder(pixels);
  if (cut.engine === 'model') {
    /* 顺序有讲究：先按颜色剔掉「颜色就是旧底色」的误判块，再整体内缩 2px。
       只做前者，轮廓外的整块误判收不干净；只做后者，边界那圈混色还在。
       2px 是试出来的：1px 仍有红点，3px 肩线开始变钝。 */
    cut.alpha = erode(cleanTint(cut.alpha, pixels, cut.border), cut.width, cut.height, 2);
  }

  cutout = cut;
  previewBase = toCanvas(image, PREVIEW_SIDE);
  setBusy(false);
  opts.hidden = false;
  outCard.hidden = false;
  engineEl.textContent = cut.engine === 'model' ? '人像模型' : '简化算法';
  /* 简化算法只认「和边框颜色相近」的像素，遇到杂乱背景就几乎抠不动。
     人像占了八成以上面积时基本等于没换，这时候得说清楚，别让人以为工具坏了。 */
  if (cut.engine !== 'model' && portraitShare() > 0.8) {
    say('这张的背景比较复杂，简化算法只抠掉了很少一部分。用支持 WebGL 的浏览器会准得多。');
  } else {
    say('抠好了，下面挑个底色。');
  }
  renderMeta();
  renderPreview();
}

function drawBefore() {
  const base = toCanvas(source, PREVIEW_SIDE);
  beforeCanvas.width = base.width;
  beforeCanvas.height = base.height;
  beforeCanvas.getContext('2d').drawImage(base, 0, 0);
}

/* 抽样估一下人像占多大面积：既用于信息栏，也用来判断这次到底有没有抠动。 */
function portraitShare() {
  let hit = 0;
  let seen = 0;
  for (let i = 0; i < cutout.alpha.length; i += 97) {
    seen += 1;
    if (cutout.alpha[i] > 0.5) hit += 1;
  }
  return seen ? hit / seen : 0;
}

function renderMeta() {
  if (!cutout || !source) return;
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  const share = Math.round(portraitShare() * 100);
  metaEl.textContent = '';
  const add = (label, value) => {
    const span = document.createElement('span');
    const b = document.createElement('b');
    b.textContent = value;
    span.append(label + ' ', b);
    metaEl.append(span);
  };
  add('原图', width + ' × ' + height + ' 像素');
  add('人像占比', share + '%');
}

function currentOptions() {
  return {
    color,
    transparent: transparentBox.checked,
    tight: Number(edgeInput.value) / 100,
    clean: cleanBox.checked,
    border: cutout && cutout.border ? cutout.border : null,
  };
}

function renderPreview() {
  if (!cutout || !previewBase) return;
  const canvas = composite(previewBase, cutout, currentOptions());
  afterCanvas.width = canvas.width;
  afterCanvas.height = canvas.height;
  afterCanvas.getContext('2d').drawImage(canvas, 0, 0);
  afterCanvas.classList.toggle('checker', transparentBox.checked);
  const palette = transparentBox.checked ? '透明背景' : color.toUpperCase();
  sumEl.textContent = canvas.width + ' × ' + canvas.height + ' 预览 · ' + palette;
  scheduleDownloadUrls();
}

/* 预览改一下就重算一次大图太浪费，等手停下来再生成下载链接。 */
function scheduleDownloadUrls() {
  clearTimeout(timer);
  timer = setTimeout(() => { makeUrls().catch(() => {}); }, 500);
}

async function buildFull() {
  const full = toCanvas(source, EXPORT_SIDE);
  return composite(full, cutout, currentOptions());
}

async function makeUrls() {
  if (!cutout || !source) return;
  const canvas = await buildFull();
  const png = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (png) {
    if (pngBtn.dataset.url) URL.revokeObjectURL(pngBtn.dataset.url);
    const url = URL.createObjectURL(png);
    pngBtn.dataset.url = url;
    pngBtn.href = url;
    pngBtn.download = fileName + (transparentBox.checked ? '-透明.png' : '-换底色.png');
  }
  const flat = document.createElement('canvas');
  flat.width = canvas.width;
  flat.height = canvas.height;
  const ctx = flat.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, flat.width, flat.height);
  ctx.drawImage(canvas, 0, 0);
  const jpg = await new Promise((resolve) => flat.toBlob(resolve, 'image/jpeg', 0.94));
  if (jpg) {
    if (jpgBtn.dataset.url) URL.revokeObjectURL(jpgBtn.dataset.url);
    const url = URL.createObjectURL(jpg);
    jpgBtn.dataset.url = url;
    jpgBtn.href = url;
    jpgBtn.download = fileName + '-换底色.jpg';
  }
}

function pickColor(value) {
  color = value;
  let preset = false;
  for (const button of swatches.querySelectorAll('button[data-color]')) {
    const on = button.dataset.color.toLowerCase() === value.toLowerCase();
    if (on) preset = true;
    button.setAttribute('aria-pressed', String(on));
  }
  // 自己调出来的颜色也要有选中态，否则看不出当前用的是哪个
  $('customWrap').setAttribute('aria-pressed', String(!preset));
  colorInput.value = value;
  renderPreview();
}

function reset() {
  runToken += 1;
  source = null;
  cutout = null;
  previewBase = null;
  opts.hidden = true;
  outCard.hidden = true;
  fileInput.value = '';
  setBusy(false);
  say('');
}

drop.addEventListener('dragover', (event) => {
  event.preventDefault();
  drop.classList.add('hot');
});
drop.addEventListener('dragleave', () => drop.classList.remove('hot'));
drop.addEventListener('drop', (event) => {
  event.preventDefault();
  drop.classList.remove('hot');
  openFile(event.dataTransfer && event.dataTransfer.files);
});
fileInput.addEventListener('change', () => openFile(fileInput.files));

swatches.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-color]');
  if (button) pickColor(button.dataset.color);
});
colorInput.addEventListener('input', () => pickColor(colorInput.value));
colorInput.addEventListener('click', (event) => event.stopPropagation());

edgeInput.addEventListener('input', () => {
  edgeOut.textContent = edgeInput.value + '%';
  renderPreview();
});
transparentBox.addEventListener('change', renderPreview);
cleanBox.addEventListener('change', renderPreview);
$('again').addEventListener('click', reset);

for (const link of [pngBtn, jpgBtn]) {
  link.addEventListener('click', async (event) => {
    if (link.dataset.url) return;
    event.preventDefault();
    try {
      await makeUrls();
      if (link.dataset.url) link.click();
    } catch (error) {
      sayFail(statusEl, '生成文件时出错了：', error);
    }
  });
}

window.addEventListener('beforeunload', () => {
  for (const link of [pngBtn, jpgBtn]) if (link.dataset.url) URL.revokeObjectURL(link.dataset.url);
});
