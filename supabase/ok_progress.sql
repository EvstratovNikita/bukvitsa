-- Прогресс игроков в Одноклассниках.
--
-- Зачем. ОК запускает ту же VK-сборку, но правила размещения там требуют,
-- чтобы прогресс в каждой соцсети вёлся отдельно, синхронизировался между
-- устройствами и хранился на бэкенде игры. VK Storage для этого не годится:
-- он привязан к VK ID, а у игрока со связанными аккаунтами тот же VK ID и в ОК,
-- — прогресс стал бы общим с VK. Поэтому здесь ключ — id игрока в ОК.
--
-- Модель доверия. Игрока определяет подписанная строка запуска: vk_client=ok
-- и vk_ok_user_id подписаны тем же защищённым ключом, что и в VK, и
-- проверяются private.vk_sign_ok. Чужой прогресс ни прочитать, ни записать
-- нельзя. Содержимое снимка присылает клиент — как и в VK Storage, сервер
-- его не пересчитывает, только ограничивает размер.
--
-- Слияние с местным снимком делает клиент (hooks/useCloudSync.js +
-- utils/mergeProgress.js), сервер хранит последний присланный снимок целиком.
--
-- Как применить: СНАЧАЛА vk_leaderboard.sql (отсюда нужны private.vk_sign_ok,
-- private.query_param и ключ в private.app_secrets), затем этот файл:
-- Supabase → SQL Editor → вставить и выполнить. Идемпотентно.

-- ---------------------------------------------------------------- хранилище

create table if not exists public.ok_progress (
  ok_user_id text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.ok_progress enable row level security;
revoke all on public.ok_progress from anon, authenticated;

-- --------------------------------------------------------------- кто игрок

-- id игрока ОК из подписанной строки запуска либо null. Строка без
-- vk_client=ok не подходит: иначе подписанный запуск из VK читал бы и писал
-- прогресс ОК. p_secret — только для самопроверки внизу файла.
create or replace function private.ok_user_id(p_query text, p_secret text default null)
returns text
language plpgsql
stable
security definer
set search_path = private, extensions, pg_temp
as $$
declare
  v_uid text;
begin
  if not private.vk_sign_ok(p_query, p_secret) then
    return null;
  end if;
  if coalesce(private.query_param(p_query, 'vk_client'), '') <> 'ok' then
    return null;
  end if;
  v_uid := private.query_param(p_query, 'vk_ok_user_id');
  if v_uid is null or v_uid !~ '^[0-9]{1,20}$' then
    return null;
  end if;
  return v_uid;
end;
$$;

-- ------------------------------------------------------------------ чтение

-- {ok:true, data} — data = null, если игрок ещё ничего не сохранял.
-- {ok:false, error} — подпись не сошлась или это не запуск из ОК.
create or replace function public.load_ok_progress(p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_uid  text;
  v_data jsonb;
begin
  v_uid := private.ok_user_id(p_query);
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'bad_sign');
  end if;
  select data into v_data from public.ok_progress where ok_user_id = v_uid;
  return jsonb_build_object('ok', true, 'data', v_data);
end;
$$;

-- ------------------------------------------------------------------ запись

-- Снимок сейчас около 3 КБ; 64 КБ — потолок с многократным запасом, чтобы
-- таблицу нельзя было использовать как бесплатную файлопомойку.
create or replace function public.save_ok_progress(p_query text, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_uid text;
begin
  v_uid := private.ok_user_id(p_query);
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'bad_sign');
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'bad_data');
  end if;
  if octet_length(p_data::text) > 65536 then
    return jsonb_build_object('ok', false, 'error', 'too_big');
  end if;

  insert into public.ok_progress (ok_user_id, data, updated_at)
  values (v_uid, p_data, now())
  on conflict (ok_user_id) do update
    set data = excluded.data, updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

-- -------------------------------------------------------------------- права

revoke all on function private.ok_user_id(text, text) from public, anon, authenticated;
revoke all on function public.load_ok_progress(text) from public;
revoke all on function public.save_ok_progress(text, jsonb) from public;
grant execute on function public.load_ok_progress(text) to anon, authenticated;
grant execute on function public.save_ok_progress(text, jsonb) to anon, authenticated;

-- -------------------------------------------------------------- самопроверка
--
-- Фикстуры подписаны тестовым ключом test_secret_123 по алгоритму VK, со всеми
-- параметрами запуска из ОК. Настоящий ключ не участвует. Должно напечатать
-- четыре «ok».
do $$
declare
  v_secret constant text := 'test_secret_123';
  v_ok     constant text := 'vk_access_token_settings=&vk_app_id=53671510&vk_client=ok&vk_is_app_user=1&vk_language=ru&vk_ok_app_id=512002000000&vk_ok_user_id=777&vk_platform=desktop_web_ok&vk_ts=1789000000&vk_user_id=42&sign=AH8mfmY8hgn-UVaIWRrBwQn1TPo37sjucULkdE_rM3U';
  -- подпись из VK (без vk_client=ok) — валидна, но это не запуск из ОК
  v_vk     constant text := 'vk_access_token_settings=&vk_app_id=53671510&vk_are_notifications_enabled=0&vk_is_app_user=1&vk_is_favorite=0&vk_language=ru&vk_platform=desktop_web&vk_ref=other&vk_ts=1789000000&vk_user_id=42&sign=sHo5UubWosJ1xW3VIXvp9TfO4UAS68Pct0oJHRtcvCQ';
begin
  raise notice 'игрок ОК найден:     %', case when private.ok_user_id(v_ok, v_secret) = '777' then 'ok' else 'FAIL' end;
  raise notice 'подделка id отбита:  %', case when private.ok_user_id(replace(v_ok, 'vk_ok_user_id=777', 'vk_ok_user_id=778'), v_secret) is null then 'ok' else 'FAIL' end;
  raise notice 'подмена площадки:    %', case when private.ok_user_id(replace(v_ok, 'vk_client=ok', 'vk_client=vk'), v_secret) is null then 'ok' else 'FAIL' end;
  raise notice 'запуск из VK отбит:  %', case when private.ok_user_id(v_vk, v_secret) is null then 'ok' else 'FAIL' end;
end $$;
