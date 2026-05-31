import { useMemo, useState } from 'react';
import { callRpc } from '../../lib/economy.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Modal } from '../Modal/Modal.jsx';
import { MailIcon } from '../icons/Icon.jsx';

const DEV_EMAIL = 'relagames@yandex.com';

const CATEGORIES = [
  { id: 'question', label: 'Вопрос',      subject: 'Вопрос' },
  { id: 'bug',      label: 'Ошибка',      subject: 'Сообщение об ошибке' },
  { id: 'idea',     label: 'Предложение', subject: 'Предложение' },
  { id: 'other',    label: 'Другое',      subject: 'Сообщение' }
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
    const subject = `Буквица — ${cat?.subject || 'Сообщение'}`;
    const body = trimmed ? `${trimmed}\n\n—\nОтправлено из игры «Буквица»` : '';
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
      showToast?.('Слишком много сообщений за час. Попробуйте позже.');
    } else if (r && r.reason === 'too_short') {
      showToast?.('Сообщение слишком короткое');
    } else {
      showToast?.('Не удалось отправить — напишите на почту напрямую');
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(DEV_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast?.(DEV_EMAIL);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Обратная связь">
      <div className="feedback">
        {sent ? (
          <div className="feedback__done">
            <div className="feedback__done-mark">✓</div>
            <p className="feedback__done-text">
              Спасибо! Сообщение получено — мы обязательно его прочитаем
              {linkedEmail || contact ? ' и постараемся ответить' : ''}.
            </p>
            <button
              type="button"
              className="btn btn--ghost feedback__again"
              onClick={() => setSent(false)}
              onMouseDown={(e) => e.preventDefault()}
            >
              Написать ещё
            </button>
          </div>
        ) : (
          <>
            <p className="feedback__lead">
              Нашли ошибку, есть вопрос или идея? Напишите нам — это помогает
              делать игру лучше.
            </p>

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
              placeholder="Ваше сообщение…"
              rows={5}
              maxLength={4000}
            />

            <input
              className="feedback__contact"
              type="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={linkedEmail ? `Для ответа: ${linkedEmail}` : 'E-mail для ответа (необязательно)'}
            />

            <button
              type="button"
              className="btn btn--primary feedback__send"
              onClick={onSubmit}
              onMouseDown={(e) => e.preventDefault()}
              disabled={!canSend}
            >
              {sending ? 'Отправка…' : 'Отправить'}
            </button>

            <div className="feedback__divider"><span>или напрямую</span></div>

            <div className="feedback__direct">
              <MailIcon className="feedback__direct-icon" />
              <a className="feedback__email" href={mailtoHref}>{DEV_EMAIL}</a>
              <button
                type="button"
                className="btn btn--ghost feedback__copy"
                onClick={onCopy}
                onMouseDown={(e) => e.preventDefault()}
              >
                {copied ? 'Скопировано ✓' : 'Копировать'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
