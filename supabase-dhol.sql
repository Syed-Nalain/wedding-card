-- Dhol Beat: its own scoreboard table (separate from Shagun Catch).
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Same rules as Shagun Catch: one row per name (its best score), guests can read and submit only.

create table if not exists public.dhol_scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 24),
  team text not null check (team in ('Team Rida', 'Team Awais Mahad', 'Team Urwah')),
  score int not null check (score between 0 and 20000),
  created_at timestamptz not null default now()
);

create unique index if not exists dhol_scores_name_unique on public.dhol_scores (lower(btrim(name)));

alter table public.dhol_scores enable row level security;
drop policy if exists "anyone can read dhol scores" on public.dhol_scores;
create policy "anyone can read dhol scores" on public.dhol_scores for select using (true);
grant select on public.dhol_scores to anon;

-- The game saves through this function: a new name is added,
-- an existing name is only updated when the new score is higher.
create or replace function public.submit_dhol_score(p_name text, p_team text, p_score int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := btrim(p_name);
begin
  if clean_name = '' or char_length(clean_name) > 24 then raise exception 'invalid name'; end if;
  if p_team not in ('Team Rida', 'Team Awais Mahad', 'Team Urwah') then raise exception 'invalid team'; end if;
  if p_score < 0 or p_score > 20000 then raise exception 'invalid score'; end if;

  insert into public.dhol_scores (name, team, score)
  values (clean_name, p_team, p_score)
  on conflict ((lower(btrim(name)))) do update
    set score = excluded.score, team = excluded.team, name = excluded.name, created_at = now()
    where excluded.score > public.dhol_scores.score;
end;
$$;

revoke all on function public.submit_dhol_score(text, text, int) from public;
grant execute on function public.submit_dhol_score(text, text, int) to anon;

-- Check: should return an empty table the first time.
select name, team, score from public.dhol_scores order by score desc limit 20;
