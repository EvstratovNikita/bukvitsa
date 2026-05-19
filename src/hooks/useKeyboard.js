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
}
