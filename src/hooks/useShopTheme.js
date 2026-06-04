import { useEffect } from 'react';
import { getItem } from '../data/shopItems.js';
import { getGift, GIFT_CELL_IDS } from '../data/petGifts.js';
import { useGameContext } from '../context/GameContext.jsx';

// Resolve a cosmetic id from EITHER the shop catalog OR the pet-gift catalog.
function resolveBackgroundGradient(id) {
  if (!id) return null;
  const shop = getItem(id);
  if (shop?.payload?.gradient) return shop.payload.gradient;
  const gift = getGift(id);
  if (gift?.type === 'background' && gift.payload?.gradient) return gift.payload.gradient;
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
    const grad = resolveBackgroundGradient(activeBackground);
    document.body.style.backgroundImage = grad || '';
    document.body.style.backgroundColor = '';
  }, [activeBackground]);

  // Cell style — toggle a single class on body so CSS handles the rest.
  useEffect(() => {
    for (const c of ALL_CELL_STYLES) document.body.classList.remove(`cell-style-${c}`);
    if (activeCellStyle) document.body.classList.add(`cell-style-${activeCellStyle}`);
  }, [activeCellStyle]);
}
