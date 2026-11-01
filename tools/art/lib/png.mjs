// studio-managed: installed by the /studio skill; rerunning /studio updates this file.
// Remove this line to keep local edits.
//
// Zero-dependency PNG decode/encode and the raster helpers the art tool needs.
// Rasters are { width, height, data: Uint8Array RGBA 8-bit, row-major }.
import zlib from "node:zlib";
import { createHash } from "node:crypto";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffers) {
  let c = 0xffffffff;
  for (const buf of buffers)
    for (let i = 0; i < buf.length; i += 1)
      c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function blank(width, height, rgba = [0, 0, 0, 0]) {
  const data = new Uint8Array(width * height * 4);
  if (rgba.some((v) => v !== 0))
    for (let i = 0; i < data.length; i += 4) data.set(rgba, i);
  return { width, height, data };
}

/** Width and height from the header of a PNG, GIF, JPEG, BMP, WebP or ICO file. */
export function imageSize(buf) {
  if (buf.length >= 24 && buf.subarray(0, 8).equals(SIGNATURE))
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), format: "png" };
  if (buf.length >= 10 && buf.toString("latin1", 0, 3) === "GIF")
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8), format: "gif" };
  if (buf.length >= 26 && buf.toString("latin1", 0, 2) === "BM")
    return { width: buf.readInt32LE(18), height: Math.abs(buf.readInt32LE(22)), format: "bmp" };
  if (buf.length >= 30 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") {
    const kind = buf.toString("latin1", 12, 16);
    if (kind === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff, format: "webp" };
    if (kind === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1, format: "webp" };
    }
    if (kind === "VP8X") return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1, format: "webp" };
  }
  if (buf.length >= 22 && buf.readUInt16LE(0) === 0 && buf.readUInt16LE(2) === 1)
    return { width: buf[6] || 256, height: buf[7] || 256, format: "ico" };
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let at = 2;
    while (at + 9 < buf.length) {
      if (buf[at] !== 0xff) { at += 1; continue; }
      const marker = buf[at + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
        return { width: buf.readUInt16BE(at + 7), height: buf.readUInt16BE(at + 5), format: "jpeg" };
      at += 2 + buf.readUInt16BE(at + 2);
    }
  }
  return null;
}

export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error("not a PNG file");
  let at = 8;
  let header = null;
  let palette = null;
  let trns = null;
  const idat = [];
  while (at < buf.length) {
    const length = buf.readUInt32BE(at);
    const type = buf.toString("latin1", at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + length);
    at += 12 + length;
    if (type === "IHDR")
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        colour: data[9],
        interlace: data[12],
      };
    else if (type === "PLTE") palette = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
  }
  if (header === null) throw new Error("PNG without IHDR");
  const { width, height, depth, colour, interlace } = header;
  if (interlace !== 0) throw new Error("interlaced PNGs are not supported; re-save without interlacing");
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colour];
  if (channels === undefined) throw new Error(`unsupported PNG colour type ${colour}`);
  const bitsPerPixel = channels * depth;
  const bpp = Math.max(1, Math.ceil(bitsPerPixel / 8));
  const stride = Math.ceil((width * bitsPerPixel) / 8);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const rows = new Uint8Array(stride * height);
  let previous = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = rows.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x += 1) {
      const a = x >= bpp ? out[x - bpp] : 0;
      const b = previous[x];
      const c = x >= bpp ? previous[x - bpp] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error(`bad PNG filter ${filter}`);
      out[x] = value & 255;
    }
    previous = out;
  }
  const max = (1 << depth) - 1;
  const sample = (row, index) => {
    if (depth === 8) return rows[row * stride + index];
    if (depth === 16) return rows[row * stride + index * 2];
    const bit = index * depth;
    return (rows[row * stride + (bit >> 3)] >> (8 - depth - (bit & 7))) & max;
  };
  const rawSample16 = (row, index) =>
    depth === 16 ? (rows[row * stride + index * 2] << 8) | rows[row * stride + index * 2 + 1] : sample(row, index);
  const scale = (v) => (depth >= 8 ? v : Math.round((v * 255) / max));
  const result = blank(width, height);
  const d = result.data;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4;
      if (colour === 3) {
        const index = sample(y, x);
        d[o] = palette[index * 3];
        d[o + 1] = palette[index * 3 + 1];
        d[o + 2] = palette[index * 3 + 2];
        d[o + 3] = trns !== null && index < trns.length ? trns[index] : 255;
      } else if (colour === 0 || colour === 4) {
        const g = scale(sample(y, x * channels));
        d[o] = d[o + 1] = d[o + 2] = g;
        if (colour === 4) d[o + 3] = sample(y, x * 2 + 1);
        else d[o + 3] = trns !== null && rawSample16(y, x) === trns.readUInt16BE(0) ? 0 : 255;
      } else {
        for (let k = 0; k < 3; k += 1) d[o + k] = sample(y, x * channels + k);
        if (colour === 6) d[o + 3] = sample(y, x * 4 + 3);
        else
          d[o + 3] =
            trns !== null &&
            rawSample16(y, x * 3) === trns.readUInt16BE(0) &&
            rawSample16(y, x * 3 + 1) === trns.readUInt16BE(2) &&
            rawSample16(y, x * 3 + 2) === trns.readUInt16BE(4)
              ? 0
              : 255;
      }
    }
  return result;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type, "latin1");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32([name, data]));
  return Buffer.concat([length, name, data, crc]);
}

/** RGBA 8-bit PNG, filter "none", deterministic bytes for the same pixels. */
export function encodePng(raster) {
  const { width, height, data } = raster;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1)
    raw.set(data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** A hash of the visible pixels: fully transparent pixels count as 0,0,0,0. */
export function pixelSha256(raster) {
  const copy = new Uint8Array(raster.data);
  for (let i = 0; i < copy.length; i += 4) if (copy[i + 3] === 0) copy.fill(0, i, i + 4);
  return createHash("sha256").update(`${raster.width}x${raster.height}\n`).update(copy).digest("hex");
}

export function parseColour(colour) {
  if (colour === "transparent") return [0, 0, 0, 0];
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(colour);
  if (match === null) throw new Error(`bad colour ${colour} (want #rrggbb, #rrggbbaa or transparent)`);
  const v = Number.parseInt(match[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255, match[2] === undefined ? 255 : Number.parseInt(match[2], 16)];
}

export function crop(src, x, y, w, h) {
  if (x < 0 || y < 0 || x + w > src.width || y + h > src.height) throw new Error(`crop ${x},${y} ${w}x${h} leaves the ${src.width}x${src.height} image`);
  const out = blank(w, h);
  for (let row = 0; row < h; row += 1) {
    const from = ((y + row) * src.width + x) * 4;
    out.data.set(src.data.subarray(from, from + w * 4), row * w * 4);
  }
  return out;
}

/** Whole-pixel enlargement (nearest neighbour). */
export function scaleNearest(src, factor) {
  if (!Number.isInteger(factor) || factor < 1) throw new Error("scale wants a whole factor >= 1");
  const out = blank(src.width * factor, src.height * factor);
  for (let y = 0; y < out.height; y += 1)
    for (let x = 0; x < out.width; x += 1) {
      const from = (Math.floor(y / factor) * src.width + Math.floor(x / factor)) * 4;
      out.data.set(src.data.subarray(from, from + 4), (y * out.width + x) * 4);
    }
  return out;
}

/**
 * Pixel-art downscale by a whole factor: each block becomes its alpha-weighted
 * mean colour, kept (opaque) only when at least half its pixels are opaque
 * enough, so outlines stay hard edges instead of grey fringes. Small sizes
 * still usually need hand edits or a dedicated take (see LESSONS).
 */
export function downscale(src, factor) {
  if (src.width % factor !== 0 || src.height % factor !== 0) throw new Error(`downscale ${factor} needs sides divisible by ${factor}`);
  const out = blank(src.width / factor, src.height / factor);
  const need = Math.ceil((factor * factor) / 2);
  for (let y = 0; y < out.height; y += 1)
    for (let x = 0; x < out.width; x += 1) {
      let r = 0, g = 0, b = 0, weight = 0, covered = 0;
      for (let dy = 0; dy < factor; dy += 1)
        for (let dx = 0; dx < factor; dx += 1) {
          const at = ((y * factor + dy) * src.width + x * factor + dx) * 4;
          const alpha = src.data[at + 3];
          if (alpha >= 128) covered += 1;
          r += src.data[at] * alpha;
          g += src.data[at + 1] * alpha;
          b += src.data[at + 2] * alpha;
          weight += alpha;
        }
      if (covered < need || weight === 0) continue;
      out.data.set([Math.round(r / weight), Math.round(g / weight), Math.round(b / weight), 255], (y * out.width + x) * 4);
    }
  return out;
}

export function applyEdits(src, edits) {
  const out = { ...src, data: new Uint8Array(src.data) };
  for (const [x, y, colour] of edits) {
    if (x < 0 || y < 0 || x >= out.width || y >= out.height) throw new Error(`edit ${x},${y} leaves the image`);
    out.data.set(parseColour(colour), (y * out.width + x) * 4);
  }
  return out;
}

/** Alpha-composites `src` onto `dst` (mutates dst) at x, y. */
export function composite(dst, src, left, top) {
  for (let y = 0; y < src.height; y += 1) {
    const ty = y + top;
    if (ty < 0 || ty >= dst.height) continue;
    for (let x = 0; x < src.width; x += 1) {
      const tx = x + left;
      if (tx < 0 || tx >= dst.width) continue;
      const s = (y * src.width + x) * 4;
      const d = (ty * dst.width + tx) * 4;
      const a = src.data[s + 3] / 255;
      if (a === 0) continue;
      const da = dst.data[d + 3] / 255;
      const oa = a + da * (1 - a);
      for (let k = 0; k < 3; k += 1)
        dst.data[d + k] = Math.round((src.data[s + k] * a + dst.data[d + k] * da * (1 - a)) / oa);
      dst.data[d + 3] = Math.round(oa * 255);
    }
  }
  return dst;
}

export function fillRect(dst, x, y, w, h, rgba) {
  for (let yy = Math.max(0, y); yy < Math.min(dst.height, y + h); yy += 1)
    for (let xx = Math.max(0, x); xx < Math.min(dst.width, x + w); xx += 1) dst.data.set(rgba, (yy * dst.width + xx) * 4);
}

export function checker(width, height, a, b, cell = 8) {
  const out = blank(width, height);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      out.data.set((Math.floor(x / cell) + Math.floor(y / cell)) % 2 ? a : b, (y * width + x) * 4);
  return out;
}

/** `src` enlarged by `scale` and centred on an opaque `size` x `size` plate. */
export function plate(src, size, scale, background) {
  const out = blank(size, size, parseColour(background));
  const big = scaleNearest(src, scale);
  const left = Math.floor((size - big.width) / 2);
  const top = Math.floor((size - big.height) / 2);
  if (left < 0 || top < 0) throw new Error("the enlarged image does not fit its plate");
  return composite(out, big, left, top);
}

/** Pads to width x height; anchor is one of center, bottom, top, left, right. */
export function pad(src, width, height, anchor = "center") {
  const out = blank(width, height);
  const left = anchor === "left" ? 0 : anchor === "right" ? width - src.width : Math.floor((width - src.width) / 2);
  const top = anchor === "top" ? 0 : anchor === "bottom" ? height - src.height : Math.floor((height - src.height) / 2);
  if (left < 0 || top < 0) throw new Error("pad target is smaller than the image");
  return composite(out, src, left, top);
}

export function flipX(src) {
  const out = blank(src.width, src.height);
  for (let y = 0; y < src.height; y += 1)
    for (let x = 0; x < src.width; x += 1) {
      const from = (y * src.width + x) * 4;
      out.data.set(src.data.subarray(from, from + 4), (y * src.width + (src.width - 1 - x)) * 4);
    }
  return out;
}

export function hasTransparency(raster) {
  for (let i = 3; i < raster.data.length; i += 4) if (raster.data[i] < 255) return true;
  return false;
}

/** Bounding box of pixels with alpha > 0, or null when fully transparent. */
export function alphaBounds(raster) {
  let minX = raster.width, minY = raster.height, maxX = -1, maxY = -1;
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1)
      if (raster.data[(y * raster.width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
  return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
