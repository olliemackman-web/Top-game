// ---------------------------------------------------------------------------
// Pixel drawing primitives. Everything snaps to integers; nothing anti-aliases.
// ---------------------------------------------------------------------------

export function mkPix(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return { c, g };
}

export const r = (g, x, y, w, h, c) => {
  if (w <= 0 || h <= 0) return;
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

// 1px border around a box
export const box = (g, x, y, w, h, c) => {
  r(g, x, y, w, 1, c); r(g, x, y + h - 1, w, 1, c);
  r(g, x, y, 1, h, c); r(g, x + w - 1, y, 1, h, c);
};

// ---------------------------------------------------------------------------
// Materials: hi = lit edge, mid = body, lo = shade, out = outline
// ---------------------------------------------------------------------------
export const M = {
  wood:    { hi: '#c08a4d', mid: '#9a6a35', lo: '#6f4a24', out: '#33200f' },
  wood2:   { hi: '#a97b45', mid: '#84582b', lo: '#5b3a1b', out: '#2b1b0d' },
  logs:    { hi: '#d0a066', mid: '#a97b45', lo: '#77522a', out: '#33200f' },
  stone:   { hi: '#b3b0a4', mid: '#8d8a7e', lo: '#66645a', out: '#312e27' },
  stone2:  { hi: '#c9c6b8', mid: '#a09d8e', lo: '#767364', out: '#38352d' },
  plaster: { hi: '#efe4cb', mid: '#d6c8a9', lo: '#ad9d7d', out: '#4a4032' },
  thatch:  { hi: '#e2c069', mid: '#bb9640', lo: '#8a6d27', out: '#3d3011' },
  shingle: { hi: '#836647', mid: '#614a31', lo: '#432f1d', out: '#22160c' },
  tile:    { hi: '#bc5540', mid: '#90392a', lo: '#65251a', out: '#2c110b' },
  slate:   { hi: '#637181', mid: '#454f5c', lo: '#2e3740', out: '#171b20' },
  gold:    { hi: '#ffe08a', mid: '#f2c14e', lo: '#b8860f', out: '#5c420a' },
  cloth:   { hi: '#cf5138', mid: '#98291a', lo: '#63130b', out: '#2c0805' },
  blue:    { hi: '#5f8fc4', mid: '#3d6493', lo: '#274263', out: '#111d2e' },
  purple:  { hi: '#9b6ec6', mid: '#6d4593', lo: '#472a63', out: '#1e112e' },
  iron:    { hi: '#c3c9d1', mid: '#8d949d', lo: '#5c626a', out: '#282c31' },
  dirt:    { hi: '#a37c4e', mid: '#82603a', lo: '#5f4529', out: '#2e2013' },
  grass:   { hi: '#7fae52', mid: '#66913f', lo: '#4d7130', out: '#2c4419' },
  crop:    { hi: '#d9b84e', mid: '#b3903a', lo: '#856a26', out: '#3d3011' },
};

export const SHADOW = 'rgba(24,14,6,0.24)';

// ---------------------------------------------------------------------------
// Structural pieces
// ---------------------------------------------------------------------------

// A flat wall face with an optional surface pattern.
export function wall(g, x, y, w, h, m, pattern = 'plain') {
  r(g, x, y, w, h, m.mid);
  r(g, x, y, w, 1, m.hi);
  r(g, x, y, 1, h, m.hi);
  r(g, x + w - 1, y, 1, h, m.lo);
  r(g, x, y + h - 1, w, 1, m.lo);

  if (pattern === 'plank') {
    for (let i = y + 3; i < y + h - 1; i += 3) r(g, x + 1, i, w - 2, 1, m.lo);
  } else if (pattern === 'block') {
    let row = 0;
    for (let i = y + 3; i < y + h - 1; i += 3, row++) {
      r(g, x + 1, i, w - 2, 1, m.lo);
      for (let j = x + (row % 2 ? 2 : 4); j < x + w - 1; j += 5) r(g, j, i - 2, 1, 2, m.lo);
    }
  } else if (pattern === 'timber') {
    // half-timbered: pale panels crossed by dark beams
    r(g, x + 1, y + 1, w - 2, h - 2, M.plaster.mid);
    r(g, x + 1, y + 1, w - 2, 1, M.plaster.hi);
    for (let j = x + 4; j < x + w - 2; j += 6) r(g, j, y + 1, 1, h - 2, m.lo);
    r(g, x + 1, y + Math.floor(h / 2), w - 2, 1, m.lo);
  } else if (pattern === 'log') {
    for (let i = y; i < y + h; i += 3) {
      r(g, x, i, w, 2, m.mid);
      r(g, x, i, w, 1, m.hi);
      r(g, x, i + 2, w, 1, m.lo);
    }
  }
  box(g, x, y, w, h, m.out);
}

// Triangular gable end.
export function gable(g, x, y, w, h, m) {
  for (let i = 0; i < h; i++) {
    const hw = Math.max(1, Math.round(((i + 1) / h) * (w / 2)));
    const xx = Math.round(x + w / 2 - hw), ww = hw * 2;
    r(g, xx, y + i, ww, 1, i < 2 ? m.hi : (i % 3 === 0 ? m.lo : m.mid));
    r(g, xx, y + i, 1, 1, m.out);
    r(g, xx + ww - 1, y + i, 1, 1, m.out);
  }
  r(g, x, y + h - 1, w, 1, m.out);
}

// Trapezoid roof (narrow ridge, wide eaves) — reads as a hipped roof.
export function roofTrap(g, x, y, w, h, m, over = 2) {
  for (let i = 0; i < h; i++) {
    const t = h === 1 ? 1 : i / (h - 1);
    const ww = Math.round(w * (0.40 + 0.60 * t) + over * 2 * t);
    const xx = Math.round(x + (w - ww) / 2);
    r(g, xx, y + i, ww, 1, i === 0 ? m.hi : (i % 3 === 2 ? m.lo : m.mid));
    r(g, xx, y + i, 1, 1, m.out);
    r(g, xx + ww - 1, y + i, 1, 1, m.out);
  }
  const bw = Math.round(w + over * 2);
  r(g, Math.round(x + (w - bw) / 2), y + h - 1, bw, 1, m.out);
}

// Simple lean-to / shed roof, high on the left.
export function roofLean(g, x, y, w, h, m) {
  for (let i = 0; i < w; i++) {
    const hh = Math.round(h * (1 - i / w) + 2);
    r(g, x + i, y + (h - hh), 1, hh, i % 3 === 2 ? m.lo : m.mid);
    r(g, x + i, y + (h - hh), 1, 1, m.hi);
  }
  box(g, x, y, w, h + 2, m.out);
}

export function windowLit(g, x, y, w, h, lit = true) {
  r(g, x, y, w, h, lit ? '#f6d67a' : '#2c3a49');
  if (lit) { r(g, x, y, w, 1, '#fff0b8'); r(g, x, y + h - 1, w, 1, '#c99a2e'); }
  box(g, x - 1, y - 1, w + 2, h + 2, '#3a2614');
  if (w >= 5) r(g, x + Math.floor(w / 2), y, 1, h, '#3a2614');
  if (h >= 5) r(g, x, y + Math.floor(h / 2), w, 1, '#3a2614');
}

export function door(g, x, y, w, h, m = M.wood2) {
  r(g, x, y, w, h, m.mid);
  r(g, x, y, w, 1, m.hi);
  for (let i = x + 2; i < x + w - 1; i += 3) r(g, i, y + 1, 1, h - 2, m.lo);
  box(g, x, y, w, h, m.out);
  r(g, x + w - 2, y + Math.floor(h / 2), 1, 1, M.gold.mid);
}

export function chimney(g, x, y, w, h, m = M.stone) {
  wall(g, x, y, w, h, m, 'block');
  r(g, x - 1, y, w + 2, 2, m.lo);
  box(g, x - 1, y, w + 2, 2, m.out);
}

// Hanging cloth banner with a device on it.
export function banner(g, x, y, w, h, m = M.cloth, crest = M.gold) {
  r(g, x, y, w, h - 2, m.mid);
  r(g, x, y, 1, h - 2, m.hi);
  r(g, x + w - 1, y, 1, h - 2, m.lo);
  // pointed hem
  for (let i = 0; i < 2; i++) {
    r(g, x + i, y + h - 2 + i, w - i * 2, 1, m.mid);
  }
  box(g, x, y, w, h - 2, m.out);
  r(g, x + Math.floor(w / 2) - 1, y + 2, 2, 3, crest.mid);
  r(g, x - 1, y - 1, w + 2, 1, M.wood2.lo);
}

export function flag(g, x, y, dir, m = M.cloth) {
  r(g, x, y - 6, 1, 8, M.wood2.mid);          // pole
  r(g, x + dir, y - 6, 5 * dir, 4, m.mid);
  r(g, x + dir, y - 6, 5 * dir, 1, m.hi);
  r(g, x + dir, y - 3, 5 * dir, 1, m.lo);
}

// Ground shadow beneath a structure.
export function groundShadow(g, x, y, w) {
  r(g, x + 2, y - 2, w - 4, 2, SHADOW);
  r(g, x + 4, y - 3, w - 8, 1, SHADOW);
}

export function barrel(g, x, y) {
  r(g, x, y, 5, 7, M.wood.mid);
  r(g, x, y, 1, 7, M.wood.hi);
  r(g, x + 4, y, 1, 7, M.wood.lo);
  r(g, x, y + 1, 5, 1, M.iron.mid);
  r(g, x, y + 5, 5, 1, M.iron.mid);
  box(g, x, y, 5, 7, M.wood.out);
}

export function crate(g, x, y) {
  r(g, x, y, 6, 6, M.wood.mid);
  r(g, x, y, 6, 1, M.wood.hi);
  r(g, x + 1, y + 2, 4, 1, M.wood.lo);
  r(g, x + 2, y + 1, 1, 4, M.wood.lo);
  box(g, x, y, 6, 6, M.wood.out);
}

export function logPile(g, x, y, n = 3) {
  for (let i = 0; i < n; i++) {
    const xx = x + i * 4, yy = y - (i % 2 ? 1 : 0);
    r(g, xx, yy, 4, 4, M.logs.mid);
    r(g, xx, yy, 4, 1, M.logs.hi);
    r(g, xx + 1, yy + 1, 2, 2, M.logs.lo);
    box(g, xx, yy, 4, 4, M.logs.out);
  }
}

// Pine tree — the valley's signature silhouette.
export function pine(g, x, y, s = 1) {
  const h = Math.round(14 * s), w = Math.round(11 * s);
  r(g, x + Math.round(w / 2) - 1, y - 3, 2, 3, '#5b3a1b');
  for (let layer = 0; layer < 3; layer++) {
    const ly = y - 3 - Math.round((layer + 1) * h * 0.26);
    const lw = Math.round(w * (1 - layer * 0.24));
    const lh = Math.round(h * 0.34);
    for (let i = 0; i < lh; i++) {
      const hw = Math.max(1, Math.round(((i + 1) / lh) * (lw / 2)));
      r(g, x + Math.round(w / 2) - hw, ly - lh + i, hw * 2, 1,
        i < 2 ? '#4d7130' : (i % 2 ? '#3f6127' : '#4a6d2d'));
    }
  }
  // sun-lit left edge
  r(g, x + 1, y - Math.round(h * 0.55), 1, 2, '#7fae52');
}

export function rock(g, x, y, s = 1) {
  const w = Math.max(5, Math.round(8 * s)), h = Math.max(4, Math.round(6 * s));
  // rounded boulder: narrower at the top, flat where it meets the ground
  for (let i = 0; i < h; i++) {
    const t = i / h;
    const inset = Math.round((1 - Math.sin((t * 0.8 + 0.2) * Math.PI)) * (w * 0.3));
    const xx = x + inset, ww = w - inset * 2;
    r(g, xx, y - h + i, ww, 1, i < 2 ? M.stone.hi : (t > 0.72 ? M.stone.lo : M.stone.mid));
    r(g, xx, y - h + i, 1, 1, M.stone.out);
    r(g, xx + ww - 1, y - h + i, 1, 1, M.stone.out);
  }
  r(g, x + 1, y - 1, w - 2, 1, M.stone.out);
  r(g, x + Math.round(w * 0.3), y - h + 1, 2, 1, '#cfccc0');   // catch-light
}

export function bush(g, x, y) {
  r(g, x + 1, y - 4, 5, 4, '#4a6d2d');
  r(g, x, y - 3, 7, 3, '#4a6d2d');
  r(g, x + 1, y - 4, 3, 1, '#6b9440');
  r(g, x, y - 1, 7, 1, '#33501f');
}

export function fencePost(g, x, y) {
  r(g, x, y - 7, 2, 7, M.wood2.mid);
  r(g, x, y - 7, 1, 7, M.wood2.hi);
  r(g, x, y - 7, 2, 1, M.wood2.out);
}

export function fenceRun(g, x, y, w) {
  r(g, x, y - 5, w, 1, M.wood2.mid);
  r(g, x, y - 3, w, 1, M.wood2.lo);
  for (let i = x; i < x + w; i += 8) fencePost(g, i, y);
}

// ---------------------------------------------------------------------------
// Value noise — smooth, seeded, tileable-enough for terrain patches.
// ---------------------------------------------------------------------------
// Backed by a flat Float32Array over a known domain. A Map keyed by "i,j"
// strings is ~20x slower and this is called once per terrain pixel.
export function makeNoise(rnd, cell, w = 512, h = 512, ox = 0, oy = 0) {
  const gw = Math.max(4, Math.ceil(w / cell) + 3), gh = Math.max(4, Math.ceil(h / cell) + 3);
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = (x + ox) / cell, fy = (y + oy) / cell;
    const bx = Math.floor(fx), by = Math.floor(fy);
    const tx = smooth(fx - bx), ty = smooth(fy - by);
    let i = bx, j = by;
    if (i < 0) i = 0; else if (i > gw - 2) i = gw - 2;
    if (j < 0) j = 0; else if (j > gh - 2) j = gh - 2;
    const o = j * gw + i;
    const a = grid[o], b = grid[o + 1], c = grid[o + gw], d = grid[o + gw + 1];
    const top = a + (b - a) * tx;
    return top + ((c + (d - c) * tx) - top) * ty;
  };
}

// Numeric form of the colour helpers, for direct ImageData writes.
export const rgbOf = (hex) => [parseInt(hex.slice(1, 3), 16),
                               parseInt(hex.slice(3, 5), 16),
                               parseInt(hex.slice(5, 7), 16)];

// Colour helpers used by the terrain painter.
const HEX = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
export const mixHex = (a, b, t) => {
  const A = HEX(a), B = HEX(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, t)))
    .toString(16).padStart(2, '0')).join('');
};
// Pick from an ordered colour ramp by a 0..1 value.
export const ramp = (stops, t) => {
  const safe = Number.isFinite(t) ? t : 0;
  const x = Math.max(0, Math.min(0.9999, safe)) * (stops.length - 1);
  const i = Math.floor(x);
  return mixHex(stops[i], stops[i + 1], x - i);
};

// A soft contact shadow. Pixel-art friendly: stepped, not a gradient blob.
export function contactShadow(g, cx, y, rx, alpha = 0.26) {
  g.globalAlpha = alpha;
  r(g, cx - rx, y - 1, rx * 2, 2, '#1b2410');
  g.globalAlpha = alpha * 0.65;
  r(g, cx - rx - 1, y, rx * 2 + 2, 1, '#1b2410');
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Trees. Three species so a wood does not read as stamped clones.
// ---------------------------------------------------------------------------
const LEAF = {
  pine:  ['#2f4a1f', '#3d6127', '#4d7833', '#63954a'],
  oak:   ['#39501f', '#4a6b28', '#5d8434', '#77a44a'],
  birch: ['#465b24', '#5a7530', '#6f8f3d', '#8bad55'],
};

export function treePine(g, x, y, s = 1, rnd = Math.random) {
  const h = Math.round(17 * s), w = Math.round(12 * s);
  const P = LEAF.pine;
  contactShadow(g, x + w / 2, y, Math.round(w * 0.42));
  r(g, x + Math.round(w / 2) - 1, y - 4, 2, 4, '#4a3320');
  for (let layer = 0; layer < 4; layer++) {
    const ly = y - 3 - Math.round(layer * h * 0.21);
    const lw = Math.round(w * (1 - layer * 0.19));
    const lh = Math.max(3, Math.round(h * 0.32));
    for (let i = 0; i < lh; i++) {
      const hw = Math.max(1, Math.round(((i + 1) / lh) * (lw / 2)));
      const cx = x + Math.round(w / 2);
      // lit on the left, shaded on the right
      for (let k = -hw; k < hw; k++) {
        const t = (k + hw) / (hw * 2);
        r(g, cx + k, ly - lh + i, 1, 1, P[i < 1 ? 3 : (t < 0.3 ? 2 : t > 0.78 ? 0 : 1)]);
      }
    }
  }
  r(g, x + Math.round(w * 0.3), y - h - 2, 1, 2, P[3]);
}

export function treeOak(g, x, y, s = 1) {
  const w = Math.round(15 * s), h = Math.round(14 * s);
  const P = LEAF.oak;
  contactShadow(g, x + w / 2, y, Math.round(w * 0.45));
  r(g, x + Math.round(w / 2) - 1, y - 5, 3, 5, '#5b3a1b');
  r(g, x + Math.round(w / 2) - 1, y - 5, 1, 5, '#77522a');
  const cx = x + w / 2, cy = y - 5 - h * 0.42;
  // three overlapping lobes make a believable canopy
  const lobes = [[0, -h * 0.30, w * 0.40], [-w * 0.28, -h * 0.06, w * 0.34], [w * 0.28, -h * 0.04, w * 0.32]];
  for (const [ox, oy, rr] of lobes) {
    for (let dy = -rr; dy <= rr; dy++) {
      const half = Math.round(Math.sqrt(Math.max(0, rr * rr - dy * dy)));
      for (let dx = -half; dx <= half; dx++) {
        // light from the upper-left, plus a rim of dark at the silhouette edge
        const edge = Math.sqrt(dx * dx + dy * dy) / rr;
        const lit = (dx + rr) / (rr * 2) * 0.45 + (dy + rr) / (rr * 2) * 0.55;
        const t = lit + (edge > 0.86 ? 0.35 : 0);
        r(g, Math.round(cx + ox + dx), Math.round(cy + oy + dy), 1, 1,
          P[t < 0.20 ? 3 : t < 0.46 ? 2 : t < 0.82 ? 1 : 0]);
      }
    }
  }
}

export function treeDead(g, x, y, s = 1) {
  const h = Math.round(13 * s);
  contactShadow(g, x + 2, y, 3, 0.2);
  r(g, x + 1, y - h, 2, h, '#3f3226');
  r(g, x + 1, y - h, 1, h, '#544433');
  r(g, x - 2, y - Math.round(h * 0.72), 3, 1, '#3f3226');
  r(g, x + 3, y - Math.round(h * 0.86), 3, 1, '#3f3226');
  r(g, x - 3, y - Math.round(h * 0.8), 1, 2, '#3f3226');
  r(g, x + 5, y - Math.round(h * 0.95), 1, 3, '#3f3226');
}
