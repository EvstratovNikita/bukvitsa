import { useState } from 'react';

// "Как играть" — a compact, tabbed reference. Three categories:
//   • Игра    — core loop (shown first): mechanics, coins, hints, energy,
//               extra modes, achievements
//   • Питомец — every bar, how Букля grows, what to buy, why feed, training
//   • Магазин — what coins buy, and that the theme follows the background
// Copy is deliberately terse: one short line per topic, icon-led so it scans.

const TABS = [
  { id: 'game', icon: '🎯', label: 'Игра' },
  { id: 'pet',  icon: '🦉', label: 'Питомец' },
  { id: 'shop', icon: '🛍️', label: 'Магазин' }
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
      <p className="help-cat__lead">Угадай слово из 5 букв за 6 попыток.</p>
      <ul className="help__legend">
        <li><span className="swatch swatch--correct" /> буква на своём месте</li>
        <li><span className="swatch swatch--present" /> буква есть, но в другом месте</li>
        <li><span className="swatch swatch--absent" /> буквы нет в слове</li>
      </ul>

      <Topic icon="🪙" title="Монеты">
        Чем меньше попыток — тем больше награда (от 8 до 1). Не угадал — 0.
        Копи и трать в магазине.
      </Topic>
      <Topic icon="💡" title="Подсказки">
        Открой букву за монеты: случайную (10) или на выбранной позиции (15).
      </Topic>
      <Topic icon="⚡" title="Энергия">
        Каждая новая партия тратит 1 энергию (максимум 5). Восстанавливается
        сама (1 за 2 часа), за монеты или рекламу. Слово дня и доп. режимы
        энергию не тратят.
      </Topic>
      <Topic icon="🔤" title="Режимы 4 и 6 букв">
        Играй без траты энергии — идёт только опыт Букле. Каждые 5 побед
        возвращают +1 энергию в основном режиме.
      </Topic>
      <Topic icon="🏆" title="Достижения">
        За успехи в игре — серии, быстрые победы, число слов — начисляются
        монеты.
      </Topic>
    </div>
  );
}

function PetHelp() {
  return (
    <div className="help-cat">
      <p className="help-cat__lead">
        Совёнок Букля вылупляется после 10 сыгранных партий и растёт вместе
        с тобой.
      </p>

      <Topic icon="⭐" title="Уровень (опыт)">
        Букля получает опыт за каждую победу — быстрые победы дают больше.
        Опыт открывает новые наряды.
      </Topic>
      <Topic icon="🍖" title="Сытость">
        Корми Буклю: чем она сытнее, тем быстрее восстанавливается твоя
        энергия (до ×2). Сытость со временем убывает.
      </Topic>
      <Topic icon="🎀" title="Привязанность">
        Пока Букля сыта, растёт сама (+1 очко каждые 5 минут). Наполни шкалу —
        и она принесёт эксклюзивный подарок: фон или стиль клеток.
      </Topic>
      <Topic icon="🎁" title="Наряды">
        Во вкладке «Порадовать» — украшения за монеты. Каждое даёт +монеты за
        победу, бонусы складываются.
      </Topic>
      <Topic icon="🎓" title="Обучение">
        Мини-игры (память, анаграмма) во вкладке «Обучить» — раз в сутки,
        приносят опыт и монеты.
      </Topic>
    </div>
  );
}

function ShopHelp() {
  return (
    <div className="help-cat">
      <p className="help-cat__lead">
        Всё покупается за монеты, заработанные в игре. Реальных денег нет.
      </p>

      <Topic icon="🖼️" title="Фоны">
        Меняют оформление экрана. Тема (тёмная или светлая) переключается
        вместе с фоном автоматически.
      </Topic>
      <Topic icon="🟩" title="Стиль клеток">
        Особый вид клеток — неон, изумруд, золотое мерцание.
      </Topic>
      <Topic icon="✨" title="Бонусы">
        Временные усиления: двойные монеты, повышенный запас энергии,
        щедрая реклама.
      </Topic>
      <Topic icon="👛" title="Где взять монеты">
        Победы, достижения, наряды Букли и ежедневный вход. Магазин — в меню
        справа вверху.
      </Topic>
    </div>
  );
}

export function HowToPlay() {
  const [tab, setTab] = useState('game');
  return (
    <div className="help">
      <div className="help-tabs" role="tablist" aria-label="Разделы помощи">
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

      {tab === 'game' && <GameHelp />}
      {tab === 'pet'  && <PetHelp />}
      {tab === 'shop' && <ShopHelp />}

      <p className="help__hint">
        Загадываются только нарицательные русские существительные — без имён
        и географических названий.
      </p>
    </div>
  );
}
