'use strict';
// Премиальный промо «Буклицы». Сцена — чистая функция времени: renderAt(t)
// выставляет всё состояние кадра, поэтому покадровый рендер идёт ровно,
// без рывков записи. Длительности сцен считаются по меткам геймплея.
(async function main() {
  const W = 1920, H = 1080;
  const CLIPS = await (await fetch('clips.json')).json();
  const OWL = await (await fetch('owl.svg.html')).text();

  // ---------------- math ----------------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const eOut = (k) => 1 - Math.pow(1 - k, 3);
  const eIn = (k) => k * k * k;
  const eIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const eBack = (k, s = 1.6) => (k <= 0 ? 0 : 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2));
  const spring = (tau, w = 13, d = 6.5) => (tau <= 0 ? 0 : 1 - Math.exp(-d * tau) * Math.cos(w * tau));
  const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const mixc = (a, b, k) => a.map((v, i) => Math.round(lerp(v, b[i], k)));
  const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  // ---------------- timeline (from gameplay marks, on the music grid) ----------------
  // Музыка 120 BPM: доля 0,5 с, такты с нечётных секунд. Ключевые события ставим на доли,
  // а клип сдвигаем так, чтобы момент из записи (победа, смена фона, прыжок) попал на долю.
  const BEAT = 0.5;
  const onBeat = (x) => Math.round(x / BEAT) * BEAT;
  const FLIP = { stagger: 0.28, mid: 0.25 }; // переворот клеток в игре: FLIP_STAGGER_MS, половина FLIP_MS
  const A = CLIPS.A, B = CLIPS.B, C = CLIPS.C;
  const TL = {};
  TL.logo = 3.0;
  TL.game = 6.0;
  TL.playA = TL.game + 0.5;
  { const w = TL.playA + (A.marks.enter2 - A.marks.start) + 4 * FLIP.stagger + FLIP.mid; TL.win = onBeat(w); TL.playA += TL.win - w; }
  TL.shop = onBeat(TL.win + 2.0);
  TL.playB = TL.shop + 0.2;
  { const w = TL.playB + (B.marks.applied - B.marks.start) + 0.15; TL.warm = onBeat(w); TL.playB += TL.warm - w; }
  TL.pet = onBeat(TL.playB + (B.marks.closed - B.marks.start) + 0.6);
  TL.playC = TL.pet + 0.2;
  { const w = TL.playC + (C.marks.jump - C.marks.start); TL.jump = onBeat(w); TL.playC += TL.jump - w; }
  TL.jump2 = TL.playC + (C.marks.jump2 - C.marks.start);
  TL.fin = onBeat(TL.jump2 + 1.1);
  TL.end = TL.fin + 5.0;
  window.DURATION = TL.end;
  window.TIMELINE = TL;

  // ---------------- DOM helpers ----------------
  const scene = document.getElementById('scene');
  function $(tag, cls, parent = scene, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    parent.appendChild(e);
    return e;
  }
  const px = (v) => v + 'px';
  function place(e, x, y, w, h) { e.style.left = px(x); e.style.top = px(y); if (w != null) e.style.width = px(w); if (h != null) e.style.height = px(h); }
  const show = (e, on) => { e.style.visibility = on ? 'visible' : 'hidden'; };

  function flipTile(parent, size, letter, cls, radius) {
    const root = $('div', 'tile', parent);
    root.style.width = root.style.height = px(size);
    const inn = $('div', 'in', root);
    const front = $('div', 'face front empty', inn);
    const back = $('div', `face back ${cls} gloss`, inn, `<span class="glyph">${letter}</span>`);
    front.style.borderRadius = back.style.borderRadius = px(radius);
    back.style.fontSize = px(Math.round(size * 0.56));
    return { root, inn, size };
  }
  function solidTile(parent, size, letter, cls, radius) {
    const root = $('div', 'tile', parent);
    root.style.width = root.style.height = px(size);
    const inn = $('div', 'in', root);
    const face = $('div', `face ${cls} gloss`, inn, `<span class="glyph">${letter}</span><i class="sheen"></i>`);
    face.style.borderRadius = px(radius);
    face.style.fontSize = px(Math.round(size * 0.58));
    return { root, inn, size, sheen: face.querySelector('.sheen') };
  }
  function line(parent, html, cls, x, y, w, align) {
    const m = $('div', 'mask', parent);
    place(m, x, y, w);
    m.style.textAlign = align;
    const inner = $('div', 'inner ' + cls, m, html);
    return { m, inner };
  }
  function relLine(parent, html, cls) {
    const m = $('div', 'mask', parent);
    const inner = $('div', 'inner ' + cls, m, html);
    return { m, inner };
  }
  function reveal(L, kin, kout = 0, dy = 36) {
    const e = eOut(kin);
    L.m.style.opacity = kin > 0 ? String(1 - eIn(kout)) : '0';
    L.inner.style.transform = `translateY(${(1 - e) * 108}%) translateY(${-eIn(kout) * dy}px)`;
  }

  // ---------------- canvases & sprites ----------------
  const bg = document.getElementById('bg').getContext('2d');
  const fx = document.getElementById('fx').getContext('2d');
  const wp = document.getElementById('wipe').getContext('2d');

  function sprite(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); return c; }
  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function sparkPath(ctx, s) {
    const q = s * 0.17;
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(q, -q); ctx.lineTo(s, 0); ctx.lineTo(q, q);
    ctx.lineTo(0, s); ctx.lineTo(-q, q); ctx.lineTo(-s, 0); ctx.lineTo(-q, -q); ctx.closePath();
  }
  function drawSpark(ctx, x, y, s, a, tint = '215,230,255') {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.4);
    g.addColorStop(0, `rgba(${tint},.55)`); g.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = g; ctx.fillRect(-s * 2.4, -s * 2.4, s * 4.8, s * 4.8);
    ctx.fillStyle = '#fff'; sparkPath(ctx, s); ctx.fill();
    ctx.restore();
  }

  const R = rng(20260915);
  const STARS = Array.from({ length: 260 }, () => ({ x: R() * W, y: R() * H, r: 0.5 + Math.pow(R(), 3) * 2.3, d: 0.2 + R() * 0.8, ph: R() * 6.283, sp: 0.6 + R() * 1.8, a: 0.35 + R() * 0.65 }));
  const SPARKS = Array.from({ length: 10 }, () => ({ x: R() * W, y: R() * H, s: 6 + R() * 7, ph: R() * 6.283, sp: 0.5 + R(), d: 0.3 + R() * 0.7 }));
  const TILE_COLS = ['#f7b21c', '#5aa82b', '#6b7080', '#f7b21c', '#4a4e58', '#5aa82b'];
  const BOKEH = Array.from({ length: 14 }, (_, i) => {
    const size = 64 + R() * 96, blur = 5 + R() * 16, pad = blur * 3;
    const img = sprite(size + pad * 2, size + pad * 2, (ctx) => { ctx.filter = `blur(${blur}px)`; ctx.fillStyle = TILE_COLS[i % TILE_COLS.length]; rrect(ctx, pad, pad, size, size, size * 0.2); ctx.fill(); });
    return { img, x: R() * W, y: R() * H, d: 0.15 + R() * 0.55, rot: R() * 6.283, vr: (R() - 0.5) * 0.25, a: 0.10 + R() * 0.14, vy: -8 - R() * 14 };
  });
  const COIN = sprite(100, 100, (ctx) => {
    const g = ctx.createRadialGradient(38, 34, 6, 50, 50, 46);
    g.addColorStop(0, '#fff4b8'); g.addColorStop(0.45, '#ffcf3f'); g.addColorStop(1, '#b8740a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(50, 50, 44, 0, 6.283); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(140,80,6,.9)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(50, 50, 31, 0, 6.283); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,240,180,.75)'; ctx.stroke();
    ctx.translate(50, 50); ctx.fillStyle = 'rgba(255,248,210,.95)'; sparkPath(ctx, 17); ctx.fill();
  });
  function leafPath(ctx, s) {
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.bezierCurveTo(s * 0.95, -s * 0.55, s * 0.8, s * 0.45, 0, s);
    ctx.bezierCurveTo(-s * 0.8, s * 0.45, -s * 0.95, -s * 0.55, 0, -s); ctx.closePath();
  }
  const LEAF = ['#f29a4a', '#e2572b', '#f7c948', '#c8421f'].map((c) => sprite(84, 84, (ctx) => {
    ctx.translate(42, 42); leafPath(ctx, 32); ctx.fillStyle = c; ctx.fill();
    ctx.strokeStyle = 'rgba(90,30,5,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, 30); ctx.stroke();
  }));
  const HEART = sprite(80, 80, (ctx) => {
    ctx.translate(40, 44); ctx.fillStyle = '#ff7aa8';
    ctx.beginPath(); ctx.moveTo(0, 22); ctx.bezierCurveTo(-34, 0, -24, -30, 0, -14); ctx.bezierCurveTo(24, -30, 34, 0, 0, 22); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-10, -10, 6, 4, -0.6, 0, 6.283); ctx.fill();
  });

  const CR = rng(77);
  const COINS = Array.from({ length: 38 }, () => ({ ang: -Math.PI / 2 + (CR() - 0.5) * 3.3, sp: 640 + CR() * 760, spin: 5 + CR() * 9, ph: CR() * 6.283, size: 36 + CR() * 30, delay: CR() * 0.2 }));
  const LR = rng(5);
  const LEAVES = Array.from({ length: 22 }, () => ({ x: LR() * W, y: LR() * H, v: 70 + LR() * 90, sw: 30 + LR() * 60, ph: LR() * 6.283, rs: (LR() - 0.5) * 2, s: 0.55 + LR() * 0.7, k: Math.floor(LR() * 4) }));
  const PR = rng(33);
  const PET_P = Array.from({ length: 30 }, () => ({ dx: (PR() - 0.5) * 760, off: PR() * 2.4, life: 1.8 + PR() * 1.0, s: 0.5 + PR() * 0.8, heart: PR() < 0.4, sway: 20 + PR() * 40, ph: PR() * 6.283 }));

  // ---------------- palettes ----------------
  const NIGHT = { a: [7, 12, 52], b: [22, 46, 150], c: [84, 42, 172], g1: [70, 168, 255], g2: [172, 104, 255] };
  const WARM = { a: [40, 14, 6], b: [124, 50, 16], c: [210, 124, 40], g1: [255, 192, 106], g2: [255, 116, 58] };

  // Фон рисуем в любой контекст: ночной — в #bg, тёплый — в отдельный холст, который
  // потом проявляется маской (волна от телефона / шторка), без грязного смешения цветов.
  const warmCanvas = sprite(W, H, () => {});
  const bgW = warmCanvas.getContext('2d');
  function drawBg(bg, t, warm, camX, bokehA) {
    const P = (k) => mixc(NIGHT[k], WARM[k], warm);
    const lg = bg.createLinearGradient(0, 0, W, H);
    lg.addColorStop(0, rgba(P('a'))); lg.addColorStop(0.55, rgba(P('b'))); lg.addColorStop(1, rgba(P('c')));
    bg.fillStyle = lg; bg.fillRect(0, 0, W, H);
    const glow = (x, y, r, c, a) => { const g = bg.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0)); bg.fillStyle = g; bg.fillRect(0, 0, W, H); };
    glow(640 + Math.sin(t * 0.23) * 90 - camX * 0.05, 430 + Math.cos(t * 0.19) * 50, 920, P('g1'), 0.40);
    glow(1520 + Math.cos(t * 0.17) * 80 - camX * 0.08, 880, 840, P('g2'), 0.36);
    glow(960, 1200, 760, P('g2'), 0.20);

    const starMul = 1 - 0.8 * warm;
    for (const s of STARS) {
      const x = (((s.x - camX * s.d * 0.08) % W) + W) % W;
      const y = s.y + Math.sin(t * 0.1 + s.ph) * 2;
      const a = s.a * (0.6 + 0.4 * Math.sin(t * s.sp + s.ph)) * starMul;
      if (a <= 0.01) continue;
      bg.fillStyle = `rgba(255,255,255,${a})`; bg.beginPath(); bg.arc(x, y, s.r, 0, 6.283); bg.fill();
      if (s.r > 1.5) { const g = bg.createRadialGradient(x, y, 0, x, y, s.r * 6); g.addColorStop(0, `rgba(200,222,255,${a * 0.5})`); g.addColorStop(1, 'rgba(200,222,255,0)'); bg.fillStyle = g; bg.fillRect(x - s.r * 6, y - s.r * 6, s.r * 12, s.r * 12); }
    }
    for (const s of SPARKS) {
      const x = (((s.x - camX * s.d * 0.1) % W) + W) % W;
      const a = (0.45 + 0.55 * Math.sin(t * s.sp * 1.3 + s.ph)) * starMul;
      drawSpark(bg, x, s.y, s.s * (0.75 + 0.25 * a), a);
    }
    if (bokehA > 0.01) {
      for (const k of BOKEH) {
        const x = ((((k.x - camX * k.d * 0.3) % (W + 360)) + W + 360) % (W + 360)) - 180;
        const y = ((((k.y + k.vy * t) % (H + 360)) + H + 360) % (H + 360)) - 180;
        bg.save(); bg.globalAlpha = k.a * bokehA; bg.translate(x, y); bg.rotate(k.rot + k.vr * t);
        bg.drawImage(k.img, -k.img.width / 2, -k.img.height / 2); bg.restore();
      }
    }
    const v = bg.createRadialGradient(W / 2, H / 2, H * 0.36, W / 2, H / 2, H * 1.06);
    v.addColorStop(0, 'rgba(0,0,14,0)'); v.addColorStop(1, 'rgba(0,0,14,.62)');
    bg.fillStyle = v; bg.fillRect(0, 0, W, H);
  }

  // ---------------- HOOK ----------------
  const hook = $('div', 'layer');
  const HS = 176, HG = 26, HX = (W - (5 * HS + 4 * HG)) / 2, HY = 282;
  const HOOK = [['С', 'g-gray'], ['Л', 'g-green'], ['О', 'g-gold'], ['В', 'g-gray'], ['О', 'g-green']];
  const hookTiles = HOOK.map(([l, c], i) => { const tl = flipTile(hook, HS, l, c, 28); place(tl.root, HX + i * (HS + HG), HY); return tl; });
  const hookL1 = line(hook, 'Одно слово.', 'hl', 0, 524, W, 'center');
  const hookL2 = line(hook, 'Шесть попыток.', 'hl gold', 0, 642, W, 'center');
  // Середина переворота плитки хука — на восьмых долях (0,75; 1,0; …), под звук.
  const HOOK_FLIP = (i) => 0.53 + i * 0.25;

  function renderHook(t) {
    const on = t < TL.logo + 0.35;
    show(hook, on);
    if (!on) return;
    const out = seg(t, TL.logo - 0.25, TL.logo + 0.3);
    const cam = 1.07 - 0.07 * eOut(seg(t, 0, 3.2));
    hook.style.transform = `scale(${cam}) translateY(${-eIn(out) * 90}px)`;
    hook.style.opacity = String(1 - eIn(out));
    // Первый кадр не пустой: плитки уже на месте (обложка ролика), дальше лишь «дышат».
    hookTiles.forEach((tl, i) => {
      const a = seg(t, i * 0.04, i * 0.04 + 0.4);
      const f0 = HOOK_FLIP(i);
      const fl = seg(t, f0, f0 + 0.44);
      const pop = 1 + 0.09 * bump(t, f0 + 0.3, f0 + 0.62);
      const s = lerp(0.9, 1, eBack(a)) * pop;
      const fly = eIn(seg(t, TL.logo - 0.3 + i * 0.03, TL.logo + 0.2 + i * 0.03));
      tl.root.style.opacity = String(lerp(0.78, 1, clamp(a * 2)) * (1 - fly));
      tl.root.style.transform = `translateY(${-fly * 260}px) rotate(${(i - 2) * fly * 9}deg) scale(${s * (1 - 0.3 * fly)})`;
      tl.inn.style.transform = `rotateX(${eIO(fl) * 180}deg)`;
    });
    reveal(hookL1, seg(t, 1.3, 1.95), seg(t, TL.logo - 0.35, TL.logo));
    reveal(hookL2, seg(t, 1.6, 2.25), seg(t, TL.logo - 0.3, TL.logo + 0.05));
  }

  // ---------------- LOGO ----------------
  const logo = $('div', 'layer');
  const halo = $('div', 'halo', logo); place(halo, 960 - 450, 650 - 450);
  const rays = $('div', 'rays', logo); place(rays, 960 - 600, 650 - 600);
  const logoOwl = $('div', 'owl', logo, OWL); place(logoOwl, 960 - 280, 650 - 300, 560, 560);
  const LOGO = [['Б', 'g-gold'], ['У', 'g-dark'], ['К', 'g-green'], ['Л', 'g-gold'], ['И', 'g-dark'], ['Ц', 'g-green'], ['А', 'g-gold']];
  const LS = 128;
  const logoTiles = LOGO.map(([l, c]) => solidTile(logo, LS, l, c, 26));
  const tag = line(logo, '<b>✦</b>&nbsp;&nbsp;ИГРА В СЛОВА&nbsp;&nbsp;<b>✦</b>', 'tagline', 0, 962, W, 'center');
  const arc = (i, cx, cy, step, curve, tilt) => { const k = i - 3; return { x: cx + k * step - LS / 2, y: cy + k * k * curve - LS / 2, r: k * tilt }; };
  // Когда пружина впервые доходит до места (cos = 0): под этот момент ставим удары звука.
  const SPRING_HIT = (w) => Math.PI / (2 * w);
  const LOGO_LAND = (i) => TL.logo + i * 0.125; // плитки логотипа приземляются шестнадцатыми
  const OWL_LAND = (t0) => t0 + 1.0;           // сова — на следующей доле такта

  function owlBlink(root, t, times) {
    let k = 0;
    for (const b of times) k = Math.max(k, bump(t, b, b + 0.2));
    root.querySelectorAll('.owl-lid').forEach((lid) => { lid.style.transformBox = 'fill-box'; lid.style.transformOrigin = '50% 0%'; lid.style.transform = `scaleY(${k})`; });
  }

  function renderLogo(t) {
    const on = t > TL.logo - 0.1 && t < TL.game;
    show(logo, on);
    if (!on) return;
    const cam = 1 + 0.035 * seg(t, TL.logo, TL.game);
    logo.style.transform = `scale(${cam})`;
    logoTiles.forEach((tl, i) => {
      const p = arc(i, 960, 250, 142, 11, 4.5);
      const tau = t - LOGO_LAND(i) + SPRING_HIT(12);
      const s = spring(tau, 12, 6);
      place(tl.root, p.x, p.y);
      tl.root.style.opacity = String(clamp(tau * 8));
      tl.root.style.transform = `translateY(${-(1 - s) * 720}px) rotate(${p.r + (1 - s) * (i - 3) * -9}deg)`;
      // блик пробегает по плиткам слева направо, когда слово собралось
      tl.sheen.style.transform = `translateX(${lerp(-140, 260, eIO(seg(t, TL.logo + 1.1 + i * 0.06, TL.logo + 1.5 + i * 0.06)))}%) skewX(-12deg)`;
    });
    const ot = t - OWL_LAND(TL.logo) + SPRING_HIT(10);
    const os = spring(ot, 10, 5.5);
    logoOwl.style.opacity = String(clamp(ot * 5));
    logoOwl.style.transform = `translateY(${(1 - os) * 300}px) scale(${0.7 + 0.3 * os})`;
    owlBlink(logoOwl, t, [TL.logo + 2.3]);
    const lightA = eOut(seg(t, TL.logo + 0.85, TL.logo + 1.65));
    halo.style.opacity = String(lightA * (0.85 + 0.15 * Math.sin(t * 2)));
    rays.style.opacity = String(lightA * 0.8);
    rays.style.transform = `rotate(${t * 9}deg)`;
    reveal(tag, seg(t, TL.logo + 1.5, TL.logo + 2.15));
  }

  // ---------------- PHONE + CAPTIONS ----------------
  const pshadow = $('div', 'pshadow');
  const phone = $('div', 'phone');
  const device = $('div', 'device', phone);
  $('div', 'btn1', device); $('div', 'btn2', device);
  const screenEl = $('div', 'screen', device);
  const shot1 = $('img', '', screenEl); const shot2 = $('img', '', screenEl);
  const glare = $('div', 'glare', screenEl);
  $('div', 'rim', screenEl);
  const pill = $('div', 'pill', scene, '<span class="coin"></span>+ монеты за победу');

  function caption(x, num, l1, l2, sub) {
    const root = $('div', 'cap'); place(root, x, 356);
    return { root, parts: [relLine(root, `<i></i>${num}`, 'over'), relLine(root, l1, 'big'), relLine(root, l2, 'big gold'), relLine(root, sub, 'sub')] };
  }
  const capGame = caption(150, '01 · СЛОВА', 'Угадай слово', 'из пяти букв', 'Цвет клеток подскажет, где буквы');
  const capShop = caption(1050, '02 · СТИЛЬ', 'Меняй стиль', 'всей игры', 'Фоны и стили клеток в магазине');
  const capPet = caption(150, '03 · ПИТОМЕЦ', 'Совёнок Букля', 'растёт с тобой', 'Корми, наряжай, играй в мини-игры');
  function renderCaption(c, t, tin, tout) {
    const on = t > tin - 0.05 && t < tout + 0.5;
    show(c.root, on);
    if (!on) return;
    c.parts.forEach((L, i) => reveal(L, seg(t, tin + i * 0.09, tin + i * 0.09 + 0.7), seg(t, tout + i * 0.04, tout + i * 0.04 + 0.38), 50));
  }

  function phoneState(t) {
    const st = { vis: t > TL.game - 0.05 && t < TL.fin + 0.05, x: 1330, y: 540, ry: -14, rx: 3, s: 1, op: 1 };
    const ent = eOut(seg(t, TL.game, TL.game + 1.05));
    st.y += (1 - ent) * 190; st.rx += (1 - ent) * 18; st.op = clamp(seg(t, TL.game, TL.game + 0.45));
    st.ry = lerp(-16, -10, seg(t, TL.game, TL.shop));
    const m1 = eIO(seg(t, TL.shop - 0.55, TL.shop + 0.45));
    const m2 = eIO(seg(t, TL.pet - 0.55, TL.pet + 0.45));
    st.x = lerp(lerp(1330, 590, m1), 1330, m2);
    if (m1 > 0) st.ry = lerp(-10, lerp(13, 8, seg(t, TL.shop, TL.pet)), m1);
    if (m2 > 0) st.ry = lerp(st.ry, lerp(-13, -9, seg(t, TL.pet, TL.fin)), m2);
    st.s = 1 - 0.05 * Math.sin(Math.PI * m1) - 0.05 * Math.sin(Math.PI * m2);
    // Наезд камеры: крупнее доска на второй попытке и победе, крупнее сова на прыжках.
    st.zA = eIO(seg(t, TL.win - 2.5, TL.win - 1.6)) * (1 - eIO(seg(t, TL.shop - 0.8, TL.shop - 0.05)));
    st.zC = eIO(seg(t, TL.jump - 0.95, TL.jump - 0.2)) * (1 - eIO(seg(t, TL.fin - 1.05, TL.fin - 0.35)));
    st.s *= 1 + 0.26 * st.zA + 0.3 * st.zC;
    st.y += 60 * st.zA + 190 * st.zC;
    const ex = eIn(seg(t, TL.fin - 0.7, TL.fin));
    st.y += ex * 120; st.s *= 1 - 0.08 * ex;
    st.y += Math.sin(t * 1.25) * 7;
    st.ry += Math.sin(t * 0.7) * 1.3;
    return st;
  }
  const OWL_ON_SCREEN = -210; // центр совы на экране питомца относительно центра телефона, px

  async function setShot(img, clip, ct) {
    const n = CLIPS[clip].n;
    const idx = clamp(Math.floor(ct * 60), 0, n - 1);
    const src = `clips/${clip}/${String(idx).padStart(5, '0')}.jpg`;
    if (img.dataset.src !== src) { img.dataset.src = src; img.src = src; await img.decode().catch(() => {}); }
  }

  async function renderPhone(t, st) {
    show(phone, st.vis); show(pshadow, st.vis);
    if (!st.vis) return;
    place(phone, st.x - 259, st.y - 448);
    phone.style.opacity = String(st.op);
    device.style.transform = `rotateY(${st.ry}deg) rotateX(${st.rx}deg) scale(${st.s})`;
    place(pshadow, st.x - 310 + st.ry * 3, 540 + 430);
    pshadow.style.opacity = String(0.9 * st.op * (1 - Math.max(st.zA, st.zC))); // при наезде низ телефона за кадром

    const ctA = t - TL.playA + A.marks.start;
    const ctB = t - TL.playB + B.marks.start;
    const ctC = t - TL.playC + C.marks.start;
    const xAB = seg(t, TL.shop - 0.12, TL.shop + 0.12);
    const xBC = seg(t, TL.pet - 0.12, TL.pet + 0.12);
    if (t < TL.shop) {
      await setShot(shot1, 'A', ctA); shot1.style.opacity = '1';
      if (xAB > 0) { await setShot(shot2, 'B', Math.max(0, ctB)); shot2.style.opacity = String(xAB); } else shot2.style.opacity = '0';
    } else if (t < TL.pet) {
      await setShot(shot1, 'B', ctB); shot1.style.opacity = '1';
      if (xAB < 1) { await setShot(shot2, 'A', ctA); shot2.style.opacity = String(1 - xAB); }
      else if (xBC > 0) { await setShot(shot2, 'C', Math.max(0, ctC)); shot2.style.opacity = String(xBC); }
      else shot2.style.opacity = '0';
    } else {
      await setShot(shot1, 'C', ctC); shot1.style.opacity = '1';
      if (xBC < 1) { await setShot(shot2, 'B', ctB); shot2.style.opacity = String(1 - xBC); } else shot2.style.opacity = '0';
    }
    let g = -1;
    for (const g0 of [TL.game + 0.7, TL.shop + 0.35, TL.pet + 0.35]) { const k = seg(t, g0, g0 + 1.1); if (k > 0 && k < 1) g = k; }
    glare.style.transform = `translateX(${lerp(-55, 55, g < 0 ? 1 : eIO(g))}%)`;
    glare.style.opacity = g < 0 ? '0' : '1';

  }

  function renderPill(t) {
    const pk = seg(t, TL.win + 0.2, TL.win + 0.65);
    const pout = seg(t, TL.shop - 0.55, TL.shop - 0.2);
    const pv = pk > 0 && pout < 1;
    show(pill, pv);
    if (!pv) return;
    place(pill, 150, 792);
    pill.style.transformOrigin = '0% 50%';
    pill.style.opacity = String(1 - pout);
    pill.style.transform = `scale(${eBack(pk, 2.2)}) translateY(${-eOut(pout) * 30}px)`;
  }

  // ---------------- FINALE ----------------
  const fin = $('div', 'layer');
  const fhalo = $('div', 'halo', fin); place(fhalo, 960 - 450, 540 - 450);
  const frays = $('div', 'rays', fin); place(frays, 960 - 600, 540 - 600);
  const fOwl = $('div', 'owl', fin, OWL); place(fOwl, 960 - 250, 540 - 275, 500, 500);
  const FS = 118;
  const finTiles = LOGO.map(([l, c]) => flipTile(fin, FS, l, c, 24));
  const fsub = line(fin, 'Новое слово — каждый день', 'fsub', 0, 792, W, 'center');
  const cta = $('div', 'cta', fin, '<span>Играть бесплатно</span><div class="shine"></div>');
  const shine = cta.querySelector('.shine');

  function renderFinale(t) {
    const on = t >= TL.fin;
    show(fin, on);
    if (!on) return;
    const f = t - TL.fin;
    fin.style.transform = `scale(${1.04 - 0.04 * eOut(seg(f, 0, 5.0))})`;
    finTiles.forEach((tl, i) => {
      const k = i - 3;
      const x = 960 + k * 132 - FS / 2, y = 178 + k * k * 10 - FS / 2;
      place(tl.root, x, y);
      const a = seg(f, 0.15 + i * 0.07, 0.15 + i * 0.07 + 0.35);
      const fl = seg(f, FIN_FLIP(i) - 0.25, FIN_FLIP(i) + 0.25);
      tl.root.style.opacity = String(clamp(a * 2));
      tl.root.style.transform = `rotate(${k * 4.2}deg) scale(${eBack(a)})`;
      tl.inn.style.transform = `rotateX(${eIO(fl) * 180}deg)`;
    });
    const ot = f - 1.0 + SPRING_HIT(10);
    const os = spring(ot, 10, 5.5);
    fOwl.style.opacity = String(clamp(ot * 5));
    fOwl.style.transform = `translateY(${(1 - os) * 260}px) scale(${0.72 + 0.28 * os})`;
    owlBlink(fOwl, t, [TL.fin + 2.8]);
    const lightA = eOut(seg(f, 0.8, 1.6));
    fhalo.style.opacity = String(lightA);
    frays.style.opacity = String(lightA * 0.75);
    frays.style.transform = `rotate(${t * 9}deg)`;
    reveal(fsub, seg(f, 1.2, 1.85));
    const ck = seg(f, 1.55, 2.05); // кнопка «встаёт» на долю fin + 2
    const cw = 590;
    place(cta, 960 - cw / 2, 902, cw);
    cta.style.opacity = String(clamp(ck * 3));
    cta.style.transform = `scale(${eBack(ck, 2)})`;
    const sh = Math.max(seg(f, 2.5, 3.2), seg(f, 4.0, 4.7));
    shine.style.transform = `translateX(${lerp(-160, cw + 60, sh)}px) skewX(-18deg)`;
  }

  // ---------------- FX ----------------
  const FIN_FLIP = (i) => 0.5 + i * 0.125; // середина переворота плиток финала: шестнадцатые от fin + 0,5
  // Зоны подписей: частицы у текста гаснут, чтобы не ложиться на буквы.
  const CAP_L = { x0: 120, y0: 330, x1: 960, y1: 900 };
  const CAP_R = { x0: 1020, y0: 330, x1: 1880, y1: 790 };
  function clearOf(x, y, r, pad = 110) {
    const dx = Math.max(r.x0 - x, 0, x - r.x1), dy = Math.max(r.y0 - y, 0, y - r.y1);
    return 0.08 + 0.92 * clamp(Math.hypot(dx, dy) / pad);
  }
  function drawCoins(ctx, t, cx, cy) {
    const tau0 = t - TL.win;
    if (tau0 < 0 || tau0 > 2.4) return;
    const k = seg(tau0, 0, 0.7);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 460 * eOut(k) + 1);
    g.addColorStop(0, `rgba(255,226,140,${0.75 * (1 - k)})`); g.addColorStop(1, 'rgba(255,226,140,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const c of COINS) {
      const tau = tau0 - c.delay;
      if (tau < 0) continue;
      const x = cx + Math.cos(c.ang) * c.sp * tau * 0.85;
      const y = cy + Math.sin(c.ang) * c.sp * tau + 0.5 * 1500 * tau * tau;
      const a = (1 - seg(tau, 1.2, 1.75)) * clearOf(x, y, CAP_L);
      if (a <= 0.01) continue;
      const sx = Math.max(0.12, Math.abs(Math.cos(c.ph + c.spin * tau)));
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(sx, 1);
      ctx.drawImage(COIN, -c.size / 2, -c.size / 2, c.size, c.size); ctx.restore();
    }
  }
  function drawLeaves(ctx, t) {
    for (const l of LEAVES) {
      const y = ((((l.y + l.v * t) % (H + 200)) + H + 200) % (H + 200)) - 100;
      const x = l.x + Math.sin(t * 1.1 + l.ph) * l.sw;
      ctx.save(); ctx.globalAlpha = 0.9 * clearOf(x, y, CAP_R); ctx.translate(x, y); ctx.rotate(l.ph + l.rs * t); ctx.scale(l.s, l.s * Math.abs(Math.cos(t * 1.4 + l.ph)) + 0.25);
      ctx.drawImage(LEAF[l.k], -42, -42); ctx.restore();
    }
  }
  function drawPet(t, st) {
    const vis = seg(t, TL.pet + 0.2, TL.pet + 0.8) * (1 - seg(t, TL.fin - 0.7, TL.fin - 0.1));
    if (vis <= 0) return;
    const oy = st.y + OWL_ON_SCREEN * st.s;
    for (const p of PET_P) {
      const lt = ((t - TL.pet + p.off) % p.life) / p.life;
      // всегда снаружи телефона: слева узкая полоса (там подпись), справа шире
      const side = p.dx < 0 ? -(360 + Math.abs(p.dx) * 0.26) : 360 + p.dx * 0.55;
      const x = st.x + side + Math.sin(t * 1.6 + p.ph) * p.sway;
      const y = st.y + 380 - lt * 620;
      const a = Math.sin(Math.PI * lt) * vis * clearOf(x, y, CAP_L);
      if (p.heart) { fx.save(); fx.globalAlpha = a * 0.9; fx.translate(x, y); fx.scale(p.s, p.s); fx.drawImage(HEART, -40, -40); fx.restore(); }
      else drawSpark(fx, x, y, 10 + p.s * 12, a, '255,226,150');
    }
    for (const jt of [TL.jump, TL.jump2]) {
      const k = seg(t, jt + 0.05, jt + 0.85);
      if (k <= 0 || k >= 1) continue;
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * 6.283 + jt;
        const r = (120 + eOut(k) * 230) * st.s * 0.9;
        drawSpark(fx, st.x + Math.cos(ang) * r, oy + Math.sin(ang) * r * 0.7, 14, (1 - k) * 0.95, '255,226,150');
      }
    }
  }
  // Волна-переход: глянцевые плитки в цветах игры, на акцентных — буквы.
  let WIPE_TILES = null;
  function buildWipeTiles() {
    const S = 120, P = 5;
    const COLS = [['#2c3c9e', '#151e60'], ['#24318c', '#101851'], ['#ffd766', '#dc860b'], ['#93d655', '#3b771a'], ['#858b9a', '#444856']];
    const LETTERS = 'БУКЛИЦАСЛОВО';
    const WR = rng(404);
    const mk = (c, letter) => sprite(S, S, (ctx) => {
      const g = ctx.createLinearGradient(0, P, 0, S - P); g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
      rrect(ctx, P, P, S - 2 * P, S - 2 * P, 18); ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.26)'; ctx.fillRect(0, P, S, 6);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, S - P - 9, S, 9);
      ctx.restore();
      rrect(ctx, P + 1, P + 1, S - 2 * P - 2, S - 2 * P - 2, 17); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2; ctx.stroke();
      if (letter) {
        ctx.font = '800 64px M'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillText(letter, S / 2, S / 2 + 7);
        ctx.fillStyle = '#fff'; ctx.fillText(letter, S / 2, S / 2 + 3);
      }
    });
    WIPE_TILES = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 16; c++) {
      const u = WR();
      const kind = u < 0.1 ? 2 : u < 0.18 ? 3 : u < 0.24 ? 4 : (r + c) % 2;
      WIPE_TILES.push(mk(COLS[kind], kind >= 2 && WR() < 0.75 ? LETTERS[Math.floor(WR() * LETTERS.length)] : ''));
    }
  }
  function drawWipe(t, t0) {
    const cols = 16, rows = 9, cw = W / cols, ch = H / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const d = (c / (cols - 1)) * 0.2 + (r / (rows - 1)) * 0.07;
      const cover = eIO(seg(t, t0 - 0.43 + d, t0 - 0.27 + d));
      const rev = eIO(seg(t, t0 + d, t0 + d + 0.16));
      const k = cover * (1 - rev);
      if (k <= 0.001) continue;
      const y = r * ch + ch / 2, h = ch * k;
      wp.fillStyle = `rgba(6,9,34,${k})`; wp.fillRect(c * cw, y - h / 2, cw, h);
      wp.drawImage(WIPE_TILES[r * cols + c], c * cw, y - h / 2, cw, h);
    }
  }

  // ---------------- frame ----------------
  // Тёплый фон — отдельный слой поверх ночного: приходит волной от телефона в момент
  // смены фона в игре, уходит шторкой вслед за телефоном. Цвета не смешиваются в бурый.
  function paintBg(t, st, camX, bokehA) {
    drawBg(bg, t, 0, camX, bokehA);
    const wIn = seg(t, TL.warm, TL.warm + 0.95);
    const wOut = seg(t, TL.pet - 0.5, TL.pet + 0.5);
    if (wIn <= 0 || wOut >= 1) return;
    const r = 60 + eOut(wIn) * 2400;
    drawBg(bgW, t, 1, camX, bokehA);
    drawLeaves(bgW, t);
    bgW.save();
    bgW.globalCompositeOperation = 'destination-in';
    if (wIn < 1) {
      const g = bgW.createRadialGradient(st.x, st.y, 0, st.x, st.y, r);
      g.addColorStop(0, '#000'); g.addColorStop(Math.max(0, r - 300) / r, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
      bgW.fillStyle = g;
    } else {
      const e = lerp(-420, W + 420, eIO(wOut));
      const g = bgW.createLinearGradient(e - 260, 0, e + 260, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, '#000');
      bgW.fillStyle = g;
    }
    bgW.fillRect(0, 0, W, H);
    bgW.restore();
    bg.drawImage(warmCanvas, 0, 0);
    if (wIn < 1 && wIn > 0) { // золотой гребень волны
      bg.save(); bg.globalCompositeOperation = 'lighter';
      bg.strokeStyle = `rgba(255,206,120,${0.45 * (1 - wIn)})`; bg.lineWidth = 26;
      bg.beginPath(); bg.arc(st.x, st.y, Math.max(1, r - 150), 0, 6.283); bg.stroke(); bg.restore();
    }
  }

  window.renderAt = async function renderAt(t) {
    const st = phoneState(t);
    const camX = st.vis ? (st.x - 960) * 0.8 : 0;
    const bokehA = Math.max(seg(t, TL.game - 0.2, TL.game + 0.8), 0);
    paintBg(t, st, camX, bokehA);
    if (st.vis) drawCoins(bg, t, st.x, st.y - 40);
    renderHook(t);
    renderLogo(t);
    await renderPhone(t, st);
    renderPill(t);
    renderCaption(capGame, t, TL.game + 0.55, TL.shop - 0.55);
    renderCaption(capShop, t, TL.shop + 0.35, TL.pet - 0.75);
    renderCaption(capPet, t, TL.pet + 0.2, TL.fin - 0.75);
    renderFinale(t);

    fx.clearRect(0, 0, W, H);
    if (st.vis) drawPet(t, st);
    wp.clearRect(0, 0, W, H);
    drawWipe(t, TL.game);
    drawWipe(t, TL.fin);
  };

  await document.fonts.load('800 100px M', 'АБВЁ'); await document.fonts.load('800 64px M', 'БУКЛИЦА');
  await document.fonts.load('700 70px C', 'Новое');
  await document.fonts.ready;
  buildWipeTiles();

  // ---------------- события для звука ----------------
  // Музыка и эффекты строятся по этим же числам, поэтому звук попадает в кадр.
  const SFX = [];
  const add = (tt, kind, v = 0) => { if (tt >= 0 && tt <= TL.end) SFX.push([+tt.toFixed(3), kind, v]); };
  const HOOK_TONE = (c) => (c === 'g-gold' ? 2 : c === 'g-green' ? 1 : 0);
  HOOK.forEach(([, c], i) => add(HOOK_FLIP(i) + 0.22, 'flip', HOOK_TONE(c)));
  add(TL.logo - 1.0, 'riser', 1.0);
  add(TL.logo, 'impact', 0);
  LOGO.forEach((_, i) => add(LOGO_LAND(i), 'tile', i));
  add(OWL_LAND(TL.logo), 'owl');
  add(TL.logo + 1.5, 'sparkle');
  add(TL.game - 1.0, 'riser', 1.0);
  add(TL.game - 0.45, 'whoosh');
  add(TL.game, 'impact', 1);
  const CLIP_T = { A: TL.playA, B: TL.playB, C: TL.playC };
  const TAP_KIND = { key: 'key', enter: 'enter', ui: 'ui', apply: 'apply', owl: 'pet' };
  for (const [name, cl] of Object.entries({ A, B, C })) {
    for (const [ct, kind] of cl.taps || []) add(CLIP_T[name] + ct - cl.marks.start, TAP_KIND[kind] || 'ui');
  }
  // перевороты клеток в игре: КОШКА (жёлтая, жёлтая, серая, серая, жёлтая) и победная ЗАМОК
  [['enter1', ['y', 'y', 'x', 'x', 'y']], ['enter2', ['g', 'g', 'g', 'g', 'g']]].forEach(([mk, cols]) => {
    cols.forEach((c, i) => add(TL.playA + (A.marks[mk] - A.marks.start) + i * FLIP.stagger + FLIP.mid, 'rev-' + c, i));
  });
  add(TL.win, 'coins');
  add(TL.win + 0.2, 'pill');
  add(TL.shop, 'swish');
  add(TL.warm, 'magic');
  add(TL.pet, 'swish');
  add(TL.jump, 'boing', 0); add(TL.jump2, 'boing', 1);
  add(TL.fin - 1.0, 'riser', 1.0);
  add(TL.fin - 0.45, 'whoosh'); add(TL.fin, 'impact', 1);
  LOGO.forEach((_, i) => add(TL.fin + FIN_FLIP(i), 'fintile', i));
  add(TL.fin + 1.0, 'owl');
  add(TL.fin + 2.0, 'cta');
  add(TL.fin + 2.5, 'glint'); add(TL.fin + 4.0, 'glint');
  SFX.sort((a, b) => a[0] - b[0]);
  window.SFX = SFX;

  await window.renderAt(0);
  window.READY = true;
})().catch((e) => { document.title = 'ERROR ' + e.message; console.error(e); window.READY_ERROR = String(e && e.stack || e); });
