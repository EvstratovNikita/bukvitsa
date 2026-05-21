import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import { translateAuthError } from '../../lib/authErrors.js';
import { useGameContext } from '../../context/GameContext.jsx';
import { Modal } from '../Modal/Modal.jsx';
import { GoogleIcon, LogoutIcon, MailIcon, UserIcon } from '../icons/Icon.jsx';

export function AuthButton() {
  const { auth } = useGameContext();
  const [open, setOpen] = useState(false);

  // Hide when Supabase isn't configured — no point offering sign-in
  // if the backend isn't wired up.
  if (!isSupabaseConfigured) return null;

  const isLinked = auth?.user && auth.isAnonymous === false;
  const label = isLinked ? 'Аккаунт' : 'Войти';

  return (
    <>
      <button
        type="button"
        className="iconbtn iconbtn--accent"
        onClick={() => setOpen(true)}
        onMouseDown={(e) => e.preventDefault()}
        aria-label={label}
        title={label}
      >
        <UserIcon />
      </button>
      <AuthModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AuthModal({ open, onClose }) {
  const { auth } = useGameContext();
  const isLinked = auth?.user && auth.isAnonymous === false;

  return (
    <Modal open={open} onClose={onClose} title={isLinked ? 'Аккаунт' : 'Сохранить прогресс'}>
      {isLinked ? <AccountPanel onClose={onClose} /> : <SignInPanel />}
    </Modal>
  );
}

function SignInPanel() {
  const [phase, setPhase] = useState('default'); // 'default' | 'email' | 'sent'
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const onGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      // Save intent so the App-level error handler can fall back to a plain
      // sign-in if the identity is already linked to another (returning) user.
      sessionStorage.setItem('auth:link-intent', 'google');
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
      // Browser navigates away on success.
    } catch (e) {
      sessionStorage.removeItem('auth:link-intent');
      setError(translateAuthError(e));
      setBusy(false);
    }
  };

  const onSendEmail = async (ev) => {
    ev.preventDefault();
    const addr = email.trim();
    if (!addr) return;
    setBusy(true);
    setError(null);
    try {
      // 1st try: link this email to the current anon user (preserves progress).
      const { error: linkErr } = await supabase.auth.updateUser({ email: addr });
      if (!linkErr) {
        setPhase('sent');
        return;
      }
      // If the email is already used by another (returning) user, fall back
      // to a plain magic-link sign-in into that existing account.
      const msg = (linkErr.message || '').toLowerCase();
      const isTaken =
        linkErr.code === 'email_exists' ||
        linkErr.code === 'email_address_not_authorized' ||
        msg.includes('already') ||
        msg.includes('exists') ||
        msg.includes('registered');
      if (isTaken) {
        const { error: signInErr } = await supabase.auth.signInWithOtp({
          email: addr,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: window.location.origin
          }
        });
        if (signInErr) throw signInErr;
        setPhase('sent');
        return;
      }
      throw linkErr;
    } catch (e) {
      setError(translateAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'sent') {
    return (
      <div className="auth-menu">
        <div className="auth-sent">
          <div className="auth-sent__icon"><MailIcon /></div>
          <h3 className="auth-sent__title">Письмо отправлено</h3>
          <p className="auth-sent__text">
            Открой письмо на <b>{email}</b> и нажми на ссылку, чтобы привязать
            аккаунт. После этого можешь закрыть это окно.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-menu">
      <p className="auth-menu__lead">
        Привяжи аккаунт — и прогресс не потеряется при сбросе данных или
        переходе на другое устройство.
      </p>

      <button
        type="button"
        className="auth-option"
        onClick={onGoogle}
        onMouseDown={(e) => e.preventDefault()}
        disabled={busy}
      >
        <div className="auth-option__icon auth-option__icon--white">
          <GoogleIcon />
        </div>
        <div className="auth-option__body">
          <div className="auth-option__title">Войти через Google</div>
          <div className="auth-option__sub">Один клик — без пароля</div>
        </div>
      </button>

      {phase === 'default' ? (
        <button
          type="button"
          className="auth-option"
          onClick={() => setPhase('email')}
          onMouseDown={(e) => e.preventDefault()}
          disabled={busy}
        >
          <div className="auth-option__icon auth-option__icon--soft">
            <MailIcon />
          </div>
          <div className="auth-option__body">
            <div className="auth-option__title">Войти по email</div>
            <div className="auth-option__sub">Пришлём ссылку на почту</div>
          </div>
        </button>
      ) : (
        <form className="auth-email" onSubmit={onSendEmail}>
          <input
            type="email"
            className="auth-email__input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            disabled={busy}
          />
          <button
            type="submit"
            className="btn btn--primary auth-email__submit"
            disabled={busy || !email.trim()}
            onMouseDown={(e) => e.preventDefault()}
          >
            {busy ? 'Отправляем…' : 'Отправить ссылку'}
          </button>
        </form>
      )}

      {error && <div className="auth-error">{error}</div>}
    </div>
  );
}

function AccountPanel({ onClose }) {
  const { auth } = useGameContext();
  const [busy, setBusy] = useState(false);
  const email = auth.user?.email || '—';
  const initial = (email[0] || '?').toUpperCase();

  const onLogout = async () => {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      // useAuth's onAuthStateChange listener fires; on next render the hook
      // will sign back in as a fresh anonymous user automatically? No — our
      // hook only signs in once on mount. Force a reload so the cycle restarts.
      window.location.reload();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <div className="auth-account">
      <div className="auth-account__head">
        <div className="auth-account__avatar">{initial}</div>
        <div className="auth-account__email" title={email}>{email}</div>
      </div>
      <p className="auth-account__hint">
        Прогресс сохранён. Можно войти под этим аккаунтом на любом устройстве.
      </p>
      <button
        type="button"
        className="btn btn--ghost auth-account__logout"
        onClick={onLogout}
        onMouseDown={(e) => e.preventDefault()}
        disabled={busy}
      >
        <LogoutIcon />
        <span>{busy ? 'Выходим…' : 'Выйти'}</span>
      </button>
    </div>
  );
}
