// Картинки миссий VK (588×196) — векторные, в стиле обложки игры: глянцевые
// плитки, космический сине-фиолетовый фон, свечение. Без Букли и без
// текста — только символ достижения (цифры там, где они и есть смысл).
//
//   node gen.mjs <папка>          → <папка>/NN-id.html + index.html (превью)
//   node render.mjs <папка>       → PNG через Playwright (см. render.mjs)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 588, H = 196, CX = 294, CY = 98;

// Палитра плиток: светлый верх, середина, низ, кромка.
const PAL = {
  gold:   ['#ffe9a3', '#ffc53d', '#ec8a12', '#94500a'],
  green:  ['#b4f28c', '#66cc42', '#379226', '#1f5a14'],
  char:   ['#808799', '#50576a', '#2e333e', '#171a21'],
  blue:   ['#c3d3ff', '#7f9dff', '#4d6bf0', '#2a3aa0'],
  violet: ['#dcc4ff', '#a97fff', '#7a4bff', '#46209e'],
  teal:   ['#b0f7ec', '#40d6c1', '#179e8f', '#0b5f56'],
  pink:   ['#ffc6e3', '#ff7fbb', '#e2468f', '#8f1c54'],
  navy:   ['#5b63b8', '#343a8a', '#1e2260', '#11143b']
};

function rng(seed) {
  let s = seed % 2147483647;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const f = (n) => Math.round(n * 100) / 100;

// ------------------------------------------------------------------ defs

function defs(accent) {
  const grads = Object.entries(PAL).map(([k, c]) => `
    <linearGradient id="g-${k}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c[0]}"/><stop offset=".45" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/>
    </linearGradient>
    <radialGradient id="r-${k}" cx=".35" cy=".3" r=".8">
      <stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/>
    </radialGradient>`).join('');
  return `<defs>${grads}
    <linearGradient id="bgbase" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0f1f8f"/><stop offset=".5" stop-color="#2436c9"/><stop offset="1" stop-color="#4a1fb3"/>
    </linearGradient>
    <linearGradient id="bgshade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#050a3a" stop-opacity=".35"/><stop offset=".5" stop-color="#050a3a" stop-opacity="0"/><stop offset="1" stop-color="#050a3a" stop-opacity=".45"/>
    </linearGradient>
    <radialGradient id="halo" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#8fd4ff" stop-opacity=".75"/><stop offset=".45" stop-color="#5a8cff" stop-opacity=".35"/><stop offset="1" stop-color="#3a50ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="accent" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="${accent}" stop-opacity=".85"/><stop offset=".5" stop-color="${accent}" stop-opacity=".25"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vign" cx=".5" cy=".5" r=".75">
      <stop offset=".55" stop-color="#030628" stop-opacity="0"/><stop offset="1" stop-color="#030628" stop-opacity=".6"/>
    </radialGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="rayfade" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".6" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="raymask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <ellipse cx="${CX}" cy="${CY}" rx="210" ry="120" fill="url(#rayfade)"/>
    </mask>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>
    <filter id="blur1" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.1"/></filter>
    <filter id="blur2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
    <filter id="neb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glowbig" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="drop" x="-40%" y="-40%" width="180%" height="190%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#050a3a" flood-opacity=".55"/>
    </filter>
  </defs>`;
}

// ------------------------------------------------------------ фон и декор

function sparkle(x, y, s, op = 1) {
  const d = `M0 ${-s} Q0 0 ${s} 0 Q0 0 0 ${s} Q0 0 ${-s} 0 Q0 0 0 ${-s}Z`;
  return `<g transform="translate(${f(x)} ${f(y)})" opacity="${op}">
    <path d="${d}" fill="#fff" filter="url(#glow)"/><circle r="${f(s * 0.22)}" fill="#fff"/></g>`;
}

function background(seed) {
  const r = rng(seed);
  let stars = '';
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = r() * H;
    stars += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.35 + r() * 0.9)}" fill="#fff" opacity="${f(0.25 + r() * 0.65)}"/>`;
  }
  let sp = '';
  const spots = [[40, 30], [120, 160], [210, 22], [380, 172], [470, 26], [556, 150], [70, 110], [520, 90]];
  for (const [x, y] of spots) sp += sparkle(x + (r() - 0.5) * 20, y + (r() - 0.5) * 14, 2.5 + r() * 3.5, 0.55 + r() * 0.45);
  return `
    <rect width="${W}" height="${H}" fill="url(#bgbase)"/>
    <g filter="url(#neb)">
      <ellipse cx="90" cy="60" rx="120" ry="70" fill="#2a7bff" opacity=".55"/>
      <ellipse cx="510" cy="130" rx="130" ry="80" fill="#9a3dff" opacity=".55"/>
      <ellipse cx="300" cy="190" rx="200" ry="50" fill="#6a3dff" opacity=".35"/>
      <ellipse cx="470" cy="20" rx="90" ry="40" fill="#c04dff" opacity=".3"/>
    </g>
    <rect width="${W}" height="${H}" fill="url(#bgshade)"/>
    <ellipse cx="${CX}" cy="${CY}" rx="250" ry="130" fill="url(#halo)"/>
    ${stars}${sp}`;
}

function accentGlow() {
  return `<ellipse cx="${CX}" cy="${CY}" rx="150" ry="95" fill="url(#accent)"/>`;
}

function rays(color, n = 18, op = 0.5) {
  let p = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, w = i % 2 ? 0.05 : 0.09, L = 260;
    const x1 = CX + Math.cos(a - w) * L, y1 = CY + Math.sin(a - w) * L;
    const x2 = CX + Math.cos(a + w) * L, y2 = CY + Math.sin(a + w) * L;
    p += `<path d="M${CX} ${CY}L${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}Z"/>`;
  }
  return `<g mask="url(#raymask)" fill="${color}" opacity="${op}">${p}</g>`;
}

// Размытые плитки по краям — глубина, как на обложке.
function sideTiles(seed, colors = ['char', 'gold', 'green', 'char']) {
  const r = rng(seed + 7);
  const spots = [[58, 62, 34], [118, 146, 26], [470, 150, 28], [532, 58, 36]];
  return spots.map(([x, y, s], i) =>
    tile(x + (r() - 0.5) * 10, y + (r() - 0.5) * 8, s, colors[i % colors.length], { rot: (r() - 0.5) * 36, blur: 2, op: 0.5 })
  ).join('');
}

// ---------------------------------------------------------------- примитивы

function checkMark(s, color = '#fff') {
  const d = `M${f(-s * 0.24)} ${f(s * 0.01)}L${f(-s * 0.07)} ${f(s * 0.17)}L${f(s * 0.25)} ${f(-s * 0.18)}`;
  return `<path d="${d}" transform="translate(0 ${f(s * 0.04)})" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="${f(s * 0.14)}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="${f(s * 0.13)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function starPath(R, r, n = 5) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n, rad = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${f(Math.cos(a) * rad)} ${f(Math.sin(a) * rad)}`;
  }
  return d + 'Z';
}

function label(text, s, c, size) {
  const fs = size || s * 0.56;
  return `<text x="0" y="${f(fs * 0.36)}" text-anchor="middle" font-family="Manrope, Montserrat, Arial, sans-serif" font-weight="800" font-size="${f(fs)}"
    fill="#fff" stroke="${PAL[c][3]}" stroke-width="${f(fs * 0.09)}" paint-order="stroke" letter-spacing="-.5">${text}</text>`;
}

function tile(x, y, s, c, { rot = 0, text = '', check = false, star = false, blur = 0, op = 1, fs } = {}) {
  const h = s / 2, rr = s * 0.2, e = PAL[c][3];
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" opacity="${op}"${blur ? ` filter="url(#blur${blur})"` : ''}>
    <rect x="${f(-h)}" y="${f(-h + s * 0.1)}" width="${f(s)}" height="${f(s)}" rx="${f(rr)}" fill="#050a3a" opacity=".5" filter="url(#soft)"/>
    <rect x="${f(-h)}" y="${f(-h + s * 0.07)}" width="${f(s)}" height="${f(s)}" rx="${f(rr)}" fill="${e}"/>
    <rect x="${f(-h)}" y="${f(-h)}" width="${f(s)}" height="${f(s)}" rx="${f(rr)}" fill="url(#g-${c})"/>
    <rect x="${f(-h + s * 0.07)}" y="${f(-h + s * 0.05)}" width="${f(s * 0.86)}" height="${f(s * 0.4)}" rx="${f(rr * 0.75)}" fill="url(#gloss)"/>
    <rect x="${f(-h + 0.8)}" y="${f(-h + 0.8)}" width="${f(s - 1.6)}" height="${f(s - 1.6)}" rx="${f(rr - 0.5)}" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.4"/>
    ${check ? checkMark(s) : ''}
    ${star ? `<path d="${starPath(s * 0.3, s * 0.13)}" transform="translate(0 ${f(s * 0.02)})" fill="#fff" stroke="${e}" stroke-width="${f(s * 0.04)}" paint-order="stroke"/>` : ''}
    ${text ? label(text, s, c, fs) : ''}
  </g>`;
}

function medal(x, y, r, c, text, rimC = 'gold') {
  return `<g transform="translate(${f(x)} ${f(y)})" filter="url(#drop)">
    <circle r="${f(r + 5)}" fill="url(#g-${rimC})"/>
    <circle r="${f(r + 5)}" fill="none" stroke="${PAL[rimC][3]}" stroke-width="1.5"/>
    <circle r="${f(r)}" fill="url(#r-${c})"/>
    <ellipse cx="0" cy="${f(-r * 0.45)}" rx="${f(r * 0.72)}" ry="${f(r * 0.42)}" fill="url(#gloss)"/>
    ${text ? label(text, r * 2, c, r * (text.length > 2 ? 0.78 : 0.95)) : ''}
  </g>`;
}

// Лавровая ветвь: стебель по дуге от низа вверх, пары листьев-миндалин
// растут вдоль него — наружный лист крупнее внутреннего, к верхушке мельче.
function laurel(x, y, R, c = 'gold') {
  const leaf = (px, py, deg, L, Wd) =>
    `<path d="M0 0Q${f(L * 0.45)} ${f(-Wd)} ${f(L)} 0Q${f(L * 0.45)} ${f(Wd)} 0 0Z" transform="translate(${f(px)} ${f(py)}) rotate(${f(deg)})" fill="url(#g-${c})" stroke="${PAL[c][3]}" stroke-width=".7"/>`;
  let out = '';
  for (const side of [-1, 1]) {
    // слева угол растёт 100°→240° (низ → лево → верх), справа убывает 80°→-60°
    const a0 = side < 0 ? 100 : 80, a1 = side < 0 ? 240 : -60, N = 8;
    let leaves = '';
    for (let i = 0; i <= N; i++) {
      const t = i / N, aDeg = a0 + (a1 - a0) * t, a = (aDeg * Math.PI) / 180;
      const px = x + Math.cos(a) * R, py = y + Math.sin(a) * R;
      const tau = side < 0 ? aDeg + 90 : aDeg - 90;       // направление роста
      const out1 = side < 0 ? tau - 38 : tau + 38;          // наружу
      const in1 = side < 0 ? tau + 34 : tau - 34;           // внутрь
      const L = 23 - t * 8, Wd = 7.5 - t * 2.5;
      if (i === N) { leaves += leaf(px, py, tau, L + 2, Wd); continue; }
      leaves += leaf(px, py, out1, L, Wd) + leaf(px, py, in1, L * 0.78, Wd * 0.85);
    }
    const p0 = [x + Math.cos((a0 * Math.PI) / 180) * R, y + Math.sin((a0 * Math.PI) / 180) * R];
    const p1 = [x + Math.cos((a1 * Math.PI) / 180) * R, y + Math.sin((a1 * Math.PI) / 180) * R];
    out += `<path d="M${f(p0[0])} ${f(p0[1])}A${R} ${R} 0 0 ${side < 0 ? 1 : 0} ${f(p1[0])} ${f(p1[1])}" fill="none" stroke="${PAL[c][2]}" stroke-width="2.4" stroke-linecap="round"/>${leaves}`;
  }
  return `<g filter="url(#drop)">${out}</g>`;
}

// --------------------------------------------------------------- эмблемы

const E = {};

E.first_win = () => `
  ${rays('#ffd76a', 20, 0.55)}
  ${tile(CX, CY - 2, 98, 'gold', { check: true })}
  ${sparkle(CX + 62, CY - 44, 7)}${sparkle(CX - 60, CY + 36, 5)}${sparkle(CX + 48, CY + 50, 4)}`;

E.streak_3 = () => `
  <path d="M${CX - 170} ${CY + 58}C${CX - 60} ${CY + 50} ${CX + 40} ${CY + 30} ${CX + 160} ${CY - 44}" fill="none" stroke="#b9ff9a" stroke-opacity=".5" stroke-width="12" stroke-linecap="round" filter="url(#glowbig)"/>
  ${tile(CX - 88, CY + 20, 62, 'green', { check: true })}
  ${tile(CX, CY, 68, 'green', { check: true })}
  ${tile(CX + 88, CY - 20, 74, 'green', { check: true })}
  ${sparkle(CX + 136, CY - 52, 7)}${sparkle(CX - 130, CY + 50, 4)}`;

E.won_10 = () => `
  ${rays('#9fffb8', 16, 0.35)}
  ${laurel(CX, CY + 2, 66)}
  ${medal(CX, CY + 2, 44, 'green', '10')}
  ${sparkle(CX + 70, CY - 50, 6)}${sparkle(CX - 74, CY - 40, 4)}`;

E.pet_lvl_5 = () => {
  const R = 62, C = 2 * Math.PI * R;
  return `
  <g transform="rotate(-90 ${CX} ${CY})">
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="11"/>
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="url(#g-teal)" stroke-width="11" stroke-linecap="round" stroke-dasharray="${f(C * 0.5)} ${f(C)}" filter="url(#glow)"/>
  </g>
  <g transform="translate(${CX} ${CY}) rotate(28)" filter="url(#drop)">
    <path d="M0 -56C24 -38 28 12 6 50L-3 50C-27 14 -22 -38 0 -56Z" fill="url(#featherG)"/>
    <path d="M0 -56C-22 -38 -27 14 -3 50" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/>
    <path d="M0 -50L2 62" stroke="#e9eeff" stroke-width="3" stroke-linecap="round"/>
    <path d="M1 -30L16 -40M1 -14L19 -24M1 2L19 -8M2 18L16 8M-1 -30L-15 -38M-1 -14L-18 -21M-1 2L-19 -4M0 18L-16 13" stroke="#aebcff" stroke-width="1.3" stroke-linecap="round"/>
  </g>
  ${tile(CX + 50, CY + 44, 36, 'gold', { text: '5' })}
  ${sparkle(CX - 58, CY - 50, 6)}${sparkle(CX + 70, CY - 36, 4)}`;
};

E.first_try = () => {
  let row = '';
  for (let i = 0; i < 5; i++) row += tile(CX - 124 + i * 62, CY + 10, 54, 'green');
  return `
  ${rays('#a8ffb0', 18, 0.35)}
  ${row}
  <g filter="url(#glow)">${medal(CX + 146, CY - 30, 27, 'gold', '1', 'gold')}</g>
  ${sparkle(CX + 186, CY - 58, 6)}${sparkle(CX - 170, CY - 30, 4)}`;
};

E.daily_6 = () => {
  const off = [16, 3, -4, -4, 3, 16];
  let t = '';
  for (let i = 0; i < 6; i++) {
    const last = i === 5;
    t += tile(CX - 150 + i * 60, CY + off[i], last ? 54 : 48, last ? 'gold' : 'green', { check: !last, star: last });
  }
  return `
  <path d="M${CX - 170} ${CY + 30}Q${CX} ${CY - 20} ${CX + 170} ${CY + 30}" fill="none" stroke="#ffe08a" stroke-opacity=".45" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>
  ${t}${sparkle(CX + 176, CY - 20, 7)}${sparkle(CX - 30, CY - 46, 4)}`;
};

E.fast_30 = () => {
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r1 = i % 3 ? 40 : 36;
    ticks += `<line x1="${f(Math.cos(a) * r1)}" y1="${f(Math.sin(a) * r1)}" x2="${f(Math.cos(a) * 44)}" y2="${f(Math.sin(a) * 44)}" stroke="#3a3f86" stroke-width="${i % 3 ? 1.6 : 2.6}" stroke-linecap="round"/>`;
  }
  let lines = '';
  [[-36, 120], [-14, 150], [8, 130], [30, 100]].forEach(([dy, len], i) => {
    lines += `<line x1="${CX - 70 - len}" y1="${CY + dy}" x2="${CX - 72}" y2="${CY + dy}" stroke="url(#speed)" stroke-width="${6 - i}" stroke-linecap="round"/>`;
  });
  return `
  <linearGradient id="speed" gradientUnits="userSpaceOnUse" x1="${CX - 230}" y1="0" x2="${CX - 72}" y2="0"><stop offset="0" stop-color="#9fd0ff" stop-opacity="0"/><stop offset="1" stop-color="#e6f3ff" stop-opacity=".9"/></linearGradient>
  ${lines}
  <g transform="translate(${CX} ${CY + 6})" filter="url(#drop)">
    <rect x="-9" y="-72" width="18" height="14" rx="4" fill="url(#g-gold)" stroke="#94500a"/>
    <rect x="-16" y="-80" width="32" height="10" rx="5" fill="url(#g-gold)" stroke="#94500a"/>
    <rect x="34" y="-56" width="14" height="10" rx="3" transform="rotate(45 41 -51)" fill="url(#g-gold)" stroke="#94500a"/>
    <circle r="58" fill="url(#g-gold)"/><circle r="58" fill="none" stroke="#94500a" stroke-width="1.5"/>
    <circle r="49" fill="url(#faceG)"/>
    <path d="M0 0L0 -46A46 46 0 0 1 0 46Z" fill="#a97fff" opacity=".22"/>
    ${ticks}
    <line x1="0" y1="0" x2="${f(Math.cos(-Math.PI / 3) * 36)}" y2="${f(Math.sin(-Math.PI / 3) * 36)}" stroke="#7a4bff" stroke-width="4.5" stroke-linecap="round"/>
    <circle r="6" fill="url(#g-violet)" stroke="#46209e"/>
    <ellipse cx="-8" cy="-30" rx="30" ry="14" fill="url(#gloss)" opacity=".8"/>
  </g>
  <g transform="translate(${CX + 58} ${CY + 30}) rotate(12)" filter="url(#glowbig)">
    <path d="M6 -40L-20 6L-2 6L-10 40L22 -8L3 -8L12 -40Z" fill="url(#g-gold)" stroke="#fff5c2" stroke-width="1.5" stroke-linejoin="round"/>
  </g>
  ${sparkle(CX + 96, CY - 50, 6)}${sparkle(CX - 60, CY - 56, 4)}`;
};

E.won_50 = () => `
  <path d="M${CX - 70} ${CY + 18}L${CX - 120} ${CY - 90}L${CX + 120} ${CY - 90}L${CX + 70} ${CY + 18}Z" fill="url(#beam)"/>
  <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff6c8" stop-opacity=".75"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>
  <g filter="url(#drop)">
    <path d="M${CX} ${CY + 56}C${CX - 44} ${CY + 42} ${CX - 86} ${CY + 44} ${CX - 124} ${CY + 56}L${CX - 124} ${CY + 4}C${CX - 86} ${CY - 6} ${CX - 44} ${CY - 4} ${CX} ${CY + 8}C${CX + 44} ${CY - 4} ${CX + 86} ${CY - 6} ${CX + 124} ${CY + 4}L${CX + 124} ${CY + 56}C${CX + 86} ${CY + 44} ${CX + 44} ${CY + 42} ${CX} ${CY + 56}Z" fill="url(#g-violet)"/>
    <path d="M${CX} ${CY + 48}C${CX - 42} ${CY + 34} ${CX - 80} ${CY + 36} ${CX - 114} ${CY + 46}L${CX - 114} ${CY - 2}C${CX - 80} ${CY - 12} ${CX - 42} ${CY - 10} ${CX} ${CY + 2}Z" fill="url(#pageL)"/>
    <path d="M${CX} ${CY + 48}C${CX + 42} ${CY + 34} ${CX + 80} ${CY + 36} ${CX + 114} ${CY + 46}L${CX + 114} ${CY - 2}C${CX + 80} ${CY - 12} ${CX + 42} ${CY - 10} ${CX} ${CY + 2}Z" fill="url(#pageR)"/>
    <path d="M${CX} ${CY + 2}L${CX} ${CY + 48}" stroke="#b9a8e6" stroke-width="1.4"/>
    <path d="M${CX - 96} ${CY + 12}C${CX - 70} ${CY + 6} ${CX - 40} ${CY + 8} ${CX - 16} ${CY + 16}M${CX - 96} ${CY + 24}C${CX - 70} ${CY + 18} ${CX - 40} ${CY + 20} ${CX - 16} ${CY + 28}M${CX + 96} ${CY + 12}C${CX + 70} ${CY + 6} ${CX + 40} ${CY + 8} ${CX + 16} ${CY + 16}M${CX + 96} ${CY + 24}C${CX + 70} ${CY + 18} ${CX + 40} ${CY + 20} ${CX + 16} ${CY + 28}" fill="none" stroke="#c9bcf0" stroke-width="1.6" stroke-linecap="round"/>
  </g>
  <linearGradient id="pageL" x1="0" x2="1"><stop offset="0" stop-color="#e9e3ff"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
  <linearGradient id="pageR" x1="1" x2="0"><stop offset="0" stop-color="#e9e3ff"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
  ${tile(CX - 44, CY - 38, 36, 'gold', { rot: -14 })}
  ${tile(CX + 4, CY - 58, 40, 'green', { rot: 6 })}
  ${tile(CX + 50, CY - 30, 32, 'char', { rot: 16 })}
  <g filter="url(#glow)">${medal(CX + 150, CY + 26, 24, 'violet', '50')}</g>
  ${sparkle(CX - 90, CY - 50, 6)}${sparkle(CX + 96, CY - 64, 4)}`;

E.streak_10 = () => {
  const r = rng(99);
  let emb = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 2.4, d = 60 + r() * 30;
    emb += `<circle cx="${f(CX + Math.cos(a) * d)}" cy="${f(CY - 6 + Math.sin(a) * d * 0.8)}" r="${f(1.6 + r() * 2)}" fill="#ffd36a" filter="url(#glow)"/>`;
  }
  const drop = (s, fill) => `<path transform="translate(${CX + 4} ${CY + 60}) scale(${s})" d="M0 0C-32 0 -40 -30 -26 -56C-18 -70 -8 -78 -2 -98C8 -80 22 -68 28 -52C40 -26 32 0 0 0Z" fill="${fill}"/>`;
  const flame = (s, fill) => `<path transform="translate(${CX} ${CY + 62}) scale(${s})" d="M0 0C-44 -4 -58 -44 -40 -78C-30 -96 -34 -114 -20 -132C-10 -104 8 -108 14 -88C22 -108 18 -124 30 -138C58 -100 64 -40 40 -14C30 -4 16 0 0 0Z" fill="${fill}"/>`;
  return `
  <linearGradient id="fl1" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3d2e"/><stop offset=".6" stop-color="#ff7a1f"/><stop offset="1" stop-color="#ffb13b"/></linearGradient>
  <linearGradient id="fl2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff9a1f"/><stop offset="1" stop-color="#ffe066"/></linearGradient>
  <linearGradient id="fl3" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff2b0"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
  ${rays('#ffb04a', 20, 0.4)}
  <ellipse cx="${CX}" cy="${CY + 60}" rx="70" ry="10" fill="#ff8a2a" opacity=".55" filter="url(#glowbig)"/>
  <g filter="url(#glowbig)">${flame(0.95, 'url(#fl1)')}</g>
  ${drop(0.92, 'url(#fl2)')}
  ${drop(0.55, 'url(#fl3)')}
  ${emb}${sparkle(CX + 90, CY - 40, 5)}`;
};

E.first_try_5 = () => {
  const rings = [[62, 'url(#r-char)'], [54, '#f4f6ff'], [44, 'url(#r-violet)'], [34, '#f4f6ff'], [24, 'url(#r-violet)'], [13, 'url(#r-gold)']];
  let target = rings.map(([r, fill]) => `<circle r="${r}" fill="${fill}"/>`).join('');
  let arrows = '';
  const angs = [-30, -15, 0, 15, 30];
  angs.forEach((deg, i) => {
    const a = (deg * Math.PI) / 180, tx = CX - 50 + (i - 2) * 2, ty = CY + (i - 2) * 2.5;
    const L = 128, bx = tx + Math.cos(a) * L, by = ty + Math.sin(a) * L;
    const sx = tx + Math.cos(a) * 8, sy = ty + Math.sin(a) * 8;
    arrows += `<g filter="url(#drop)">
      <line x1="${f(sx)}" y1="${f(sy)}" x2="${f(bx)}" y2="${f(by)}" stroke="#94500a" stroke-width="5" stroke-linecap="round"/>
      <line x1="${f(sx)}" y1="${f(sy)}" x2="${f(bx)}" y2="${f(by)}" stroke="url(#g-gold)" stroke-width="3.2" stroke-linecap="round"/>
      <g transform="translate(${f(bx)} ${f(by)}) rotate(${deg})">
        <path d="M-18 0L2 -9L6 -9L-12 0Z" fill="url(#g-pink)"/><path d="M-18 0L2 9L6 9L-12 0Z" fill="url(#g-pink)"/>
      </g></g>`;
  });
  return `
  ${rays('#d2b6ff', 18, 0.35)}
  <g transform="translate(${CX - 54} ${CY})" filter="url(#drop)">${target}
    <ellipse cx="-10" cy="-30" rx="36" ry="16" fill="url(#gloss)" opacity=".55"/>
  </g>
  ${arrows}
  ${sparkle(CX - 128, CY - 48, 6)}${sparkle(CX - 110, CY + 52, 4)}`;
};

E.all_attempts = () => {
  const cols = ['green', 'teal', 'blue', 'violet', 'pink', 'gold'];
  const off = [12, 2, -6, -6, 2, 12];
  let t = '';
  for (let i = 0; i < 6; i++) t += tile(CX - 170 + i * 68, CY + off[i], 58, cols[i], { text: String(i + 1) });
  return `${rays('#cfe0ff', 18, 0.3)}${t}${sparkle(CX + 206, CY - 30, 6)}${sparkle(CX - 206, CY - 24, 5)}`;
};

E.pet_lvl_10 = () => `
  ${rays('#ffd76a', 20, 0.4)}
  <g transform="translate(${CX + 6} ${CY + 40}) rotate(-10)" filter="url(#drop)">
    <rect x="-80" y="-13" width="160" height="26" rx="13" fill="url(#scrollG)"/>
    <ellipse cx="80" cy="0" rx="7" ry="13" fill="#e8d9a8"/><ellipse cx="80" cy="0" rx="3.5" ry="7" fill="#c9b27a"/>
    <rect x="-14" y="-15" width="18" height="30" fill="url(#g-violet)"/>
    <path d="M-5 13L-16 34L-8 30L-3 38L-1 14Z" fill="url(#g-violet)"/>
    <path d="M-5 13L6 34L-2 30L-7 38L-9 14Z" fill="url(#g-violet)"/>
  </g>
  <linearGradient id="scrollG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset=".5" stop-color="#f3e7c4"/><stop offset="1" stop-color="#cdb57e"/></linearGradient>
  <g filter="url(#drop)">
    <path d="M${CX - 44} ${CY - 30}L${CX - 44} ${CY}C${CX - 30} ${CY + 12} ${CX + 30} ${CY + 12} ${CX + 44} ${CY}L${CX + 44} ${CY - 30}Z" fill="url(#g-navy)"/>
    <path d="M${CX} ${CY - 70}L${CX + 86} ${CY - 40}L${CX} ${CY - 10}L${CX - 86} ${CY - 40}Z" fill="url(#g-navy)"/>
    <path d="M${CX} ${CY - 70}L${CX + 86} ${CY - 40}L${CX} ${CY - 10}L${CX - 86} ${CY - 40}Z" fill="none" stroke="#8a92e6" stroke-opacity=".7" stroke-width="1.4"/>
    <path d="M${CX} ${CY - 66}L${CX + 70} ${CY - 42}L${CX} ${CY - 50}L${CX - 70} ${CY - 42}Z" fill="#fff" opacity=".14"/>
    <path d="M${CX} ${CY - 40}Q${CX + 40} ${CY - 44} ${CX + 62} ${CY - 34}L${CX + 64} ${CY + 4}" fill="none" stroke="url(#g-gold)" stroke-width="3" stroke-linecap="round"/>
    <path d="M${CX + 57} ${CY + 2}L${CX + 71} ${CY + 2}L${CX + 74} ${CY + 26}L${CX + 54} ${CY + 26}Z" fill="url(#g-gold)" stroke="#94500a" stroke-width="1"/>
    <circle cx="${CX}" cy="${CY - 40}" r="6" fill="url(#r-gold)" stroke="#94500a"/>
  </g>
  ${sparkle(CX - 96, CY - 30, 6)}${sparkle(CX + 108, CY - 60, 5)}${sparkle(CX - 60, CY + 54, 4)}`;

E.won_200 = () => {
  const gem = (x, y, c, r = 6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#r-${c})" stroke="${PAL[c][3]}" stroke-width="1"/><circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.3)}" fill="#fff" opacity=".8"/>`;
  return `
  ${rays('#ffd76a', 22, 0.6)}
  <g filter="url(#drop)">
    <path d="M${CX - 66} ${CY + 6}L${CX - 80} ${CY - 50}L${CX - 38} ${CY - 18}L${CX} ${CY - 66}L${CX + 38} ${CY - 18}L${CX + 80} ${CY - 50}L${CX + 66} ${CY + 6}Z" fill="url(#g-gold)" stroke="#94500a" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M${CX - 60} ${CY - 2}L${CX - 70} ${CY - 40}L${CX - 38} ${CY - 12}L${CX} ${CY - 56}L${CX + 38} ${CY - 12}L${CX + 70} ${CY - 40}L${CX + 60} ${CY - 2}Z" fill="url(#gloss)" opacity=".55"/>
    ${gem(CX - 80, CY - 52, 'pink', 7)}${gem(CX, CY - 68, 'blue', 8)}${gem(CX + 80, CY - 52, 'pink', 7)}
    <path d="M${CX} ${CY - 34}L${CX + 10} ${CY - 20}L${CX} ${CY - 6}L${CX - 10} ${CY - 20}Z" fill="url(#g-pink)" stroke="#8f1c54"/>
    <rect x="${CX - 70}" y="${CY + 2}" width="140" height="22" rx="7" fill="url(#g-gold)" stroke="#94500a" stroke-width="1.4"/>
    ${gem(CX - 44, CY + 13, 'teal', 5)}${gem(CX, CY + 13, 'pink', 6)}${gem(CX + 44, CY + 13, 'blue', 5)}
  </g>
  <g filter="url(#drop)" transform="translate(${CX} ${CY + 50})">
    <path d="M-96 -12L-78 -12L-78 12L-96 12L-86 0Z" fill="#46209e"/>
    <path d="M96 -12L78 -12L78 12L96 12L86 0Z" fill="#46209e"/>
    <rect x="-80" y="-15" width="160" height="30" rx="6" fill="url(#g-violet)"/>
    <rect x="-76" y="-12" width="152" height="11" rx="5" fill="url(#gloss)" opacity=".6"/>
    <text x="0" y="8" text-anchor="middle" font-family="Manrope, Montserrat, Arial, sans-serif" font-weight="800" font-size="22" fill="#fff" stroke="#46209e" stroke-width="2" paint-order="stroke" letter-spacing="1">200</text>
  </g>
  ${sparkle(CX + 104, CY - 30, 7)}${sparkle(CX - 110, CY - 20, 5)}${sparkle(CX + 60, CY - 74, 4)}`;
};

// Порядок и акценты — как в таблице миссий.
export const MISSIONS = [
  ['first_win', 'Добиться первого успеха', '#ffcf5a', ['char', 'char', 'green', 'char']],
  ['streak_3', 'Собрать тройку побед', '#7dff9a', ['char', 'gold', 'char', 'char']],
  ['won_10', 'Разгадать десятку слов', '#8dffb0', ['char', 'gold', 'char', 'green']],
  ['pet_lvl_5', 'Вырастить птенца', '#7ff0e0', ['char', 'green', 'char', 'gold']],
  ['first_try', 'Угадать с первого раза', '#8dffa0', ['char', 'gold', 'char', 'char']],
  ['daily_6', 'Пройти неделю верности', '#ffdf7a', ['char', 'char', 'char', 'green']],
  ['fast_30', 'Стать спринтером', '#9fd8ff', ['char', 'green', 'char', 'gold']],
  ['won_50', 'Заслужить звание знатока', '#d2b6ff', ['char', 'green', 'char', 'gold']],
  ['streak_10', 'Разжечь огонь побед', '#ff9a4a', ['char', 'gold', 'char', 'char']],
  ['first_try_5', 'Стать снайпером', '#d2b6ff', ['char', 'gold', 'char', 'green']],
  ['all_attempts', 'Стать универсалом', '#cfe0ff', ['char', 'char', 'char', 'char']],
  ['pet_lvl_10', 'Вырастить учёную сову', '#ffd76a', ['char', 'green', 'char', 'gold']],
  ['won_200', 'Получить звание мастера', '#ffcf5a', ['char', 'green', 'char', 'char']]
];

export function svg(id, i) {
  const [, , accent, side] = MISSIONS.find((m) => m[0] === id);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${defs(accent)}
  <defs>
    <linearGradient id="featherG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#dfe5ff"/><stop offset="1" stop-color="#a9b6ff"/></linearGradient>
    <radialGradient id="faceG" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9e1ff"/></radialGradient>
  </defs>
  ${background(1000 + i * 37)}
  ${accentGlow()}
  ${sideTiles(i, side)}
  ${E[id]()}
  <rect width="${W}" height="${H}" fill="url(#vign)"/>
</svg>`;
}

const page = (body, w = W, h = H) => `<!doctype html><html><head><meta charset="utf-8">
<style>@font-face{font-family:'Manrope';src:url(manrope-latin.woff2) format('woff2');font-weight:200 800}html,body{margin:0;background:#0b0f2e}svg{display:block}</style></head><body>${body}</body></html>`;

if (process.argv[1] && process.argv[1].endsWith('gen.mjs')) {
  const out = process.argv[2] || 'out';
  mkdirSync(out, { recursive: true });
  let all = '';
  MISSIONS.forEach(([id, title], i) => {
    const n = String(i + 1).padStart(2, '0');
    writeFileSync(join(out, `${n}-${id}.html`), page(svg(id, i)));
    // Каждая картинка — в своём iframe: id градиентов у всех одинаковые, и в
    // одном документе они бы перепутались.
    all += `<div style="margin:14px 18px 6px;color:#cfd6ff;font:600 14px Arial">${n} · ${title}</div><iframe src="${n}-${id}.html" width="${W}" height="${H}" style="border:0;margin:0 18px;zoom:2"></iframe>`;
  });
  writeFileSync(join(out, 'index.html'), page(all));
  console.log('ok', MISSIONS.length);
}
