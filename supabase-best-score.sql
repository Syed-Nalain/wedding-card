-- Shagun Catch: keep only ONE row per name (its highest score).
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Safe to run again; it only changes what still needs changing.

-- 1. Remove duplicate names. For each name (ignoring capital letters and spaces at the ends),
--    keep the row with the highest score (the earliest one if two scores are equal).
delete from public.game_scores g
using (
  select id,
         row_number() over (
           partition by lower(btrim(name))
           order by score desc, created_at asc, id asc
         ) as rn
  from public.game_scores
) ranked
where g.id = ranked.id
  and ranked.rn > 1;

-- 2. Tidy the names that are left (remove spaces at the ends).
update public.game_scores set name = btrim(name) where name <> btrim(name);

-- 3. There is no time limit any more, so allow higher scores.
alter table public.game_scores drop constraint if exists game_scores_score_check;
alter table public.game_scores add constraint game_scores_score_check check (score between 0 and 1000000);

-- 4. From now on the database itself refuses a second row with the same name.
create unique index if not exists game_scores_name_unique on public.game_scores (lower(btrim(name)));

-- 5. One function the game calls to save a score:
--    a new name is added; an existing name is only updated when the new score is higher
--    (the team is updated to the team used for that higher score).
create or replace function public.submit_score(p_name text, p_team text, p_score int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := btrim(p_name);
begin
  if clean_name = '' or char_length(clean_name) > 24 then
    raise exception 'invalid name';
  end if;
  if p_team not in ('Team Rida', 'Team Awais Mahad', 'Team Urwah') then
    raise exception 'invalid team';
  end if;
  if p_score < 0 or p_score > 1000000 then
    raise exception 'invalid score';
  end if;

  insert into public.game_scores (name, team, score)
  values (clean_name, p_team, p_score)
  on conflict ((lower(btrim(name)))) do update
    set score = excluded.score,
        team = excluded.team,
        name = excluded.name,
        created_at = now()
    where excluded.score > public.game_scores.score;
end;
$$;

-- 6. Guests may read scores and call submit_score, but can no longer insert rows directly.
revoke insert on public.game_scores from anon;
drop policy if exists "anyone can add a score" on public.game_scores;
revoke all on function public.submit_score(text, text, int) from public;
grant execute on function public.submit_score(text, text, int) to anon;

-- Check: every name should now appear only once.
select name, team, score from public.game_scores order by score desc limit 20;
