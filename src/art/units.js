import { r, mkPix } from './prims.js';

// ---------------------------------------------------------------------------
// Characters are drawn into a padded buffer, then stamped four times in dark to
// build a 1px outline before the fill goes on top. The outline is what stops
// them dissolving into the grass once you zoom in.
// ---------------------------------------------------------------------------
const OUTLINE = '#1b1409';

function withOutline(w, h, paint) {
  const a = mkPix(w, h);
  paint(a.g);
  const b = mkPix(w, h);
  const g = b.g;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(a.c, dx, dy);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = OUTLINE;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  g.drawImage(a.c, 0, 0);
  return b.c;
}

const SKIN = {
  pale:  { hi: '#f3cfa2', mid: '#dfae7e', lo: '#b0805a' },
  green: { hi: '#8fb85c', mid: '#6f9440', lo: '#4e6b2b' },
  dark:  { hi: '#b98a5f', mid: '#96683f', lo: '#6d492a' },
  troll: { hi: '#bfa877', mid: '#9a8258', lo: '#6d5b3a' },
};

// Shared two-legged frame. f: 0/1 walk, 2 = attack pose.
function person(g, o, f) {
  const atk = f === 2;
  const bob = f === 1 ? 1 : 0;
  const y = 2 + bob;
  const S = o.skin, C = o.cloth, Ch = o.clothHi, Cl = o.clothLo;

  // legs (stride swaps between walk frames)
  const la = atk ? 2 : (f ? 2 : 3), lb = atk ? 6 : (f ? 5 : 4);
  r(g, la, y + 8, 2, 3, o.boot); r(g, la, y + 10, 2, 1, OUTLINE);
  r(g, lb, y + 8, 2, 3, o.boot); r(g, lb, y + 10, 2, 1, OUTLINE);

  // torso
  r(g, 2, y + 4, 6, 5, C);
  r(g, 2, y + 4, 6, 1, Ch);
  r(g, 7, y + 5, 1, 4, Cl);
  if (o.armour) { r(g, 2, y + 5, 6, 3, o.armour); r(g, 2, y + 5, 6, 1, o.armourHi); r(g, 7, y + 6, 1, 2, o.armourLo); }
  if (o.belt) r(g, 2, y + 8, 6, 1, o.belt);

  // arms — the weapon arm lifts on the attack frame
  r(g, 1, y + 5, 1, 3, C);
  r(g, 8, y + (atk ? 3 : 5), 1, 3, C);

  // head
  r(g, 3, y, 4, 4, S.mid);
  r(g, 3, y, 4, 1, S.hi);
  r(g, 6, y + 1, 1, 3, S.lo);
  r(g, 4, y + 2, 1, 1, o.eye || '#241a10');
  r(g, 6, y + 2, 1, 1, o.eye || '#241a10');
  if (o.helm) {
    r(g, 2, y - 1, 6, 3, o.helm);
    r(g, 2, y - 1, 6, 1, o.helmHi);
    r(g, 2, y + 1, 6, 1, o.helmLo);   // brow band — must not cover the eye row
    r(g, 1, y, 1, 2, o.helm);         // cheek guards
    r(g, 8, y, 1, 2, o.helmLo);
    if (o.plume) { r(g, 4, y - 3, 2, 2, o.plume); r(g, 4, y - 3, 1, 2, o.plumeHi || o.plume); }
  }
  if (o.hood) {
    r(g, 2, y - 1, 6, 4, o.hood);
    r(g, 2, y - 1, 6, 1, o.hoodHi);
    r(g, 3, y + 1, 4, 2, S.mid);          // face inside the hood
    r(g, 4, y + 2, 1, 1, o.eye || '#241a10');
    r(g, 6, y + 2, 1, 1, o.eye || '#241a10');
  }
  return y;
}

const D = {};

D.militia = (g, f) => {
  const y = person(g, { cloth: '#8a5a30', clothHi: '#ab7440', clothLo: '#5f3d1e',
    skin: SKIN.pale, helm: '#8d949d', helmHi: '#c3c9d1', helmLo: '#5f666e',
    boot: '#4a3320', belt: '#3d2812' }, f);
  const lift = f === 2 ? -2 : 0;
  r(g, 9, y + 2 + lift, 1, 6, '#c3c9d1');            // blade
  r(g, 9, y + 1 + lift, 1, 1, '#eef2f6');
  r(g, 8, y + 7 + lift, 3, 1, '#7a5a2a');            // crossguard
  r(g, 0, y + 4, 3, 4, '#7a4a22');                   // shield
  r(g, 0, y + 4, 3, 1, '#a97b45');
  r(g, 1, y + 5, 1, 2, '#c9a367');
};

D.knight = (g, f) => {
  const y = person(g, { cloth: '#3d6493', clothHi: '#5f8fc4', clothLo: '#284461',
    armour: '#9aa2ab', armourHi: '#ccd2d9', armourLo: '#6a7078',
    skin: SKIN.pale, helm: '#a8b0b8', helmHi: '#e2e7ec', helmLo: '#6e757d',
    plume: '#98291a', plumeHi: '#cf5138', boot: '#5c626a', eye: '#2b3138' }, f);
  const lift = f === 2 ? -3 : 0;
  r(g, 9, y + lift, 1, 8, '#e2e7ec');
  r(g, 9, y - 1 + lift, 1, 1, '#ffffff');
  r(g, 8, y + 7 + lift, 3, 1, '#c9a367');
  r(g, 0, y + 3, 3, 6, '#3d6493');                   // kite shield
  r(g, 0, y + 3, 3, 1, '#5f8fc4');
  r(g, 1, y + 5, 1, 2, '#f2c14e');
};

D.archer = (g, f) => {
  const y = person(g, { cloth: '#4a6b28', clothHi: '#6b9440', clothLo: '#32491b',
    skin: SKIN.pale, hood: '#3f5c22', hoodHi: '#5d8034',
    boot: '#4a3320', belt: '#3d2812' }, f);
  const draw = f === 2 ? 1 : 0;
  r(g, 9 - draw, y + 1, 1, 8, '#8a5a30');            // bow limbs
  r(g, 8 - draw, y, 1, 1, '#8a5a30');
  r(g, 8 - draw, y + 9, 1, 1, '#8a5a30');
  r(g, 8 - draw, y + 2, 1, 6, '#e7dcb4');            // string
  if (f === 2) r(g, 6, y + 4, 4, 1, '#d8cba0');      // nocked arrow
  r(g, 0, y + 2, 2, 4, '#5f3d1e');                   // quiver
  r(g, 0, y + 1, 2, 1, '#c9a367');
};

D.mage = (g, f) => {
  const y = person(g, { cloth: '#6d4593', clothHi: '#9b6ec6', clothLo: '#472a63',
    skin: SKIN.pale, hood: '#563477', hoodHi: '#7d55a8',
    boot: '#3a2450', belt: '#f2c14e' }, f);
  r(g, 2, y + 9, 6, 3, '#6d4593');                   // robe hem
  r(g, 2, y + 9, 6, 1, '#9b6ec6');
  r(g, 9, y - 1, 1, 11, '#8a5a30');                  // staff
  const glow = f === 2 ? '#ffffff' : '#c7ecff';
  r(g, 8, y - 3, 3, 3, glow);
  r(g, 9, y - 4, 1, 5, glow);
  r(g, 7, y - 2, 5, 1, glow);
};

const civ = (cloth, hi, lo, hat) => (g, f) =>
  person(g, { cloth, clothHi: hi, clothLo: lo, skin: SKIN.pale,
              helm: hat, helmHi: hat, helmLo: hat, boot: '#4a3320' }, f === 2 ? 0 : f);

D.villagerA = civ('#7a5a8f', '#9d7ab2', '#553f66', null);
D.villagerB = civ('#4a6d5c', '#68937f', '#33503f', '#8a5a30');
D.villagerC = civ('#a05a3a', '#c47c54', '#733d24', null);

D.chicken = (g, f) => {
  const b = f === 1 ? 1 : 0;
  r(g, 2, 4 + b, 5, 4, '#efe4cb');
  r(g, 2, 4 + b, 5, 1, '#ffffff');
  r(g, 2, 7 + b, 5, 1, '#c9bda2');
  r(g, 5, 2 + b, 3, 3, '#efe4cb');
  r(g, 5, 2 + b, 3, 1, '#ffffff');
  r(g, 7, 4 + b, 1, 1, '#e8a33a');
  r(g, 5, 1 + b, 2, 1, '#c2452f');
  r(g, 7, 3 + b, 1, 1, '#241a10');
  r(g, 1, 4 + b, 1, 3, '#d6c8a9');
  r(g, f ? 3 : 4, 8 + b, 1, 2, '#e8a33a');
  r(g, f ? 5 : 6, 8 + b, 1, 2, '#e8a33a');
};

D.goblin = (g, f) => {
  const y = person(g, { cloth: '#6b4423', clothHi: '#8a5a30', clothLo: '#4a2e15',
    skin: SKIN.green, boot: '#3d2812', belt: '#3d2812', eye: '#e8412a' }, f);
  r(g, 1, y, 1, 3, SKIN.green.mid);                  // ears
  r(g, 8, y, 1, 3, SKIN.green.mid);
  r(g, 1, y, 1, 1, SKIN.green.hi);
  const lift = f === 2 ? -2 : 0;
  r(g, 9, y + 3 + lift, 1, 5, '#a9b0b8');            // notched cleaver
  r(g, 9, y + 2 + lift, 1, 1, '#d3d9de');
  r(g, 8, y + 5 + lift, 1, 1, '#6a7078');
};

D.orc = (g, f) => {
  const y = person(g, { cloth: '#98291a', clothHi: '#cf5138', clothLo: '#631308',
    armour: '#5c626a', armourHi: '#8d949d', armourLo: '#3d4249',
    skin: { hi: '#78a24a', mid: '#5c8235', lo: '#3f5c22' },
    helm: '#5c626a', helmHi: '#8d949d', helmLo: '#3d4249',
    boot: '#3d2812', eye: '#ffd24a' }, f);
  r(g, 4, y + 3, 1, 1, '#efe4cb'); r(g, 6, y + 3, 1, 1, '#efe4cb');   // tusks
  const lift = f === 2 ? -3 : 0;
  r(g, 9, y + 2 + lift, 1, 7, '#6f4a24');            // haft
  r(g, 8, y + lift, 3, 3, '#a9b0b8');                // axe head
  r(g, 8, y + lift, 3, 1, '#d3d9de');
};

D.shaman = (g, f) => {
  const y = person(g, { cloth: '#472a63', clothHi: '#6d4593', clothLo: '#2f1b45',
    skin: SKIN.green, hood: '#2f1b45', hoodHi: '#563477',
    boot: '#3d2812', eye: '#ffd24a' }, f);
  r(g, 2, y + 9, 6, 3, '#472a63');
  r(g, 2, y + 9, 6, 1, '#6d4593');
  r(g, 9, y - 1, 1, 11, '#4a3320');
  r(g, 8, y - 3, 3, 3, '#b06adf');
  r(g, 9, y - 4, 1, 2, '#e6cbff');
  r(g, 8, y - 2, 1, 1, '#e6cbff');
};

D.wolf = (g, f) => {
  const b = f === 1 ? 1 : 0;
  const lunge = f === 2 ? 1 : 0;
  r(g, 2, 4 + b, 8, 4, '#6b6b63');                   // body
  r(g, 2, 4 + b, 8, 1, '#8f8f85');
  r(g, 2, 7 + b, 8, 1, '#4a4a44');
  r(g, 9 + lunge, 2 + b, 4, 4, '#75756c');           // head
  r(g, 9 + lunge, 2 + b, 4, 1, '#98988d');
  r(g, 12 + lunge, 4 + b, 1, 1, '#2a2a25');          // snout
  r(g, 11 + lunge, 3 + b, 1, 1, '#e8412a');          // eye
  r(g, 9 + lunge, 1 + b, 1, 1, '#5a5a52');
  r(g, 11 + lunge, 1 + b, 1, 1, '#5a5a52');
  if (f === 2) { r(g, 11, 6 + b, 3, 1, '#efe4cb'); } // bared teeth
  r(g, 0, 3 + b, 2, 2, '#4a4a44');                   // tail
  r(g, f ? 2 : 3, 8 + b, 2, 3, '#4a4a44');
  r(g, f ? 7 : 6, 8 + b, 2, 3, '#4a4a44');
};

D.ogre = (g, f) => {
  const b = f === 1 ? 1 : 0;
  const lift = f === 2 ? -4 : 0;
  r(g, 3, 13 + b, 4, 5, '#4a3320'); r(g, 8, 13 + b, 4, 5, '#4a3320');   // legs
  r(g, 2, 6 + b, 11, 8, SKIN.troll.mid);                                 // torso
  r(g, 2, 6 + b, 11, 1, SKIN.troll.hi);
  r(g, 12, 7 + b, 1, 7, SKIN.troll.lo);
  r(g, 3, 11 + b, 9, 3, '#98291a');                                      // loincloth
  r(g, 3, 11 + b, 9, 1, '#cf5138');
  r(g, 4, 1 + b, 7, 6, SKIN.troll.mid);                                  // head
  r(g, 4, 1 + b, 7, 1, SKIN.troll.hi);
  r(g, 10, 2 + b, 1, 5, SKIN.troll.lo);
  r(g, 5, 3 + b, 2, 1, '#ffd24a'); r(g, 8, 3 + b, 2, 1, '#ffd24a');      // eyes
  r(g, 6, 6 + b, 1, 2, '#efe4cb'); r(g, 9, 6 + b, 1, 2, '#efe4cb');      // tusks
  r(g, 13, 4 + b + lift, 3, 11, '#6f4a24');                              // club
  r(g, 12, 1 + b + lift, 5, 5, '#5b3a1b');
  r(g, 12, 1 + b + lift, 5, 1, '#8a5a30');
  r(g, 14, 3 + b + lift, 1, 1, '#3d2812');
};

// Canvas size per type (content is inset by 1 for the outline).
const SIZE = {
  militia: [12, 16], knight: [12, 17], archer: [12, 16], mage: [13, 18],
  villagerA: [11, 16], villagerB: [11, 16], villagerC: [11, 16], chicken: [10, 12],
  goblin: [11, 15], orc: [12, 17], shaman: [12, 18], wolf: [15, 13], ogre: [18, 20],
};

const cache = new Map();

export function unitSprite(type, frame, faceLeft) {
  const key = type + frame + (faceLeft ? 'L' : 'R');
  let hit = cache.get(key);
  if (hit) return hit;
  const [w, h] = SIZE[type] || SIZE.militia;
  const c = withOutline(w, h, (g) => {
    if (faceLeft) { g.translate(w, 0); g.scale(-1, 1); }
    (D[type] || D.militia)(g, frame);
  });
  cache.set(key, c);
  return c;
}

export function unitSize(type) { return SIZE[type] || SIZE.militia; }

export function drawUnitIcon(ctx, type, size) {
  const s = unitSprite(type, 0, false);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);
  const k = Math.max(1, Math.floor(size / Math.max(s.width, s.height)));
  ctx.drawImage(s, Math.floor((size - s.width * k) / 2), Math.floor((size - s.height * k) / 2),
                s.width * k, s.height * k);
}
