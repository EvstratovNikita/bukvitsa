import { useEffect, useMemo, useState } from 'react';
import { petComputeLevel } from '../../constants/game.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Modal } from '../Modal/Modal.jsx';
import { PetScene } from './PetScene.jsx';

const HATCH_DURATION_MS = 3200;

// Days-since-bornAt, floored. Returns 0 for "today" so the UI can say
// "вылупилась сегодня" without weird negative offsets.
function ageInDays(iso) {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export function PetModal({ open, onClose }) {
  const { stats, hatchPet, renamePet } = useGameContext();
  const pet = stats.pet || { hatched: false, name: 'Букля', bornAt: null };

  // Scene mode lifecycle:
  //   first open AND not hatched yet → start at 'egg', flip to 'hatching'
  //   on next tick, persist hatched after animation, settle on 'owl'.
  //   already hatched → start (and stay) at 'owl'.
  const [mode, setMode] = useState(pet.hatched ? 'owl' : 'egg');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(pet.name);

  useEffect(() => {
    if (!open) return;
    if (pet.hatched) { setMode('owl'); return; }
    setMode('egg');
    // Tiny delay so the egg has time to mount before the animation starts.
    const start = setTimeout(() => setMode('hatching'), 120);
    const finish = setTimeout(() => {
      hatchPet();
      setMode('owl');
    }, HATCH_DURATION_MS);
    return () => {
      clearTimeout(start);
      clearTimeout(finish);
    };
  }, [open, pet.hatched, hatchPet]);

  const age = useMemo(() => ageInDays(pet.bornAt), [pet.bornAt]);
  const lvlInfo = useMemo(() => petComputeLevel(pet.xp || 0), [pet.xp]);
  const lvlPct = Math.min(100, Math.round((lvlInfo.xpInLevel / lvlInfo.xpForNext) * 100));

  const saveName = () => {
    renamePet(draftName);
    setEditingName(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Дупло Букли">
      <div className="pet">
        <PetScene mode={mode} />

        {mode === 'egg' && (
          <div className="pet__caption">В дупле что-то шевелится…</div>
        )}
        {mode === 'hatching' && (
          <div className="pet__caption pet__caption--anim">Скорлупа трескается!</div>
        )}
        {mode === 'owl' && (
          <div className="pet__panel">
            <div className="pet__row">
              {!editingName ? (
                <>
                  <div className="pet__name">{pet.name}</div>
                  <button
                    type="button"
                    className="pet__edit"
                    onClick={() => { setDraftName(pet.name); setEditingName(true); }}
                  >
                    Переименовать
                  </button>
                </>
              ) : (
                <>
                  <input
                    className="pet__name-input"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    maxLength={20}
                    autoFocus
                  />
                  <button type="button" className="pet__edit" onClick={saveName}>OK</button>
                </>
              )}
            </div>

            <div className="pet__meta">
              {age === 0 ? 'Вылупилась сегодня' : `Вылупилась ${age} ${pluralDays(age)} назад`}
              {' · '}
              Совёнок
            </div>

            <div className="pet__level-row">
              <div className="pet__level-badge">Ур. {lvlInfo.level}</div>
              <div className="pet__xp">
                <div className="pet__xp-bar">
                  <div className="pet__xp-fill" style={{ width: `${lvlPct}%` }} />
                </div>
                <div className="pet__xp-text">
                  {lvlInfo.xpInLevel} / {lvlInfo.xpForNext} XP до следующего уровня
                </div>
              </div>
            </div>
            <p className="pet__level-hint">
              Букля получает опыт за каждую угаданную игру — чем меньше попыток, тем больше XP.
            </p>

            <div className="pet__roadmap">
              <h4 className="pet__roadmap-title">Что появится у Букли</h4>
              <ul className="pet__roadmap-list">
                <li>🍇 Кормление за монеты — поднимает настроение</li>
                <li>📈 Уровни знаний — открывают пассивные бонусы к награде</li>
                <li>🎩 Шапочки и шарфики — косметика только для Букли</li>
                <li>💡 «Подсказки от Букли» — раз в день бесплатная подсказка</li>
              </ul>
              <p className="pet__roadmap-hint">
                Сейчас Букля просто живёт в твоём дупле. Скоро будет больше — заходи проведывать!
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function pluralDays(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня';
  return 'дней';
}
