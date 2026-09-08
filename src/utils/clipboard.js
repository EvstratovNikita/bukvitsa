// Копирование в буфер обмена одним путём для всей игры.
//
// Внутри iframe площадки navigator.clipboard обычно недоступен: разрешение
// clipboard-write в permissions policy нам не выдают, и вызов падает. Раньше
// кнопка «Копировать» в обратной связи в этом случае просто не работала —
// показывала адрес и всё. Запасной путь через execCommand в том же клике
// работает и там, потому что копирует выделение, а не пишет в буфер напрямую.
export async function copyText(text) {
  if (!text) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* нет разрешения — идём запасным путём */ }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    // Вне экрана, но НЕ display:none — иначе выделять нечего.
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
