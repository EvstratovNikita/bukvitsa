import { useEffect, useRef, useState, memo } from 'react';
import { GAME_STATUS, MAX_ATTEMPTS, PET_UNLOCK_GAMES, ENERGY_MAX } from '../../constants/game.js';
import { unclaimedAchievementIds } from '../../data/achievements.js';
import { hasLeaderboard } from '../../lib/leaderboard.js';
import { escAllowed } from '../../lib/platform.js';
import { SoundButton } from '../Sound/SoundButton.jsx';
import { getPlayerInfo, inviteFriends, addToFavorites, vkSupports, launchParams } from '../../lib/vk.js';
import { share, SHARE_BASE_URL } from '../../lib/share.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { OwlSvg } from '../Pet/OwlSvg.jsx';
import { HalloweenBanner, HalloweenBats } from '../Halloween/HalloweenBanner.jsx';
import {
  AwardIcon, BoltIcon, CoinIcon, HelpIcon, MailIcon, MoonIcon, OwlIcon,
  PlayIcon, PlusIcon, SettingsIcon, ShareIcon, ShopIcon, StarIcon, StatsIcon, SunIcon,
  TrophyIcon, UsersIcon
} from '../icons/Icon.jsx';
import { isEn, tr } from '../../lib/lang.js';

// Главное меню — стартовый экран игры в VK (правила площадки, п. 4.2.10:
// «полноценное стартовое меню» и «возможность вернуться в главное меню в любой
// момент»). Открывается при запуске и по кнопке «Домой» в шапке. Здесь собраны
// все опции игры — отдельное боковое меню в VK не показываем.
//
// Меню ничего не запускает само: «Играть» просто возвращает к полю в том
// состоянии, в каком оно есть. Начало партии, трата энергии и правила Слова дня
// остаются там, где жили, — меню не должно их обходить.

const LOGO = isEn()
  ? [['H', 'gold'], ['O', 'dark'], ['O', 'green'], ['T', 'gold'], ['W', 'dark'], ['O', 'green'], ['R', 'gold'], ['D', 'dark']]
  : [['Б', 'gold'], ['У', 'dark'], ['К', 'green'], ['Л', 'gold'], ['И', 'dark'], ['Ц', 'green'], ['А', 'gold']];

// Один и тот же пустой наряд — новый {} на каждый рендер ломал memo совы.
const NO_DECO = {};

function lettersLabel(n) {
  return n === 4 ? tr('4 буквы') : tr('{n} букв', { n });
}

function StartMenuView({
  onPlay, onOpenShop, onOpenPet, onOpenAchievements, onOpenLeaderboard,
  onOpenStats, onOpenHelp, onOpenSettings, onOpenFeedback, onOpenHalloween
}) {
  const {
    stats, status, guesses, gameMode, wordLength, energy, energyMax,
    petGiftReady, setTheme, showToast, openEnergyModal
  } = useGameContext();
  const playRef = useRef(null);
  const noSteal = (e) => e.preventDefault();
  const [player, setPlayer] = useState(null);
  const [social, setSocial] = useState({ invite: false, favorites: false, share: false });
  // Уже в избранном? VK сообщает это при запуске (vk_is_favorite=1), а после
  // успешного добавления помним до конца сессии. Убрать из избранного мост VK
  // не умеет, поэтому повторное нажатие только напоминает, что всё уже сделано.
  const [favorite, setFavorite] = useState(() => launchParams().vk_is_favorite === '1');

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
  // Пока поверх меню открыта модалка (магазин, настройки) или экран Букли,
  // клавиши — их.
  useEffect(() => {
    const onKey = (e) => {
      if (document.querySelector('.modal-backdrop, .pet-screen')) return;
      const onButton = document.activeElement?.tagName === 'BUTTON' && document.activeElement !== playRef.current;
      if ((e.key === 'Escape' && escAllowed) || (e.key === 'Enter' && !onButton)) { e.preventDefault(); onPlay(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onPlay]);

  const playing = status === GAME_STATUS.PLAYING;
  const tries = guesses?.length || 0;
  const continuing = playing && tries > 0;
  const modeLabel = gameMode === 'daily' ? tr('Слово дня')
    : gameMode === 'halloween' ? tr('Загадки ночи · {v0}', { v0: lettersLabel(wordLength || 5) })
    : tr('Обычная игра · {v0}', { v0: lettersLabel(wordLength || 5) });
  const playSub = !playing
    ? tr('Партия сыграна — впереди новое слово')
    : continuing ? tr('{modeLabel} · попытка {v1} из {MAX_ATTEMPTS}', { modeLabel, v1: Math.min(tries + 1, MAX_ATTEMPTS), MAX_ATTEMPTS }) : modeLabel;

  const cap = energyMax || ENERGY_MAX;
  const isLight = (stats.prefs?.theme || 'dark') === 'light';
  const hatched = Boolean(stats.pet?.hatched);
  const petAlert = Boolean(petGiftReady) || (!hatched && (stats.played || 0) >= PET_UNLOCK_GAMES);
  // Значок «Достижений» — сколько наград ждут кнопки «Забрать».
  const achCount = unclaimedAchievementIds(stats).length;
  const firstName = player?.name ? player.name.split(' ')[0] : '';

  const onInvite = async () => {
    const r = await inviteFriends();
    if (r === 'ok') showToast?.(tr('Приглашения отправлены'));
    else if (r === 'failed') showToast?.(tr('Не получилось открыть приглашения'));
  };
  const onFavorites = async () => {
    if (favorite) { showToast?.(tr('Буклица уже в избранном')); return; }
    const r = await addToFavorites();
    if (r === 'ok') { setFavorite(true); showToast?.(tr('Буклица в избранном')); }
    else if (r === 'failed') showToast?.(tr('Не получилось добавить в избранное'));
  };
  const onShare = async () => {
    const r = await share({ text: tr('Буклица — угадай слово из пяти букв за шесть попыток'), url: SHARE_BASE_URL });
    if (r === 'copied') showToast?.(tr('Ссылка скопирована'));
    else if (r === 'failed') showToast?.(tr('Не получилось поделиться'));
  };

  return (
    <div className="home" role="dialog" aria-modal="true" aria-label={tr('Главное меню')}>
      <div className="home__sky" aria-hidden="true">
        <i className="home__stars" />
        <i className="home__glow home__glow--a" />
        <i className="home__glow home__glow--b" />
        {/* Ивент «Ночь тыкв»: тыквенный отсвет и летучие мыши. */}
        {onOpenHalloween && <i className="hw-home-glow" />}
        {onOpenHalloween && <HalloweenBats />}
      </div>

      <div className="home__inner">
        <header className="home__top" style={{ '--d': 0 }}>
          <div className="home__hello">
            {player?.avatar
              ? <img className="home__avatar" src={player.avatar} alt="" />
              : <span className="home__avatar home__avatar--ph"><OwlIcon /></span>}
            <span className="home__hello-text">
              <span className="home__hello-hi">{tr('Привет,')}</span>
              <b className="home__hello-name">{firstName || tr('игрок')}</b>
            </span>
          </div>
          {/* Ресурсы — кнопки, как в играх: монета ведёт в магазин, энергия
              открывает окно энергии (пополнить, таймер до следующей). */}
          <div className="home__chips">
            <button
              type="button"
              className="home-res home-res--coin"
              onClick={onOpenShop}
              onMouseDown={noSteal}
              aria-label={tr('Монеты: {v0}. Открыть магазин', { v0: stats.coins || 0 })}
            >
              <span className="home-res__ic"><CoinIcon /></span>
              <span className="home-res__val">{stats.coins || 0}</span>
              <span className="home-res__plus" aria-hidden="true"><PlusIcon /></span>
            </button>
            <button
              type="button"
              className={`home-res home-res--bolt${energy <= 0 ? ' home-res--empty' : ''}`}
              onClick={openEnergyModal}
              onMouseDown={noSteal}
              aria-label={tr('Энергия {energy} из {cap}', { energy, cap })}
            >
              <span className="home-res__ic"><BoltIcon /></span>
              <span className="home-res__val">{energy}<small>/{cap}</small></span>
              <span className="home-res__plus" aria-hidden="true"><PlusIcon /></span>
            </button>
          </div>
        </header>

        <section className="home__hero">
          <div className={`home__logo${LOGO.length > 7 ? ' home__logo--long' : ''}`} role="img" aria-label={tr('Буклица')}>
            {LOGO.map(([ch, tone], i) => (
              // Падение при появлении — на слоте, волна — на самой плитке: две
              // анимации transform на одном элементе браузер не отдаёт
              // видеокарте, и волна считалась на главном потоке каждый кадр.
              <span key={i} className="home__tile-slot" style={{ '--i': i }}>
                <span className={`home__tile home__tile--${tone}`}>{ch}</span>
              </span>
            ))}
          </div>
          <div className="home__owl">
            <span className="home__halo" aria-hidden="true" />
            <span className="home__rays" aria-hidden="true" />
            <i className="home__spark home__spark--a" aria-hidden="true" />
            <i className="home__spark home__spark--b" aria-hidden="true" />
            <i className="home__spark home__spark--c" aria-hidden="true" />
            <div className="home__owl-float">
              <OwlSvg equipped={hatched ? (stats.pet?.equipped || NO_DECO) : NO_DECO} perch />
            </div>
          </div>
          <p className="home__tagline" style={{ '--d': 3 }}><b>✦</b>{tr(' Игра в слова ')}<b>✦</b></p>
        </section>

        {/* На телефоне панель «прозрачна» (display: contents) и всё идёт одной
            колонкой; в широком фрейме vk.ru она становится правой колонкой. */}
        <div className="home__panel">
        <div className="home__actions" style={{ '--d': 4 }}>
          {/* Значок «плей» — отдельным кружком у левого края, а надпись и
              подпись центрируются по всей кнопке: иначе значок сдвигал слово
              «Играть» вправо от подписи. Поля слева и справа одинаковые. */}
          <button ref={playRef} type="button" className="home__play" onClick={onPlay} onMouseDown={noSteal}>
            <span className="home__play-badge" aria-hidden="true"><PlayIcon /></span>
            <span className="home__play-text">
              <span className="home__play-label">{continuing ? tr('Продолжить') : tr('Играть')}</span>
              <span className="home__play-sub">{playSub}</span>
            </span>
            <i className="home__play-shine" aria-hidden="true" />
          </button>
        </div>

        {onOpenHalloween && (
          <div className="home__event" style={{ '--d': 4 }}>
            <HalloweenBanner onOpen={onOpenHalloween} />
          </div>
        )}

        <nav className="home__grid" aria-label={tr('Разделы')} style={{ '--d': 5 }}>
          <Tile icon={<ShopIcon />} label={tr('Магазин')} tint="shop" onClick={onOpenShop} />
          <Tile icon={<OwlIcon />} label={hatched ? tr(stats.pet?.name || 'Букля') : tr('Питомец')} tint="pet" onClick={onOpenPet} dot={petAlert} />
          <Tile icon={<AwardIcon />} label={tr('Достижения')} tint="awards" onClick={onOpenAchievements} badge={achCount || undefined} />
          {hasLeaderboard
            ? <Tile icon={<TrophyIcon />} label={tr('Лучшие игроки')} tint="rating" onClick={onOpenLeaderboard} />
            : <Tile icon={<SettingsIcon />} label={tr('Настройки')} tint="settings" onClick={onOpenSettings} />}
          <Tile icon={<StatsIcon />} label={tr('Статистика')} tint="stats" onClick={onOpenStats} />
          <Tile icon={<HelpIcon />} label={tr('Как играть')} tint="help" onClick={onOpenHelp} />
        </nav>

        {(social.invite || social.share || social.favorites) && (
          <div className="home__social" style={{ '--d': 6 }}>
            {social.invite && <Pill icon={<UsersIcon />} label={tr('Пригласить друзей')} onClick={onInvite} strong />}
            {social.share && <Pill icon={<ShareIcon />} label={tr('Поделиться')} onClick={onShare} iconOnly={social.invite} tint="share" />}
            {social.favorites && (
              <Pill
                icon={<StarIcon fill={favorite ? 'currentColor' : 'none'} />}
                label={favorite ? tr('В избранном') : tr('В избранное')}
                onClick={onFavorites}
                iconOnly={social.invite}
                tint="fav"
                on={favorite}
              />
            )}
          </div>
        )}

        {/* Служебные кнопки — такие же цветные карточки, как разделы, только
            пилюлями. Тема — круглым значком: три подписанные кнопки в строку
            на телефоне не влезают, а перенос отнимал место у совы. */}
        <footer className="home__util" style={{ '--d': 7 }}>
          {hasLeaderboard && <Pill icon={<SettingsIcon />} label={tr('Настройки')} onClick={onOpenSettings} tint="settings" />}
          <SoundButton variant="home" />
          <Pill icon={<MailIcon />} label={tr('Написать нам')} onClick={onOpenFeedback} tint="mail" />
          <Pill
            icon={isLight ? <MoonIcon /> : <SunIcon />}
            label={isLight ? tr('Тёмная тема') : tr('Светлая тема')}
            onClick={() => setTheme(isLight ? 'dark' : 'light')}
            tint={isLight ? 'moon' : 'sun'}
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
      {dot && <span className="home-tile__dot" aria-label={tr('Есть новое')} />}
    </button>
  );
}

// iconOnly — круглая кнопка-значок рядом с «Пригласить друзей»: три подписанные
// кнопки в одну строку на телефоне не влезают, а вторая строка отнимает место у совы.
function Pill({ icon, label, onClick, strong, tint, iconOnly, on }) {
  const cls = ['home-pill', strong && 'home-pill--strong', tint && `home-pill--tint home-pill--${tint}`, iconOnly && 'home-pill--icon', on && 'home-pill--on']
    .filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={iconOnly ? label : undefined}
      aria-pressed={on === undefined ? undefined : on}
      title={iconOnly ? label : undefined}
    >
      {tint && !iconOnly ? <span className="home-pill__ic">{icon}</span> : icon}
      {!iconOnly && <span>{label}</span>}
    </button>
  );
}

// Открытие любого окна меняет состояние в App, и без memo это перерисовывало
// всё дерево. Компонент берёт данные из контекста — его изменения дойдут и так. Обработчики App
// передаёт стабильные (useCallback / useMemo).
export const StartMenu = memo(StartMenuView);
