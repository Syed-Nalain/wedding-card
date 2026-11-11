# With Love — Wedding Celebrations

A small responsive invitation website for two weddings in the Moien family: a desi-themed home page plus four individually themed event pages.

- **Home (`index.html`):** a Pakistani shadi theme with a marigold toran, fairy lights, falling petals, a truck-art border and an illustrated dhol with baja-band trumpets. The **Play the dhol & baja** button plays a bhangra-style dhol beat and a short brass riff. The sound is generated live in the browser with the Web Audio API, so there are no audio files. It also has a countdown to the next event (Pakistan time) and four event cards above the footer that link to each invitation.
- **Shagun Catch (`game.html`):** an endless game opened from the **Play game** button below the home page's top section. Guests enter a name and pick Team Rida, Team Awais Mahad or Team Urwah, with no login. They catch mithai, marigolds and shagun envelopes on a thaal and dodge green mirchi. Missing any good item ends the game. For the first 45 seconds it plays at the original pace. After that it gets very fast and suddenly speeds up or slows down without warning, so rounds rarely last past 2 minutes. Each name appears once on the scoreboard, with its best score. When the game ends, a scoreboard appears. The team of the player at the top of the scoreboard is shown as the winning team.
- **Mehndi (`mehndi.html`):** both brothers, Monday, 21 December 2026 at 7:00 PM, Gulshan-e-Naseem, 30-B, Raza Town, Faisalabad.
- **Barat — Awais & Rida (`barat.html`):** Tuesday, 22 December 2026. Breakfast is at 9:00 AM; the Barat departs at 10:00 AM sharp from Gulshan-e-Naseem, with arrival at The Memories Event Complex, Wazirabad at 1:00 PM.
- **Barat — Mahad & Urwah (`barat-mahad.html`):** Wednesday, 23 December 2026 at 6:00 PM, White Rose Marquee.
- **Waleema (`waleema.html`):** both couples, Friday, 25 December 2026 at 2:00 PM sharp for lunch, White Orchard Event Complex, Faisalabad.

## Run on localhost

1. Open a terminal in this `wedding-card` folder.
2. Run `python -m http.server 8000` (or `py -m http.server 8000` on Windows).
3. Visit [http://localhost:8000](http://localhost:8000) and use the top navigation or the event cards to move between pages.
4. Stop the server with Ctrl+C when finished.

## Files

- `index.html`, `home.css`, `home.js` — the home page.
- `mehndi.html`, `barat.html`, `barat-mahad.html`, `waleema.html` — event pages. All four use the same template; `script.js` fills in each event's details.
- `game.html`, `game.css`, `game.js`, `game-config.js` — the Shagun Catch game and its scoreboard settings.
- `styles.css` — shared styles and the per-event colour themes.
- `assets/*.webp` — full-size illustrations for the event pages.
- `assets/thumbs/*.webp` — smaller copies used on the home page cards.
- `assets/originals-png/` — the original PNG artwork (about 12.5 MB). The site no longer uses it, so you can leave it out when you upload the site.

## Shared scoreboard

By default each phone keeps its own scoreboard, so guests only see scores played on their own phone. For one scoreboard that every guest shares, connect a free [Supabase](https://supabase.com) project:

1. Create a Supabase project. Open **SQL Editor** and run:

   ```sql
   create table public.game_scores (
     id bigint generated always as identity primary key,
     name text not null check (char_length(name) between 1 and 24),
     team text not null check (team in ('Team Rida', 'Team Awais Mahad', 'Team Urwah')),
     score int not null check (score between 0 and 5000),
     created_at timestamptz not null default now()
   );
   alter table public.game_scores enable row level security;
   create policy "anyone can read scores" on public.game_scores for select using (true);
   create policy "anyone can add a score" on public.game_scores for insert with check (true);
   ```

2. In **Project Settings → API**, copy the project URL and the public `anon` key into `game-config.js`.

Then also run `supabase-best-score.sql`, which keeps only each name's best score (see DEPLOY.md, step 1.3b).

Guests can add scores but cannot edit or delete them. To clear the scoreboard, delete rows in Supabase's Table Editor.

## Personalize

- **Event pages:** the details and page descriptions are in `script.js`. Names, date, time and venue can still be clicked and edited on the page. Edits are saved only in that browser on that device.
- **Home page:** event details on the cards are written directly in `index.html`. Countdown times are in `home.js`. If you change a date or venue, update `script.js`, `index.html` and `home.js`.
