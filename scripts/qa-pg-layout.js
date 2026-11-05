// Проверка вёрстки по п. 1.6 требований Playgama на текущем размере окна:
//   (await import('/scripts/qa-pg-layout.js')).sweep()
// Ищет прокрутку страницы, вылет кнопок за экран, перекрытые кнопки, мелкий текст.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const visible = (el) => {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05 && r.width > 1 && r.height > 1;
};
const scroller = (el) => {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p;
  }
  return null;
};
const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.className || '').toString().trim().slice(0, 24);

export function scan(label) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const out = { label, problems: [] };
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1 || de.scrollHeight > de.clientHeight + 1) out.problems.push(`страница прокручивается ${de.scrollWidth}x${de.scrollHeight}`);
  const layer = [...document.querySelectorAll('.modal, .pet-screen, .home')].filter(visible).pop() || document.body;
  for (const el of layer.querySelectorAll('button, a, input, select')) {
    if (!visible(el)) continue;
    let r = el.getBoundingClientRect();
    // Убранное за край боковое меню: целиком вне экрана и не показывается.
    if (r.left >= vw || r.right <= 0) continue;
    const sc = scroller(el);
    if (sc) {
      const b = sc.getBoundingClientRect();
      if (r.right > b.right + 1 || r.left < b.left - 1) out.problems.push(`вбок за прокрутку: ${name(el)}`);
      if (r.bottom < b.top || r.top > b.bottom) continue;
      r = { left: r.left, right: r.right, top: Math.max(r.top, b.top), bottom: Math.min(r.bottom, b.bottom) };
      if (r.bottom - r.top < 8) continue;
    } else if (r.right > vw + 1 || r.left < -1 || r.bottom > vh + 1 || r.top < -1) {
      out.problems.push(`за экраном: ${name(el)} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`);
      continue;
    }
    const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
    if (hit && !el.contains(hit) && !hit.contains(el) && !hit.closest('button') !== true && hit.closest('button') !== el) out.problems.push(`перекрыта: ${name(el)} кнопкой ${name(hit.closest('button'))}`);
  }
  const w = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
  const small = new Set();
  while (w.nextNode()) {
    const t = w.currentNode.nodeValue.trim();
    const el = w.currentNode.parentElement;
    if (!t || !el || !visible(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 10) small.add(`${t.slice(0, 16)}:${fs.toFixed(1)}`);
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow === 'ellipsis') out.problems.push(`обрезан текст: ${t.slice(0, 24)}`);
  }
  if (small.size) out.problems.push(`мелкий текст: ${[...small].slice(0, 5).join(', ')}`);
  const keys = [...document.querySelectorAll('.key')].filter(visible);
  if (keys.length) out.keyH = Math.round(keys[0].getBoundingClientRect().height);
  return out;
}

const click = (test, root = document) => {
  const el = [...root.querySelectorAll('button')].find((b) => visible(b) && test(b));
  if (el) el.click();
  return Boolean(el);
};
const byText = (txt) => (b) => b.textContent.trim().startsWith(txt);
const closeTop = async () => {
  const c = [...document.querySelectorAll('.modal__close')].filter(visible).pop();
  if (c) { c.click(); await wait(300); }
};

export async function sweep() {
  const res = [];
  const note = (label) => res.push(scan(label));
  note('home');
  for (const t of ['Shop', 'Achievements', 'Settings', 'Stats', 'How to play']) {
    if (!click((b) => b.classList.contains('home-tile') && byText(t)(b))) { res.push({ label: t, problems: ['нет кнопки'] }); continue; }
    await wait(450);
    note(t);
    await closeTop();
  }
  const petBtn = [...document.querySelectorAll('.home-tile')].find((b) => /Pip|Pet/.test(b.textContent));
  if (petBtn) {
    petBtn.click();
    await wait(800);
    note('pet');
    for (const tab of ['Feed', 'Train', 'Gifts']) {
      if (click((b) => b.classList.contains('pet-tab') && b.textContent.trim() === tab)) { await wait(300); note(`pet/${tab}`); }
    }
    const close = document.querySelector('.pet-screen button');
    if (close) { close.click(); await wait(500); }
  }
  if (click(byText('Play'))) {
    await wait(900);
    click(byText('Skip'));
    await wait(300);
    note('game');
    if (click((b) => b.classList.contains('iconbtn--modes'))) { await wait(400); note('modes'); await closeTop(); }
    const home = document.querySelector('.iconbtn--accent');
    if (home) { home.click(); await wait(400); }
  }
  return {
    size: `${window.innerWidth}x${window.innerHeight}`,
    checked: res.length,
    keyH: res.find((r) => r.keyH)?.keyH,
    bad: res.filter((r) => r.problems.length).map((r) => ({ [r.label]: r.problems.slice(0, 6) }))
  };
}
