// Khana Khul Gaya! Serve the buffet guests. Every round has the same guests and dish counts per phase
// (fair difficulty), but who arrives when, what they order and where they stand is random.
(() => {
  const WS = window.WeddingScores, Board = WS.board('khana');
  const $ = s => document.querySelector(s);
  const GAME_SECONDS = 90;
  // Each event has its own menu.
  const MENUS = [
    [['chai', 'Chai', '☕'], ['pakora', 'Pakora', '🧆'], ['samosa', 'Samosa', '🥟'], ['jalebi', 'Jalebi', '🍥'], ['lassi', 'Lassi', '🥛'], ['chaat', 'Chaat', '🥗']],
    [['biryani', 'Biryani', '🍛'], ['qorma', 'Qorma', '🍲'], ['naan', 'Naan', '🫓'], ['raita', 'Raita', '🥣'], ['kebab', 'Kebab', '🍢'], ['kheer', 'Kheer', '🍮']],
    [['karahi', 'Karahi', '🥘'], ['tikka', 'Tikka', '🍗'], ['pulao', 'Pulao', '🍚'], ['roast', 'Roast', '🍖'], ['halwa', 'Gajar Halwa', '🥕'], ['drink', 'Cold Drink', '🥤']]
  ];
  const ALL_DISHES = MENUS.flat();
  const TYPES = {
    bachcha: { name: 'Bachcha', icon: '👦', patience: 8 },
    nana: { name: 'Nana Jaan', icon: '👴', patience: 16 },
    phupho: { name: 'Phupho ⭐', icon: '🧕', patience: 11, vip: true },
    dost: { name: 'Dulhe ke dost', icon: '🧑‍🤝‍🧑', patience: 15 }
  };
  // Fixed difficulty budget per phase: [type, number of dishes, how many]
  const PHASES = [
    { name: 'Mehndi', start: 0, guests: [['bachcha', 1, 4], ['nana', 2, 3], ['dost', 3, 1]] },
    { name: 'Baraat', start: 30, guests: [['bachcha', 1, 3], ['nana', 2, 3], ['phupho', 3, 2], ['dost', 4, 2]] },
    { name: 'Waleema', start: 60, guests: [['bachcha', 1, 2], ['nana', 2, 2], ['phupho', 4, 3], ['dost', 5, 3]] }
  ];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const mult = streak => (streak >= 10 ? 3 : streak >= 6 ? 2 : streak >= 3 ? 1.5 : 1);

  function makeShift() {
    const list = [];
    PHASES.forEach(ph => {
      const g = shuffle(ph.guests.flatMap(([type, items, n]) => Array.from({ length: n }, () => ({ type, items }))));
      const gap = 30 / g.length;
      const menu = MENUS[PHASES.indexOf(ph)];
      g.forEach((x, i) => list.push({ ...x, at: Math.max(ph.start + .3, ph.start + i * gap + (Math.random() - .5) * .8),
        order: Array.from({ length: x.items }, () => menu[Math.floor(Math.random() * menu.length)][0]) }));
    });
    return list.sort((a, b) => a.at - b.at);
  }
  // Best possible score for a shift (every guest served instantly and perfectly), used for the star rating.
  const maxScore = shift => shift.reduce((s, g, i) => s + (g.items * 10 + 20) * mult(i + 1) * (TYPES[g.type].vip ? 2 : 1), 0);

  /* ---------- screens + player ---------- */
  const screens = { start: $('[data-screen="start"]'), play: $('[data-screen="play"]'), over: $('[data-screen="over"]') };
  const show = n => { Object.entries(screens).forEach(([k, el]) => { el.hidden = k !== n; }); scrollTo({ top: 0 }); };
  const form = $('[data-player-form]'), nameInput = $('#playerName');
  let player = WS.player.get();
  if (player) { nameInput.value = player.name; const r = form.querySelector(`input[value="${player.team}"]`); if (r) r.checked = true; }
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = nameInput.value.replace(/\s+/g, ' ').trim().slice(0, 24), team = form.querySelector('input[name="team"]:checked')?.value;
    $('[data-name-error]').hidden = !!name; $('[data-team-error]').hidden = !!team;
    if (!name || !team) return;
    player = { name, team }; WS.player.set(player); start();
  });
  $('[data-show-board]').onclick = () => showOver(null);
  $('[data-play-again]').onclick = () => (player ? start() : show('start'));
  $('[data-change-player]').onclick = () => show('start');

  /* ---------- sound ---------- */
  let actx;
  const tone = (f, type = 'triangle', len = .12) => { try { actx = actx || new AudioContext(); const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(.1, t); g.gain.exponentialRampToValueAtTime(.001, t + len); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + len); } catch (_) {} };

  /* ---------- play ---------- */
  const spotsEl = $('[data-spots]'), counter = $('[data-counter]');
  const hud = { score: $('[data-hud-score]'), time: $('[data-hud-time]'), name: $('[data-hud-name]'), team: $('[data-hud-team]') };
  let G = null;

  const setMenu = ph => { counter.innerHTML = MENUS[ph].map(([id, label, icon]) => `<button class="dish" type="button" data-dish="${id}"><b>${icon}</b>${label}</button>`).join(''); };
  counter.addEventListener('click', e => { const b = e.target.closest('[data-dish]'); if (b) tapDish(b.dataset.dish); });
  const iconOf = id => ALL_DISHES.find(d => d[0] === id)[2];

  function start() {
    show('play');
    hud.name.textContent = player.name; hud.team.textContent = player.team.toUpperCase();
    const shift = makeShift();
    G = { shift, queue: shift.slice(), spots: [null, null, null], sel: -1, t: 0, score: 0, streak: 0, max: maxScore(shift),
      served: 0, angry: 0, fb: {}, right: 0, wrong: 0, lockUntil: 0, phase: -1, last: performance.now(), running: true };
    draw(); requestAnimationFrame(loop);
  }

  function loop(now) {
    if (!G || !G.running) return;
    const dt = Math.max(0, Math.min(.05, (now - G.last) / 1000)); G.last = now; G.t += dt;
    if (G.t >= GAME_SECONDS) return end();
    const ph = PHASES.filter(p => G.t >= p.start).length - 1;
    if (ph !== G.phase) {
      G.phase = ph; $('[data-phase]').textContent = PHASES[ph].name; setMenu(ph);
      $('[data-stage]').className = `khana-stage ev-${ph}`;
      // New event, new menu: guests from the last event leave happily (no penalty).
      if (ph > 0) { G.spots = [null, null, null]; G.sel = -1; draw(); }
    }
    hud.time.textContent = Math.ceil(GAME_SECONDS - G.t);
    // seat arrived guests in a random free spot
    while (G.queue.length && G.queue[0].at <= G.t && G.spots.includes(null)) {
      const free = G.spots.map((s, i) => (s ? -1 : i)).filter(i => i >= 0);
      const g = G.queue.shift(), T = TYPES[g.type];
      G.spots[free[Math.floor(Math.random() * free.length)]] = { ...g, got: g.order.map(() => false), left: T.patience, maxP: T.patience, vip: !!T.vip, wrong: false };
      draw();
    }
    G.spots.forEach((g, i) => {
      if (!g) return;
      g.left -= dt;
      if (g.left <= 0) { mark(g, false); const p = g.vip ? 50 : 25; addScore(-p); G.streak = 0; G.angry++; G.spots[i] = null; if (G.sel === i) G.sel = -1; pop(i, `😤 −${p}`, false); tone(140, 'sawtooth', .25); draw(); return; }
      const bar = spotsEl.children[i]?.querySelector('.pat i');
      if (bar) { const f = g.left / g.maxP; bar.style.width = `${f * 100}%`; bar.style.background = f > .5 ? '#7cf0b0' : f > .25 ? '#ffd24d' : '#ff6b8a'; }
    });
    const waiting = G.queue.filter(g => g.at <= G.t).length;
    $('[data-queue]').textContent = waiting ? `${waiting} hungry guest${waiting > 1 ? 's' : ''} waiting…` : '';
    requestAnimationFrame(loop);
  }

  function draw() {
    spotsEl.innerHTML = '';
    G.spots.forEach((g, i) => {
      const b = document.createElement('button'); b.type = 'button';
      if (!g) { b.className = 'spot empty'; b.textContent = 'Khaali'; b.disabled = true; }
      else {
        const T = TYPES[g.type];
        b.className = `spot guest${g.vip ? ' vip' : ''}${G.sel === i ? ' sel' : ''}`;
        b.innerHTML = `<span class="ava">${T.icon}</span><span class="who">${T.name}</span><span class="order">${g.order.map((d, k) => `<span class="${g.got[k] ? 'got' : ''}">${iconOf(d)}</span>`).join('')}</span><span class="pat"><i style="width:${g.left / g.maxP * 100}%"></i></span>`;
        b.onclick = () => { G.sel = i; draw(); };
      }
      spotsEl.appendChild(b);
    });
    $('[data-streak]').textContent = mult(G.streak) > 1 ? `Streak ×${mult(G.streak)}` : '';
    hud.score.textContent = G.score;
  }

  // Remember how each kind of guest was treated (good = no wrong dish and not served late).
  function mark(g, good) { const f = G.fb[g.type] = G.fb[g.type] || { good: 0, bad: 0 }; f[good ? 'good' : 'bad']++; }
  const NOTES = {
    phupho: ['bas sae tha, waisay itna bhi acha nai tha khana', 'Tumhare tou baap ko shikayat lgay gi!'],
    bachcha: ['Kheer bohat mazay ki thi! 😋', 'Ammiii! Mera khana nahi aya! 😭'],
    nana: ['Jeetay raho beta, barkat ho! 🤲', 'Hamaray zamanay mein khana waqt pe milta tha!']
  };
  function guestNotes(fb) {
    const out = [];
    [['phupho', '🧕 Phupho'], ['bachcha', '👦 Bachcha'], ['nana', '👴 Nana Jaan']].forEach(([t, who]) => {
      const f = fb[t]; if (!f) return;
      out.push(`${who}: "${NOTES[t][f.bad ? 1 : 0]}"`);
    });
    if (fb.dost) out.push('🧑‍🤝‍🧑 Dulhe ke dost: "Roti ka mza aya"');
    return out;
  }
  function addScore(n) { G.score = Math.max(0, G.score + n); hud.score.textContent = G.score; }
  function pop(i, text, good) {
    const el = spotsEl.children[i]; if (!el) return;
    const p = document.createElement('span'); p.className = `pop ${good ? 'good' : 'bad'}`; p.textContent = text;
    el.appendChild(p); setTimeout(() => p.remove(), 1000);
  }

  function tapDish(id) {
    if (!G || !G.running || performance.now() < G.lockUntil) return;
    const g = G.spots[G.sel];
    if (!g) { $('[data-queue]').textContent = 'Pehle mehmaan chuno! Tap a guest first.'; return; }
    const k = g.order.findIndex((d, j) => d === id && !g.got[j]);
    if (k < 0) {   // wrong dish
      G.wrong++; G.streak = 0; g.wrong = true; addScore(-5); G.lockUntil = performance.now() + 400;
      counter.classList.add('locked'); setTimeout(() => counter.classList.remove('locked'), 400);
      const el = spotsEl.children[G.sel]; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
      pop(G.sel, '−5', false); tone(180, 'square', .15); draw(); return;
    }
    G.right++; g.got[k] = true; tone(520 + k * 80);
    if (g.got.every(Boolean)) {
      mark(g, !g.wrong && g.left / g.maxP >= .25);
      G.streak = g.wrong ? 0 : G.streak + 1;
      const pts = Math.round((g.order.length * 10 + 20 * Math.max(0, g.left / g.maxP)) * mult(G.streak) * (g.vip ? 2 : 1));
      addScore(pts); G.served++; const i = G.sel; G.spots[i] = null; G.sel = -1;
      draw(); pop(i, `+${pts}`, true); tone(880, 'triangle', .2);
    } else draw();
  }

  async function end() {
    G.running = false;
    const acc = G.right + G.wrong ? Math.round(100 * G.right / (G.right + G.wrong)) : 100;
    const pct = Math.round(100 * G.score / G.max), stars = pct >= 60 ? '⭐⭐⭐' : pct >= 40 ? '⭐⭐' : pct >= 20 ? '⭐' : '';
    const entry = { name: player.name, team: player.team, score: G.score, at: Date.now(),
      notes: guestNotes(G.fb),
      stats: `${stars} ${pct}% of a perfect shift · ${G.served} served · ${G.angry} angry · ${acc}% accuracy` };
    G = null;
    let err = null; try { await Board.add(entry); } catch (e) { err = e; }
    showOver(entry, err);
  }

  /* ---------- results ---------- */
  async function showOver(entry, err) {
    show('over');
    $('[data-result]').hidden = !entry;
    $('[data-play-again]').textContent = entry ? 'Play again' : 'Play now';
    $('[data-change-player]').hidden = !player;
    if (entry) {
      $('[data-result-reason]').textContent = 'Khana khatam! The shift is over.';
      $('[data-result-name]').textContent = entry.name; $('[data-result-score]').textContent = entry.score;
      $('[data-result-team]').textContent = entry.team; $('[data-result-stats]').textContent = entry.stats;
      const ul = $('[data-notes]'); ul.innerHTML = ''; entry.notes.forEach(n => { const li = document.createElement('li'); li.textContent = n; ul.appendChild(li); }); $('[data-result-rank]').textContent = '';
    }
    const note = $('[data-board-note]');
    note.textContent = err ? 'Your score could not be sent to the shared scoreboard. It is saved on this phone.' : '';
    let rows;
    try { rows = await Board.top(1000); } catch (_) { rows = Board.localTop(1000); note.textContent = 'Could not reach the shared scoreboard. Showing scores from this phone.'; }
    if (!Board.shared && !note.textContent) note.textContent = 'Scores played on this phone.';
    const st = WS.teamStandings(rows);
    WS.renderStandings($('[data-standings]'), st, player && player.team);
    const lead = st[0];
    $('[data-banter]').textContent = !lead.total ? 'No team has scored yet. Be the first!'
      : lead.team === 'Team Awais Mahad' ? 'Dulhe walay aage hain! Dulhan walo, kuch karo! 🔥' : `${lead.team} aage hai! Dulhe walo, khana thanda ho raha hai! 🔥`;
    const tr = $('[data-team-rank]'); tr.textContent = '';
    if (player) {
      const mine = st.find(t => t.team === player.team), all = rows.filter(r => r.team === player.team);
      const r = all.findIndex(x => WS.nameKey(x.name) === WS.nameKey(player.name));
      if (r >= 0) tr.textContent = r < WS.TEAM_TOP
        ? `Your best (${all[r].score}) counts for ${player.team}: #${r + 1} in its top ${WS.TEAM_TOP}.${r > 0 ? ` Beat ${all[r - 1].name} (${all[r - 1].score}) to move up.` : ''}`
        : `Only the top ${WS.TEAM_TOP} count. Beat ${mine.top[WS.TEAM_TOP - 1].name} (${mine.top[WS.TEAM_TOP - 1].score}) to get in!`;
    }
    const top = rows.slice(0, 15), myRank = WS.renderRows($('[data-board]'), top, entry && entry.name);
    if (entry && myRank) { const m = top[myRank - 1]; $('[data-result-rank]').textContent = m.score > entry.score ? `Your best is still ${m.score}.` : `New best! #${myRank} overall.`; }
  }
})();
