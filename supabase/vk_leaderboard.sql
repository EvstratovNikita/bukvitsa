-- Общая таблица лидеров для VK Mini Apps.
--
-- Зачем. У VK нет общего рейтинга: нативный VKWebAppShowLeaderBoardBox
-- сравнивает игрока только с друзьями, у которых игра установлена. Общая
-- таблица бывает только своя, на своём сервере — им и служит этот файл.
--
-- Модель доверия. Счёт присылает клиент (как и на Яндексе), поэтому подпись
-- launch-параметров проверяется здесь: без неё любой мог бы прислать результат
-- за чужого игрока. От накрутки собственного счёта подпись не спасает — для
-- этого нужна серверная проверка слов; пока счёт только растёт и ограничен
-- потолком прироста.
--
-- Права. Таблица закрыта RLS без единой политики: снаружи в неё нельзя ни
-- писать, ни читать. Наружу торчат ровно две SECURITY DEFINER функции — тот
-- же приём, что у экономики (см. save_cosmetics.sql).
--
-- Как применить: Supabase → SQL Editor → вставить и выполнить. Идемпотентно.
-- ОТДЕЛЬНО, ОДИН РАЗ, своей рукой положить защищённый ключ приложения VK
-- (настройки приложения → «Защищённый ключ»):
--
--   insert into private.app_secrets (name, value)
--   values ('vk_client_secret', 'СЮДА_КЛЮЧ')
--   on conflict (name) do update set value = excluded.value;
--
-- Ключ не должен попадать ни в репозиторий, ни в переписку.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- хранилище

create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.app_secrets (
  name  text primary key,
  value text not null
);
revoke all on private.app_secrets from anon, authenticated;

create table if not exists public.leaderboard (
  platform   text not null,
  player_id  text not null,
  name       text not null default '',
  score      integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (platform, player_id)
);

alter table public.leaderboard enable row level security;
revoke all on public.leaderboard from anon, authenticated;

-- Топ читается по одной площадке — индекс ровно под этот запрос.
create index if not exists leaderboard_top_idx
  on public.leaderboard (platform, score desc, updated_at asc);

-- ------------------------------------------------------------ разбор строки

-- Значение параметра из строки запуска. Строка берётся сырой, без
-- перекодировки: подпись считается именно по тому виду, в каком VK её отдал.
create or replace function private.query_param(p_query text, p_key text)
returns text
language sql
immutable
as $$
  select substr(pair, length(p_key) + 2)
  from unnest(string_to_array(ltrim(p_query, '?'), '&')) as pair
  where split_part(pair, '=', 1) = p_key
  limit 1;
$$;

-- Проверка подписи launch-параметров VK.
--
-- Алгоритм из официального примера VKCOM/vk-apps-launch-params: берём все
-- параметры, начинающиеся с vk_, сортируем по алфавиту, склеиваем через «&»,
-- считаем HMAC-SHA256 на защищённом ключе приложения, кодируем в base64,
-- делаем его url-safe (+ → -, / → _) и убираем хвостовые «=».
--
-- Сортировка идёт в collate "C": порядок должен совпадать с побайтовым
-- порядком в JavaScript, а не с языковыми правилами локали.
--
-- p_secret нужен только самопроверке внизу файла; функция живёт в приватной
-- схеме и наружу не выдаётся, подставить свой ключ снаружи нельзя.
create or replace function private.vk_sign_ok(p_query text, p_secret text default null)
returns boolean
language plpgsql
stable
security definer
set search_path = private, extensions, pg_temp
as $$
declare
  v_secret text;
  v_given  text;
  v_parts  text[];
  v_calc   text;
begin
  v_secret := coalesce(p_secret, (select value from private.app_secrets where name = 'vk_client_secret'));
  if v_secret is null or v_secret = '' then
    return false;
  end if;

  v_given := private.query_param(p_query, 'sign');
  if v_given is null or v_given = '' then
    return false;
  end if;

  select array_agg(pair order by pair collate "C")
    into v_parts
  from unnest(string_to_array(ltrim(p_query, '?'), '&')) as pair
  where left(split_part(pair, '=', 1), 3) = 'vk_';

  if v_parts is null then
    return false;
  end if;

  v_calc := rtrim(
    translate(
      regexp_replace(
        encode(extensions.hmac(array_to_string(v_parts, '&'), v_secret, 'sha256'), 'base64'),
        '\s', '', 'g'),
      '+/', '-_'),
    '=');

  return v_calc = v_given;
end;
$$;

-- ------------------------------------------------------------- запись счёта

-- Отправка результата. Возвращает {ok, score} либо {ok:false, error}.
--
-- Потолок прироста. Игрок, который час не заходил, может прибавить около
-- тридцати слов в час; первая запись не ограничена — на площадке игру могли
-- проходить задолго до появления таблицы. Превышение не отвергается, а
-- срезается: честный счёт догонит себя на следующих отправках, а накрутка не
-- даст мгновенного первого места.
create or replace function public.submit_vk_score(p_query text, p_score integer, p_name text default '')
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_uid   text;
  v_name  text;
  v_want  integer;
  v_prev  public.leaderboard%rowtype;
  v_cap   integer;
  v_final integer;
begin
  if not private.vk_sign_ok(p_query) then
    return jsonb_build_object('ok', false, 'error', 'bad_sign');
  end if;

  v_uid := private.query_param(p_query, 'vk_user_id');
  if v_uid is null or v_uid !~ '^[0-9]{1,20}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_user');
  end if;

  -- Имя показывается публично: чистим управляющие символы и обрезаем, иначе
  -- длинная строка разъедет строку таблицы.
  v_name := left(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g'), 32);
  v_want := least(greatest(coalesce(p_score, 0), 0), 100000);

  select * into v_prev from public.leaderboard
   where platform = 'vk' and player_id = v_uid;

  if v_prev.player_id is null then
    insert into public.leaderboard (platform, player_id, name, score)
    values ('vk', v_uid, v_name, v_want);
    return jsonb_build_object('ok', true, 'score', v_want);
  end if;

  -- Чаще раза в 20 секунд писать незачем: счёт шлётся после каждой победы, а
  -- быстрее одной победы за 20 секунд не бывает.
  if v_prev.updated_at > now() - interval '20 seconds' and v_want > v_prev.score then
    return jsonb_build_object('ok', true, 'score', v_prev.score, 'throttled', true);
  end if;

  v_cap := greatest(20, floor(extract(epoch from (now() - v_prev.updated_at)) / 120)::integer);
  v_final := greatest(v_prev.score, least(v_want, v_prev.score + v_cap));

  update public.leaderboard
     set score = v_final,
         name = case when v_name = '' then name else v_name end,
         updated_at = now()
   where platform = 'vk' and player_id = v_uid;

  return jsonb_build_object('ok', true, 'score', v_final);
end;
$$;

-- --------------------------------------------------------------- чтение топа

-- Топ-20 и место игрока. Форма ответа повторяет лидерборд Яндекса, чтобы
-- модалка не знала, откуда пришли данные:
--   { entries: [{ rank, score, formattedScore, player: { publicName } }],
--     userRank: число или null }
--
-- Наружу отдаются только двадцать имён призовой части — выгрузить всю базу
-- этой функцией нельзя.
create or replace function public.leaderboard_top(p_platform text default 'vk', p_player_id text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_entries jsonb;
  v_rank    integer;
begin
  if p_platform is null or p_platform !~ '^[a-z]{1,16}$' then
    return jsonb_build_object('entries', '[]'::jsonb, 'userRank', null);
  end if;

  with ranked as (
    select player_id,
           name,
           score,
           row_number() over (order by score desc, updated_at asc) as rank
    from public.leaderboard
    where platform = p_platform
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'rank', rank,
      'score', score,
      'formattedScore', score::text,
      'player', jsonb_build_object('publicName', case when name = '' then 'Игрок' else name end)
    ) order by rank) filter (where rank <= 20), '[]'::jsonb),
    max(rank) filter (where p_player_id is not null and player_id = p_player_id)
  into v_entries, v_rank
  from ranked;

  return jsonb_build_object('entries', v_entries, 'userRank', v_rank);
end;
$$;

-- -------------------------------------------------------------------- права

revoke all on function public.submit_vk_score(text, integer, text) from public;
revoke all on function public.leaderboard_top(text, text) from public;
grant execute on function public.submit_vk_score(text, integer, text) to anon, authenticated;
grant execute on function public.leaderboard_top(text, text) to anon, authenticated;

-- -------------------------------------------------------------- самопроверка
--
-- Фикстура подписана тестовым ключом test_secret_123 по тому же алгоритму,
-- что у VK. Настоящий ключ здесь не участвует. Должно напечатать три «ok».
do $$
declare
  v_secret   constant text := 'test_secret_123';
  v_query    constant text := 'vk_access_token_settings=&vk_app_id=53671510&vk_are_notifications_enabled=0&vk_is_app_user=1&vk_is_favorite=0&vk_language=ru&vk_platform=desktop_web&vk_ref=other&vk_ts=1789000000&vk_user_id=42&sign=sHo5UubWosJ1xW3VIXvp9TfO4UAS68Pct0oJHRtcvCQ';
  -- те же параметры, порядок перемешан: функция обязана отсортировать сама
  v_shuffled constant text := 'vk_user_id=42&sign=sHo5UubWosJ1xW3VIXvp9TfO4UAS68Pct0oJHRtcvCQ&vk_platform=desktop_web&vk_app_id=53671510&vk_language=ru&vk_is_favorite=0&vk_ts=1789000000&vk_ref=other&vk_is_app_user=1&vk_are_notifications_enabled=0&vk_access_token_settings=';
  -- подделанный vk_user_id: подпись обязана не сойтись
  v_forged   constant text := replace(v_query, 'vk_user_id=42', 'vk_user_id=43');
begin
  raise notice 'подпись верная:   %', case when private.vk_sign_ok(v_query, v_secret)    then 'ok' else 'FAIL' end;
  raise notice 'порядок не важен: %', case when private.vk_sign_ok(v_shuffled, v_secret) then 'ok' else 'FAIL' end;
  raise notice 'подделка отбита:  %', case when private.vk_sign_ok(v_forged, v_secret)   then 'FAIL' else 'ok' end;
end $$;
