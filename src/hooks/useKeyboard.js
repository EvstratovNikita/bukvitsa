import { useEffect } from 'react';
import { useGameContext } from '../context/GameContext.jsx';

export function useKeyboard(enabled = true) {
  const { addLetter, removeLetter, submit } = useGameContext();

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k === 'Enter') {
        e.preventDefault();
        submit();
      } else if (k === 'Backspace') {
        e.preventDefault();
        removeLetter();
      } else if (k.length === 1 && /[а-яёА-ЯЁ]/.test(k)) {
        e.preventDefault();
        addLetter(k);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addLetter, removeLetter, submit, enabled]);

  // Во фрейме площадки (vk.ru, Яндекс Игры) клавиши получает тот документ, у
  // которого фокус. Экранные кнопки гасят mousedown, чтобы не красть фокус, —
  // и заодно не пускают его во фрейм: игрок жмёт по экранным клавишам, а
  // физическая клавиатура продолжает печатать в страницу площадки. Поэтому
  // при любом нажатии указателя внутри игры забираем фокус явно: во время
  // жеста пользователя браузер это разрешает.
  useEffect(() => {
    if (!enabled || window.self === window.top) return;
    const grab = () => { if (!document.hasFocus()) window.focus(); };
    window.addEventListener('pointerdown', grab, true);
    grab();
    return () => window.removeEventListener('pointerdown', grab, true);
  }, [enabled]);
}
