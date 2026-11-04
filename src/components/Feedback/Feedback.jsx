import { useMemo, useState } from 'react';
import { callRpc } from '../../lib/economy.js';
import { isEmbedded, isVk } from '../../lib/platform.js';
import { isEn } from '../../lib/lang.js';
import { copyText } from '../../utils/clipboard.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Modal } from '../Modal/Modal.jsx';
import { MailIcon } from '../icons/Icon.jsx';
import { tr } from '../../lib/lang.js';

// В VK — почта не на домене Яндекса: модерация площадки придирается к чужим
// брендам. На Яндексе и в вебе адрес прежний.
const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const DEV_EMAIL = ENV.VITE_SUPPORT_EMAIL || (isVk ? 'relagames@mail.ru' : 'relagames@yandex.com');
// На площадках нет сервера, принимающего сообщения: форма могла только выдать
// ошибку. В английской версии — один адрес с кнопкой «Копировать».
const FORM_WORKS = !isEn();

const CATEGORIES = [
  { id: 'question', label: tr('Вопрос'),      subject: tr('Вопрос') },
  { id: 'bug',      label: tr('Ошибка'),      subject: tr('Сообщение об ошибке') },
  { id: 'idea',     label: tr('Предложение'), subject: tr('Предложение') },
  { id: 'other',    label: tr('Другое'),      subject: tr('Сообщение') }
];

// Feedback / "write to the developer" screen. Submits straight from the app
// via the submit_feedback RPC (works inside the Yandex Games iframe, where
// mailto: is often blocked), and also offers the developer's e-mail directly.
export function FeedbackModal({ open, onClose }) {
  const { auth, showToast } = useGameContext();
  const linkedEmail = auth?.isAnonymous === false ? (auth.user?.email || '') : '';

  const [category, setCategory] = useState('question');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const trimmed = message.trim();
  const canSend = trimmed.length >= 3 && !sending;

  const mailtoHref = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.id === category);
    const subject = tr('Буклица — {v0}', { v0: cat?.subject || tr('Сообщение') });
    const body = trimmed ? tr('{trimmed}\n\n—\nОтправлено из игры «Буклица»', { trimmed }) : '';
    return `mailto:${DEV_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [category, trimmed]);

  const handleClose = () => {
    setSent(false);
    onClose();
  };

  const onSubmit = async () => {
    if (!canSend) return;
    setSending(true);
    const r = await callRpc('submit_feedback', {
      p_category: category,
      p_message: trimmed,
      p_contact: (contact || linkedEmail || '').trim() || null
    });
    setSending(false);
    if (r && r.ok) {
      setSent(true);
      setMessage('');
      setContact('');
    } else if (r && r.reason === 'rate_limited') {
      showToast?.(tr('Слишком много сообщений за час. Попробуйте позже.'));
    } else if (r && r.reason === 'too_short') {
      showToast?.(tr('Сообщение слишком короткое'));
    } else {
      showToast?.(tr('Не удалось отправить — напишите на почту напрямую'));
    }
  };

  const onCopy = async () => {
    if (await copyText(DEV_EMAIL)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      // Совсем не вышло — показываем адрес, чтобы его можно было переписать.
      showToast?.(DEV_EMAIL);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={tr('Обратная связь')}>
      <div className="feedback">
        {sent ? (
          <div className="feedback__done">
            <div className="feedback__done-mark">✓</div>
            <p className="feedback__done-text">{tr('Спасибо! Сообщение получено — мы обязательно его прочитаем')}{linkedEmail || contact ? tr(' и постараемся ответить') : ''}.
            </p>
            <button
              type="button"
              className="btn btn--ghost feedback__again"
              onClick={() => setSent(false)}
              onMouseDown={(e) => e.preventDefault()}
            >{tr('Написать ещё')}</button>
          </div>
        ) : (
          <>
            <p className="feedback__lead">{tr('Нашли ошибку, есть вопрос или идея? Напишите нам — это помогает делать игру лучше.')}</p>

            {FORM_WORKS && (<>
            <div className="feedback__cats" role="tablist">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  className={`feedback__cat${category === c.id ? ' feedback__cat--active' : ''}`}
                  onClick={() => setCategory(c.id)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <textarea
              className="feedback__textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={tr('Ваше сообщение…')}
              rows={5}
              maxLength={4000}
            />

            <input
              className="feedback__contact"
              type="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={linkedEmail ? tr('Для ответа: {linkedEmail}', { linkedEmail }) : tr('E-mail для ответа (необязательно)')}
            />

            <button
              type="button"
              className="btn btn--primary feedback__send"
              onClick={onSubmit}
              onMouseDown={(e) => e.preventDefault()}
              disabled={!canSend}
            >
              {sending ? tr('Отправка…') : tr('Отправить')}
            </button>

            <div className="feedback__divider"><span>{tr('или напрямую')}</span></div>
            </>)}

            <div className="feedback__direct">
              <MailIcon className="feedback__direct-icon" />
              {/* Внутри площадки адрес — ТЕКСТ, а не ссылка. Клик по
                  <a href="mailto:…"> уводит сам iframe, а он у площадки под
                  CSP: игра мгновенно заменяется страницей «Сайт заблокирован»
                  и больше ни на что не реагирует. Именно это модерация Яндекса
                  и записала как зависание (п. 1.14). Действие никуда не
                  делось — рядом стоит кнопка «Копировать». */}
              {isEmbedded
                ? <span className="feedback__email">{DEV_EMAIL}</span>
                : <a className="feedback__email" href={mailtoHref}>{DEV_EMAIL}</a>}
              <button
                type="button"
                className="btn btn--ghost feedback__copy"
                onClick={onCopy}
                onMouseDown={(e) => e.preventDefault()}
              >
                {copied ? tr('Скопировано ✓') : tr('Копировать')}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
