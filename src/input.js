import { VP, camMaxY, camMinX, camMaxX, clampCam, setZoom, pick } from './render.js';
import { ZOOM_MIN, ZOOM_MAX } from './config.js';

// Browser event -> logical canvas pixels (the canvas always fills the window).
function toLogical(e) {
  return {
    x: (e.clientX / window.innerWidth) * VP.w,
    y: (e.clientY / window.innerHeight) * VP.h,
  };
}

export function wireInput(canvas, cam, handlers) {
  const pointers = new Map();      // id -> {x, y} in logical px
  let moved = 0;
  let pinchDist = 0, pinchZoom = 1;
  const keys = new Set();

  // Zoom while keeping the world point under (sx, sy) pinned in place.
  function zoomAt(z, sx, sy) {
    const wx = cam.x + sx, wy = cam.y + sy;
    const fx = sx / VP.w, fy = sy / VP.h;
    setZoom(z);
    cam.x = wx - fx * VP.w;
    cam.y = wy - fy * VP.h;
    cam.target = null;
    clampCam(cam);
  }
  cam.zoomAt = zoomAt;

  const centre = () => {
    let x = 0, y = 0;
    for (const p of pointers.values()) { x += p.x; y += p.y; }
    return { x: x / pointers.size, y: y / pointers.size };
  };
  const spread = () => {
    const a = [...pointers.values()];
    return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
  };

  canvas.addEventListener('pointerdown', (e) => {
    const p = toLogical(e);
    pointers.set(e.pointerId, p);
    moved = 0;
    cam.target = null;
    if (pointers.size === 2) { pinchDist = spread(); pinchZoom = VP.zoom; }
    try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    canvas.classList.add('drag');
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = toLogical(e);
    if (!pointers.has(e.pointerId)) {
      handlers.onHover(pick(p.x, p.y, cam));
      return;
    }
    const prev = pointers.get(e.pointerId);
    const before = pointers.size >= 2 ? centre() : prev;
    pointers.set(e.pointerId, p);

    if (pointers.size >= 2) {
      // pinch: scale about the midpoint, and pan with it
      const d = spread();
      if (pinchDist > 4 && d > 4) {
        const mid = centre();
        zoomAt(pinchZoom * (d / pinchDist), mid.x, mid.y);
        cam.x -= (mid.x - before.x);
        cam.y -= (mid.y - before.y);
        clampCam(cam);
      }
      moved += 99;                       // never treat a pinch as a tap
    } else {
      const dx = p.x - prev.x, dy = p.y - prev.y;
      moved += Math.abs(dx) + Math.abs(dy);
      cam.x -= dx;
      cam.y -= dy;
      clampCam(cam);
    }
  });

  const release = (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = pointers.get(e.pointerId);
    const wasSingle = pointers.size === 1;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (!pointers.size) canvas.classList.remove('drag');
    // a tap only counts if it was one finger that barely moved
    if (wasSingle && moved < 5 * (VP.w / 400)) handlers.onTap(pick(p.x, p.y, cam));
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', (e) => {
    pointers.delete(e.pointerId);
    if (!pointers.size) canvas.classList.remove('drag');
  });

  // Wheel zooms toward the cursor. Shift+wheel pans vertically instead.
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = toLogical(e);
    const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if (e.shiftKey) {
      cam.target = null;
      cam.y += step * 0.6 * (VP.w / 400);
      clampCam(cam);
    } else {
      zoomAt(VP.zoom * Math.pow(0.9985, step), p.x, p.y);
    }
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); handlers.onToggle(); return; }
    if (k === 'escape') { handlers.onEscape(); return; }
    if (k === '+' || k === '=') { zoomAt(VP.zoom * 1.25, VP.w / 2, VP.h / 2); return; }
    if (k === '-' || k === '_') { zoomAt(VP.zoom / 1.25, VP.w / 2, VP.h / 2); return; }
    if (k === '0') { zoomAt(1, VP.w / 2, VP.h / 2); return; }
    if (e.repeat) return;
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => { keys.clear(); pointers.clear(); });

  // Called each frame from the main loop.
  return function tickInput(dt) {
    let dx = 0, dy = 0;
    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;
    if (dx || dy) {
      cam.target = null;
      const v = 260 * dt * (VP.w / 400);
      cam.x += dx * v; cam.y += dy * v;
      clampCam(cam);
    }

    if (cam.target != null) {
      const diff = cam.target - cam.y;
      if (Math.abs(diff) < 0.7) { cam.y = cam.target; cam.target = null; }
      else cam.y += diff * Math.min(1, dt * 7);
      clampCam(cam);
    }
  };
}

export { ZOOM_MIN, ZOOM_MAX };
