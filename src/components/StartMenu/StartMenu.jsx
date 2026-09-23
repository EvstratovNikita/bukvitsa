import { useEffect, useRef, useState } from 'react';
import { GAME_STATUS, MAX_ATTEMPTS, PET_UNLOCK_GAMES, ENERGY_MAX } from '../../constants/game.js';
import { ACHIEVEMENT_IDS } from '../../data/achievements.js';
import { hasLeaderboard } from '../../lib/leaderboard.js';
import { getPlayerInfo, inviteFriends, addToFavorites, vkSupports } from '../../lib/vk.js';
import { share, SHARE_BASE_URL } from '../../lib/share.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { OwlSvg } from '../Pet/OwlSvg.jsx';
import {
  AwardIcon, BoltIcon, CoinIcon, GridIcon, HelpIcon, MailIcon, MoonIcon, OwlIcon,
  PlayIcon, SettingsIcon, ShareIcon, ShopIcon, StarIcon, StatsIcon, SunIcon,
  TrophyIcon, UsersIcon
} from '../icons/Icon.jsx';

// Главное меню — стартовый экран игры в VK (правила площадки, п. 4.2.10:
// «полноценное стартовое меню» и «возможность вернуться в главное меню в любой
// момент»). Открывается при запуске и по кнопке «Домой» в шапке. Здесь собраны
// все опции игры — отдельное боковое меню в VK не показываем.
//
// Меню ничего не запускает само: «Играть» просто возвращает к полю в том
// состоянии, в каком оно есть. Начало партии, трата энергии и правила Слова дня
// остаются там, где жили, — меню не должно их обходить.

const LOGO = [['Б', 'gold'], ['У', 'dark'], ['К', 'green'], ['Л', 'gold'], ['И', 'dark'], ['Ц', 'green'], ['А', 'gold']];

function lettersLabel(n) {
  return n === 4 ? '4 буквы' : `${n} букв`;
}

export function StartMenu({
  onPlay, onOpenModes, onOpenShop, onOpenPet, onOpenAchievements, onOpenLeaderboard,
  onOpenStats, onOpenHelp, onOpenSettings, onOpenFeedback
}) {
  const {
    stats, status, guesses, gameMode, wordLength, energy, energyMax,
    petGiftReady, setTheme, showToast
  } = useGameContext();
  const playRef = useRef(null);
  const [player, setPlayer] = useState(null);
  const [social, setSocial] = useState({ invite: false, favorites: false, share: false });

  // Имя и аватар игрока, и какие нативные окна VK есть в этом клиенте:
  // кнопку показываем, только если она правда сработает.
  useEffect(() => {
    let alive = true;
    getPlayerInfo().then((p) => { if (alive && p) setPlayer(p); });
    Promise.all([
      vkSupports('VKWebAppShowInviteBox'),
      vkSupports('VKWebAppAddToFavorites'),
      vkSupports('VKWebAppShare')
    ]).then(([invite, favorites, canShare]) => {
      if (alive) setSocial({ invite, favorites, share: canShare });
    });
    return () => { alive = false; };
  }, []);

  // Esc — вернуться к игре, Enter — «Играть». Фокус на кнопку не ставим:
  // программный фокус рисует рамку, и меню выглядит «выделенным» при открытии.
  // Пока поверх меню открыта модалка (магазин, настройки), клавиши — её.
  useEffect(() => {
    const onKey = (e) => {
      if (document.querySelector('.modal-backdrop')) return;
      const onButton = document.activeElement?.tagName === 'BUTTON' && document.activeElement !== playRef.current;
      if (e.key === 'Escape' || (e.key === 'Enter' && !onButton)) { e.preventDefault(); onPlay(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onPlay]);

  const playing = status === GAME_STATUS.PLAYING;
  const tries = guesses?.length || 0;
  const continuing = playing && tries > 0;
  const modeLabel = gameMode === 'daily' ? 'Слово дня' : `Обычная игра · ${lettersLabel(wordLength || 5)}`;
  const playSub = !playing
    ? 'Партия сыграна — впереди новое слово'
    : continuing ? `${modeLabel} · попытка ${Math.min(tries + 1, MAX_ATTEMPTS)} из ${MAX_ATTEMPTS}` : modeLabel;

  const cap = energyMax || ENERGY_MAX;
  const isLight = (stats.prefs?.theme || 'dark') === 'light';
  const hatched = Boolean(stats.pet?.hatched);
  const petAlert = Boolean(petGiftReady) || (!hatched && (stats.played || 0) >= PET_UNLOCK_GAMES);
  const achCount = (stats.unlockedAchievements || []).filter((id) => ACHIEVEMENT_IDS.includes(id)).length;
  const firstName = player?.name ? player.name.split(' ')[0] : '';

  const onInvite = async () => {
    const r = await inviteFriends();
    if (r === 'ok') showToast?.('Приглашения отправлены');
    else if (r === 'failed') showToast?.('Не получилось открыть приглашения');
  };
  const onFavorites = async () => {
    const r = await addToFavorites();
    if (r === 'ok') showToast?.('Буклица в избранном');
    else if (r === 'failed') showToast?.('Не получилось добавить в избранное');
  };
  const onShare = async () => {
    const r = await share({ text: 'Буклица — угадай слово из пяти букв за шесть попыток', url: SHARE_BASE_URL });
    if (r === 'copied') showToast?.('Ссылка скопирована');
    else if (r === 'failed') showToast?.('Не получилось поделиться');
  };

  const noSteal = (e) => e.preventDefault();

  return (
    <div className="home" role="dialog" aria-modal="true" aria-label="Главное меню">
      <div className="home__sky" aria-hidden="true">
        <i className="home__stars" />
        <i className="home__glow home__glow--a" />
        <i className="home__glow home__glow--b" />
      </div>

      <div className="home__inner">
        <header className="home__top" style={{ '--d': 0 }}>
          <div className="home__hello">
            {player?.avatar
              ? <img className="home__avatar" src={player.avatar} alt="" />
              : <span className="home__avatar home__avatar--ph"><OwlIcon /></span>}
            <span className="home__hello-text">
              <span className="home__hello-hi">Привет,</span>
              <b className="home__hello-name">{firstName || 'игрок'}</b>
            </span>
          </div>
          <div className="home__chips">
            <span className="home__chip home__chip--coin" title="Монеты"><CoinIcon />{stats.coins || 0}</span>
            <span className="home__chip home__chip--bolt" title="Энергия"><BoltIcon />{energy}/{cap}</span>
          </div>
        </header>

        <section className="home__hero">
          <div className="home__logo" role="img" aria-label="Буклица">
            {LOGO.map(([ch, tone], i) => (
              <span key={i} className={`home__tile home__tile--${tone}`} style={{ '--i': i }}>{ch}</span>
            ))}
          </div>
          <div className="home__owl">
            <span className="home__halo" aria-hidden="true" />
            <div className="home__owl-float">
              <OwlSvg equipped={hatched ? (stats.pet?.equipped || {}) : {}} perch />
            </div>
          </div>
          <p className="home__tagline" style={{ '--d': 3 }}><b>✦</b> Игра в слова <b>✦</b></p>
        </section>

        {/* На телефоне панель «прозрачна» (display: contents) и всё идёт одной
            колонкой; в широком фрейме vk.ru она становится правой колонкой. */}
        <div className="home__panel">
        <div className="home__actions" style={{ '--d': 4 }}>
          <button ref={playRef} type="button" className="home__play" onClick={onPlay} onMouseDown={noSteal}>
            <span className="home__play-label"><PlayIcon />{continuing ? 'Продолжить' : 'Играть'}</span>
            <span className="home__play-sub">{playSub}</span>
            <i className="home__play-shine" aria-hidden="true" />
          </button>
          <button type="button" className="home__wide" onClick={onOpenModes} onMouseDown={noSteal}>
            <GridIcon />
            <span className="home__wide-label">Режимы игры</span>
            <span className="home__wide-sub">4 и 6 букв</span>
          </button>
        </div>

        <nav className="home__grid" aria-label="Разделы" style={{ '--d': 5 }}>
          <Tile icon={<ShopIcon />} label="Магазин" tint="shop" onClick={onOpenShop} />
          <Tile icon={<OwlIcon />} label={hatched ? (stats.pet?.name || 'Букля') : 'Питомец'} tint="pet" onClick={onOpenPet} dot={petAlert} />
          <Tile icon={<AwardIcon />} label="Достижения" tint="awards" onClick={onOpenAchievements} badge={achCount || undefined} />
          {hasLeaderboard
            ? <Tile icon={<TrophyIcon />} label="Лучшие игроки" tint="rating" onClick={onOpenLeaderboard} />
            : <Tile icon={<SettingsIcon />} label="Настройки" tint="settings" onClick={onOpenSettings} />}
          <Tile icon={<StatsIcon />} label="Статистика" tint="stats" onClick={onOpenStats} />
          <Tile icon={<HelpIcon />} label="Как играть" tint="help" onClick={onOpenHelp} />
        </nav>

        {(social.invite || social.share || social.favorites) && (
          <div className="home__social" style={{ '--d': 6 }}>
            {social.invite && <Pill icon={<UsersIcon />} label="Пригласить друзей" onClick={onInvite} strong />}
            {social.share && <Pill icon={<ShareIcon />} label="Поделиться" onClick={onShare} iconOnly={social.invite} />}
            {social.favorites && <Pill icon={<StarIcon />} label="В избранное" onClick={onFavorites} iconOnly={social.invite} />}
          </div>
        )}

        {/* Тема — круглым значком: три подписанные кнопки в строку на телефоне
            не влезают, а перенос отнимал место у совы. */}
        <footer className="home__util" style={{ '--d': 7 }}>
          {hasLeaderboard && <Pill icon={<SettingsIcon />} label="Настройки" onClick={onOpenSettings} ghost />}
          <Pill icon={<MailIcon />} label="Обратная связь" onClick={onOpenFeedback} ghost />
          <Pill
            icon={isLight ? <MoonIcon /> : <SunIcon />}
            label={isLight ? 'Тёмная тема' : 'Светлая тема'}
            onClick={() => setTheme(isLight ? 'dark' : 'light')}
            ghost
            iconOnly
          />
        </footer>
        </div>
      </div>
    </div>
  );
}

function Tile({ icon, label, tint, onClick, badge, dot }) {
  return (
    <button type="button" className={`home-tile home-tile--${tint}`} onClick={onClick} onMouseDown={(e) => e.preventDefault()}>
      <span className="home-tile__icon">{icon}</span>
      <span className="home-tile__label">{label}</span>
      {badge !== undefined && <span className="home-tile__badge">{badge}</span>}
      {dot && <span className="home-tile__dot" aria-label="Есть новое" />}
    </button>
  );
}

// iconOnly — круглая кнопка-значок рядом с «Пригласить друзей»: три подписанные
// кнопки в одну строку на телефоне не влезают, а вторая строка отнимает место у совы.
function Pill({ icon, label, onClick, strong, ghost, iconOnly }) {
  const cls = ['home-pill', strong && 'home-pill--strong', ghost && 'home-pill--ghost', iconOnly && 'home-pill--icon']
    .filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
    >
      {icon}{!iconOnly && <span>{label}</span>}
    </button>
  );
}
