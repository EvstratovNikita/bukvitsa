-- Приходы по ссылкам «Поделиться» в VK — статистика для владельца игры.
--
-- Зачем. Ссылка, которой игрок делится из VK, несёт метку отправителя:
-- https://vk.com/app<id>#ref=<vk_user_id>. VK передаёт хеш в приложение
-- (location.hash), и игра, открытая по такой ссылке, сообщает сюда: «меня
-- позвал такой-то». Так видно, сколько людей реально пришло по ссылкам, а не
-- только сколько раз нажали «Поделиться».
--
-- Наград за это нет и быть не должно: правила VK (п. 2.6.2) запрещают
-- поощрять социальные действия. Это только счётчик.
--
-- Модель доверия. Кто ПРИШЁЛ, берётся из подписанных launch-параметров
-- (vk_user_id, vk_is_app_user) — подделать нельзя, подпись проверяет
-- private.vk_sign_ok из vk_leaderboard.sql. Кто ПОЗВАЛ — из хеша ссылки, он
-- не подписан: при желании метку можно дописать руками. Для статистики это
-- приемлемо (выгоды от подделки нет), для наград — было бы нет.
-- Один игрок засчитывается один раз: первый приход и есть атрибуция.
--
-- Как применить: СНАЧАЛА vk_leaderboard.sql (отсюда нужны private.vk_sign_ok,
-- private.query_param и ключ в private.app_secrets), затем этот файл:
-- Supabase → SQL Editor → вставить и выполнить. Идемпотентно.
--
-- Посмотреть статистику — там же, в SQL Editor:
--
--   select * from private.vk_referral_summary;           -- итог
--   select * from private.vk_referral_top limit 20;      -- кто привёл больше всех
--   select date_trunc('day', created_at) as day, count(*) filter (where is_new) as new_players, count(*) as all_arrivals
--     from public.vk_referrals group by 1 order by 1 desc; -- по дням

-- ---------------------------------------------------------------- хранилище

create table if not exists public.vk_referrals (
  invitee_id  text primary key,          -- кто пришёл (из подписи)
  inviter_id  text not null,             -- чья ссылка (из хеша)
  is_new      boolean not null,          -- впервые открыл игру (vk_is_app_user=0)
  vk_ref      text not null default '',  -- откуда открыто: сообщения, стена, …
  vk_platform text not null default '',
  created_at  timestamptz not null default now()
);
alter table public.vk_referrals enable row level security;
revoke all on public.vk_referrals from anon, authenticated;
create index if not exists vk_referrals_inviter_idx on public.vk_referrals (inviter_id);

-- Сколько раз игрок делился ссылкой (успешный ответ VKWebAppShare) — чтобы
-- считать конверсию «поделился → пришли».
create table if not exists public.vk_shares (
  user_id    text primary key,
  shares     integer not null default 0,
  first_at   timestamptz not null default now(),
  last_at    timestamptz not null default now()
);
alter table public.vk_shares enable row level security;
revoke all on public.vk_shares from anon, authenticated;

-- ----------------------------------------------------------------- приход

-- Возвращает {ok, recorded} либо {ok:false, error}. recorded=false — этого
-- игрока уже засчитали раньше (или он пришёл по своей же ссылке).
create or replace function public.record_vk_referral(p_query text, p_inviter text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_uid  text;
  v_rows integer;
begin
  if not private.vk_sign_ok(p_query) then
    return jsonb_build_object('ok', false, 'error', 'bad_sign');
  end if;

  v_uid := private.query_param(p_query, 'vk_user_id');
  if v_uid is null or v_uid !~ '^[0-9]{1,20}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_user');
  end if;
  if p_inviter is null or p_inviter !~ '^[0-9]{1,20}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_inviter');
  end if;
  if p_inviter = v_uid then
    return jsonb_build_object('ok', true, 'recorded', false, 'reason', 'self');
  end if;

  insert into public.vk_referrals (invitee_id, inviter_id, is_new, vk_ref, vk_platform)
  values (
    v_uid,
    p_inviter,
    coalesce(private.query_param(p_query, 'vk_is_app_user'), '1') = '0',
    left(coalesce(private.query_param(p_query, 'vk_ref'), ''), 64),
    left(coalesce(private.query_param(p_query, 'vk_platform'), ''), 32)
  )
  on conflict (invitee_id) do nothing;
  get diagnostics v_rows = row_count;

  return jsonb_build_object('ok', true, 'recorded', v_rows > 0);
end;
$$;

-- ------------------------------------------------------------ «поделился»

create or replace function public.record_vk_share(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_uid text;
  v_prev public.vk_shares%rowtype;
begin
  if not private.vk_sign_ok(p_query) then
    return jsonb_build_object('ok', false, 'error', 'bad_sign');
  end if;
  v_uid := private.query_param(p_query, 'vk_user_id');
  if v_uid is null or v_uid !~ '^[0-9]{1,20}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_user');
  end if;

  select * into v_prev from public.vk_shares where user_id = v_uid;
  -- Чаще раза в 10 секунд не считаем: защита от накрутки счётчика кликами.
  if v_prev.user_id is not null and v_prev.last_at > now() - interval '10 seconds' then
    return jsonb_build_object('ok', true, 'counted', false);
  end if;

  insert into public.vk_shares (user_id, shares) values (v_uid, 1)
  on conflict (user_id) do update
    set shares = public.vk_shares.shares + 1, last_at = now();
  return jsonb_build_object('ok', true, 'counted', true);
end;
$$;

-- ------------------------------------------------------------ отчёты
-- Живут в private: снаружи их не видно, читаются только из SQL Editor.

create or replace view private.vk_referral_summary as
select
  (select count(*) from public.vk_referrals)                     as arrivals,
  (select count(*) from public.vk_referrals where is_new)        as new_players,
  (select count(distinct inviter_id) from public.vk_referrals)   as inviters_with_arrivals,
  (select coalesce(sum(shares), 0) from public.vk_shares)        as shares,
  (select count(*) from public.vk_shares)                        as sharing_players;

create or replace view private.vk_referral_top as
select r.inviter_id,
       count(*)                          as arrivals,
       count(*) filter (where r.is_new)  as new_players,
       coalesce(s.shares, 0)             as shares,
       'https://vk.com/id' || r.inviter_id as profile
from public.vk_referrals r
left join public.vk_shares s on s.user_id = r.inviter_id
group by r.inviter_id, s.shares
order by new_players desc, arrivals desc;

-- -------------------------------------------------------------------- права

revoke all on function public.record_vk_referral(text, text) from public;
revoke all on function public.record_vk_share(text) from public;
grant execute on function public.record_vk_referral(text, text) to anon, authenticated;
grant execute on function public.record_vk_share(text) to anon, authenticated;
