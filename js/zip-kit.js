/* 最小 ZIP 读写：只依赖浏览器原生的 CompressionStream / DecompressionStream。
   docx / pptx / xlsx 都是一个 zip，所以这一层是文档转换共用的地基。 */

const TE = new TextEncoder();
const TD = new TextDecoder();

/* ---------- CRC32 ---------- */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ---------- 解压 ---------- */
async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function deflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function u16(view, at) {
  return view.getUint16(at, true);
}
function u32(view, at) {
  return view.getUint32(at, true);
}

/** 读取 zip，返回 Map<文件名, Uint8Array>。 */
export async function unzip(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  /* 从尾部往前找 EOCD（0x06054b50），注释最多 64KB */
  let eocd = -1;
  const floor = Math.max(0, bytes.length - 66000);
  for (let i = bytes.length - 22; i >= floor; i -= 1) {
    if (u32(view, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('zip.notzip');

  const count = u16(view, eocd + 10);
  let at = u32(view, eocd + 16);
  const out = new Map();

  for (let n = 0; n < count; n += 1) {
    if (u32(view, at) !== 0x02014b50) break;
    const method = u16(view, at + 10);
    const compressed = u32(view, at + 20);
    const nameLen = u16(view, at + 28);
    const extraLen = u16(view, at + 30);
    const commentLen = u16(view, at + 32);
    const local = u32(view, at + 42);
    const name = TD.decode(bytes.subarray(at + 46, at + 46 + nameLen));
    at += 46 + nameLen + extraLen + commentLen;

    if (name.endsWith('/')) continue;

    const dataStart = local + 30 + u16(view, local + 26) + u16(view, local + 28);
    const raw = bytes.subarray(dataStart, dataStart + compressed);
    if (method === 0) {
      out.set(name, raw.slice());
    } else if (method === 8) {
      try {
        out.set(name, await inflateRaw(raw));
      } catch {
        /* 个别大文件解压失败时留空，交给调用方判断 */
        out.set(name, new Uint8Array(0));
      }
    }
  }
  return out;
}

/** 打包成 zip。files: [{name, data:Uint8Array|string}]，返回 Blob。 */
export async function zip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = TE.encode(file.name);
    const data = typeof file.data === 'string' ? TE.encode(file.data) : file.data;
    const packed = data.length > 64 ? await deflateRaw(data) : data;
    const store = packed.length >= data.length;
    const body = store ? data : packed;
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, store ? 0 : 8, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x21, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, body.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);

    chunks.push(local, body);

    const entry = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(entry.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, store ? 0 : 8, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, body.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    entry.set(nameBytes, 46);
    central.push(entry);

    offset += local.length + body.length;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, central.length, true);
  ev.setUint16(10, central.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  return new Blob([...chunks, ...central, end], { type: 'application/zip' });
}

export function xmlEscape(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const textEncoder = TE;
export const textDecoder = TD;
