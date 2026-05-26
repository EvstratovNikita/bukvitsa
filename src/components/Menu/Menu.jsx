import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase.js';
import { useGameContext } from '../../context/GameContext.jsx';
import {
  CloseIcon,
  CoinIcon,
  GiftIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
  ShopIcon,
  StatsIcon,
  TrophyIcon,
  UserIcon
} from '../icons/Icon.jsx';

export function MenuButton({ onClick }) {
  return (
    <button
      type="button"
      className="iconbtn iconbtn--accent"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-label="Меню"
      title="Меню"
    >
      <MenuIcon />
    </button>
  );
}

export function SideMenu({ open, onClose, onOpenShop, onOpenStats, onOpenHelp, onOpenAuth, onOpenAchievements, onOpenInvite, onOpenSettings }) {
  const { stats, auth } = useGameContext();
  const unlockedCount = (stats.unlockedAchievements || []).length;

  // Close with ESC, lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const isLinked = auth?.user && auth.isAnonymous === false;
  const accountLabel = isLinked ? (auth.user.email || 'Аккаунт') : 'Войти';
  const accountSub = isLinked ? 'Прогресс сохранён' : 'Сохрани прогресс';
  const initial = (isLinked ? (auth.user.email || '?')[0] : '?').toUpperCase();

  const handle = (fn) => () => { onClose(); fn(); };

  const onLogout = async () => {
    onClose();
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch {
      /* noop */
    }
  };

  return (
    <>
      <div
        className={`menu-backdrop${open ? ' menu-backdrop--open' : ''}`}
        onClick={onClose}
      />
      <aside
        className={`menu${open ? ' menu--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <header className="menu__head">
          <h2 className="menu__title">Меню</h2>
          <button
            type="button"
            className="menu__close"
            onClick={onClose}
            onMouseDown={(e) => e.preventDefault()}
            aria-label="Закрыть"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Account / Auth section — whole row opens the auth modal so the
            user has one obvious place to log in / see their account. */}
        <button
          type="button"
          className="menu__user menu__user--btn"
          onClick={isSupabaseConfigured ? handle(onOpenAuth) : undefined}
          onMouseDown={(e) => e.preventDefault()}
          aria-label={accountLabel}
        >
          <div className={`menu__avatar${isLinked ? ' menu__avatar--linked' : ''}`}>
            {isLinked ? initial : <UserIcon />}
          </div>
          <div className="menu__user-meta">
            <div className="menu__user-name" title={accountLabel}>{accountLabel}</div>
            <div className="menu__user-sub">{accountSub}</div>
          </div>
          <div className="menu__balance" title="Монеты">
            <CoinIcon />
            <span>{stats.coins || 0}</span>
          </div>
        </button>

        <nav className="menu__list">
          <MenuItem icon={<ShopIcon />} label="Магазин" onClick={handle(onOpenShop)} accent />
          <MenuItem
            icon={<TrophyIcon />}
            label="Достижения"
            badge={unlockedCount > 0 ? unlockedCount : undefined}
            onClick={handle(onOpenAchievements)}
          />
          <MenuItem icon={<StatsIcon />} label="Статистика" onClick={handle(onOpenStats)} />
          <MenuItem
            icon={<GiftIcon />}
            label="Пригласить друга"
            badge={(stats.referralsCount || 0) > 0 ? stats.referralsCount : undefined}
            onClick={handle(onOpenInvite)}
          />
          <MenuItem icon={<SettingsIcon />} label="Настройки" onClick={handle(onOpenSettings)} />
          <MenuItem icon={<HelpIcon />} label="Как играть" onClick={handle(onOpenHelp)} />
          {isLinked && (
            <MenuItem
              icon={<LogoutIcon />}
              label="Выйти"
              onClick={onLogout}
              danger
            />
          )}
        </nav>

        <footer className="menu__foot">
          <span className="menu__brand">Буквица</span>
        </footer>
      </aside>
    </>
  );
}

function MenuItem({ icon, label, onClick, accent, danger, badge }) {
  const classes = [
    'menu-item',
    accent && 'menu-item--accent',
    danger && 'menu-item--danger'
  ].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
    >
      <span className="menu-item__icon">{icon}</span>
      <span className="menu-item__label">{label}</span>
      {badge !== undefined && <span className="menu-item__badge">{badge}</span>}
    </button>
  );
}
