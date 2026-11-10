# Deploying the wedding website (Supabase + Vercel, free)

This guide puts the wedding website online for free:

- **Vercel** hosts the website. Guests open a link like `https://awais-mahad-wedding.vercel.app`.
- **Supabase** stores the Shagun Catch scores, so every guest sees **one shared scoreboard** and the same winning team.

Time needed: about 30–45 minutes. Neither service asks for a credit card on the free plan.

> Supabase and Vercel sometimes rename buttons and menus. If a label below doesn't match exactly, look for the closest one. The steps stay the same.

---

## What's already prepared in the project folder

| File | What it does |
|---|---|
| `game-config.js` | Where you paste your Supabase address and public key (Part 1). |
| `vercel.json` | Tells Vercel to run a daily "keep awake" check on Supabase. |
| `api/keepalive.js` | That daily check. It reads one score so the free Supabase project doesn't go to sleep. |
| `.vercelignore` | Keeps the old PNG images (13 MB) and the guides out of the upload. |

---

## Part 1 — Supabase (shared scoreboard)

### 1.1 Create an account
1. Go to **https://supabase.com** and click **Start your project**.
2. Sign up with GitHub or with your email.

### 1.2 Create a project
1. Click **New project**.
2. Fill in:
   - **Name:** `wedding-scoreboard`
   - **Database password:** click **Generate a password** and save it somewhere safe. You won't need it for this guide, but keep it.
   - **Region:** pick the one closest to Pakistan, for example **South Asia (Mumbai)**.
   - **Plan:** Free.
3. Click **Create new project** and wait 1–2 minutes until it finishes setting up.

### 1.3 Create the scores table
1. In the left menu, open **SQL Editor** and click **New query**.
2. Paste all of this and click **Run**:

```sql
create table public.game_scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 24),
  team text not null check (team in ('Team Rida', 'Team Awais Mahad', 'Team Urwah')),
  score int not null check (score between 0 and 5000),
  created_at timestamptz not null default now()
);

alter table public.game_scores enable row level security;

create policy "anyone can read scores"
  on public.game_scores for select using (true);

create policy "anyone can add a score"
  on public.game_scores for insert with check (true);

grant select, insert on public.game_scores to anon;
```

3. You should see **Success. No rows returned**.
4. Open **Table Editor** in the left menu. A table called **game_scores** should be listed.

What this does: guests can **add** a score and **see** scores, but they can't edit or delete anyone's score. Only you can, from the Supabase dashboard.

### 1.4 Copy your project address and public key
1. Open **Project Settings** (the gear icon), then **API Keys**. You can also click the **Connect** button at the top of the project.
2. Copy two values:
   - **Project URL**, which looks like `https://abcdefghijk.supabase.co`. It's often shown under **Data API**.
   - **Publishable key**, which starts with `sb_publishable_...`. If your project only shows the older keys, use the **anon public** key, which starts with `eyJ...`. Both work.

> ⚠️ Never use the **secret** key or the **service_role** key. They give full control of your database and must never be put on a website.

### 1.5 Paste them into the website
Open `game-config.js` in the project folder and fill in both values:

```js
window.GAME_CONFIG = {
  supabaseUrl: 'https://abcdefghijk.supabase.co',
  supabaseAnonKey: 'sb_publishable_xxxxxxxxxxxxxxxx'
};
```

Use only the main address ending in `.supabase.co`. If you paste a longer one ending in `/rest/v1/`, the site still works, because it removes that part automatically.

Save the file.

### 1.6 Test it on your computer (optional but recommended)
1. Open a terminal in the `wedding-card` folder and run:
   ```
   py -m http.server 8000
   ```
2. Open http://localhost:8000/game.html and press **Ctrl + F5**. Browsers keep old copies of files, and Ctrl + F5 loads the newest ones. Do this every time you change a file. Then play one round.
3. In Supabase, open **Table Editor → game_scores**. Your score should be there.
4. On the game-over screen, the small grey line under the scoreboard should **no longer** say "Scores played on this phone". That means it's using the shared scoreboard.

---

## Part 2 — Vercel (the website)

Choose **one** way to upload: Option A uses only websites, Option B uses the command line.

### Option A — Upload through GitHub (no coding tools needed)

**A1. Put the files on GitHub**
1. Create a free account at **https://github.com**.
2. Click **+** (top right) → **New repository**.
   - **Name:** `wedding-card`
   - **Private** is fine. Vercel can still use it.
   - Click **Create repository**.
3. On the new repository page, click **uploading an existing file**.
4. Open the `wedding-card` folder in File Explorer. Press **Ctrl + A** to select everything inside it, including the `assets` and `api` folders, and drag it all onto the GitHub page. GitHub keeps the folder layout. The old PNG files can come along: `.vercelignore` stops Vercel from publishing them.
5. Click **Commit changes**.

**A2. Connect GitHub to Vercel**
1. Go to **https://vercel.com/signup**, choose **Hobby**, and **Continue with GitHub**.
2. Click **Add New… → Project**.
3. Find `wedding-card` in the list and click **Import**. If it isn't listed, click **Adjust GitHub App Permissions** and allow access to the repository.
4. On the settings screen:
   - **Framework Preset:** `Other`
   - **Root Directory:** leave as `./`
   - **Build Command:** leave empty or off
   - **Output Directory:** leave the default
5. Click **Deploy**. After about 30 seconds you get a link like `https://wedding-card-xxxx.vercel.app`.

From now on, every time you upload changed files to GitHub, Vercel updates the website automatically.

### Option B — Upload with the Vercel command line

Node.js is already installed on this computer, so this works straight away.

1. Open a terminal in the `wedding-card` folder.
2. Log in. A browser window opens. Sign up or log in with the **Hobby** plan.
   ```
   npx vercel login
   ```
3. Create the project and a preview link:
   ```
   npx vercel
   ```
   Answer the questions:
   - *Set up and deploy?* → **Y**
   - *Which scope?* → your personal account
   - *Link to existing project?* → **N**
   - *Project name?* → `awais-mahad-wedding`, or any name you like
   - *In which directory is your code located?* → `./`
   - If it asks about build settings or the framework → choose **Other** and **don't** change anything.
4. Publish to the real link:
   ```
   npx vercel --prod
   ```
   The terminal prints your live address, for example `https://awais-mahad-wedding.vercel.app`.

To update the site later, edit the files and run `npx vercel --prod` again.

### Choose a nicer web address
In Vercel, open your project → **Settings → Domains**. Edit the `.vercel.app` address to something like `awais-mahad-wedding.vercel.app`, if the name is free. A custom domain such as `awaismahad.com` also works, but you'd have to buy it separately.

---

## Part 3 — Keep Supabase awake (recommended)

Free Supabase projects **pause after about a week with no visits**. When paused, scores don't save until you restore the project by hand. The daily check in `vercel.json` prevents that, but it needs your Supabase details:

1. In Vercel, open your project → **Settings → Environment Variables**.
2. Add two variables, ticking **Production**:
   - `SUPABASE_URL` → your Project URL, e.g. `https://abcdefghijk.supabase.co`
   - `SUPABASE_KEY` → the same publishable or anon key you put in `game-config.js`
3. Go to **Deployments**, open the menu (**⋯**) on the latest deployment and click **Redeploy**. Environment variables only apply after a new deployment.
4. Check it: open `https://YOUR-SITE.vercel.app/api/keepalive` in a browser. You should see `{"ok":true,"status":200}`.
5. Under **Settings → Cron Jobs**, you should see `/api/keepalive` running once a day.

If the project paused anyway, open it in Supabase and click **Restore project**.

---

## Part 4 — Check the live website

Open your live link on your phone **and** on a second phone. Check that:

- [ ] The home page shows the toran, dhol and countdown, and **Play the dhol & baja** plays music.
- [ ] All 4 event cards open the right event page, and every picture loads.
- [ ] The top menu works on every page.
- [ ] **Play Game** → enter a name → pick a team → the game starts.
- [ ] After playing on **both** phones, both show the **same scoreboard**.
- [ ] The home page shows **Winning team:** with the top player's team.
- [ ] Tapping the phone numbers in the footer and the invitation card opens the dialler.
- [ ] It works on mobile data (Jazz, Zong, Telenor, Ufone) as well as Wi-Fi.

---

## Part 5 — Before you send the link to guests

1. **Clear your test scores.** In Supabase, open **SQL Editor** and run:
   ```sql
   delete from public.game_scores;
   ```
2. Open the site once more and check the home page says **Winning team: Not decided yet**.
3. Share the link on WhatsApp. For printed cards, you can make a QR code of the link with any free QR generator.

---

## Updating the website later

| What you want to change | Where |
|---|---|
| Event names, dates, times, venues on the event pages | `script.js` |
| Event cards on the home page | `index.html` (the `ev-card` blocks) |
| Countdown dates | `home.js` (the `milestones` list) |
| Game length or points | `game.js` (`GAME_SECONDS` and `KINDS` at the top) |

After editing, upload the changed files to GitHub (Option A) or run `npx vercel --prod` (Option B). Guests may need to refresh once to see the change.

---

## Troubleshooting

| Problem | What to do |
|---|---|
| Scoreboard says **"Could not reach the shared scoreboard"** | Check the URL and key in `game-config.js`, with no spaces or missing quotes. Make sure the Supabase project isn't paused, and that the SQL in step 1.3 ran without errors. |
| Scoreboard still says **"Scores played on this phone"** on the live site | `game-config.js` on Vercel still has empty values. Upload the filled-in file again and redeploy. |
| Scores save but other phones don't see them | Hard-refresh the page (pull down to refresh on phones). Check **Table Editor** to see whether rows are arriving. |
| `/api/keepalive` shows `"skipped"` | The environment variables are missing. Repeat Part 3, including the **Redeploy** step. |
| A picture is missing on the live site | The `assets` folder layout on GitHub must be `assets/name.webp` and `assets/thumbs/name.webp`. |
| You see an old version of a page | Hard refresh: Ctrl + F5 on a computer, or close and reopen the tab on a phone. |
| Supabase says the project is paused | Open the project in Supabase and click **Restore project**, then set up Part 3. |

---

## Good to know

- **Cost:** both services are free at this size. A wedding with a few hundred guests is far below the free limits.
- **The public key is meant to be public.** The Supabase publishable or anon key is designed to sit in website code. The table rules from step 1.3 only let guests read and add scores. Never put the **secret** or **service_role** key in any file.
- **Cheating:** a technically skilled guest could send a fake score straight to Supabase, up to the 5000 limit. You can delete any suspicious row in **Table Editor**.
- **Vercel's free plan is for personal, non-commercial use.** A family wedding site fits that. However, the footer line *"For orders of wedding website contact: 03260142469"* advertises a business, which Vercel may treat as commercial use. If you plan to use this site to promote paid work, consider Vercel's paid plan, or a free host that allows commercial sites, such as **Cloudflare Pages**. The Supabase part stays exactly the same.
