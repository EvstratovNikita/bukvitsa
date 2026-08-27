import { useEffect } from 'react';
import { getItem } from '../data/shopItems.js';
import { getGift, GIFT_CELL_IDS } from '../data/petGifts.js';
import { useGameContext } from '../context/GameContext.jsx';

// Resolve a cosmetic id from EITHER the shop catalog OR the pet-gift catalog.
function resolveBackgroundPayload(id) {
  if (!id) return null;
  const shop = getItem(id);
  if (shop?.payload?.gradient) return shop.payload;
  const gift = getGift(id);
  if (gift?.type === 'background' && gift.payload?.gradient) return gift.payload;
  return null;
}

// All toggleable cell-style classes (shop + gifts), removed before applying one.
const ALL_CELL_STYLES = ['cells-neon', 'cells-shimmer', 'cells-emerald', ...GIFT_CELL_IDS];

// Applies the user's selected cosmetic items to the document.
export function useShopTheme() {
  const { stats } = useGameContext();
  const { activeBackground, activeCellStyle } = stats;

  // Background
  useEffect(() => {
    const payload = resolveBackgroundPayload(activeBackground);
    const grad = payload?.gradient || null;
    document.body.style.backgroundImage = grad || '';
    document.body.style.backgroundColor = '';
    // Рамочные иллюстрации тянем по кадру; тайлы остаются как были.
    document.body.style.backgroundSize = payload?.frame ? '100% 100%, 100% 100%' : '';
    document.body.style.backgroundRepeat = payload?.frame ? 'no-repeat' : '';
    document.body.style.backgroundPosition = payload?.frame ? 'center center' : '';
    // Под обоями клетки и клавиши получают собственную заливку и более
    // контрастные рамки — иначе фон их «съедает» (см. body.has-bg в CSS).
    document.body.classList.toggle('has-bg', Boolean(grad));
  }, [activeBackground]);

  // Cell style — toggle a single class on body so CSS handles the rest.
  useEffect(() => {
    for (const c of ALL_CELL_STYLES) document.body.classList.remove(`cell-style-${c}`);
    if (activeCellStyle) document.body.classList.add(`cell-style-${activeCellStyle}`);
  }, [activeCellStyle]);
}
