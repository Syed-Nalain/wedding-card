// Shared scoreboard helper for the wedding games (used by Khana Khul Gaya!, the games page and the home page).
// Each game has its own Supabase table and save function, so the scoreboards stay separate.
// Without Supabase settings in game-config.js, scores are kept on this phone only.
window.WeddingScores = (() => {
  const cfg = window.GAME_CONFIG || {};
  const remote = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const base = remote ? cfg.supabaseUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '') : '';
  const api = path => `${base}/rest/v1/${path}`;
  const headers = () => ({ apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json',
    ...(String(cfg.supabaseAnonKey || '').startsWith('eyJ') ? { Authorization: `Bearer ${cfg.supabaseAnonKey}` } : {}) });

  const TEAM_CLASS = { 'Team Rida': 'team-rida', 'Team Awais Mahad': 'team-awais-mahad', 'Team Urwah': 'team-urwah' };
  const GAMES = {
    shagun: { title: 'Shagun Catch', table: 'game_scores', rpc: 'submit_score', localKey: 'shagun-catch-scores-v1', page: 'game.html' },
    khana:  { title: 'Khana Khul Gaya!', table: 'khana_scores', rpc: 'submit_khana_score', localKey: 'khana-khul-gaya-scores-v1', page: 'khana.html' }
  };

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  };
  const nameKey = n => String(n).trim().toLowerCase();
  const bestPerName = rows => { const seen = new Set(); return rows.filter(r => { const k = nameKey(r.name); if (seen.has(k)) return false; seen.add(k); return true; }); };
  const sortScores = rows => rows.sort((a, b) => b.score - a.score || a.at - b.at);

  function board(gameId) {
    const g = GAMES[gameId];
    return {
      shared: remote,
      async add(entry) {
        const local = store.get(g.localKey, []);
        local.push(entry);
        store.set(g.localKey, bestPerName(sortScores(local)).slice(0, 100));
        if (!remote) return;
        let res = await fetch(api(`rpc/${g.rpc}`), { method: 'POST', headers: headers(),
          body: JSON.stringify({ p_name: entry.name, p_team: entry.team, p_score: entry.score }) });
        if (res.status === 404) {
          res = await fetch(api(g.table), { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' },
            body: JSON.stringify({ name: entry.name, team: entry.team, score: entry.score }) });
        }
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
      },
      async top(limit = 15) {
        if (remote) {
          const res = await fetch(api(`${g.table}?select=name,team,score,created_at&order=score.desc,created_at.asc&limit=1000`), { headers: headers() });
          if (!res.ok) throw new Error(`Load failed (${res.status})`);
          const rows = (await res.json()).map(r => ({ name: r.name, team: r.team, score: r.score, at: Date.parse(r.created_at) }));
          return bestPerName(rows).slice(0, limit);
        }
        return bestPerName(sortScores(store.get(g.localKey, []))).slice(0, limit);
      },
      localTop(limit = 15) { return bestPerName(sortScores(store.get(g.localKey, []))).slice(0, limit); }
    };
  }

  // Fills an <ol class="board"> with rows (same look as the Shagun Catch scoreboard).
  function renderRows(listEl, rows, highlightName) {
    listEl.innerHTML = '';
    if (!rows.length) { listEl.innerHTML = '<li class="board-empty">No scores yet. Be the first!</li>'; return 0; }
    let myRank = 0;
    rows.forEach((r, i) => {
      const li = document.createElement('li');
      if (highlightName && !myRank && nameKey(r.name) === nameKey(highlightName)) { myRank = i + 1; li.className = 'me'; }
      const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = i === 0 ? '👑' : i + 1;
      const who = document.createElement('span'); who.className = 'who';
      const nm = document.createElement('strong'); nm.textContent = r.name;
      const chip = document.createElement('span'); chip.className = `chip ${TEAM_CLASS[r.team] || ''}`; chip.textContent = r.team;
      who.append(nm, chip);
      const pts = document.createElement('span'); pts.className = 'pts'; pts.textContent = r.score;
      li.append(rank, who, pts); listEl.appendChild(li);
    });
    return myRank;
  }

  // Team score = total of the team's top 10 best scores (one best score per name).
  const TEAM_TOP = 10;
  function teamStandings(rows) {
    return Object.keys(TEAM_CLASS).map(team => {
      const players = rows.filter(r => r.team === team).sort((a, b) => b.score - a.score || a.at - b.at);
      const top = players.slice(0, TEAM_TOP);
      return { team, total: top.reduce((sum, r) => sum + r.score, 0), players: players.length, top };
    }).sort((a, b) => b.total - a.total);
  }

  // Fills a container with one bar per team (longest bar = leading team).
  function renderStandings(el, standings, highlightTeam) {
    el.innerHTML = '';
    const max = Math.max(1, ...standings.map(t => t.total));
    standings.forEach((t, i) => {
      const row = document.createElement('div');
      row.className = `standing ${TEAM_CLASS[t.team]}${t.team === highlightTeam ? ' mine' : ''}`;
      const label = document.createElement('span'); label.className = 'standing-name';
      label.textContent = `${i === 0 && t.total > 0 ? '👑 ' : ''}${t.team}`;
      const bar = document.createElement('span'); bar.className = 'standing-bar';
      const fill = document.createElement('i'); fill.style.width = `${(t.total / max) * 100}%`; bar.appendChild(fill);
      const pts = document.createElement('span'); pts.className = 'standing-pts'; pts.textContent = t.total.toLocaleString('en-US');
      const meta = document.createElement('span'); meta.className = 'standing-meta';
      meta.textContent = `${Math.min(t.players, TEAM_TOP)}/${TEAM_TOP} players counted`;
      row.append(label, pts, bar, meta); el.appendChild(row);
    });
  }

  const player = {
    get() { return store.get('shagun-catch-player', null); },
    set(p) { store.set('shagun-catch-player', p); }
  };

  return { GAMES, TEAM_CLASS, TEAM_TOP, board, renderRows, teamStandings, renderStandings, nameKey, player, shared: remote };
})();
