import { useMemo, useState } from 'react';
import { SHOP_CATEGORIES, SHOP_ITEMS, itemsByCategory } from '../../data/shopItems.js';
import { doubleCoinsActive, energyCapFor, formatDuration } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Modal } from '../Modal/Modal.jsx';
import { CoinIcon, ShopIcon } from '../icons/Icon.jsx';

const BOOST_EMOJI = {
  'boost-double': '×2',
  'boost-ad-coins': '📺',
  'boost-energy-cap': '⚡'
};

// Human "still active" line for a timed/counted boost, or null when idle.
function boostStatus(item, stats) {
  const now = Date.now();
  if (item.id === 'boost-double' && doubleCoinsActive(stats, now)) {
    return `Активно ещё ${formatDuration(new Date(stats.boostDoubleUntil).getTime() - now)}`;
  }
  if (item.id === 'boost-energy-cap' && energyCapFor(stats, now) > 5) {
    return `Активно ещё ${formatDuration(new Date(stats.energyCapUntil).getTime() - now)}`;
  }
  if (item.id === 'boost-ad-coins' && (stats.adBonusLeft || 0) > 0) {
    return `Осталось просмотров: ${stats.adBonusLeft}`;
  }
  return null;
}

// Virtual "default" cards prepended to cosmetic categories. They aren't part
// of the inventory — they just clear the active selection back to the
// built-in look, free and always available.
const DEFAULT_ITEM = {
  background: {
    id: '__default-bg',
    category: 'background',
    theme: 'dark',
    name: 'Стандартный',
    desc: 'Базовый тёмный фон по умолчанию',
    price: 0,
    isDefault: true
  },
  cells: {
    id: '__default-cells',
    category: 'cells',
    name: 'Стандартный',
    desc: 'Базовый стиль букв в клетках',
    price: 0,
    isDefault: true
  }
};

// Light-theme counterpart of the default background — clears the custom
// background AND switches to the standard light theme. Lives in the "Светлые"
// sub-tab so the player can flip to the plain light look in one tap.
const DEFAULT_BG_LIGHT = {
  id: '__default-bg-light',
  category: 'background',
  theme: 'light',
  name: 'Стандартный',
  desc: 'Базовый светлый фон',
  price: 0,
  isDefault: true
};

const ERROR_LABEL = {
  not_enough_coins: 'Не хватает монет',
  already_owned: 'Уже куплено',
  unknown_item: 'Товар не найден'
};

export function Shop({ open, onClose }) {
  const { stats, buyItem, setActiveBackground, setActiveCellStyle, setPref } = useGameContext();
  const [activeCat, setActiveCat] = useState(SHOP_CATEGORIES[0].id);
  // Backgrounds split by the theme they belong to (dark / light "summer").
  const [bgTheme, setBgTheme] = useState('dark');
  const [feedback, setFeedback] = useState(null); // { id, type: 'ok'|'err', text }

  const items = useMemo(() => {
    const cataloged = itemsByCategory(activeCat);
    if (activeCat === 'background') {
      const filtered = cataloged.filter((i) => (i.theme || 'dark') === bgTheme);
      // Each sub-tab leads with its own "Стандартный" card (dark / light).
      const def = bgTheme === 'dark' ? DEFAULT_ITEM.background : DEFAULT_BG_LIGHT;
      return [def, ...filtered];
    }
    const defaultItem = DEFAULT_ITEM[activeCat];
    return defaultItem ? [defaultItem, ...cataloged] : cataloged;
  }, [activeCat, bgTheme]);

  const flash = (id, type, text) => {
    setFeedback({ id, type, text });
    setTimeout(() => setFeedback(null), 1400);
  };

  const onBuy = (item) => {
    const result = buyItem(item.id);
    if (result === 'ok') {
      flash(item.id, 'ok', item.consumable ? 'Активировано' : 'Куплено');
    } else {
      flash(item.id, 'err', ERROR_LABEL[result] || 'Ошибка');
    }
  };

  const onEquip = (item) => {
    const id = item.isDefault ? null : item.id;
    if (item.category === 'background') {
      setActiveBackground(id);
      // A background carries the theme it was designed for — switch the whole
      // app theme to match so the colours don't clash. Default = dark.
      setPref?.('theme', item.theme || 'dark');
    } else if (item.category === 'cells') setActiveCellStyle(id);
  };

  const onUnequip = (item) => {
    if (item.category === 'background') setActiveBackground(null);
    else if (item.category === 'cells') setActiveCellStyle(null);
  };

  return (
    <Modal open={open} onClose={onClose} title="Магазин">
      <div className="shop">
        <div className="shop__balance">
          <CoinIcon />
          <span>{stats.coins || 0}</span>
          <span className="shop__balance-label">монет на счету</span>
        </div>

        <div className="shop__tabs" role="tablist">
          {SHOP_CATEGORIES.map((c) => (
            <button
              key={c.id}
              role="tab"
              type="button"
              className={`shop__tab${activeCat === c.id ? ' shop__tab--active' : ''}`}
              onClick={() => setActiveCat(c.id)}
              onMouseDown={(e) => e.preventDefault()}
            >
              {c.label}
            </button>
          ))}
        </div>

        {activeCat === 'background' && (
          <div className="shop__subtabs" role="tablist">
            {[['dark', 'Тёмные'], ['light', 'Светлые']].map(([id, label]) => (
              <button
                key={id}
                role="tab"
                type="button"
                className={`shop__subtab${bgTheme === id ? ' shop__subtab--active' : ''}`}
                onClick={() => setBgTheme(id)}
                onMouseDown={(e) => e.preventDefault()}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="shop__grid">
          {items.map((item) => (
            <ShopCard
              key={item.id}
              item={item}
              stats={stats}
              feedback={feedback?.id === item.id ? feedback : null}
              onBuy={() => onBuy(item)}
              onEquip={() => onEquip(item)}
              onUnequip={() => onUnequip(item)}
            />
          ))}
        </div>

        {activeCat === 'boost' && (
          <p className="shop__hint">
            «Двойные монеты» удваивают монеты за победы на 1 день. «Щедрая
            реклама» добавляет +4 монеты к 10 следующим просмотрам. «Запас
            энергии» поднимает лимит до 7 на 2 дня. Можно докупать — время и
            просмотры складываются.
          </p>
        )}
      </div>
    </Modal>
  );
}

function ShopCard({ item, stats, feedback, onBuy, onEquip, onUnequip }) {
  const owned = item.isDefault || (stats.inventory || []).includes(item.id);
  const curTheme = stats.prefs?.theme === 'light' ? 'light' : 'dark';
  const active = item.isDefault
    ? // Default bg is "active" only when no custom bg AND the current theme
      // matches this card's theme (so dark/light defaults don't both light up).
      (item.category === 'background' && !stats.activeBackground && (item.theme || 'dark') === curTheme) ||
      (item.category === 'cells' && !stats.activeCellStyle)
    : (item.category === 'background' && stats.activeBackground === item.id) ||
      (item.category === 'cells' && stats.activeCellStyle === item.id);
  const boostActive = item.category === 'boost' ? boostStatus(item, stats) : null;

  const previewStyle =
    item.category === 'background' && item.payload?.gradient
      ? { backgroundImage: item.payload.gradient }
      : undefined;

  const previewClasses = ['shop-card__preview'];
  if (item.category === 'background') previewClasses.push('shop-card__preview--bg');
  if (item.category === 'cells') previewClasses.push(`shop-card__preview--${item.id}`);
  if (item.category === 'boost') previewClasses.push('shop-card__preview--boost');
  if (item.isDefault) previewClasses.push('shop-card__preview--default');
  if (item.isDefault && item.theme === 'light') previewClasses.push('shop-card__preview--default-light');

  return (
    <div className={`shop-card${active ? ' shop-card--active' : ''}`}>
      <div className={previewClasses.join(' ')} style={previewStyle}>
        {item.category === 'cells' && !item.isDefault && (
          <span className="shop-card__preview-letter">А</span>
        )}
        {item.category === 'cells' && item.isDefault && (
          <span className="shop-card__preview-letter shop-card__preview-letter--plain">А</span>
        )}
        {item.category === 'boost' && (
          <span className="shop-card__preview-emoji">{BOOST_EMOJI[item.id] || '×2'}</span>
        )}
        {item.isDefault && item.category === 'background' && (
          <span className="shop-card__preview-default-label">по умолчанию</span>
        )}
      </div>

      <div className="shop-card__body">
        <div className="shop-card__name">{item.name}</div>
        <div className="shop-card__desc">{item.desc}</div>
      </div>

      <div className="shop-card__cta">
        {feedback ? (
          <div className={`shop-card__feedback shop-card__feedback--${feedback.type}`}>
            {feedback.text}
          </div>
        ) : item.consumable ? (
          <div className="shop-card__boost-cta">
            {boostActive && <span className="shop-card__boost-status">{boostActive}</span>}
            <button
              type="button"
              className="btn btn--primary shop-card__btn"
              onClick={onBuy}
              onMouseDown={(e) => e.preventDefault()}
            >
              <CoinIcon />
              <span>{item.price}</span>
            </button>
          </div>
        ) : active ? (
          <button
            type="button"
            className="btn btn--ghost shop-card__btn"
            onClick={item.isDefault ? undefined : onUnequip}
            onMouseDown={(e) => e.preventDefault()}
            disabled={item.isDefault}
          >
            Активно ✓
          </button>
        ) : owned ? (
          <button
            type="button"
            className="btn btn--primary shop-card__btn"
            onClick={onEquip}
            onMouseDown={(e) => e.preventDefault()}
          >
            Применить
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary shop-card__btn"
            onClick={onBuy}
            onMouseDown={(e) => e.preventDefault()}
            disabled={(stats.coins || 0) < item.price}
          >
            <CoinIcon />
            <span>{item.price}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export { SHOP_ITEMS };
