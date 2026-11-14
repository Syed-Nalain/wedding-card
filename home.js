// Home page: fairy lights, petal rain, countdown and a synthesized dhol + baja band (Web Audio, no audio files).
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- fairy lights ---------- */
  const lights = document.querySelector('.fairy-lights');
  const lightColors = ['#ffd24d', '#ff7aa8', '#7cf0b0', '#ffb347', '#8ec5ff'];
  if (lights) {
    const count = 26;
    for (let i = 0; i < count; i++) {
      const b = document.createElement('i');
      const x = (i + 0.5) / count;
      b.style.left = `${x * 100}%`;
      b.style.top = `${4 + Math.sin(x * Math.PI * 6) * 9 + 9}px`;
      b.style.setProperty('--c', lightColors[i % lightColors.length]);
      b.style.setProperty('--d', `${(i % 5) * 0.45}s`);
      lights.appendChild(b);
    }
  }

  /* ---------- marigold & rose petal rain ---------- */
  const rain = document.querySelector('.petal-rain');
  if (rain && !reduceMotion) {
    const petalColors = ['#f28c0f', '#ffae1f', '#e0457b', '#ffd24d', '#c2185b'];
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('i');
      p.style.left = `${Math.random() * 100}%`;
      p.style.setProperty('--c', petalColors[i % petalColors.length]);
      p.style.setProperty('--t', `${9 + Math.random() * 8}s`);
      p.style.setProperty('--d', `${-Math.random() * 15}s`);
      p.style.setProperty('--x', `${-60 + Math.random() * 120}px`);
      rain.appendChild(p);
    }
  }

  /* ---------- countdown (Pakistan time, UTC+5) ---------- */
  const milestones = [
    { at: Date.parse('2026-12-21T19:00:00+05:00'), title: 'Until the Mehndi begins' },
    { at: Date.parse('2026-12-22T10:00:00+05:00'), title: 'Until Awais & Rida’s Barat departs' },
    { at: Date.parse('2026-12-23T18:00:00+05:00'), title: 'Until Mahad & Urwah’s Barat' },
    { at: Date.parse('2026-12-25T14:00:00+05:00'), title: 'Until the Waleema lunch' }
  ];
  const cdTitle = document.querySelector('[data-countdown-title]');
  const cd = Object.fromEntries([...document.querySelectorAll('[data-cd]')].map(el => [el.dataset.cd, el]));
  const pad = n => String(n).padStart(2, '0');
  function tick() {
    const now = Date.now();
    const next = milestones.find(m => m.at > now);
    if (!next) {
      cdTitle.textContent = 'Shukriya for celebrating with us!';
      document.querySelector('[data-countdown]').hidden = true;
      return;
    }
    cdTitle.textContent = next.title;
    let s = Math.floor((next.at - now) / 1000);
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    cd.days.textContent = d; cd.hours.textContent = pad(h); cd.minutes.textContent = pad(m); cd.seconds.textContent = pad(s);
  }
  if (cdTitle) { tick(); setInterval(tick, 1000); }

  /* ---------- winning team of each game (team of that game's top scorer) ---------- */
  document.querySelectorAll('[data-winning-team]').forEach(async el => {
    const WS = window.WeddingScores;
    if (!WS) return;
    const board = WS.board(el.dataset.winningTeam);
    const id = el.dataset.winningTeam;
    let rows;
    try { rows = await board.top(id === 'khana' ? 1000 : 1); } catch (_) { rows = board.localTop(1000); }
    let top = rows[0];
    if (id === 'khana') { const lead = WS.teamStandings(rows)[0]; top = lead.total ? lead : null; }
    if (top && WS.TEAM_CLASS[top.team]) {
      el.textContent = top.team;
      el.classList.add(WS.TEAM_CLASS[top.team]);
    }
  });

  /* ---------- dhol + baja band ---------- */
  const btn = document.querySelector('[data-dhol-toggle]');
  const label = document.querySelector('[data-dhol-label]');
  const shell = document.querySelector('.site-shell');
  const dhol = document.querySelector('.dhol');
  const dagga = document.querySelector('.stick-dagga');
  const tilli = document.querySelector('.stick-tilli');
  if (!btn || !(window.AudioContext || window.webkitAudioContext)) { btn && (btn.hidden = true); return; }

  let ctx, master, noiseBuf, playing = false, timerId = null, step = 0, nextTime = 0;
  const BPM = 104;
  const STEP = 60 / BPM / 3;           // triplet (swing) grid, 12 steps per bar
  const BAR = 12;
  // Bhangra-style chaal: B = dagga (bass), t = tilli (treble), A = accented bass
  const grooveA = { 0: 'A', 2: 't', 3: 't', 5: 't', 6: 'B', 8: 't', 9: 'B', 11: 't' };
  const grooveB = { 0: 'A', 2: 't', 3: 'B', 5: 't', 6: 'B', 7: 't', 8: 't', 9: 'A', 10: 't', 11: 't' };
  // Original brass riff over two bars: [step, midi note, length in steps]
  const riff = [
    [0, 81, 2], [3, 81, 1], [4, 83, 1], [5, 81, 1], [6, 79, 2], [9, 78, 2],
    [12, 76, 1], [13, 78, 1], [14, 79, 1], [15, 81, 3], [18, 79, 1], [19, 78, 1], [20, 76, 1], [21, 74, 3]
  ];
  const riffAnswer = [
    [0, 74, 1], [1, 76, 1], [2, 78, 1], [3, 79, 2], [6, 81, 1], [7, 83, 1], [8, 86, 3],
    [12, 83, 1], [13, 81, 1], [14, 79, 1], [15, 78, 2], [18, 76, 1], [19, 78, 1], [20, 74, 4]
  ];
  const midiHz = n => 440 * Math.pow(2, (n - 69) / 12);

  function initAudio() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  function noise(t, dur, type, freq, q, vol) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + dur + 0.02);
  }

  function bass(t, accent) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(accent ? 130 : 115, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.28);
    g.gain.setValueAtTime(accent ? 1 : 0.75, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.55);
    noise(t, 0.05, 'lowpass', 900, 0.7, 0.45);
    flash(t, 'bass');
  }

  function treble(t) {
    noise(t, 0.09, 'bandpass', 2600, 1.4, 0.55);
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(560, t); o.frequency.exponentialRampToValueAtTime(400, t + 0.07);
    g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.1);
    flash(t, 'treble');
  }

  function chimta(t) { noise(t, 0.05, 'highpass', 7000, 0.5, 0.12); }

  function brass(t, midi, dur) {
    const hz = midiHz(midi);
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(2600, t + 0.05); f.frequency.linearRampToValueAtTime(1700, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.03);
    g.gain.setValueAtTime(0.14, t + Math.max(0.04, dur - 0.06)); g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.05);
    const lfo = ctx.createOscillator(); const lfoGain = ctx.createGain();
    lfo.frequency.value = 5.5; lfoGain.gain.value = hz * 0.006; lfo.connect(lfoGain);
    [0, 7, -7].forEach(cents => {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = hz; o.detune.value = cents; lfoGain.connect(o.frequency);
      o.connect(f); o.start(t); o.stop(t + dur + 0.08);
    });
    const low = ctx.createOscillator(); const lowG = ctx.createGain();
    low.type = 'square'; low.frequency.value = hz / 2; lowG.gain.value = 0.25;
    low.connect(lowG).connect(f); low.start(t); low.stop(t + dur + 0.08);
    lfo.start(t); lfo.stop(t + dur + 0.08);
    f.connect(g).connect(master);
  }

  function flash(t, kind) {
    const delay = Math.max(0, (t - ctx.currentTime) * 1000);
    setTimeout(() => {
      if (!playing) return;
      const targets = kind === 'bass' ? [dhol, dagga] : [tilli];
      targets.forEach(el => { if (!el) return; el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 110); });
    }, delay);
  }

  function scheduleStep(s, t) {
    const bar = Math.floor(s / BAR), pos = s % BAR;
    const groove = bar % 4 === 3 ? grooveB : grooveA;
    const hit = groove[pos];
    if (hit === 'A') bass(t, true); else if (hit === 'B') bass(t, false); else if (hit === 't') treble(t);
    if (pos % 3 === 0) chimta(t);
    // Band plays in bars 3-4 (call) and 7-8 (answer) of every 8-bar cycle
    const cycleBar = bar % 8;
    if (cycleBar === 2 || cycleBar === 6) {
      const phrase = cycleBar === 2 ? riff : riffAnswer;
      phrase.forEach(([st, note, len]) => { if (st === pos) brass(t, note, len * STEP * 0.95); });
    }
    if (cycleBar === 3 || cycleBar === 7) {
      const phrase = cycleBar === 3 ? riff : riffAnswer;
      phrase.forEach(([st, note, len]) => { if (st === pos + BAR) brass(t, note, len * STEP * 0.95); });
    }
  }

  function scheduler() {
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(step, nextTime);
      step++; nextTime += STEP;
    }
  }

  function start() {
    if (!ctx) initAudio();
    ctx.resume();
    playing = true; step = 0; nextTime = ctx.currentTime + 0.06;
    timerId = setInterval(scheduler, 25); scheduler();
    btn.setAttribute('aria-pressed', 'true'); label.textContent = 'Stop the band';
    shell.classList.add('is-playing');
  }

  function stop() {
    playing = false; clearInterval(timerId); timerId = null;
    if (ctx) ctx.suspend();
    btn.setAttribute('aria-pressed', 'false'); label.textContent = 'Play the dhol & baja';
    shell.classList.remove('is-playing');
  }

  btn.addEventListener('click', () => (playing ? stop() : start()));
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) stop(); });
})();
