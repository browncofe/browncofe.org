-- 北科大圖書館座位預約。以專案擁有者身分在 Supabase SQL Editor 執行。
begin;
create schema if not exists reading_room;
revoke all on schema reading_room from public, anon, authenticated;
create table if not exists reading_room.zones (
  id text primary key, title text not null, floor text not null, description text not null,
  maintenance boolean not null default false
);
create table if not exists reading_room.seats (
  id text primary key, zone text not null references reading_room.zones(id),
  row_no integer not null, col_no integer not null, power boolean not null,
  window_seat boolean not null, maintenance boolean not null default false,
  unique(zone,row_no,col_no)
);
create table if not exists reading_room.rules (
  id integer primary key check(id=1), grace integer not null check(grace between 1 and 60),
  away integer not null check(away between 1 and 180)
);
create table if not exists reading_room.closures (day date primary key, reason text not null);
insert into reading_room.rules values (1,15,30) on conflict do nothing;
insert into reading_room.zones values
 ('A','安靜閱讀','B1 自習室西側','全區靜音，北側採光。部分座位備有插座。',false),
 ('B','筆電使用','B1 自習室東側','全席配備插座，可使用筆電與滑鼠。北側與東側靠窗。',false),
 ('C','靠窗閱讀','2F 閱覽長廊','自然採光的閱讀長桌，適合輕聲自習。',true)
on conflict do nothing;
insert into reading_room.seats(id,zone,row_no,col_no,power,window_seat)
select z.id||'-'||lpad(n::text,3,'0'), z.id,(n-1)/6+1,(n-1)%6+1,
 case z.id when 'A' then n not in (2,5,10,13,18,21) when 'B' then true else n<=6 or n%2=1 end,
 case z.id when 'C' then n<=12 when 'B' then n<=6 or n%6=0 else n<=6 end
from reading_room.zones z cross join lateral generate_series(1,case z.id when 'C' then 18 else 24 end) n
where z.id in ('A','B','C') on conflict do nothing;

create table if not exists reading_room.bookings (
 id uuid primary key default gen_random_uuid(), reader_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, seat text not null references reading_room.seats(id), day date not null,
 start_hour integer not null check(start_hour between 8 and 21),
 end_hour integer not null check(end_hour between 9 and 22 and end_hour>start_hour),
 starts_at timestamptz not null, ends_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','in_use','temp_away','cancelled','completed','expired')),
 check_by timestamptz not null, away_minutes integer not null,
 created_at timestamptz not null default now(), checked_at timestamptz, return_by timestamptz, ended_at timestamptz,
 unique(reader_id, request_id)
);
create index if not exists rr_day_seat on reading_room.bookings(day,seat);
create index if not exists rr_reader_created on reading_room.bookings(reader_id,created_at desc);
-- 每個整點只能分配給一位讀者；同一讀者每個整點也只能持有一席。
create table if not exists reading_room.hours (
 booking_id uuid not null references reading_room.bookings(id) on delete cascade,
 seat text not null, reader_id uuid not null, day date not null, hour integer not null,
 primary key(seat,day,hour), unique(reader_id,day,hour)
);
create index if not exists rr_hours_booking on reading_room.hours(booking_id);

create table if not exists public.rr_signal (
 id integer primary key check(id=1), revision bigint not null default 0
);
insert into public.rr_signal(id) values(1) on conflict do nothing;
alter table public.rr_signal enable row level security;
revoke all on public.rr_signal from public,anon,authenticated;
grant select on public.rr_signal to anon,authenticated;
drop policy if exists rr_signal_read on public.rr_signal;
create policy rr_signal_read on public.rr_signal for select to anon,authenticated using(true);

create or replace function reading_room.touch_signal() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update public.rr_signal set revision=revision+1 where id=1;
 return null;
end $$;
do $$
declare t text;
begin
 foreach t in array array['zones','seats','rules','closures','bookings','hours'] loop
  execute format('alter table reading_room.%I enable row level security',t);
  if t<>'hours' then
   execute format('drop trigger if exists rr_changed on reading_room.%I',t);
   execute format('create trigger rr_changed after insert or update or delete on reading_room.%I for each row execute function reading_room.touch_signal()',t);
  end if;
 end loop;
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
  create publication supabase_realtime;
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='rr_signal') then
  alter publication supabase_realtime add table public.rr_signal;
 end if;
end $$;

create or replace function reading_room.effective(b reading_room.bookings, at_time timestamptz)
returns text language sql immutable set search_path='' as $$
 select case
 when b.status='pending' and at_time>=b.check_by then 'expired'
 when b.status='temp_away' and b.return_by<b.ends_at and at_time>=b.return_by then 'expired'
 when b.status in ('in_use','temp_away') and at_time>=b.ends_at then 'completed'
 else b.status end
$$;
create or replace function reading_room.receipt(b reading_room.bookings, at_time timestamptz)
returns jsonb language sql immutable set search_path='' as $$
 select (to_jsonb(b)-'reader_id'-'request_id') || jsonb_build_object('status',reading_room.effective(b,at_time))
$$;

-- 即使整晚沒有人開網頁，查詢仍立即顯示有效狀態。
-- 下次預約或操作時才將到期結果寫回歷史並回收整點索引。
create or replace function reading_room.settle(at_time timestamptz)
returns void language sql volatile set search_path='' as $$
 with settled as (
  update reading_room.bookings b set
    status=reading_room.effective(b,at_time),
    ended_at=case when b.status='pending' then b.check_by
                  when b.status='temp_away' then least(b.return_by,b.ends_at)
                  else b.ends_at end
  where b.status in ('pending','in_use','temp_away')
    and reading_room.effective(b,at_time) in ('expired','completed')
  returning b.id
 ) delete from reading_room.hours h using settled where h.booking_id=settled.id
$$;

create or replace function public.rr_snapshot(p_day date,p_start integer,p_end integer)
returns jsonb language sql stable security definer set search_path='' as $$
 with clock as (select now() as t,(now() at time zone 'Asia/Taipei')::date as today),
 live as (
  select b.*,reading_room.effective(b,c.t) as state from reading_room.bookings b,clock c
  where b.day in (p_day,c.today) and b.status in ('pending','in_use','temp_away')
 ), active as (select * from live where state in ('pending','in_use','temp_away')),
 mine as (select b from reading_room.bookings b where b.reader_id=(select auth.uid()))
 select jsonb_build_object(
  'now',c.t,'today',c.today,'last_day',(date_trunc('month',c.today::timestamp)+interval '2 months - 1 day')::date,
  'rules',(select to_jsonb(r)-'id' from reading_room.rules r where id=1),
  'closures',coalesce((select jsonb_object_agg(day::text,reason) from reading_room.closures
     where day between c.today and (date_trunc('month',c.today::timestamp)+interval '2 months - 1 day')::date),'{}'),
  'zones',(select jsonb_agg(to_jsonb(z) order by id) from reading_room.zones z),
  'seats',(select jsonb_agg(to_jsonb(s)||jsonb_build_object(
     'busy',exists(select 1 from active a where a.seat=s.id and a.day=p_day and a.start_hour<p_end and a.end_hour>p_start),
     'busy_now',exists(select 1 from active a where a.seat=s.id and a.starts_at<=c.t and a.ends_at>c.t)
    ) order by s.zone,s.row_no,s.col_no) from reading_room.seats s),
  'conflict',exists(select 1 from active a where a.reader_id=(select auth.uid()) and a.day=p_day and a.start_hour<p_end and a.end_hour>p_start),
  'latest',(select reading_room.receipt(m.b,c.t) from mine m order by (m.b).created_at desc limit 1),
  'counts',(select jsonb_build_object('pending',count(*) filter(where st='pending'),
   'active',count(*) filter(where st in ('in_use','temp_away')),
   'history',count(*) filter(where st in ('expired','completed','cancelled')))
   from (select reading_room.effective(m.b,c.t) st from mine m) x)
 ) from clock c
$$;

create or replace function public.rr_my_bookings(p_tab text,p_offset integer)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(items.item order by items.created_at desc,items.id),'[]') from (
 select reading_room.receipt(b,now()) as item,b.created_at,b.id from reading_room.bookings b
 where b.reader_id=(select auth.uid()) and case p_tab
 when 'pending' then reading_room.effective(b,now())='pending'
 when 'active' then reading_room.effective(b,now()) in ('in_use','temp_away')
 when 'history' then reading_room.effective(b,now()) in ('cancelled','completed','expired')
 else false end
 order by b.created_at desc,b.id limit 11 offset greatest(0,p_offset)) items
$$;

create or replace function public.rr_reserve(p_seat text,p_day date,p_start integer,p_end integer,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 reader uuid:=auth.uid(); t timestamptz; today date; start_time timestamptz; end_time timestamptz;
 cfg reading_room.rules; reservation reading_room.bookings; locked_zone text;
begin
 if reader is null then raise exception '請先登入'; end if;
 -- 小型閱覽室共用寫入鎖，依序判斷到期與重試；整點唯一鍵另外保障併發。
 perform pg_advisory_xact_lock(178821,6601);
 t:=clock_timestamp(); today:=(t at time zone 'Asia/Taipei')::date;
 select * into reservation from reading_room.bookings where reader_id=reader and request_id=p_request;
 if found then
  if row(reservation.seat,reservation.day,reservation.start_hour,reservation.end_hour)
   is distinct from row(p_seat,p_day,p_start,p_end) then raise exception '請重新確認預約內容'; end if;
  return reservation.id;
 end if;
 if p_request is null or p_day is null or p_start is null or p_end is null or
    p_start<8 or p_end>22 or p_start>=p_end or p_day<today or
    p_day>(date_trunc('month',today::timestamp)+interval '2 months - 1 day')::date then raise exception '日期或時段不在開放範圍'; end if;
 start_time:=(p_day+make_time(p_start,0,0)) at time zone 'Asia/Taipei';
 end_time:=(p_day+make_time(p_end,0,0)) at time zone 'Asia/Taipei';
 if start_time<=t then raise exception '開始時間已過，請重新選擇'; end if;
 if exists(select 1 from reading_room.closures where day=p_day) then raise exception '所選日期休館'; end if;
 select z.id into locked_zone from reading_room.seats s join reading_room.zones z on z.id=s.zone
 where s.id=p_seat and not s.maintenance and not z.maintenance for share of s,z;
 if not found then raise exception '座位目前未開放'; end if;
 perform reading_room.settle(t);
 if exists(select 1 from reading_room.hours where day=p_day and hour>=p_start and hour<p_end and reader_id=reader)
 then raise exception '你在這段時間已有預約'; end if;
 if exists(select 1 from reading_room.hours where day=p_day and hour>=p_start and hour<p_end and seat=p_seat)
 then raise exception '此座位剛被預約，請另選座位'; end if;
 select * into strict cfg from reading_room.rules where id=1;
 insert into reading_room.bookings(reader_id,request_id,seat,day,start_hour,end_hour,starts_at,ends_at,check_by,away_minutes)
 values(reader,p_request,p_seat,p_day,p_start,p_end,start_time,end_time,least(end_time,start_time+make_interval(mins=>cfg.grace)),cfg.away)
 returning * into reservation;
 insert into reading_room.hours select reservation.id,p_seat,reader,p_day,h from generate_series(p_start,p_end-1) h;
 return reservation.id;
end $$;

create or replace function public.rr_act(p_id uuid,p_action text)
returns text language plpgsql security definer set search_path='' as $$
declare b reading_room.bookings; t timestamptz; st text;
begin
 if auth.uid() is null then raise exception '請先登入'; end if;
 perform pg_advisory_xact_lock(178821,6601);
 t:=clock_timestamp();
 perform reading_room.settle(t);
 select * into b from reading_room.bookings where id=p_id and reader_id=auth.uid() for update;
 if not found then raise exception '找不到可操作的預約'; end if;
 t:=clock_timestamp(); st:=reading_room.effective(b,t);
 if p_action='checkin' and st='pending' and t>=b.starts_at then
  update reading_room.bookings set status='in_use',checked_at=t where id=b.id;
 elsif p_action='away' and st='in_use' then
  update reading_room.bookings set status='temp_away',return_by=least(b.ends_at,t+make_interval(mins=>b.away_minutes)) where id=b.id;
 elsif p_action='return' and st='temp_away' then
  update reading_room.bookings set status='in_use',return_by=null where id=b.id;
 elsif (p_action='cancel' and st='pending') or (p_action='end' and st in ('in_use','temp_away')) then
  update reading_room.bookings set status=case p_action when 'end' then 'completed' else 'cancelled' end,ended_at=t,return_by=null where id=b.id;
  delete from reading_room.hours where booking_id=b.id;
 else raise exception '目前的時間或預約狀態不允許此操作，請重新整理'; end if;
 return p_action;
end $$;

revoke all on all tables in schema reading_room from public,anon,authenticated;
revoke all on all functions in schema reading_room from public,anon,authenticated;
revoke all on function public.rr_snapshot(date,integer,integer), public.rr_my_bookings(text,integer),
 public.rr_reserve(text,date,integer,integer,uuid), public.rr_act(uuid,text) from public,anon,authenticated;
grant execute on function public.rr_snapshot(date,integer,integer) to anon,authenticated;
grant execute on function public.rr_my_bookings(text,integer),public.rr_reserve(text,date,integer,integer,uuid),
 public.rr_act(uuid,text) to authenticated;
notify pgrst, 'reload schema';
commit;

