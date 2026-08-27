import {
  r, box, mkPix, M, rock, bush, fenceRun, barrel, crate, logPile,
  makeNoise, mixHex, ramp, rgbOf, contactShadow, treePine, treeOak, treeDead,
} from './prims.js';
import { WORLD, GATE_Y, GATE_X, BUILDINGS, TERRAIN_PAD as PAD } from '../config.js';

// Deterministic RNG so the valley is identical every session.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Grass ramps. The land is scorched at the front line and lush behind the wall,
// so the ramp itself is blended by latitude rather than just darkened.
const WAR   = ['#3a3a2c', '#474734', '#55523d', '#615c46'];
const WILD  = ['#3f5c28', '#4a6d2d', '#5a8137', '#6b9440'];
const LUSH  = ['#42662a', '#517532', '#66913f', '#7fae52'];

function rampAt(y) {
  const t = Math.max(0, Math.min(1, (y - 30) / (GATE_Y - 90)));
  const lush = Math.max(0, Math.min(1, (y - GATE_Y + 70) / 130));
  return WAR.map((c, i) => mixHex(mixHex(c, WILD[i], t), LUSH[i], lush));
}

// Footprints terrain scatter must avoid.
function keepOut() {
  const out = BUILDINGS.map(b => ({ x: b.x - 5, y: b.y - 5, w: b.w + 10, h: b.h + 10 }));
  out.push({ x: GATE_X - 27, y: 0, w: 54, h: WORLD.H });      // the great north road
  out.push({ x: 0, y: GATE_Y - 14, w: WORLD.W, h: 24 });      // the palisade
  out.push({ x: 0, y: 734, w: WORLD.W, h: 26 });              // village cross-street
  return out;
}
const hits = (z, x, y, w = 8, h = 8) =>
  z.some(o => x + w > o.x && x < o.x + o.w && y + h > o.y && y < o.y + o.h);

// ---------------------------------------------------------------------------
export function buildTerrain(seed = 20260827) {
  const { c, g } = mkPix(WORLD.W + PAD * 2, WORLD.H);
  g.translate(PAD, 0);
  return paint(c, g, mulberry32(seed));
}

function paint(c, g, rnd) {
  const W = WORLD.W, H = WORLD.H;
  const TW = W + PAD * 2;
  const coarse = makeNoise(rnd, 46, TW, H, PAD);
  const fine   = makeNoise(rnd, 11, TW, H, PAD);
  const grain  = makeNoise(rnd, 3,  TW, H, PAD);

  // Ground and mountains are painted straight into an ImageData. Doing this with
  // per-pixel fillRect and hex-string colour mixing cost ~14s of load; tabulated
  // colours plus one putImageData bring it under a second.
  const BANDS = 56, STEPS = 28;
  const grassLut = new Uint8Array(BANDS * STEPS * 3);
  for (let bi = 0; bi < BANDS; bi++) {
    const R = rampAt((bi + 0.5) * H / BANDS);
    for (let si = 0; si < STEPS; si++) {
      const [cr, cg, cb] = rgbOf(ramp(R, si / (STEPS - 1)));
      const o = (bi * STEPS + si) * 3;
      grassLut[o] = cr; grassLut[o + 1] = cg; grassLut[o + 2] = cb;
    }
  }
  const VSTEP = 28, NSTEP = 10;
  const rockLut = new Uint8Array(VSTEP * NSTEP * 3);
  for (let vi = 0; vi < VSTEP; vi++) {
    for (let ni = 0; ni < NSTEP; ni++) {
      const base = mixHex('#33322e', '#cbc8bb', vi / (VSTEP - 1));
      const [cr, cg, cb] = rgbOf(mixHex(base, '#8d97a8', (1 - ni / (NSTEP - 1)) * 0.38));
      const o = (vi * NSTEP + ni) * 3;
      rockLut[o] = cr; rockLut[o + 1] = cg; rockLut[o + 2] = cb;
    }
  }

  const img = g.createImageData(TW, H);
  const px = img.data;
  const ridgeOf = mountainProfile();
  for (let y = 0; y < H; y++) {
    const band = Math.min(BANDS - 1, (y * BANDS / H) | 0) * STEPS;
    const rowL = ridgeOf('L', y), rowR = ridgeOf('R', y);
    for (let wx = -PAD; wx < W + PAD; wx++) {
      const o = (y * TW + (wx + PAD)) * 4;
      let cr, cg2, cb;
      const inL = wx < rowL.edge, inR = wx > W - 1 - rowR.edge;
      if (inL || inR) {
        const rw = inL ? rowL : rowR;
        const i = inL ? wx : W - 1 - wx;
        const v = rw.shadeAt(i);
        const near = Math.min(0.9999, Math.max(0, (i + PAD) / (rw.edge + PAD)));
        const q = ((Math.min(0.9999, Math.max(0, v)) * VSTEP) | 0) * NSTEP + ((near * NSTEP) | 0);
        const l = q * 3;
        cr = rockLut[l]; cg2 = rockLut[l + 1]; cb = rockLut[l + 2];
      } else {
        const n = coarse(wx, y) * 0.55 + fine(wx, y) * 0.31 + grain(wx, y) * 0.14;
        const l = (band + Math.min(STEPS - 1, (n * STEPS) | 0)) * 3;
        cr = grassLut[l]; cg2 = grassLut[l + 1]; cb = grassLut[l + 2];
      }
      px[o] = cr; px[o + 1] = cg2; px[o + 2] = cb; px[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);   // putImageData ignores the translate, so origin is 0

  // grass tufts, denser where the noise is already light
  for (let i = 0; i < 5200; i++) {
    const x = Math.floor(rnd() * (W + 60)) - 30, y = Math.floor(rnd() * H);
    const R = rampAt(y);
    const n = coarse(x, y) * 0.6 + fine(x, y) * 0.4;
    if (rnd() > 0.3 + n * 0.6) continue;
    r(g, x, y, 1, 2, ramp(R, n - 0.3));
    r(g, x + 1, y + 1, 1, 1, ramp(R, n + 0.35));
    if (rnd() < 0.3) r(g, x - 1, y + 1, 1, 1, ramp(R, n - 0.15));
  }

  // --- battlefield scarring ----------------------------------------------
  for (let i = 0; i < 74; i++) {
    const cx = 30 + Math.floor(rnd() * (W - 60)), cy = Math.floor(rnd() * 390);
    const rw = 4 + Math.floor(rnd() * 9), rh = 2 + Math.floor(rnd() * 4);
    for (let dy = -rh; dy <= rh; dy++) {
      const k = Math.sqrt(Math.max(0, 1 - (dy * dy) / (rh * rh + 0.01)));
      const half = Math.round(rw * k * (0.72 + rnd() * 0.55));
      if (half <= 0) continue;
      r(g, cx - half, cy + dy, half * 2, 1, dy < 0 ? '#4a3b28' : '#372c1d');
    }
    r(g, cx - rw, cy - rh, rw * 2, 1, '#5e4b33');
  }
  for (let i = 0; i < 50; i++) {
    const x = 24 + Math.floor(rnd() * (W - 48)), y = Math.floor(rnd() * 420);
    if (Math.abs(x - GATE_X) < 22) continue;
    if (rnd() < 0.5) {
      r(g, x, y, 4, 1, '#cfc7b2'); r(g, x, y - 1, 1, 1, '#cfc7b2'); r(g, x + 3, y + 1, 1, 1, '#cfc7b2');
    } else {
      r(g, x, y - 5, 1, 6, '#6f4a24'); r(g, x, y - 7, 1, 2, '#a9b0b8');
    }
  }
  // the horde's staging ground
  for (let i = 0; i < 10; i++) {
    const x = 40 + Math.floor(rnd() * (W - 80)), y = 16 + Math.floor(rnd() * 84);
    if (Math.abs(x - GATE_X) < 18) continue;
    if (rnd() < 0.55) {
      contactShadow(g, x + 1, y + 1, 4, 0.3);
      r(g, x, y - 12, 2, 13, '#4a3320');
      r(g, x - 2, y - 17, 6, 5, '#d8d2c0');
      r(g, x - 2, y - 17, 6, 1, '#f0ebdc');
      r(g, x - 1, y - 15, 1, 2, '#2a2018'); r(g, x + 2, y - 15, 1, 2, '#2a2018');
      r(g, x - 2, y - 12, 6, 1, '#2a2018');
      r(g, x - 4, y - 14, 2, 1, '#98291a'); r(g, x + 4, y - 14, 2, 1, '#98291a');
    } else {
      for (let a = 0; a < 8; a++) {
        r(g, x + Math.round(Math.cos(a / 8 * 6.28) * 5), y + Math.round(Math.sin(a / 8 * 6.28) * 3), 2, 2, '#6e6b62');
      }
      r(g, x - 2, y - 1, 4, 2, '#241a12');
      r(g, x - 1, y, 2, 1, '#5c3a1a');
    }
  }

  // --- roads: worn centre, rutted, stones and puddles ---------------------
  const road = (x, y, w, h, vertical) => {
    const dirt = makeNoise(rnd, 9, w + 4, h + 4, -x, -y);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const across = vertical ? i / w : j / h;
        const edge = Math.abs(across - 0.5) * 2;             // 0 centre, 1 verge
        const n = dirt(x + i, y + j);
        // packed and pale down the middle, damper and darker at the verge
        const t = 0.62 - edge * 0.42 + n * 0.34;
        r(g, x + i, y + j, 1, 1, ramp(['#5c4529', '#75593a', '#8f7049', '#a5865c'], t));
      }
    }
    // cart ruts
    for (const off of [0.34, 0.66]) {
      for (let j = 0; j < (vertical ? h : w); j += 1) {
        if (rnd() < 0.25) continue;
        const px = vertical ? x + Math.round(w * off) : x + j;
        const py = vertical ? y + j : y + Math.round(h * off);
        r(g, px, py, vertical ? 2 : 1, vertical ? 1 : 2, '#5c4529');
      }
    }
    // grit and the odd puddle
    for (let i = 0; i < w * h * 0.012; i++) {
      const px = x + Math.floor(rnd() * w), py = y + Math.floor(rnd() * h);
      if (rnd() < 0.22) { r(g, px, py, 3, 2, '#4a4433'); r(g, px, py, 3, 1, '#6b6754'); }
      else r(g, px, py, 1, 1, rnd() < 0.5 ? '#4f3d24' : '#b39a70');
    }
    // ragged verge blending into grass
    for (let j = 0; j < (vertical ? h : w); j += 2) {
      const py = vertical ? y + j : y + Math.round(h * rnd());
      const px = vertical ? x : x + j;
      const verge = rnd() < 0.5 ? '#6a5637' : '#5f6b3a';   // earth blending to grass
      if (vertical) {
        r(g, px - 1 + Math.floor(rnd() * 2), py, 1, 2, verge);
        r(g, px + w - 1 + Math.floor(rnd() * 2), py, 1, 2, verge);
      } else {
        r(g, px, y - 1 + Math.floor(rnd() * 2), 2, 1, verge);
        r(g, px, y + h - 1 + Math.floor(rnd() * 2), 2, 1, verge);
      }
    }
  };
  road(GATE_X - 11, 0, 22, H - 36, true);
  road(0, 738, W, 18, false);
  road(96, 730, 12, 62, true);
  road(292, 728, 10, 132, true);

  // --- mountains: a rock band with real crests, not a gradient ------------
  mountains(g, rnd, 'L');
  mountains(g, rnd, 'R');

  // --- palisade + gate ----------------------------------------------------
  const py = GATE_Y - 10;
  for (let x = 0; x < W; x += 4) {
    if (Math.abs(x - GATE_X) < 15) continue;
    contactShadow(g, x + 2, py + 13, 3, 0.3);
    r(g, x, py, 4, 12, M.wood2.mid);
    r(g, x, py, 1, 12, M.wood2.hi);
    r(g, x + 3, py, 1, 12, M.wood2.lo);
    r(g, x + 1, py - 2, 2, 3, M.wood2.mid);
    r(g, x + 1, py - 2, 1, 3, M.wood2.hi);
    box(g, x, py - 2, 4, 14, M.wood2.out);
  }
  for (const gx of [GATE_X - 22, GATE_X + 15]) {
    contactShadow(g, gx + 4, py + 13, 5, 0.32);
    r(g, gx, py - 8, 8, 20, M.stone.mid);
    r(g, gx, py - 8, 8, 1, M.stone.hi);
    r(g, gx, py - 8, 1, 20, M.stone.hi);
    r(g, gx + 7, py - 8, 1, 20, M.stone.lo);
    for (let i = 0; i < 3; i++) r(g, gx + i * 3, py - 11, 2, 3, M.stone2.mid);
    box(g, gx, py - 11, 8, 23, M.stone.out);
  }
  r(g, GATE_X - 15, py - 6, 30, 4, M.wood2.mid);
  r(g, GATE_X - 15, py - 6, 30, 1, M.wood2.hi);
  box(g, GATE_X - 15, py - 6, 30, 4, M.wood2.out);

  fenceRun(g, 12, 742, 74);
  fenceRun(g, 262, 906, 78);
  const zones = keepOut();

  // --- woodland -----------------------------------------------------------
  for (let i = 0; i < 460; i++) {
    const x = Math.floor(rnd() * (W + 40)) - 20;
    const y = Math.floor(rnd() * (H - 30)) + 18;
    if (hits(zones, x - 7, y - 18, 18, 22)) continue;
    const edge = Math.min(Math.max(x, 0), W - x) / (W / 2);
    const inVillage = y > GATE_Y;
    const p = (1 - edge) * 0.85 + 0.14 + (inVillage ? -0.28 : 0);
    if (rnd() > p) continue;
    const s = 0.75 + rnd() * 0.55;
    if (y < 350 && rnd() < 0.5) treeDead(g, x, y, s);
    else if (rnd() < 0.66) treePine(g, x, y, s, rnd);
    else treeOak(g, x, y, s);
  }
  for (let i = 0; i < 110; i++) {
    const x = Math.floor(rnd() * (W - 18)) + 9, y = Math.floor(rnd() * (H - 20)) + 10;
    if (hits(zones, x, y - 8, 11, 11)) continue;
    if (rnd() < 0.5) rock(g, x, y, 0.7 + rnd() * 0.85); else bush(g, x, y);
  }
  // wildflowers grow in patches, not evenly scattered like confetti
  for (let p = 0; p < 16; p++) {
    const px = 20 + Math.floor(rnd() * (W - 40));
    const py = GATE_Y + 20 + Math.floor(rnd() * (H - GATE_Y - 40));
    const c1 = ['#d8b45a', '#e6e0cc', '#c26a52', '#9d78bd'][Math.floor(rnd() * 4)];
    for (let i = 0; i < 6 + rnd() * 7; i++) {
      const x = px + Math.round((rnd() - 0.5) * 22), y = py + Math.round((rnd() - 0.5) * 14);
      if (hits(zones, x, y, 3, 3)) continue;
      r(g, x, y, 1, 1, c1);
      if (rnd() < 0.35) r(g, x, y + 1, 1, 1, '#4a6b28');
    }
  }

  // --- village clutter ----------------------------------------------------
  barrel(g, 214, 726); barrel(g, 220, 728); crate(g, 208, 730);
  crate(g, 310, 742); barrel(g, 318, 740);
  logPile(g, 118, 806, 3); logPile(g, 30, 820, 2);
  crate(g, 150, 830); barrel(g, 158, 828);

  // --- lamp posts along the road -----------------------------------------
  for (let y = 690; y < H - 30; y += 62) {
    for (const x of [GATE_X - 17, GATE_X + 14]) {
      contactShadow(g, x + 1, y + 1, 3, 0.28);
      r(g, x, y - 12, 2, 13, M.wood2.mid);
      r(g, x, y - 12, 1, 13, M.wood2.hi);
      r(g, x - 2, y - 16, 6, 5, M.iron.mid);
      r(g, x - 1, y - 15, 4, 3, '#f6d67a');
      r(g, x - 1, y - 15, 4, 1, '#fff2c0');
      box(g, x - 2, y - 16, 6, 5, M.iron.out);
    }
  }

  // --- the horde's shadow lies over the far north ------------------------
  for (let y = 0; y < 80; y++) {
    g.globalAlpha = 0.46 * (1 - y / 80);
    r(g, -PAD, y, W + PAD * 2, 1, '#1a1024');
    g.globalAlpha = 1;
  }
  return c;
}

// ---------------------------------------------------------------------------
// Flanking rock. Filled band + several crest lines with snow and cast shadow,
// which reads as a range rather than the flat gradient a single ridge gives.
// ---------------------------------------------------------------------------
// Crest geometry, shared by the ImageData pass and the detail pass below.
function mountainProfile() {
  const depth = Math.ceil((PAD + 30) / 40);
  const crestOf = (side, y, k) => {
    const ph = side === 'L' ? 0 : 3.1;
    return 27 - k * 40
      + Math.sin(y * 0.020 + ph + k * 1.7) * (9 + k * 6)
      + Math.sin(y * 0.047 + ph * 2 + k * 2.3) * (4 + k * 2)
      + Math.sin(y * 0.009 + ph * 0.7 + k) * 7;
  };
  const cache = new Map();
  const row = (side, y) => {
    const key = side + ':' + y;
    let hit = cache.get(key);
    if (hit) return hit;
    const cs = [];
    for (let k = 0; k < depth; k++) cs.push(crestOf(side, y, k));
    const e = Math.max(6, Math.round(cs[0]));
    const L = side === 'L';
    hit = {
      edge: e, cs, depth,
      // 0..1 lightness: bright along each ridge, dark in the troughs between.
      shadeAt(i) {
        let k = 0;
        while (k < depth - 1 && cs[k + 1] > i) k++;
        const hi = cs[k], lo = k + 1 < depth ? cs[k + 1] : hi - 40;
        const u = Math.max(0, Math.min(1, (i - lo) / Math.max(1, hi - lo)));
        const ridgeLit = 1 - Math.sin(u * Math.PI);
        const near = (i + PAD) / (e + PAD);
        const lean = L ? u * 0.16 : (1 - u) * 0.16;
        return 0.16 + ridgeLit * 0.46 + near * 0.13 + lean;
      },
    };
    cache.set(key, hit);
    return hit;
  };
  row.crestOf = crestOf;
  row.depth = depth;
  return row;
}

// Highlights, snow, talus and vegetation drawn over the rock body.
function mountains(g, rnd, side) {
  const W = WORLD.W, H = WORLD.H;
  const L = side === 'L';
  const prof = mountainProfile();
  const xAt = (v) => (L ? v : W - 1 - v);
  const HAZE = '#8d97a8';

  for (let y = 0; y < H; y++) {
    const row = prof(side, y);
    const e = row.edge;
    for (let k = 0; k < row.depth; k++) {
      const cx = Math.round(row.cs[k]);
      if (cx < -PAD + 1 || cx > e) continue;
      const peak = row.cs[k] - Math.max(prof.crestOf(side, y - 9, k), prof.crestOf(side, y + 9, k));
      const haze = Math.min(0.55, k * 0.13);
      r(g, xAt(cx), y, 1, 1, mixHex('#ddd9cc', HAZE, haze));
      r(g, xAt(cx + (L ? 1 : -1)), y, 1, 1, mixHex('#3d3c37', HAZE, haze));
      if (peak > 0.35) {
        const cap = Math.min(5, 2 + k);
        for (let sIdx = 0; sIdx < cap; sIdx++) {
          r(g, xAt(cx - (L ? sIdx : -sIdx)), y, 1, 1,
            mixHex(sIdx === 0 ? '#f6f4ee' : sIdx < 3 ? '#e2dfd5' : '#c8c5ba', HAZE, haze));
        }
      }
    }
    if (rnd() < 0.10) r(g, xAt(e), y, L ? 2 : -2, 1, '#6b675e');
    g.globalAlpha = 0.32;
    r(g, xAt(e), y, L ? 4 : -4, 1, '#22301a');
    g.globalAlpha = 0.17;
    r(g, xAt(e + (L ? 4 : -4)), y, L ? 3 : -3, 1, '#22301a');
    g.globalAlpha = 1;
  }

  for (let i = 0; i < 70; i++) {
    const y = Math.floor(rnd() * H);
    const v = prof(side, y).edge - 1 - Math.floor(rnd() * 26);
    if (v < -PAD + 8) continue;
    if (rnd() < 0.45) rock(g, xAt(v) - 3, y, 0.6 + rnd() * 0.7);
    else treePine(g, xAt(v) - 5, y, 0.5 + rnd() * 0.3, rnd);
  }
}
