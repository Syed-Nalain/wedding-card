// Shagun Catch: catch falling mithai, marigolds and shagun envelopes on a thaal, dodge the mirchi.
(() => {
  const TEAM_CLASS = { 'Team Rida': 'team-rida', 'Team Awais Mahad': 'team-awais-mahad', 'Team Urwah': 'team-urwah' };
  const $ = sel => document.querySelector(sel);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }
  };

  /* ---------- scoreboard (shared via Supabase if configured, otherwise this device) ---------- */
  const cfg = window.GAME_CONFIG || {};
  const remote = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const LOCAL_KEY = 'shagun-catch-scores-v1';
  const api = path => `${cfg.supabaseUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '')}/rest/v1/${path}`;
  // New Supabase 'publishable' keys go only in the apikey header; legacy JWT 'anon' keys also go in Authorization.
  const headers = () => ({ apikey: cfg.supabaseAnonKey, 'Content-Type': 'application/json', ...(cfg.supabaseAnonKey.startsWith('eyJ') ? { Authorization: `Bearer ${cfg.supabaseAnonKey}` } : {}) });

  // One entry per name (ignoring capital letters): keep only that name's highest score.
  const nameKey = n => String(n).trim().toLowerCase();
  const bestPerName = rows => {
    const seen = new Set();
    return rows.filter(r => { const k = nameKey(r.name); if (seen.has(k)) return false; seen.add(k); return true; });
  };
  const sortScores = rows => rows.sort((a, b) => b.score - a.score || a.at - b.at);

  const Board = {
    shared: remote,
    async add(entry) {
      const local = store.get(LOCAL_KEY, []);
      local.push(entry);
      store.set(LOCAL_KEY, bestPerName(sortScores(local)).slice(0, 100));
      if (!remote) return;
      // submit_score keeps only the best score per name (see supabase-best-score.sql).
      let res = await fetch(api('rpc/submit_score'), {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ p_name: entry.name, p_team: entry.team, p_score: entry.score })
      });
      if (res.status === 404) {
        // The database update has not been run yet: fall back to adding a row.
        res = await fetch(api('game_scores'), {
          method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' },
          body: JSON.stringify({ name: entry.name, team: entry.team, score: entry.score })
        });
      }
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
    },
    async top(limit = 15) {
      if (remote) {
        const res = await fetch(api('game_scores?select=name,team,score,created_at&order=score.desc,created_at.asc&limit=500'), { headers: headers() });
        if (!res.ok) throw new Error(`Load failed (${res.status})`);
        const rows = (await res.json()).map(r => ({ name: r.name, team: r.team, score: r.score, at: Date.parse(r.created_at) }));
        return bestPerName(rows).slice(0, limit);
      }
      return bestPerName(sortScores(store.get(LOCAL_KEY, []))).slice(0, limit);
    }
  };

  /* ---------- screens ---------- */
  const screens = { start: $('[data-screen="start"]'), play: $('[data-screen="play"]'), over: $('[data-screen="over"]') };
  function show(name) {
    Object.entries(screens).forEach(([k, el]) => { el.hidden = k !== name; });
    window.scrollTo({ top: 0 });
  }

  /* ---------- player form ---------- */
  const form = $('[data-player-form]');
  const nameInput = $('#playerName');
  let player = store.get('shagun-catch-player', null);
  if (player) {
    nameInput.value = player.name;
    const r = form.querySelector(`input[name="team"][value="${player.team}"]`);
    if (r) r.checked = true;
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = nameInput.value.replace(/\s+/g, ' ').trim().slice(0, 24);
    const team = form.querySelector('input[name="team"]:checked')?.value;
    $('[data-name-error]').hidden = Boolean(name);
    $('[data-team-error]').hidden = Boolean(team);
    if (!name) { nameInput.focus(); return; }
    if (!team) return;
    player = { name, team };
    store.set('shagun-catch-player', player);
    startGame();
  });
  $('[data-show-board]').addEventListener('click', () => showOver(null));
  $('[data-play-again]').addEventListener('click', () => (player ? startGame() : show('start')));
  $('[data-change-player]').addEventListener('click', () => show('start'));

  /* ---------- drawing ---------- */
  const KINDS = {
    ladoo:    { pts: 10, weight: 24, label: 'Ladoo' },
    jalebi:   { pts: 10, weight: 20, label: 'Jalebi' },
    jamun:    { pts: 10, weight: 18, label: 'Gulab jamun' },
    marigold: { pts: 5,  weight: 14, label: 'Marigold' },
    shagun:   { pts: 30, weight: 6,  label: 'Shagun envelope' },
    mirchi:   { pts: -20, weight: 18, label: 'Mirchi' }
  };
  const totalWeight = Object.values(KINDS).reduce((s, k) => s + k.weight, 0);
  function pickKind() {
    let r = Math.random() * totalWeight;
    for (const [k, v] of Object.entries(KINDS)) { if ((r -= v.weight) < 0) return k; }
    return 'ladoo';
  }

  function drawItem(c, kind, x, y, r, rot = 0) {
    c.save(); c.translate(x, y); c.rotate(rot);
    if (kind === 'ladoo') {
      const g = c.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r);
      g.addColorStop(0, '#ffd27a'); g.addColorStop(1, '#e88a10');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#b8620a';
      for (let i = 0; i < 9; i++) { const a = i * 2.4, d = r * (.25 + (i % 3) * .2); c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, r * .07, 0, 7); c.fill(); }
    } else if (kind === 'jalebi') {
      c.strokeStyle = '#f28c0f'; c.lineWidth = r * .32; c.lineCap = 'round'; c.beginPath();
      for (let t = 0; t < 14; t += .2) { const rr = r * .1 + t * r * .062; c.lineTo(Math.cos(t) * rr, Math.sin(t) * rr); }
      c.stroke(); c.strokeStyle = '#ffd36a'; c.lineWidth = r * .1; c.stroke();
    } else if (kind === 'jamun') {
      const g = c.createRadialGradient(-r * .35, -r * .35, r * .1, 0, 0, r);
      g.addColorStop(0, '#b4572a'); g.addColorStop(1, '#4a1a08');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * .9, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff66'; c.beginPath(); c.ellipse(-r * .3, -r * .35, r * .22, r * .12, -.6, 0, 7); c.fill();
    } else if (kind === 'marigold') {
      for (let ring = 0; ring < 3; ring++) {
        const n = 12 - ring * 3, rr = r * (0.75 - ring * .22);
        c.fillStyle = ['#e8770c', '#f59a12', '#ffc23a'][ring];
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + ring; c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * (.32 - ring * .06), 0, 7); c.fill(); }
      }
      c.fillStyle = '#ffd24d'; c.beginPath(); c.arc(0, 0, r * .2, 0, 7); c.fill();
    } else if (kind === 'shagun') {
      const w = r * 1.8, h = r * 1.25;
      c.fillStyle = '#c2185b'; roundRect(c, -w / 2, -h / 2, w, h, r * .15); c.fill();
      c.strokeStyle = '#ffd24d'; c.lineWidth = r * .08; c.strokeRect(-w / 2 + r * .14, -h / 2 + r * .14, w - r * .28, h - r * .28);
      c.fillStyle = '#e0457b'; c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(0, h * .1); c.lineTo(w / 2, -h / 2); c.closePath(); c.fill();
      c.fillStyle = '#ffd24d'; c.beginPath(); c.arc(0, h * .08, r * .22, 0, 7); c.fill();
    } else if (kind === 'mirchi') {
      c.fillStyle = '#1f9d3a'; c.beginPath();
      c.moveTo(-r * .2, -r * .8);
      c.quadraticCurveTo(r * .75, -r * .5, r * .45, r * .55);
      c.quadraticCurveTo(r * .2, r * 1.05, -r * .55, r * .95);
      c.quadraticCurveTo(r * .05, r * .5, -r * .2, -r * .8); c.fill();
      c.fillStyle = '#ffffff55'; c.beginPath(); c.ellipse(r * .2, -r * .1, r * .08, r * .35, .3, 0, 7); c.fill();
      c.strokeStyle = '#0b5a1f'; c.lineWidth = r * .14; c.lineCap = 'round'; c.beginPath(); c.moveTo(-r * .2, -r * .8); c.quadraticCurveTo(-r * .3, -r * 1.1, -r * .05, -r * 1.2); c.stroke();
    }
    c.restore();
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  function drawThaal(c, x, y, w) {
    const h = w * .22;
    c.save(); c.translate(x, y);
    c.fillStyle = '#00000033'; c.beginPath(); c.ellipse(0, h * .55, w * .5, h * .35, 0, 0, 7); c.fill();
    const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#fff1b0'); g.addColorStop(.5, '#e9b73c'); g.addColorStop(1, '#a8731a');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, 7); c.fill();
    c.fillStyle = '#f7d77a'; c.beginPath(); c.ellipse(0, -h * .06, w * .38, h * .3, 0, 0, 7); c.fill();
    c.fillStyle = '#c2185b';
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * w * .44, Math.sin(a) * h * .4, w * .018, 0, 7); c.fill(); }
    c.restore();
  }

  document.querySelectorAll('canvas[data-icon]').forEach(cv => drawItem(cv.getContext('2d'), cv.dataset.icon, 32, 34, 22));

  /* ---------- sound ---------- */
  let actx;
  function blip(good) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = good ? 'triangle' : 'sawtooth';
      o.frequency.setValueAtTime(good ? 660 : 180, t); o.frequency.exponentialRampToValueAtTime(good ? 990 : 90, t + .12);
      g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .18);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + .2);
    } catch (_) {}
  }

  /* ---------- game loop ---------- */
  const arena = $('[data-arena]');
  const canvas = $('[data-canvas]');
  const ctx = canvas.getContext('2d');
  const hud = { score: $('[data-hud-score]'), time: $('[data-hud-time]'), name: $('[data-hud-name]'), team: $('[data-hud-team]') };
  const comboEl = $('[data-combo]');
  const readyEl = $('[data-ready]');
  const speedFlash = $('[data-speed-flash]');
  let flashTimer = 0;
  function flash(text) {
    speedFlash.textContent = text; speedFlash.hidden = false;
    speedFlash.classList.remove('pop'); void speedFlash.offsetWidth; speedFlash.classList.add('pop');
    clearTimeout(flashTimer); flashTimer = setTimeout(() => { speedFlash.hidden = true; }, 1100);
  }

  /* ---------- difficulty ----------
     0-60 s: starts slow and speeds up gently.
     After 60 s: keeps creeping up, and every few seconds the speed jumps randomly faster or slower. */
  const SLOW_START = 0.55, CALM_PHASE = 60;
  function updateSpeed(s, dt) {
    const t = s.elapsed;
    if (t < CALM_PHASE) { s.speed = SLOW_START + (1 - SLOW_START) * (t / CALM_PHASE); return; }
    if (!s.wild) { s.wild = true; flash('Now it gets wild!'); s.surgeIn = 2; }
    const base = Math.min(1.9, 1 + (t - CALM_PHASE) * 0.008);
    s.surgeIn -= dt;
    if (s.surgeIn <= 0) {
      const prev = s.surgeTarget;
      s.surgeTarget = 0.6 + Math.random() * 0.95;          // between 0.6x and 1.55x
      s.surgeIn = 2.5 + Math.random() * 3.5;                 // next change in 2.5-6 s
      if (s.surgeTarget - prev > 0.25) flash('Faster!');
      else if (prev - s.surgeTarget > 0.25) flash('Slower...');
    }
    s.surge += (s.surgeTarget - s.surge) * Math.min(1, dt * 2.5);
    s.speed = base * s.surge;
  }
  const fmtTime = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  let W = 0, H = 0, dpr = 1, state = null, raf = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state) { state.plateW = Math.max(84, Math.min(150, W * .26)); state.plateY = H - 36; state.x = Math.min(Math.max(state.x, state.plateW / 2), W - state.plateW / 2); }
  }
  window.addEventListener('resize', resize);

  function setTarget(clientX) {
    if (!state) return;
    const r = canvas.getBoundingClientRect();
    state.target = Math.min(Math.max(clientX - r.left, state.plateW / 2), W - state.plateW / 2);
  }
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture?.(e.pointerId); setTarget(e.clientX); });
  canvas.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons || e.pressure) setTarget(e.clientX); });
  const keys = {};
  window.addEventListener('keydown', e => { if (state?.running && ['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) { keys[e.key] = true; e.preventDefault(); } });
  window.addEventListener('keyup', e => { keys[e.key] = false; });

  function startGame() {
    show('play');
    hud.name.textContent = player.name;
    hud.team.textContent = player.team.toUpperCase();
    hud.score.textContent = '0'; hud.time.textContent = '0:00';
    comboEl.hidden = true;
    resize();
    speedFlash.hidden = true;
    state = { running: false, score: 0, elapsed: 0, speed: SLOW_START, surge: 1, surgeTarget: 1, surgeIn: 0, wild: false, items: [], pops: [], spawnIn: 0, combo: 0, best: 0, caught: 0,
      plateW: Math.max(84, Math.min(150, W * .26)), plateY: H - 36, x: W / 2, target: W / 2, last: 0 };
    cancelAnimationFrame(raf);
    let n = 3; readyEl.hidden = false; readyEl.textContent = n;
    render();
    const iv = setInterval(() => {
      n--;
      if (n > 0) { readyEl.textContent = n; return; }
      clearInterval(iv); readyEl.textContent = 'Go!';
      setTimeout(() => { readyEl.hidden = true; }, 450);
      state.running = true; state.last = performance.now(); raf = requestAnimationFrame(loop);
    }, 700);
  }

  function loop(now) {
    const dt = Math.min(.05, (now - state.last) / 1000); state.last = now;
    update(dt); render();
    if (state.running) raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    const s = state;
    s.elapsed += dt;
    hud.time.textContent = fmtTime(s.elapsed);
    updateSpeed(s, dt);

    const kb = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
    if (kb) s.target = Math.min(Math.max(s.x + kb * W * 1.4 * dt * 4, s.plateW / 2), W - s.plateW / 2);
    s.x += (s.target - s.x) * Math.min(1, dt * 18);

    s.spawnIn -= dt;
    if (s.spawnIn <= 0) {
      const r = Math.max(15, Math.min(24, W * .05));
      const kind = pickKind();
      const spread = s.wild ? 0.5 : 0.24;                    // items vary more in speed after the first minute
      s.items.push({ kind, x: r + Math.random() * (W - 2 * r), y: -r, r, k: 1 - spread / 2 + Math.random() * spread, rot: Math.random() * 6, vr: (Math.random() - .5) * 3 });
      s.spawnIn = Math.min(1.1, Math.max(.3, .85 / Math.pow(s.speed, .7)));
    }

    const plateTop = s.plateY - s.plateW * .11;
    for (const it of s.items) {
      it.y += H * .38 * s.speed * it.k * dt; it.rot += it.vr * dt;
      if (!it.done && it.y + it.r * .6 >= plateTop && it.y - it.r <= s.plateY + 6 && Math.abs(it.x - s.x) <= s.plateW / 2 + it.r * .4) {
        it.done = true; catchItem(it);
      } else if (!it.done && it.y - it.r > H) {
        it.done = true;
        if (it.kind !== 'mirchi' && !s.missed) s.missed = it.kind;
      }
    }
    if (s.missed) { endGame(); return; }
    s.items = s.items.filter(it => !it.done);
    for (const p of s.pops) { p.life -= dt; p.y -= 40 * dt; }
    s.pops = s.pops.filter(p => p.life > 0);
    comboEl.hidden = s.combo < 5;
    if (!comboEl.hidden) comboEl.textContent = `COMBO ×${multiplier().toFixed(1)}`;
  }

  const multiplier = () => Math.min(3, 1 + Math.floor(state.combo / 5) * .5);

  function catchItem(it) {
    const s = state, k = KINDS[it.kind];
    let pts;
    if (k.pts < 0) {
      pts = k.pts; s.combo = 0;
      arena.classList.remove('shake'); void arena.offsetWidth; arena.classList.add('shake');
      blip(false);
    } else {
      s.combo++; s.best = Math.max(s.best, s.combo); s.caught++;
      pts = Math.round(k.pts * multiplier()); blip(true);
    }
    s.score = Math.max(0, s.score + pts);
    hud.score.textContent = s.score;
    s.pops.push({ x: it.x, y: s.plateY - 30, text: (pts > 0 ? '+' : '') + pts, good: pts > 0, life: .8 });
  }

  function render() {
    if (!state) return;
    ctx.clearRect(0, 0, W, H);
    // hanging marigold strands for decoration
    for (let x = 14; x < W; x += 34) {
      const len = 2 + ((x / 34) % 3 | 0);
      for (let i = 0; i < len; i++) { ctx.fillStyle = i % 2 ? '#ffae1f' : '#f28c0f'; ctx.beginPath(); ctx.arc(x, 8 + i * 11, 5, 0, 7); ctx.fill(); }
    }
    for (const it of state.items) drawItem(ctx, it.kind, it.x, it.y, it.r, it.rot);
    drawThaal(ctx, state.x, state.plateY, state.plateW);
    ctx.textAlign = 'center'; ctx.font = '700 18px "DM Sans", sans-serif';
    for (const p of state.pops) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.good ? '#ffd24d' : '#7cf0b0'; ctx.fillText(p.text, p.x, p.y); }
    ctx.globalAlpha = 1;
  }

  async function endGame() {
    state.running = false; cancelAnimationFrame(raf);
    const entry = { name: player.name, team: player.team, score: state.score, at: Date.now(),
      reason: `Oh no, you missed a ${KINDS[state.missed].label.toLowerCase()}! You lasted ${fmtTime(state.elapsed)}.` };
    speedFlash.hidden = true;
    { arena.classList.remove('shake'); void arena.offsetWidth; arena.classList.add('shake'); blip(false); await new Promise(r => setTimeout(r, 600)); }
    let saveError = null;
    try { await Board.add(entry); } catch (err) { saveError = err; }
    showOver(entry, saveError);
  }

  /* ---------- game over / scoreboard ---------- */
  async function showOver(entry, saveError) {
    show('over');
    const result = $('[data-result]');
    result.hidden = !entry;
    $('[data-play-again]').textContent = entry ? 'Play again' : (player ? 'Play now' : 'Play the game');
    $('[data-change-player]').hidden = !player;
    if (entry) {
      $('[data-result-name]').textContent = entry.name;
      $('[data-result-score]').textContent = entry.score;
      $('[data-result-team]').textContent = entry.team;
      $('[data-result-rank]').textContent = '';
      $('[data-result-reason]').textContent = entry.reason || '';
    }
    const boardEl = $('[data-board]');
    const note = $('[data-board-note]');
    boardEl.innerHTML = '<li class="board-empty">Loading scores…</li>';
    $('[data-winner]').hidden = true;
    note.textContent = saveError ? 'Your score could not be sent to the shared scoreboard. It is saved on this phone.' : '';

    let rows;
    try { rows = await Board.top(15); }
    catch (_) {
      rows = store.get(LOCAL_KEY, []).slice(0, 15);
      note.textContent = 'Could not reach the shared scoreboard. Showing scores from this phone.';
    }
    if (!Board.shared && !note.textContent) note.textContent = 'Scores played on this phone.';

    boardEl.innerHTML = '';
    if (!rows.length) { boardEl.innerHTML = '<li class="board-empty">No scores yet. Be the first!</li>'; return; }
    let myRank = 0;
    rows.forEach((r, i) => {
      const li = document.createElement('li');
      const isMe = entry && !myRank && nameKey(r.name) === nameKey(entry.name);
      if (isMe) { myRank = i + 1; li.className = 'me'; }
      const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = i === 0 ? '👑' : i + 1;
      const who = document.createElement('span'); who.className = 'who';
      const nm = document.createElement('strong'); nm.textContent = r.name;
      const chip = document.createElement('span'); chip.className = `chip ${TEAM_CLASS[r.team] || ''}`; chip.textContent = r.team;
      who.append(nm, chip);
      const pts = document.createElement('span'); pts.className = 'pts'; pts.textContent = r.score;
      li.append(rank, who, pts); boardEl.appendChild(li);
    });
    const top = rows[0];
    $('[data-winner-name]').textContent = top.name;
    $('[data-winner-team]').textContent = top.team;
    $('[data-winner]').hidden = false;
    if (entry) {
      const mine = myRank ? rows[myRank - 1] : null;
      $('[data-result-rank]').textContent = !mine ? 'Keep playing to reach the top 15!'
        : mine.score > entry.score ? `Your best is still ${mine.score} (#${myRank} on the scoreboard).`
        : myRank === 1 ? 'New best! You are on top of the scoreboard!' : `New best! You are #${myRank} on the scoreboard.`;
    }
  }
})();
