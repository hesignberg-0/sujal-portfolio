/* ============================================================
   Sujal Kushwaha | Portfolio interactions
   GSAP + ScrollTrigger drive the chapters, Lenis smooths scroll.
   Without GSAP (CDN blocked) or with reduced motion, the page
   falls back to a plain, fully readable layout (html.static).
   ============================================================ */
(() => {
  'use strict';

  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = window.gsap, ST = window.ScrollTrigger;
  const motion = !!(G && ST) && !reduce;
  if (!motion) html.classList.add('static');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* Split an element's text into .word > .ch spans (keeps <br>). Returns the letters. */
  function split(el) {
    const chars = [];
    const nodes = [...el.childNodes];
    el.textContent = '';
    nodes.forEach(n => {
      if (n.nodeType !== 3) { el.appendChild(n); return; }
      n.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'word';
        for (const c of part) {
          const s = document.createElement('span');
          s.className = 'ch';
          s.textContent = c;
          w.appendChild(s);
          chars.push(s);
        }
        el.appendChild(w);
      });
    });
    return chars;
  }

  /* ---------- 3D monogram: stacked layers give it depth ---------- */
  const mono = $('.mono-inner');
  if (mono) {
    const t = mono.dataset.mono, N = 22;
    const back = [16, 16, 16], near = [150, 150, 150]; // near-black -> mid grey
    let h = `<span class="sizer">${t}</span>`;
    for (let i = N; i >= 1; i--) {
      const k = i / N;
      const c = near.map((v, j) => Math.round(v + (back[j] - v) * k));
      h += `<span style="--z:${-i};--c:rgb(${c})">${t}</span>`;
    }
    mono.innerHTML = h + `<span class="front" style="--z:0">${t}</span>`;
  }

  /* pointer tilt on the monogram */
  const tilt = $('.mono-tilt');
  const pointer = { x: .5, y: .5 };
  if (tilt && !reduce && matchMedia('(hover: hover)').matches) {
    let rx = 0, ry = 0;
    addEventListener('pointermove', e => { pointer.x = e.clientX / innerWidth; pointer.y = e.clientY / innerHeight; }, { passive: true });
    (function loop() {
      rx += ((pointer.y - .5) * -16 - rx) * .06;
      ry += ((pointer.x - .5) * 26 - ry) * .06;
      tilt.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- hero gradient (WebGL, CSS gradient underneath as fallback) ---------- */
  (function heroGL() {
    const canvas = $('.hero-gl');
    const gl = canvas && canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return;

    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `
      precision mediump float;
      uniform vec2 r; uniform float t; uniform vec2 m;
      vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
        return mix(mix(dot(h2(i),f),dot(h2(i+vec2(1,0)),f-vec2(1,0)),u.x),
                   mix(dot(h2(i+vec2(0,1)),f-vec2(0,1)),dot(h2(i+1.),f-1.),u.x),u.y);}
      void main(){
        vec2 uv=gl_FragCoord.xy/r; vec2 p=uv; p.x*=r.x/r.y;
        float s=t*.05;
        vec2 q=vec2(n(p*1.1+s),n(p*1.1+vec2(5.2,1.3)-s));
        float w=n(p*1.4+2.2*q+vec2(s*1.3,-s)+(m-.5)*.35);
        float v=uv.x*.72+uv.y*.38+w*.62-.2;
        vec3 g0=vec3(.045), g1=vec3(.11), g2=vec3(.22), g3=vec3(.38);
        vec3 c=mix(g0,g1,smoothstep(.0,.36,v));
        c=mix(c,g2,smoothstep(.4,.7,v));
        c=mix(c,g3,smoothstep(.72,1.02,v));
        c+=.045*smoothstep(.35,.9,n(p*2.6-s*1.8));
        gl_FragColor=vec4(c,1.);
      }`;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, 'r'), uT = gl.getUniformLocation(prog, 't'), uM = gl.getUniformLocation(prog, 'm');

    // soft gradient: half resolution is invisible to the eye and much cheaper
    const size = () => {
      const s = .5 * Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(2, Math.round(canvas.clientWidth * s));
      canvas.height = Math.max(2, Math.round(canvas.clientHeight * s));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    size();
    addEventListener('resize', size);

    const t0 = performance.now();
    let visible = true, raf = 0, mx = .5, my = .5;
    const draw = () => {
      mx += (pointer.x - mx) * .03; my += (pointer.y - my) * .03;
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, reduce ? 12 : (performance.now() - t0) / 1000);
      gl.uniform2f(uM, mx, 1 - my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = () => { draw(); raf = visible ? requestAnimationFrame(loop) : 0; };
    if (reduce) { draw(); return; }
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) loop(); }).observe(canvas);
    loop();
  })();

  /* ---------- header theme + scroll ticks follow the section under the header ---------- */
  const themed = $$('[data-theme]').filter(el => el !== html);
  const ticks = $$('.ticks i');
  let queued = false;
  const syncTheme = () => {
    queued = false;
    let cur = 0;
    themed.forEach((s, i) => { if (s.getBoundingClientRect().top <= 48) cur = i; });
    html.dataset.theme = themed[cur].dataset.theme;
    ticks.forEach((t, i) => t.classList.toggle('on', i === cur));
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(syncTheme); } }, { passive: true });
  syncTheme();

  /* credentials: letter roll on hover */
  $$('.cred-name').forEach(el => {
    const txt = el.textContent;
    let i = 0;
    el.innerHTML = `<span class="sr-only">${txt}</span>` + txt.split(' ').map(w =>
      `<span class="word" aria-hidden="true">${[...w].map(c => `<span class="rch"><span class="rin" data-c="${c}" style="--i:${i++}">${c}</span></span>`).join('')}</span>`
    ).join(' ');
  });

  /* ---------- no GSAP / reduced motion: static layout, done ---------- */
  if (!motion) {
    const loader = $('.loader'); if (loader) loader.remove();
    const tp = $('#ntp'); if (tp) tp.setAttribute('startOffset', '120');
    const orb = $('#norb'); if (orb) orb.remove();
    return;
  }

  /* ================= motion ================= */
  G.registerPlugin(ST);

  // the intro always plays from the top, so don't restore an old scroll position
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  const lenis = window.Lenis ? new window.Lenis({ lerp: .09 }) : null;
  if (lenis) {
    lenis.on('scroll', ST.update);
    G.ticker.add(t => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
    lenis.stop();
  }

  // anchor links scroll smoothly (through Lenis when present)
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else if (target === 0) scrollTo({ top: 0, behavior: 'smooth' });
    else target.scrollIntoView({ behavior: 'smooth' });
  }));

  /* ---------- intro ---------- */
  const heroChars = $$('.hero-name .split').flatMap(split);
  const loader = $('.loader');
  G.set('.site-header', { yPercent: -130 });
  G.set(heroChars, { yPercent: 115 });
  G.set('.mono', { scale: .3, autoAlpha: 0 });
  G.set('.hero-frame', { scale: .86 });

  G.timeline({ onComplete() { if (lenis) lenis.start(); if (loader) loader.remove(); ST.refresh(); } })
    .from('.loader-mono', { autoAlpha: 0, y: 18, duration: .6, ease: 'power3.out' })
    .to('.loader-mono', { autoAlpha: 0, y: -18, duration: .45, ease: 'power3.in' }, '+=.35')
    .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' })
    .to('.hero-frame', { scale: 1, duration: 1.4, ease: 'expo.out' }, '-=.55')
    .to(heroChars, { yPercent: 0, duration: 1.1, stagger: .035, ease: 'expo.out' }, '<.1')
    .to('.mono', { scale: 1, autoAlpha: 1, duration: 1.5, ease: 'expo.out' }, '<.25')
    .to('.site-header', { yPercent: 0, duration: 1, ease: 'expo.out' }, '<.2');

  /* ---------- hero: pinned while the manifesto slides over it ---------- */
  G.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, pin: true, pinSpacing: false } })
    .to('.hero-scale', { scale: .9, ease: 'none' }, 0)
    .to('.hero-content', { yPercent: -14, ease: 'none' }, 0);

  /* ---------- manifesto: letters darken as you scroll ---------- */
  const mChars = split($('.manifesto-text'));
  G.set(mChars, { opacity: .12 });
  G.to(mChars, {
    opacity: 1, stagger: .1, ease: 'none',
    scrollTrigger: { trigger: '.manifesto', start: 'top top', end: '+=170%', scrub: .5, pin: true }
  });

  /* ---------- journey ---------- */
  const jt = $$('.j-title .split').flatMap(split);
  G.from(jt, {
    yPercent: 115, rotate: 7, stagger: .04, ease: 'power3.out',
    scrollTrigger: { trigger: '.j-entry', start: 'top 85%', end: 'top 20%', scrub: .6 }
  });

  const sents = $$('.sentence');
  const sChars = sents.map(split);
  sChars.forEach(c => G.set(c, { yPercent: 120, rotate: 6, opacity: 0 }));
  const jtl = G.timeline({
    scrollTrigger: { trigger: '.j-sentences', start: 'top top', end: () => '+=' + innerHeight * sents.length * .85, scrub: .8, pin: true, invalidateOnRefresh: true }
  });
  sChars.forEach((c, i) => {
    jtl.to(c, { yPercent: 0, rotate: 0, opacity: 1, stagger: .025, duration: .5, ease: 'power3.out' });
    jtl.to({}, { duration: .4 });
    if (i < sChars.length - 1) jtl.to(c, { yPercent: -120, opacity: 0, stagger: .015, duration: .4, ease: 'power2.in' });
  });
  const jd = jtl.duration();
  jtl.fromTo('.j-left', { y: '50vh' }, { y: '-60vh', ease: 'none', duration: jd }, 0)
     .fromTo('.j-right', { y: '65vh' }, { y: '-50vh', ease: 'none', duration: jd }, 0);

  /* ---------- toolkit: a hand of cards turns as you scroll ---------- */
  const decks = $$('.deck');
  const deckCards = decks.map(d => $$('.card', d));
  const state = decks.map(() => ({ p: 0 }));
  const lay = k => deckCards[k].forEach((c, i) => {
    const off = i - state[k].p;
    c.style.transform = `rotate(${(off * 15).toFixed(2)}deg)`;
    c.style.zIndex = String(100 - Math.round(Math.abs(off) * 10));
    c.classList.toggle('is-active', Math.abs(off) < .5);
  });
  decks.forEach((_, k) => lay(k));
  const subs = $$('.tk-sub h3');
  G.set(decks.slice(1), { autoAlpha: 0, y: '45vh' });
  G.set(subs.slice(1), { autoAlpha: 0, yPercent: 70 });

  // each deck turns through its cards, then hands over to the next deck + subtitle
  const totalCards = deckCards.reduce((sum, c) => sum + c.length, 0);
  const tk = G.timeline({
    scrollTrigger: { trigger: '.toolkit', start: 'top top', end: () => '+=' + innerHeight * totalCards * .55, scrub: .8, pin: true, invalidateOnRefresh: true }
  }).to({}, { duration: .3 });
  decks.forEach((deck, k) => {
    const n = deckCards[k].length;
    if (k > 0) {
      tk.to(decks[k - 1], { autoAlpha: 0, y: '45vh', duration: .8, ease: 'power2.in' })
        .to(subs[k - 1], { autoAlpha: 0, yPercent: -70, duration: .5 }, '<')
        .to(deck, { autoAlpha: 1, y: 0, duration: .8, ease: 'power3.out' }, '>-.2')
        .to(subs[k], { autoAlpha: 1, yPercent: 0, duration: .5 }, '<.1');
    }
    tk.to(state[k], { p: n - 1, duration: n - 1, ease: 'none', onUpdate: () => lay(k) })
      .to({}, { duration: .4 });
  });

  /* ---------- credentials rise in ---------- */
  G.from('.creds-list li', {
    yPercent: 40, autoAlpha: 0, duration: 1, stagger: .08, ease: 'expo.out',
    scrollTrigger: { trigger: '.creds-list', start: 'top 85%' }
  });

  /* ---------- what's next: text travels along the curve, an orb leads it ---------- */
  const path = $('#npath'), tp = $('#ntp'), orb = $('#norb');
  // portrait screens: fit the whole curve instead of cropping to its middle
  const nsvg = $('.next-svg');
  const fitCurve = () => nsvg.setAttribute('preserveAspectRatio', innerWidth < innerHeight ? 'xMidYMid meet' : 'xMidYMid slice');
  fitCurve();
  addEventListener('resize', fitCurve);
  if (path && tp) {
    const L = path.getTotalLength();
    const textLen = $('.next-svg text').getComputedTextLength();
    const o = { v: L };
    const draw = () => {
      tp.setAttribute('startOffset', o.v.toFixed(1));
      const pt = path.getPointAtLength(Math.max(0, Math.min(L, o.v - 46)));
      orb.setAttribute('cx', pt.x); orb.setAttribute('cy', pt.y);
      orb.style.opacity = o.v - 46 > 0 ? 1 : 0;
    };
    draw();
    G.timeline({ scrollTrigger: { trigger: '.next', start: 'top top', end: '+=160%', scrub: .6, pin: true } })
      .to(o, { v: -textLen * .35, ease: 'none', onUpdate: draw });
    G.from('.next-intro > *', {
      y: 40, autoAlpha: 0, stagger: .12, duration: 1, ease: 'expo.out',
      scrollTrigger: { trigger: '.next', start: 'top 60%' }
    });
  }

  /* footer lines lift in */
  G.from('.foot-head, .foot-cols, .foot-mail', {
    y: 50, autoAlpha: 0, stagger: .1, duration: 1.1, ease: 'expo.out',
    scrollTrigger: { trigger: '.footer', start: 'top 70%' }
  });
  G.from('.foot-big', {
    yPercent: 60, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
  });

  addEventListener('load', () => ST.refresh());
})();
