import { useEffect, useLayoutEffect } from 'react';
import { CloseIcon } from '../icons/Icon.jsx';

// Сколько окон открыто сейчас. Пока есть хоть одно, на <html> висит
// modal-open: анимации главного меню под затемнением встают на паузу
// (index.css) — телефону не нужно тратить на них кадры. Ставим до отрисовки
// (useLayoutEffect): в том же кадре, что и само окно, а не отдельным
// пересчётом стилей кадром позже.
let openCount = 0;

export function Modal({ open, onClose, title, headerRight, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    openCount += 1;
    document.documentElement.classList.add('modal-open');
    return () => {
      openCount -= 1;
      if (openCount <= 0) { openCount = 0; document.documentElement.classList.remove('modal-open'); }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          {/* Слот справа от заголовка: сюда уезжает то, что иначе заняло бы
              целую строку в теле окна (баланс монет в магазине). */}
          {headerRight ? <div className="modal__header-extra">{headerRight}</div> : null}
          <button className="modal__close" onClick={onClose} aria-label="Закрыть">
            <CloseIcon />
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
