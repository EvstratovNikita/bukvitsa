import { useEffect } from 'react';
import { getItem } from '../data/shopItems.js';
import { useGameContext } from '../context/GameContext.jsx';

// Applies the user's selected cosmetic items to the document:
//   - active background → sets body.style.background to the item gradient
//   - active cell style → toggles a body class like "cell-style-neon"
// Reset back to defaults when nothing is selected.
export function useShopTheme() {
  const { stats } = useGameContext();
  const { activeBackground, activeCellStyle } = stats;

  // Background
  useEffect(() => {
    const item = activeBackground ? getItem(activeBackground) : null;
    const grad = item?.payload?.gradient;
    if (grad) {
      document.body.style.backgroundImage = grad;
      document.body.style.backgroundColor = '';
    } else {
      // Fall back to the default declared in CSS.
      document.body.style.backgroundImage = '';
      document.body.style.backgroundColor = '';
    }
  }, [activeBackground]);

  // Cell style — toggle a single class on body so CSS handles the rest.
  useEffect(() => {
    const all = ['cells-neon', 'cells-shimmer', 'cells-emerald'];
    for (const c of all) document.body.classList.remove(`cell-style-${c}`);
    if (activeCellStyle) {
      document.body.classList.add(`cell-style-${activeCellStyle}`);
    }
  }, [activeCellStyle]);
}
