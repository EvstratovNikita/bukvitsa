-- Миссии VK: сообщение в ленту друзей и баллы за пройденную миссию.
--
-- Зачем сервер. Засчитать миссию можно только методом secure.addAppEvent, а
-- он вызывается с СЕРВИСНЫМ ключом приложения — в клиент такой ключ класть
-- нельзя. Игра сообщает сюда «я прошёл миссию N», функция проверяет подпись
-- launch-параметров и сама зовёт VK API через pg_net.
--
-- Модель доверия — как у таблицы лидеров: КТО прошёл, берётся из подписи
-- (подделать нельзя), ЧТО прошёл — со слов клиента (достижения считаются на
-- устройстве). Миссия засчитывается один раз: VK и сам отвечает ошибкой на
-- повтор, но мы не дёргаем его зря — строка в vk_missions ставится первой.
--
-- Только VK: в Одноклассниках миссий нет, а vk_user_id там бывает техническим.
--
-- Как применить: СНАЧАЛА vk_leaderboard.sql (отсюда нужны private.vk_sign_ok,
-- private.query_param и private.app_secrets), затем этот файл: Supabase →
-- SQL Editor → вставить и выполнить. Идемпотентно.
-- ОТДЕЛЬНО, ОДИН РАЗ, своей рукой положить сервисный ключ приложения VK
-- (настройки приложения → Разработка → Ключи доступа → «Сервисный ключ»):
--
--   insert into private.app_secrets (name, value)
--   values ('vk_service_key', 'СЮДА_КЛЮЧ')
--   on conflict (name) do update set value = excluded.value;
--
-- Ключ не должен попадать ни в репозиторий, ни в переписку.
--
-- Проверить, что VK принял вызовы (ответы pg_net живут ~6 часов):
--
--   select * from private.vk_mission_log limit 20;

create extension if not exists pg_net;

-- ---------------------------------------------------------------- хранилище

create table if not exists public.vk_missions (
  user_id    text    not null,
  mission_id integer not null,
  request_id bigint,                     -- id запроса pg_net, для журнала
  created_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);
alter table public.vk_missions enable row level security;
revoke all on public.vk_missions from anon, authenticated;

-- --------------------------------------------------------------- засчитать

-- Возвращает {ok, sent} либо {ok:false, error}. sent=false — миссия этому
-- игроку уже отправлена раньше и VK её принял, повторно в VK не ходим.
create or replace function public.complete_vk_mission(p_query text, p_mission integer)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_uid  text;
  v_key  text;
  v_rows integer;
  v_req  bigint;
begin
  if not private.vk_sign_ok(p_query) then
    return jsonb_build_object('ok', false, 'error', 'bad_sign');
  end if;
  if private.query_param(p_query, 'vk_client') = 'ok' then
    return jsonb_build_object('ok', false, 'error', 'not_vk');
  end if;

  v_uid := private.query_param(p_query, 'vk_user_id');
  if v_uid is null or v_uid !~ '^[0-9]{1,20}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_user');
  end if;
  -- Одобренные миссии игры (dev.vk.com → Соц. механики → Миссии).
  if p_mission is null or p_mission not between 3 and 15 then
    return jsonb_build_object('ok', false, 'error', 'bad_mission');
  end if;

  -- Без ключа строку не ставим: иначе миссия навсегда числилась бы
  -- отправленной, хотя в VK ничего не ушло. Клиент попробует позже.
  select value into v_key from private.app_secrets where name = 'vk_service_key';
  if v_key is null or v_key = '' then
    return jsonb_build_object('ok', false, 'error', 'no_key');
  end if;

  insert into public.vk_missions (user_id, mission_id) values (v_uid, p_mission)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  -- Уже отправляли. Повторяем, только если VK тогда ответил ошибкой (скажем,
  -- ключ был неверный); ответ ещё не пришёл или уже стёрт — не трогаем.
  if v_rows = 0 and not exists (
    select 1
      from public.vk_missions m
      join net._http_response r on r.id = m.request_id
     where m.user_id = v_uid and m.mission_id = p_mission
       and (r.status_code is distinct from 200 or r.content not like '{"response"%')
  ) then
    return jsonb_build_object('ok', true, 'sent', false);
  end if;

  v_req := net.http_post(
    url     := 'https://api.vk.com/method/secure.addAppEvent',
    body    := '{}'::jsonb,
    params  := jsonb_build_object(
      'user_id',      v_uid,
      'activity_id',  p_mission::text,
      'access_token', v_key,
      'v',            '5.199'
    )
  );
  update public.vk_missions set request_id = v_req
   where user_id = v_uid and mission_id = p_mission;

  return jsonb_build_object('ok', true, 'sent', true);
end;
$$;

revoke all on function public.complete_vk_mission(text, integer) from public;
grant execute on function public.complete_vk_mission(text, integer) to anon, authenticated;

-- ------------------------------------------------------------- журнал
-- Ответ VK на каждый вызов: {"response":1} — принято, {"error":…} — нет.
-- Живёт в private: снаружи не виден, читается только из SQL Editor.

create or replace view private.vk_mission_log as
select m.created_at, m.user_id, m.mission_id,
       r.status_code, left(r.content, 300) as vk_answer, r.error_msg
  from public.vk_missions m
  left join net._http_response r on r.id = m.request_id
 order by m.created_at desc;
