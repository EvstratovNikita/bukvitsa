import { useState } from 'react';
import { hasHomeMenu, isEmbedded } from '../../lib/platform.js';
import { ENERGY_REGEN_INTERVAL_MS, FREE_START_GAMES, PET_UNLOCK_GAMES } from '../../constants/game.js';
import { tr } from '../../lib/lang.js';

// "Как играть" — a compact, tabbed reference. Three categories:
//   • Игра    — core loop (shown first): mechanics, coins, hints, energy,
//               extra modes, achievements
//   • Питомец — every bar, how Букля grows, what to buy, why feed, training
//   • Магазин — what coins buy, and that the theme follows the background
// Copy is deliberately terse: one short line per topic, icon-led so it scans.

const TABS = [
  { id: 'game', icon: '🎯', label: tr('Игра') },
  { id: 'pet',  icon: '🦉', label: tr('Питомец') },
  { id: 'shop', icon: '🛍️', label: tr('Магазин') }
];

// One scannable topic: emoji chip + bold title + one-line explanation.
function Topic({ icon, title, children }) {
  return (
    <div className="help-topic">
      <span className="help-topic__icon" aria-hidden="true">{icon}</span>
      <div className="help-topic__body">
        <div className="help-topic__title">{title}</div>
        <div className="help-topic__text">{children}</div>
      </div>
    </div>
  );
}

function GameHelp() {
  return (
    <div className="help-cat">
      <p className="help-cat__lead">{tr('Угадай слово из 5 букв за 6 попыток.')}</p>
      <ul className="help__legend">
        <li><span className="swatch swatch--correct" />{tr(' буква на своём месте')}</li>
        <li><span className="swatch swatch--present" />{tr(' буква есть, но в другом месте')}</li>
        <li><span className="swatch swatch--absent" />{tr(' буквы нет в слове')}</li>
      </ul>

      <Topic icon="🪙" title={tr('Монеты')}>{tr('Чем меньше попыток — тем больше награда (от 8 до 1). Не угадал — 0. Копи и трать в магазине.')}</Topic>
      <Topic icon="💡" title={tr('Подсказки')}>{tr('Открой букву за монеты: случайную (10) или на выбранной позиции (15).')}</Topic>
      <Topic icon="⚡" title={tr('Энергия')}>{tr('Каждая новая партия тратит 1 энергию (максимум 5). Восстанавливается сама (')}{ENERGY_REGEN_INTERVAL_MS >= 2 * 3600000 ? tr('1 за 2 часа') : tr('1 за час')}{tr('), за монеты или рекламу. Слово дня и доп. режимы энергию не тратят.')}{FREE_START_GAMES > 0 && tr(' Первые {FREE_START_GAMES} партии — бесплатно.', { FREE_START_GAMES })}
      </Topic>
      <Topic icon="🔤" title={tr('Режимы 4 и 6 букв')}>{tr('Играй без траты энергии — идёт только опыт Букле. Каждые 5 побед возвращают +1 энергию в основном режиме (до 3 в день).')}</Topic>
      <Topic icon="🏆" title={tr('Достижения')}>{tr('За успехи в игре — серии, быстрые победы, число слов — положены монеты.')}{isEmbedded
          ? tr(' Забери награду кнопкой «Забрать» в разделе «Достижения» — число на значке показывает, сколько наград ждёт.')
          : tr(' Они начисляются сразу.')}
      </Topic>
    </div>
  );
}

function PetHelp() {
  return (
    <div className="help-cat">
      <p className="help-cat__lead">{tr('Совёнок Букля вылупляется после ')}{PET_UNLOCK_GAMES}{tr(' сыгранных партий и растёт вместе с тобой.')}</p>

      <Topic icon="⭐" title={tr('Уровень (опыт)')}>{tr('Букля получает опыт за каждую победу — быстрые победы дают больше. Опыт открывает новые наряды.')}</Topic>
      <Topic icon="🍖" title={tr('Сытость')}>{tr('Корми Буклю: чем она сытнее, тем быстрее восстанавливается твоя энергия (до ×2). Сытость со временем убывает.')}</Topic>
      <Topic icon="🎀" title={tr('Привязанность')}>{tr('Пока Букля сыта, растёт сама (+1 очко каждые 5 минут). Наполни шкалу — и она принесёт эксклюзивный подарок: фон или стиль клеток.')}</Topic>
      <Topic icon="🎁" title={tr('Наряды')}>{tr('Во вкладке «Порадовать» — украшения за монеты. Каждое даёт +монеты за победу, бонусы складываются.')}</Topic>
      <Topic icon="🎓" title={tr('Обучение')}>{tr('Мини-игры (память, анаграмма) во вкладке «Обучить» — раз в сутки, приносят опыт и монеты.')}</Topic>
    </div>
  );
}

function ShopHelp() {
  return (
    <div className="help-cat">
      <p className="help-cat__lead">{tr('Всё покупается за монеты, заработанные в игре. Реальных денег нет.')}</p>

      <Topic icon="🖼️" title={tr('Фоны')}>{tr('Меняют оформление экрана. Тема (тёмная или светлая) переключается вместе с фоном автоматически.')}</Topic>
      <Topic icon="🟩" title={tr('Стиль клеток')}>{tr('Особый вид клеток — неон, изумруд, золотое мерцание.')}</Topic>
      <Topic icon="✨" title={tr('Бонусы')}>{tr('Временные усиления: двойные монеты, повышенный запас энергии, щедрая реклама.')}</Topic>
      <Topic icon="👛" title={tr('Где взять монеты')}>{tr('Победы, достижения, наряды Букли и ежедневный вход.')}{hasHomeMenu
          ? tr(' Магазин — в главном меню (кнопка с домиком справа вверху) или по «+» у монет.')
          : tr(' Магазин — в меню справа вверху.')}
      </Topic>
    </div>
  );
}

export function HowToPlay() {
  const [tab, setTab] = useState('game');
  return (
    <div className="help">
      {/* Липнет именно полоса-обёртка: она непрозрачная и во всю ширину тела
          модалки, поэтому текст не просвечивает ни сквозь переключатель, ни
          по бокам от него. */}
      <div className="help-tabsbar">
        <div className="help-tabs" role="tablist" aria-label={tr('Разделы помощи')}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`help-tab${tab === t.id ? ' help-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
              onMouseDown={(e) => e.preventDefault()}
            >
              <span className="help-tab__icon" aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'game' && <GameHelp />}
      {tab === 'pet'  && <PetHelp />}
      {tab === 'shop' && <ShopHelp />}

      <p className="help__hint">{tr('Загадываются только нарицательные русские существительные — без имён и географических названий.')}</p>
    </div>
  );
}
