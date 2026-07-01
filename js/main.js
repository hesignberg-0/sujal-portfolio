/* ============================================================
   Sujal Kushwaha — Portfolio interactions
   ============================================================ */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* ---- Intro: logo reveal (vanilla port of TextEffect 'blur' per-char) ---- */
  (function intro() {
    const el = document.getElementById('intro');
    if (!el) return;

    const unlock = () => root.classList.remove('intro-lock');
    let seen = false;
    try { seen = !!sessionStorage.getItem('introSeen'); } catch (e) {}

    // Skip entirely on repeat visits or reduced-motion
    if (seen || reduce) { el.remove(); unlock(); return; }

    // Split each [data-split] into per-character spans, preserving order & spaces
    const chars = [];
    el.querySelectorAll('[data-split]').forEach(node => {
      const text = node.textContent;
      node.textContent = '';
      for (const c of text) {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = c;
        node.appendChild(s);
        chars.push(s);
      }
    });

    const stagger = 45;     // ms between characters (≈ TextEffect 0.045)
    const charDur = 550;    // matches CSS transition
    const hold = 650;       // pause on the finished logo

    // stagger each char in
    requestAnimationFrame(() => {
      chars.forEach((s, i) => {
        s.style.transitionDelay = (i * stagger) + 'ms';
        s.classList.add('show');
      });
    });

    const total = chars.length * stagger + charDur + hold;
    const finish = () => {
      el.classList.add('is-leaving');
      try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
      el.addEventListener('animationend', () => { el.remove(); unlock(); }, { once: true });
      // safety: ensure scroll unlocks even if animationend is missed
      setTimeout(() => { el.remove(); unlock(); }, 1100);
    };
    setTimeout(finish, total);
  })();

  /* ---- Nav: scrolled state ---- */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- Mobile menu ---- */
  const toggle = document.getElementById('navToggle');
  toggle?.addEventListener('click', () => nav.classList.toggle('open'));
  document.querySelectorAll('#navLinks a').forEach(a =>
    a.addEventListener('click', () => nav.classList.remove('open'))
  );

  /* ---- Scroll reveal (resilient: viewport-pass + IO + failsafe) ---- */
  const items = Array.from(document.querySelectorAll('[data-reveal]'));
  const reveal = el => el.classList.add('in');
  const inView = el => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.95 && r.bottom > 0;
  };

  if (reduce) {
    items.forEach(reveal);
  } else {
    // 1) reveal anything already on screen right away (no dependence on IO)
    items.forEach(el => { if (inView(el)) reveal(el); });

    // 2) observe the rest for scroll-in
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
      items.forEach(el => { if (!el.classList.contains('in')) io.observe(el); });
    } else {
      items.forEach(reveal);
    }

    // 3) failsafe: nothing may stay hidden — reveal remainder on scroll & after a beat
    const sweep = () => items.forEach(el => { if (inView(el)) reveal(el); });
    window.addEventListener('scroll', sweep, { passive: true });
    setTimeout(() => items.forEach(reveal), 2600);
  }

  /* ---- Pointer tilt on [data-tilt] (desktop only) ---- */
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine && !reduce) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.style.transformStyle = 'preserve-3d';
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 4).toFixed(2)}deg) translateY(-3px)`;
      });
      const reset = () => { card.style.transform = ''; };
      card.addEventListener('pointerleave', reset);
      card.addEventListener('blur', reset);
    });
  }

  /* ---- Custom cursor ---- */
  if (fine && !reduce) {
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    let rx = 0, ry = 0, mx = 0, my = 0;
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    });
    const loop = () => {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.querySelectorAll('a, button, [data-tilt]').forEach(el => {
      el.addEventListener('pointerenter', () => ring.classList.add('hover'));
      el.addEventListener('pointerleave', () => ring.classList.remove('hover'));
    });
  }

  /* ---- Active nav link on scroll ---- */
  const sections = ['work', 'motion', 'about', 'skills', 'certs', 'contact']
    .map(id => document.getElementById(id)).filter(Boolean);
  const links = new Map();
  document.querySelectorAll('#navLinks a[href^="#"]').forEach(a =>
    links.set(a.getAttribute('href').slice(1), a)
  );
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          links.forEach(l => l.style.color = '');
          links.get(e.target.id) && (links.get(e.target.id).style.color = 'var(--ink)');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => spy.observe(s));
  }

  /* ---- Carousels (drag + buttons + progress + end states) ---- */
  document.querySelectorAll('[data-carousel]').forEach(car => {
    const vp = car.querySelector('.carousel-viewport');
    const track = car.querySelector('.carousel-track');
    const fill = car.querySelector('.carousel-progress span');
    const prev = car.querySelector('[data-dir="prev"]');
    const next = car.querySelector('[data-dir="next"]');
    if (!vp || !track) return;

    const step = () => {
      const slide = track.querySelector('.slide');
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 24;
      return slide ? slide.getBoundingClientRect().width + gap : vp.clientWidth * 0.8;
    };
    const maxScroll = () => vp.scrollWidth - vp.clientWidth;

    const update = () => {
      const max = maxScroll();
      const x = vp.scrollLeft;
      if (fill) {
        const ratio = max > 0 ? x / max : 0;
        const trackW = fill.parentElement.clientWidth;
        const fw = fill.clientWidth || trackW * 0.18;
        fill.style.transform = `translateX(${ratio * (trackW - fw)}px)`;
      }
      if (prev) prev.disabled = x <= 2;
      if (next) next.disabled = x >= max - 2;
    };
    update();
    vp.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    prev && prev.addEventListener('click', () => vp.scrollBy({ left: -step(), behavior: 'smooth' }));
    next && next.addEventListener('click', () => vp.scrollBy({ left: step(), behavior: 'smooth' }));

    // pointer drag
    let down = false, startX = 0, startScroll = 0, moved = 0;
    vp.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = true; moved = 0; startX = e.clientX; startScroll = vp.scrollLeft;
      vp.classList.add('dragging');
      vp.setPointerCapture && vp.setPointerCapture(e.pointerId);
    });
    vp.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      vp.scrollLeft = startScroll - dx;
    });
    const release = () => {
      if (!down) return;
      down = false; vp.classList.remove('dragging');
      // re-enable snap after drag settles
      requestAnimationFrame(update);
    };
    vp.addEventListener('pointerup', release);
    vp.addEventListener('pointercancel', release);
    vp.addEventListener('pointerleave', release);
    // suppress click if it was a drag
    vp.addEventListener('click', (e) => {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  });

  /* ---- Focus Rail: 3D coverflow (drag + wheel + keys + click-to-focus) ---- */
  document.querySelectorAll('.focusrail').forEach(rail => {
    const cards = Array.from(rail.querySelectorAll('.fr-card'));
    const n = cards.length;
    if (!n) return;
    const bg = rail.querySelector('.fr-bg');
    const metaEl = rail.querySelector('.fr-meta');
    const titleEl = rail.querySelector('.fr-title');
    const descEl = rail.querySelector('.fr-desc');
    const countEl = rail.querySelector('.fr-count');
    const textWrap = rail.querySelector('.fr-text');
    const stage = rail.querySelector('.fr-stage');
    let active = 0;
    let muted = true; // must start muted for autoplay; user can toggle sound on

    const spread = () => Math.max(120, Math.min(window.innerWidth * 0.26, 300));

    const render = () => {
      const sp = spread();
      cards.forEach((card, i) => {
        let off = (i - active) % n;
        if (off > n / 2) off -= n;
        if (off < -n / 2) off += n;
        const dist = Math.abs(off);
        if (dist > 2) {
          card.style.opacity = '0';
          card.style.pointerEvents = 'none';
          card.style.transform = `translate(-50%,-50%) translateX(${off * sp}px) translateZ(-700px) scale(.5)`;
          card.classList.remove('is-center');
          return;
        }
        const x = off * sp;
        const z = -dist * 180;
        const scale = off === 0 ? 1 : 0.85;
        const ry = off * -20;
        card.style.zIndex = String(off === 0 ? 20 : 10 - dist);
        card.style.opacity = String(off === 0 ? 1 : Math.max(0.12, 1 - dist * 0.5));
        card.style.pointerEvents = 'auto';
        card.style.filter = off === 0 ? 'none' : `blur(${dist * 5}px) brightness(.5)`;
        card.style.transform = `translate(-50%,-50%) translateX(${x}px) translateZ(${z}px) rotateY(${ry}deg) scale(${scale})`;
        card.classList.toggle('is-center', off === 0);
      });

      const act = cards[active];
      if (textWrap) {
        textWrap.classList.remove('show');
        void textWrap.offsetWidth;
        if (metaEl) metaEl.textContent = act.dataset.meta || '';
        if (titleEl) titleEl.textContent = act.dataset.title || '';
        if (descEl) descEl.textContent = act.dataset.desc || '';
        requestAnimationFrame(() => textWrap.classList.add('show'));
      }
      if (countEl) countEl.textContent = (active + 1) + ' / ' + n;
      // ambient bg from active card's image (videos have none → fade it out)
      if (bg) {
        const im = act.querySelector('img');
        bg.style.backgroundImage = im ? `url("${im.currentSrc || im.src}")` : 'none';
        bg.style.opacity = im ? '' : '0';
      }
      // play only the centred video; pause + mute the rest (performance + focus)
      cards.forEach((card, i) => {
        const v = card.querySelector('video');
        if (!v) return;
        if (i === active) { v.muted = muted; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
        else { v.muted = true; v.pause(); }
      });
    };

    const go = (d) => { active = (active + d + n) % n; render(); };
    const setActive = (i) => { active = ((i % n) + n) % n; render(); };

    rail.querySelector('.fr-next') && rail.querySelector('.fr-next').addEventListener('click', () => go(1));
    rail.querySelector('.fr-prev') && rail.querySelector('.fr-prev').addEventListener('click', () => go(-1));

    // sound toggle (unmute requires this user gesture)
    const soundBtn = rail.querySelector('.fr-sound');
    if (soundBtn) {
      const lbl = soundBtn.querySelector('.fr-sound-label');
      soundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        muted = !muted;
        soundBtn.classList.toggle('on', !muted);
        soundBtn.setAttribute('aria-pressed', String(!muted));
        soundBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
        if (lbl) lbl.textContent = muted ? 'Tap for sound' : 'Sound on';
        const v = cards[active].querySelector('video');
        if (v) { v.muted = muted; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      });
    }

    let dragged = false;
    cards.forEach((card, i) => card.addEventListener('click', () => { if (!dragged && i !== active) setActive(i); }));

    rail.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });

    // wheel: only act on dominant horizontal intent so vertical page scroll is untouched
    let lastWheel = 0;
    rail.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      const now = Date.now();
      if (now - lastWheel < 420) return;
      if (Math.abs(e.deltaX) > 16) { e.preventDefault(); go(e.deltaX > 0 ? 1 : -1); lastWheel = now; }
    }, { passive: false });

    // drag / swipe
    let down = false, sx = 0;
    stage.addEventListener('pointerdown', (e) => { down = true; dragged = false; sx = e.clientX; });
    window.addEventListener('pointermove', (e) => { if (down && Math.abs(e.clientX - sx) > 8) dragged = true; });
    window.addEventListener('pointerup', (e) => {
      if (!down) return; down = false;
      const dx = e.clientX - sx;
      if (dx < -45) go(1); else if (dx > 45) go(-1);
      setTimeout(() => { dragged = false; }, 0);
    });
    window.addEventListener('resize', render, { passive: true });

    render();
  });
})();
