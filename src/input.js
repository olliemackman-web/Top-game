import { VP, camMax, pick } from './render.js';

// Convert a browser event into logical canvas pixels.
function toLogical(e) {
  return {
    x: (e.clientX / window.innerWidth) * VP.w,
    y: (e.clientY / window.innerHeight) * VP.h,
  };
}

export function wireInput(canvas, cam, handlers) {
  let dragging = false, moved = 0, lastY = 0, lastX = 0;
  const keys = new Set();

  const clampCam = () => { cam.y = Math.max(0, Math.min(camMax(), cam.y)); };

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0;
    const p = toLogical(e);
    lastY = p.y; lastX = p.x;
    cam.target = null;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    canvas.classList.add('drag');
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = toLogical(e);
    if (dragging) {
      const dy = p.y - lastY, dx = p.x - lastX;
      moved += Math.abs(dy) + Math.abs(dx);
      cam.y -= dy;
      clampCam();
      lastY = p.y; lastX = p.x;
    } else {
      handlers.onHover(pick(p.x, p.y, cam.y));
    }
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('drag');
    const p = toLogical(e);
    if (moved < 5) handlers.onTap(pick(p.x, p.y, cam.y));
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', () => { dragging = false; canvas.classList.remove('drag'); });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.target = null;
    cam.y += e.deltaY * (e.deltaMode === 1 ? 12 : 0.45);
    clampCam();
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); handlers.onToggle(); return; }
    if (k === 'escape') { handlers.onEscape(); return; }
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  // Called each frame from the main loop.
  return function tickInput(dt) {
    let d = 0;
    if (keys.has('w') || keys.has('arrowup')) d -= 1;
    if (keys.has('s') || keys.has('arrowdown')) d += 1;
    if (d) { cam.target = null; cam.y += d * 260 * dt; clampCam(); }

    if (cam.target != null) {
      const diff = cam.target - cam.y;
      if (Math.abs(diff) < 0.7) { cam.y = cam.target; cam.target = null; }
      else cam.y += diff * Math.min(1, dt * 7);
      clampCam();
    }
  };
}
