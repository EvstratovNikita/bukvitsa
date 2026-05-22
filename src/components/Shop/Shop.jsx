import { useMemo, useState } from 'react';
import { SHOP_CATEGORIES, SHOP_ITEMS, itemsByCategory } from '../../data/shopItems.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Modal } from '../Modal/Modal.jsx';
import { CoinIcon, ShopIcon } from '../icons/Icon.jsx';

const ERROR_LABEL = {
  not_enough_coins: 'Не хватает монет',
  already_owned: 'Уже куплено',
  unknown_item: 'Товар не найден'
};

export function Shop({ open, onClose }) {
  const { stats, buyItem, setActiveBackground, setActiveCellStyle } = useGameContext();
  const [activeCat, setActiveCat] = useState(SHOP_CATEGORIES[0].id);
  const [feedback, setFeedback] = useState(null); // { id, type: 'ok'|'err', text }

  const items = useMemo(() => itemsByCategory(activeCat), [activeCat]);

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
    if (item.category === 'background') setActiveBackground(item.id);
    else if (item.category === 'cells') setActiveCellStyle(item.id);
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
            Бонусы — одноразовые: тратятся при первом срабатывании.
            «Двойные монеты» удвоят награду за следующую победу.
          </p>
        )}
      </div>
    </Modal>
  );
}

function ShopCard({ item, stats, feedback, onBuy, onEquip, onUnequip }) {
  const owned = (stats.inventory || []).includes(item.id);
  const active =
    (item.category === 'background' && stats.activeBackground === item.id) ||
    (item.category === 'cells' && stats.activeCellStyle === item.id);
  const armedBoost = item.id === 'boost-double' && Boolean(stats.boostDoubleCoins);

  const previewStyle =
    item.category === 'background' && item.payload?.gradient
      ? { backgroundImage: item.payload.gradient }
      : undefined;

  const previewClasses = ['shop-card__preview'];
  if (item.category === 'background') previewClasses.push('shop-card__preview--bg');
  if (item.category === 'cells') previewClasses.push(`shop-card__preview--${item.id}`);
  if (item.category === 'boost') previewClasses.push('shop-card__preview--boost');

  return (
    <div className={`shop-card${active ? ' shop-card--active' : ''}`}>
      <div className={previewClasses.join(' ')} style={previewStyle}>
        {item.category === 'cells' && (
          <span className="shop-card__preview-letter">А</span>
        )}
        {item.category === 'boost' && (
          <span className="shop-card__preview-emoji">×2</span>
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
          <button
            type="button"
            className={`btn ${armedBoost ? 'btn--ghost' : 'btn--primary'} shop-card__btn`}
            onClick={onBuy}
            onMouseDown={(e) => e.preventDefault()}
            disabled={armedBoost}
          >
            {armedBoost ? (
              'Активно ×2'
            ) : (
              <>
                <CoinIcon />
                <span>{item.price}</span>
              </>
            )}
          </button>
        ) : active ? (
          <button
            type="button"
            className="btn btn--ghost shop-card__btn"
            onClick={onUnequip}
            onMouseDown={(e) => e.preventDefault()}
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
