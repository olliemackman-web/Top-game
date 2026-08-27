import { TICK_MAX, INTERMISSION, WORLD } from './config.js';
import { S, load, save, hallMax, logLine } from './state.js';
import { initArt, resize, draw, camMax, clampCam, VP } from './render.js';
import { tickEconomy } from './sim/economy.js';
import { tickCombat, clearField, hooks } from './sim/combat.js';
import { tickVillage, initVillage } from './sim/village.js';
import { wireInput } from './input.js';
import {
  wireUi, updateHud, toast, selectBuilding, closeBuilding, closeSheet,
  getSelected, showDefeat, showOffline, tryUpgrade,
} from './ui.js';

const canvas = document.getElementById('game');
let g = resize(canvas);

initArt();
const offline = load();
if (!S.hallHp) S.hallHp = hallMax();

initVillage();

const cam = { x: 0, y: camMax(), target: null };
let hover = null;
let paused = false;
let time = 0;

// ---------------------------------------------------------------------------
const api = {
  goVillage() { cam.target = camMax(); },
  goBattle()  { cam.target = 0; },
  toggleView() { if (cam.y > camMax() * 0.5) api.goBattle(); else api.goVillage(); },
};
wireUi(api);

const tickInput = wireInput(canvas, cam, {
  onTap(id) {
    if (id) selectBuilding(id);
    else { closeBuilding(); closeSheet(); }
  },
  onHover(id) { hover = id; canvas.style.cursor = id ? 'pointer' : ''; },
  onEscape() { closeBuilding(); closeSheet(); },
  onToggle() { api.toggleView(); },
});

window.addEventListener('resize', () => {
  g = resize(canvas);
  clampCam(cam);
});

// ---------------------------------------------------------------------------
hooks.toast = toast;
hooks.onWave = (n) => {
  if (n % 5 === 0) toast(`Wave ${n} — an Ogre marches with them`, 'bad');
};
hooks.onDefeat = () => {
  if (paused) return;
  paused = true;
  logLine(`The Town Hall fell on wave ${S.wave}.`);
  clearField();
  save();
  showDefeat(() => {
    S.wave = 1;
    S.phase = 'calm';
    S.timer = INTERMISSION;
    S.hallHp = hallMax();
    S.res.food = Math.max(S.res.food, 60);
    clearField();
    logLine('The valley regroups. The horde returns from wave 1.');
    paused = false;
    save();
  });
};

// ---------------------------------------------------------------------------
S.phase = 'calm';
S.timer = 8;
if (offline) showOffline(offline);
if (!S.seenIntro) {
  S.seenIntro = true;
  document.querySelector('#toolbar button[data-tab="help"]').click();
}

// Debug handle — also handy for anyone poking at the game in devtools.
window.IV = {
  S, cam, api, save, camMax, VP, upgrade: (id) => tryUpgrade(id, true),
  // Fast-forward the simulation in fixed steps (debugging / balance checks).
  ff(seconds, step = 0.05) {
    for (let t = 0; t < seconds; t += step) {
      tickEconomy(step); tickCombat(step); tickVillage(step);
      if (paused) break;
    }
  },
};

let last = performance.now();
let saveT = 0;

function frame(now) {
  const dt = Math.min(TICK_MAX, (now - last) / 1000);
  last = now;
  time += dt;

  tickInput(dt);

  if (!paused) {
    tickEconomy(dt);
    tickCombat(dt);
    tickVillage(dt);
    saveT += dt;
    if (saveT > 10) { saveT = 0; save(); }
  }

  draw(g, cam, time, getSelected(), hover);
  updateHud(dt);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------------------
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
  else last = performance.now();
});
window.addEventListener('beforeunload', save);

// Nudge the player toward the front line the first time a wave lands.
let warned = false;
hooks.onWave = ((prev) => (n) => {
  prev?.(n);
  if (!warned && n >= 1 && cam.y > camMax() * 0.5) {
    warned = true;
    toast('The horde is marching — scroll up (Space) to watch the line', '');
  }
})(hooks.onWave);
