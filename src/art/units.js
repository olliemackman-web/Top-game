import { r, box, mkPix, M } from './prims.js';

// ---------------------------------------------------------------------------
// Tiny humanoid + beast sprites. Cached per (type, frame, facing).
// Sprites are drawn facing RIGHT and flipped for left.
// ---------------------------------------------------------------------------

const SKIN   = { pale: '#e8b98d', dark: '#a9754a', green: '#79a34a', grey: '#8f9a7e' };

// Generic two-legged fighter.
function humanoid(g, o, f) {
  const { cloth, armor, skin, helm, plume } = o;
  const bob = f ? 0 : 1;         // 2-frame walk bob
  const y = 1 + bob;

  // legs (swap on frame)
  r(g, f ? 1 : 2, 7 + bob, 2, 2, o.boot || '#4a3320');
  r(g, f ? 3 : 2, 7 + bob, 2, 2, o.boot || '#4a3320');
  // body
  r(g, 1, y + 2, 5, 4, cloth);
  r(g, 1, y + 2, 5, 1, o.clothHi || cloth);
  if (armor) { r(g, 1, y + 3, 5, 2, armor); r(g, 1, y + 3, 5, 1, o.armorHi || armor); }
  // head
  r(g, 2, y - 1, 4, 3, skin);
  r(g, 2, y - 1, 4, 1, helm ? helm : skin);
  if (helm) { r(g, 1, y - 1, 6, 2, helm); r(g, 1, y - 1, 6, 1, o.helmHi || helm); }
  if (plume) r(g, 3, y - 3, 2, 2, plume);
  // eyes
  r(g, 4, y + 1, 1, 1, '#1c1409');
  box(g, 1, y - 1, 6, 8, 'rgba(28,20,9,0.34)');
}

function villager(tunic, hi, hat) {
  return (g, f) => {
    humanoid(g, { cloth: tunic, clothHi: hi, skin: SKIN.pale, helm: hat, helmHi: hat }, f);
  };
}

const DRAW = {
  villagerA: villager('#7a5a8f', '#9b7ab0', null),
  villagerB: villager('#4a6d5c', '#6b9480', '#8a5a30'),
  villagerC: villager('#a05a3a', '#c07a52', null),
  chicken: (g, f) => {
    const b = f ? 0 : 1;
    r(g, 1, 3 + b, 4, 3, '#efe4cb');
    r(g, 1, 3 + b, 4, 1, '#ffffff');
    r(g, 4, 1 + b, 2, 2, '#efe4cb');
    r(g, 5, 2 + b, 1, 1, '#e8a33a');          // beak
    r(g, 4, 0 + b, 1, 1, '#c2452f');          // comb
    r(g, 5, 1 + b, 1, 1, '#1c1409');          // eye
    r(g, 0, 3 + b, 1, 2, '#d6c8a9');          // tail
    r(g, f ? 2 : 3, 6 + b, 1, 2, '#e8a33a');
  },
  militia: (g, f) => {
    humanoid(g, { cloth: '#8a5a30', clothHi: '#a97b45', skin: SKIN.pale, helm: '#8d949d', helmHi: '#c3c9d1' }, f);
    r(g, 6, 2 + (f ? 0 : 1), 1, 5, '#c3c9d1');       // sword
    r(g, 6, 1 + (f ? 0 : 1), 1, 1, '#eef2f6');
    r(g, 0, 4 + (f ? 0 : 1), 2, 4, '#7a4a22');       // shield
    r(g, 0, 4 + (f ? 0 : 1), 2, 1, '#a97b45');
  },
  knight: (g, f) => {
    humanoid(g, { cloth: '#3d6493', clothHi: '#5f8fc4', armor: '#8d949d', armorHi: '#c3c9d1',
                  skin: SKIN.pale, helm: '#a2a9b2', helmHi: '#dfe4ea', plume: '#98291a', boot: '#5c626a' }, f);
    r(g, 7, 1 + (f ? 0 : 1), 1, 7, '#dfe4ea');       // greatsword
    r(g, 6, 4 + (f ? 0 : 1), 3, 1, '#8d949d');
    r(g, 0, 3 + (f ? 0 : 1), 2, 5, '#3d6493');
    r(g, 0, 3 + (f ? 0 : 1), 2, 1, '#5f8fc4');
  },
  archer: (g, f) => {
    humanoid(g, { cloth: '#3f6127', clothHi: '#5f8a3a', skin: SKIN.pale, helm: '#4a6d2d', helmHi: '#6b9440' }, f);
    r(g, 7, 1 + (f ? 0 : 1), 1, 7, '#8a5a30');       // bow
    r(g, 6, 1 + (f ? 0 : 1), 1, 1, '#8a5a30');
    r(g, 6, 7 + (f ? 0 : 1), 1, 1, '#8a5a30');
    r(g, 6, 2 + (f ? 0 : 1), 1, 5, '#d9c48a');       // string
    r(g, 0, 2, 2, 3, '#6f4a24');                      // quiver
  },
  mage: (g, f) => {
    humanoid(g, { cloth: '#6d4593', clothHi: '#9b6ec6', skin: SKIN.pale, helm: '#472a63', helmHi: '#6d4593' }, f);
    r(g, 1, 6 + (f ? 0 : 1), 5, 3, '#6d4593');       // robe hem
    r(g, 1, 6 + (f ? 0 : 1), 5, 1, '#9b6ec6');
    r(g, 7, 0 + (f ? 0 : 1), 1, 9, '#8a5a30');       // staff
    r(g, 6, -1 + (f ? 0 : 1), 3, 3, '#c7ecff');      // orb
    r(g, 7, 0 + (f ? 0 : 1), 1, 1, '#ffffff');
  },
  goblin: (g, f) => {
    humanoid(g, { cloth: '#6b4423', clothHi: '#8a5a30', skin: SKIN.green }, f);
    r(g, 1, 1 + (f ? 0 : 1), 1, 2, SKIN.green);      // ears
    r(g, 6, 1 + (f ? 0 : 1), 1, 2, SKIN.green);
    r(g, 4, 2 + (f ? 0 : 1), 1, 1, '#c2452f');       // red eye
    r(g, 7, 3 + (f ? 0 : 1), 1, 4, '#a9b0b8');       // rusty blade
    r(g, 7, 2 + (f ? 0 : 1), 1, 1, '#d3d9de');
  },
  orc: (g, f) => {
    humanoid(g, { cloth: '#98291a', clothHi: '#cf5138', armor: '#5c626a', armorHi: '#8d949d',
                  skin: '#5f8a3a', helm: '#5c626a', helmHi: '#8d949d' }, f);
    r(g, 0, 3, 1, 4, '#4a6d2d');
    r(g, 7, 0 + (f ? 0 : 1), 2, 2, '#a9b0b8');       // axe head
    r(g, 7, 2 + (f ? 0 : 1), 1, 6, '#6f4a24');
    r(g, 4, 3 + (f ? 0 : 1), 1, 1, '#ffd24a');
  },
  shaman: (g, f) => {
    humanoid(g, { cloth: '#472a63', clothHi: '#6d4593', skin: SKIN.green, helm: '#2f1b45' }, f);
    r(g, 1, 6 + (f ? 0 : 1), 5, 3, '#472a63');
    r(g, 7, 0 + (f ? 0 : 1), 1, 9, '#4a3320');
    r(g, 6, -1 + (f ? 0 : 1), 3, 3, '#b06adf');
    r(g, 7, 0 + (f ? 0 : 1), 1, 1, '#e6cbff');
    r(g, 4, 2 + (f ? 0 : 1), 1, 1, '#ffd24a');
  },
  wolf: (g, f) => {
    const b = f ? 0 : 1;
    r(g, 1, 2 + b, 7, 3, '#6b6b63');                 // body
    r(g, 1, 2 + b, 7, 1, '#8f8f85');
    r(g, 7, 0 + b, 3, 3, '#6b6b63');                 // head
    r(g, 7, 0 + b, 3, 1, '#8f8f85');
    r(g, 9, 2 + b, 1, 1, '#3a3a34');                 // snout
    r(g, 8, 1 + b, 1, 1, '#e05a3d');                 // eye
    r(g, 7, -1 + b, 1, 1, '#4a4a44'); r(g, 9, -1 + b, 1, 1, '#4a4a44'); // ears
    r(g, 0, 1 + b, 2, 2, '#4a4a44');                 // tail
    r(g, f ? 1 : 2, 5 + b, 1, 2, '#3a3a34');
    r(g, f ? 6 : 5, 5 + b, 1, 2, '#3a3a34');
    box(g, 1, 0 + b, 9, 7, 'rgba(20,18,14,0.3)');
  },
  ogre: (g, f) => {
    const b = f ? 0 : 1;
    r(g, 2, 10 + b, 3, 4, '#4a3320'); r(g, 6, 10 + b, 3, 4, '#4a3320');   // legs
    r(g, 1, 4 + b, 9, 7, '#8f7a52');                 // torso
    r(g, 1, 4 + b, 9, 1, '#b39a68');
    r(g, 2, 8 + b, 7, 3, '#98291a');                 // loincloth
    r(g, 3, 0 + b, 6, 5, '#a08a5e');                 // head
    r(g, 3, 0 + b, 6, 1, '#c2ab77');
    r(g, 4, 2 + b, 1, 1, '#ffd24a'); r(g, 7, 2 + b, 1, 1, '#ffd24a');
    r(g, 5, 4 + b, 1, 1, '#e8e2d4'); r(g, 7, 4 + b, 1, 1, '#e8e2d4');     // tusks
    r(g, 10, 2 + b, 2, 9, '#6f4a24');                // club
    r(g, 9, 0 + b, 4, 4, '#5b3a1b');
    r(g, 9, 0 + b, 4, 1, '#8a5a30');
    box(g, 1, 0 + b, 11, 14, 'rgba(20,14,6,0.3)');
  },
};

// Nominal canvas size per type (a little slack for weapons).
const SIZE = {
  villagerA: [9, 11], villagerB: [9, 11], villagerC: [9, 11], chicken: [7, 9],
  militia: [9, 11], knight: [10, 12], archer: [9, 11], mage: [10, 12],
  goblin: [9, 10], orc: [10, 12], shaman: [10, 12], wolf: [11, 9], ogre: [14, 16],
};

const cache = new Map();

export function unitSprite(type, frame, faceLeft) {
  const key = type + frame + (faceLeft ? 'L' : 'R');
  let hit = cache.get(key);
  if (hit) return hit;
  const [w, h] = SIZE[type] || SIZE.militia;
  const { c, g } = mkPix(w, h);
  g.translate(0, 2);
  if (faceLeft) { g.translate(w, 0); g.scale(-1, 1); }
  (DRAW[type] || DRAW.militia)(g, frame);
  cache.set(key, c);
  return c;
}

export function unitSize(type) { return SIZE[type] || SIZE.militia; }

// Small icon render for menus (scaled up 3x onto a supplied context).
export function drawUnitIcon(ctx, type, size) {
  const s = unitSprite(type, 0, false);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);
  const k = Math.floor(size / Math.max(s.width, s.height));
  ctx.drawImage(s, Math.floor((size - s.width * k) / 2), Math.floor((size - s.height * k) / 2),
                s.width * k, s.height * k);
}
