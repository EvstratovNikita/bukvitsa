// Обход экранов английской версии. Вставляется в страницу (DevTools) и
// возвращает кириллицу и обрезанный/вылезающий текст на каждом экране:
//   await window.__sweep()
// Запускается на сборке --mode gamemonetize (локальная, без рекламы и сервера).
window.__scan = (label) => {
  const out = { label, cyr: [], clipped: [] };
  const vw = document.documentElement.clientWidth;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const n = w.currentNode;
    const t = n.textContent.trim();
    const el = n.parentElement;
    if (!t || !el || ['SCRIPT', 'STYLE'].includes(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (/[А-Яа-яЁё]/.test(t)) out.cyr.push(t.slice(0, 70));
    // Обрезка многоточием или вылет за край экрана.
    if ((cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) || r.right > vw + 1 || r.left < -1) {
      out.clipped.push(`${t.slice(0, 40)} [${Math.round(r.left)}..${Math.round(r.right)}/${vw}]`);
    }
    // Кнопка, в которой текст шире самой кнопки.
    const btn = el.closest('button');
    if (btn && btn.scrollWidth > btn.clientWidth + 1 && getComputedStyle(btn).overflow !== 'visible') {
      out.clipped.push(`btn: ${t.slice(0, 40)}`);
    }
  }
  for (const a of document.querySelectorAll('[aria-label],[title],[placeholder]')) {
    for (const k of ['aria-label', 'title', 'placeholder']) {
      const v = a.getAttribute(k);
      if (v && /[А-Яа-яЁё]/.test(v)) out.cyr.push(`@${k}: ${v.slice(0, 60)}`);
    }
  }
  return out;
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clickText = (txt, root = document) => {
  const el = [...root.querySelectorAll('button,[role=tab],a')].find((b) => b.textContent.trim().includes(txt) && b.offsetParent !== null);
  if (el) el.click();
  return Boolean(el);
};
const closeTop = async () => {
  const c = [...document.querySelectorAll('.modal__close')].pop();
  if (c) { c.click(); await wait(250); }
};

window.__sweep = async () => {
  const res = [];
  res.push(window.__scan('home'));
  for (const name of ['Shop', 'Achievements', 'Settings', 'Stats', 'How to play', 'Contact us']) {
    if (!clickText(name)) { res.push({ label: name, cyr: ['НЕ НАЙДЕНА КНОПКА'], clipped: [] }); continue; }
    await wait(450);
    res.push(window.__scan(name));
    const tabs = [...document.querySelectorAll('.modal [role=tab], .modal .tabs button, .modal [class*=tab]')].filter((t) => t.tagName === 'BUTTON');
    for (const t of tabs) {
      t.click();
      await wait(150);
      res.push(window.__scan(`${name} / ${t.textContent.trim().slice(0, 20)}`));
    }
    await closeTop();
  }
  return res.filter((r) => r.cyr.length || r.clipped.length).concat([{ label: 'экранов проверено', cyr: [String(res.length)], clipped: [] }]);
};
