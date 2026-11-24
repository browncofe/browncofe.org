-- 選用的部署後驗收。先在全新的測試專案建立兩個測試帳號。
-- 填入這兩個帳號的 User UID，再將整份貼入 SQL Editor。
-- 使用明日 08:00–10:00 的 A-001、A-002。需為開館日且兩席無預約。
-- 本交易最後 ROLLBACK。發生錯誤時亦請 Rollback，不要把最後一行改成 Commit。
begin;
set local rrtest.reader_a = '填入測試帳號A的UUID';
set local rrtest.reader_b = '填入測試帳號B的UUID';
do $$
declare a uuid:=current_setting('rrtest.reader_a')::uuid; b uuid:=current_setting('rrtest.reader_b')::uuid;
begin
 if a=b or (select count(*) from auth.users where id in (a,b))<>2 then raise exception '請指定兩個不同的既有測試帳號'; end if;
 if has_schema_privilege('authenticated','reading_room','USAGE') or
    has_table_privilege('anon','public.rr_signal','UPDATE') or
    has_function_privilege('anon','public.rr_reserve(text,date,integer,integer,uuid)','EXECUTE') or
    has_function_privilege('anon','public.rr_act(uuid,text)','EXECUTE')
 then raise exception '權限檢查失敗'; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='rr_signal')
 then raise exception '尚未加入 Realtime publication'; end if;
 perform set_config('rrtest.day',((now() at time zone 'Asia/Taipei')::date+1)::text,true);
end $$;
set local role anon;
do $$
declare s jsonb:=public.rr_snapshot(current_setting('rrtest.day')::date,8,10);
begin
 if jsonb_array_length(s->'seats')<>66 or s->>'latest' is not null then raise exception '匿名座位或個資檢查失敗'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('rrtest.reader_a'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('rrtest.reader_a'),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare d date:=current_setting('rrtest.day')::date; k uuid:=gen_random_uuid(); id_a uuid;
begin
 id_a:=public.rr_reserve('A-001',d,8,10,k);
 perform set_config('rrtest.booking',id_a::text,true);
 if public.rr_reserve('A-001',d,8,10,k)<>id_a then raise exception '重送產生了新預約'; end if;
 begin perform public.rr_reserve('A-002',d,9,10,gen_random_uuid()); raise exception '未擋下本人時段重疊';
 exception when raise_exception then if sqlerrm<>'你在這段時間已有預約' then raise; end if; end;
 begin perform public.rr_act(id_a,'checkin'); raise exception '未擋下提前報到';
 exception when raise_exception then if sqlerrm not like '目前的時間或預約狀態%' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('rrtest.reader_b'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('rrtest.reader_b'),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare d date:=current_setting('rrtest.day')::date; id_a uuid:=current_setting('rrtest.booking')::uuid;
begin
 if exists(select 1 from jsonb_array_elements(public.rr_my_bookings('pending',0)) x where x->>'id'=id_a::text)
 then raise exception '讀到了他人的預約'; end if;
 begin perform public.rr_act(id_a,'cancel'); raise exception '可操作他人的預約';
 exception when raise_exception then if sqlerrm<>'找不到可操作的預約' then raise; end if; end;
 begin perform public.rr_reserve('A-001',d,9,10,gen_random_uuid()); raise exception '未擋下同席時段重疊';
 exception when raise_exception then if sqlerrm<>'此座位剛被預約，請另選座位' then raise; end if; end;
end $$;
reset role;
-- 僅在本測試交易中移動剛建立的測試紀錄之報到邊界。
update reading_room.bookings set starts_at=now()-interval '2 minutes',check_by=now()+interval '13 minutes'
 where id=current_setting('rrtest.booking')::uuid;
select set_config('request.jwt.claim.sub',current_setting('rrtest.reader_a'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('rrtest.reader_a'),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare id_a uuid:=current_setting('rrtest.booking')::uuid; d date:=current_setting('rrtest.day')::date; second_id uuid;
begin
 perform public.rr_act(id_a,'checkin');
 perform public.rr_act(id_a,'away');
 perform public.rr_act(id_a,'return');
 perform public.rr_act(id_a,'end');
 second_id:=public.rr_reserve('A-001',d,8,10,gen_random_uuid());
 perform public.rr_act(second_id,'cancel');
 if not exists(select 1 from jsonb_array_elements(public.rr_my_bookings('history',0)) x where x->>'id'=second_id::text and x->>'status'='cancelled')
 then raise exception '取消後未出現在歷史紀錄'; end if;
end $$;
reset role;
rollback;

