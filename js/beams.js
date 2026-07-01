/* ============================================================
   Global beams background — vanilla port of the React/canvas
   "BeamsBackground". Recoloured monochrome to fit the Vercel
   system. Fixed behind all content (z-index:-1), subtle so text
   stays readable. Pauses when the tab is hidden; respects
   reduced-motion; bails silently if 2D canvas is unavailable.

   To restore the original blue/purple look, change `SAT` to ~85
   and give each beam a hue (190 + Math.random()*70) instead of
   the fixed monochrome hue below.
   ============================================================ */
(() => {
  'use strict';
  const canvas = document.getElementById('beams');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.25);
  const COUNT = 16;
  const HUE = 220;   // cool-neutral
  const SAT = 12;    // ~grey (set ~85 for the original colourful version)

  let W = 0, H = 0;
  let beams = [];

  const createBeam = () => ({
    x: Math.random() * W * 1.5 - W * 0.25,
    y: Math.random() * H * 1.5 - H * 0.25,
    width: 70 + Math.random() * 120,
    length: H * 2.5,
    angle: -35 + Math.random() * 10,
    speed: 0.5 + Math.random() * 1.0,
    opacity: 0.10 + Math.random() * 0.12,
    light: 78 + Math.random() * 18,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.02 + Math.random() * 0.03,
  });

  const resetBeam = (b, i) => {
    const spacing = W / 3;
    b.y = H + 100;
    b.x = (i % 3) * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
    b.width = 80 + Math.random() * 120;
    b.speed = 0.5 + Math.random() * 0.5;
    b.opacity = 0.12 + Math.random() * 0.10;
    b.light = 78 + Math.random() * 18;
    return b;
  };

  const resize = () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    beams = Array.from({ length: COUNT }, createBeam);
  };

  const draw = (b) => {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate((b.angle * Math.PI) / 180);
    const op = b.opacity * (0.8 + Math.sin(b.pulse) * 0.2);
    const g = ctx.createLinearGradient(0, 0, 0, b.length);
    const c = (a) => `hsla(${HUE}, ${SAT}%, ${b.light}%, ${a})`;
    g.addColorStop(0,   c(0));
    g.addColorStop(0.1, c(op * 0.5));
    g.addColorStop(0.4, c(op));
    g.addColorStop(0.6, c(op));
    g.addColorStop(0.9, c(op * 0.5));
    g.addColorStop(1,   c(0));
    ctx.fillStyle = g;
    ctx.fillRect(-b.width / 2, 0, b.width, b.length);
    ctx.restore();
  };

  let running = false;
  const frame = () => {
    if (document.hidden) { running = false; return; }
    running = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = 'blur(32px)';
    beams.forEach((b, i) => {
      b.y -= b.speed;
      b.pulse += b.pulseSpeed;
      if (b.y + b.length < -100) resetBeam(b, i);
      draw(b);
    });
    ctx.filter = 'none';
    requestAnimationFrame(frame);
  };
  const start = () => { if (!running) requestAnimationFrame(frame); };

  resize();
  window.addEventListener('resize', resize, { passive: true });

  if (reduce) {
    // one static frame, no animation
    ctx.filter = 'blur(32px)';
    beams.forEach(draw);
    ctx.filter = 'none';
  } else {
    start();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  }
})();
