-- save_cosmetics — сохранение косметики игрока на сервер.
--
-- Зачем. После анти-чит-перевода экономики на SECURITY DEFINER функции с
-- таблицы user_stats сняли права на запись целиком. Клиент писал косметику
-- напрямую (upsert из useRemoteSync) и получал 42501 "permission denied for
-- table user_stats" — выбранный фон, стиль клеток и тема не доезжали до
-- сервера и терялись на новом устройстве или после очистки localStorage.
--
-- Функция трогает ровно три колонки. Экономику (монеты, энергию, инвентарь,
-- достижения, бусты, Слово дня) она не видит — расширить её случайно нельзя.
--
-- Владение фоном здесь не проверяется: подделать можно только внешний вид, а
-- не баланс. Единственная зацепка — достижение «сменил фон»: если
-- recompute_achievements смотрит на active_background, а не на inventory,
-- стоит переключить его на inventory.
--
-- Как применить: Supabase → SQL Editor → вставить и выполнить. Идемпотентно,
-- можно запускать повторно.

create or replace function public.save_cosmetics(
  p_active_background text default null,
  p_active_cell_style text default null,
  p_prefs jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  insert into public.user_stats as u (user_id, active_background, active_cell_style, prefs)
  values (v_uid, p_active_background, p_active_cell_style, p_prefs)
  on conflict (user_id) do update
     set active_background = excluded.active_background,
         active_cell_style = excluded.active_cell_style,
         -- prefs целиком клиент-авторитетны, но null означает «клиент не
         -- прислал», а не «очисти» — иначе сорванный вызов стёр бы тему и
         -- коллекцию подарков.
         prefs             = coalesce(excluded.prefs, u.prefs)
   where u.user_id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'active_background', p_active_background,
    'active_cell_style', p_active_cell_style
  );
end;
$$;

-- Вызывать может только вошедший игрок (анонимный вход Supabase тоже даёт
-- роль authenticated). Роли anon без JWT здесь делать нечего: auth.uid() пуст.
revoke all on function public.save_cosmetics(text, text, jsonb) from public;
grant execute on function public.save_cosmetics(text, text, jsonb) to authenticated;
