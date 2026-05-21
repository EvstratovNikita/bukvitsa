// Translates Supabase Auth error objects into short, user-facing Russian messages.
// Supabase exposes both `code` (stable enum) and `message` (English prose).
// We map by code first, then fall back to message pattern matching for cases
// where Supabase didn't tag the response with a code.

const CODE_MAP = {
  // Rate limits
  email_rate_limit_exceeded: 'Слишком много писем подряд. Подожди минуту и попробуй снова.',
  over_email_send_rate_limit: 'Слишком много писем подряд. Подожди минуту и попробуй снова.',
  over_sms_send_rate_limit: 'Слишком много SMS подряд. Подожди немного.',
  over_request_rate_limit: 'Слишком много попыток. Подожди и попробуй снова.',
  too_many_requests: 'Слишком много попыток. Подожди и попробуй снова.',
  request_timeout: 'Сервер не ответил. Попробуй ещё раз.',

  // Email
  email_exists: 'Этот email уже используется.',
  email_address_invalid: 'Неверный формат email.',
  email_address_not_authorized: 'Этот email недоступен для входа.',
  email_not_confirmed: 'Сначала подтверди email — мы отправили письмо.',
  email_provider_disabled: 'Вход по email сейчас недоступен.',

  // Phone
  phone_exists: 'Этот номер уже используется.',
  phone_not_confirmed: 'Сначала подтверди номер телефона.',

  // Auth state / credentials
  invalid_credentials: 'Неверный email или пароль.',
  user_not_found: 'Пользователь не найден. Создай аккаунт.',
  user_already_exists: 'Пользователь с таким email уже зарегистрирован.',
  user_banned: 'Аккаунт заблокирован.',
  no_authorization: 'Нужно сначала войти.',
  session_not_found: 'Сессия устарела. Войди заново.',
  session_expired: 'Сессия истекла. Войди заново.',

  // Identity / linking
  identity_already_exists: 'Этот аккаунт уже привязан к другому пользователю.',
  identity_not_found: 'Аккаунт не найден.',
  manual_linking_disabled: 'Привязка аккаунта временно недоступна.',
  single_identity_not_deletable: 'Нельзя удалить единственный способ входа.',

  // Signup
  signup_disabled: 'Регистрация временно недоступна.',
  anonymous_provider_disabled: 'Анонимный вход выключен.',

  // OAuth
  bad_oauth_callback: 'Не получилось войти через провайдер. Попробуй ещё раз.',
  bad_oauth_state: 'Сессия входа устарела. Открой окно входа заново.',
  oauth_provider_not_supported: 'Этот способ входа недоступен.',
  provider_disabled: 'Этот способ входа сейчас выключен.',
  provider_email_needs_verification: 'Подтверди email у провайдера.',

  // Validation
  validation_failed: 'Проверь введённые данные.',
  weak_password: 'Слишком простой пароль.',
  same_password: 'Новый пароль должен отличаться от старого.',

  // Captcha
  captcha_failed: 'Не пройдена проверка «я не робот». Попробуй ещё раз.',

  // Generic
  unexpected_failure: 'Что-то пошло не так. Попробуй ещё раз.'
};

const MESSAGE_PATTERNS = [
  [/email\s*rate\s*limit\s*exceeded|over.*email.*rate.*limit/i,
    'Слишком много писем подряд. Подожди минуту и попробуй снова.'],
  [/rate\s*limit|too\s*many\s*requests/i,
    'Слишком много попыток. Подожди и попробуй снова.'],
  [/invalid\s*(email|email\s*format|format)/i,
    'Неверный формат email.'],
  [/network\s*error|failed\s*to\s*fetch|fetch\s*failed|networkerror/i,
    'Нет соединения. Проверь интернет и попробуй снова.'],
  [/already\s*(registered|exists|used)/i,
    'Этот email уже используется.'],
  [/invalid\s*login|invalid\s*credentials|wrong\s*password/i,
    'Неверный email или пароль.'],
  [/anonymous\s*sign[-\s]?ins?\s*(are\s*)?disabled/i,
    'Анонимный вход выключен.'],
  [/provider\s*is\s*not\s*enabled|unsupported\s*provider/i,
    'Этот способ входа сейчас недоступен.'],
  [/manual\s*linking\s*(is\s*)?disabled/i,
    'Привязка аккаунта временно недоступна.'],
  [/identity\s*is\s*already\s*linked/i,
    'Этот аккаунт уже привязан к другому пользователю.']
];

export function translateAuthError(error) {
  if (!error) return null;

  // Supabase errors usually have a `code`; some wrap as `error_code`.
  const code = error.code || error.error_code;
  if (code && CODE_MAP[code]) return CODE_MAP[code];

  const msg = typeof error === 'string'
    ? error
    : (error.message || error.error_description || '');

  for (const [pattern, ru] of MESSAGE_PATTERNS) {
    if (pattern.test(msg)) return ru;
  }

  // Last resort — short generic. Don't dump raw English at the user.
  return 'Что-то пошло не так. Попробуй ещё раз.';
}
