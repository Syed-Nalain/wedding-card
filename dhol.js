// Dhol Beat: tap each lane when its note reaches the line. The beat speeds up; streaks multiply points.
MiniGame('dhol', { seconds: 45, start(api) {
  const lanes = [...document.querySelectorAll('[data-lane]')], pads = [...document.querySelectorAll('[data-pad]')];
  const comboEl = document.querySelector('[data-streak]'), judgeEl = document.querySelector('[data-judge]');
  const HIT = 0.86; // where the line is (fraction of lane height)
  let notes = [], combo = 0, best = 0, perfect = 0, good = 0, miss = 0, raf, t0 = performance.now(), alive = true;
  let ac; const sound = lane => {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime, f = [70, 140, 320][lane];
      o.frequency.setValueAtTime(f * 2, t); o.frequency.exponentialRampToValueAtTime(f, t + .08);
      g.gain.setValueAtTime(.6, t); g.gain.exponentialRampToValueAtTime(.001, t + (lane ? .12 : .25));
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .3);
    } catch (_) {}
  };
  const mult = () => Math.min(4, 1 + Math.floor(combo / 8));
  function judge(text, cls) { judgeEl.textContent = text; judgeEl.className = `judge ${cls}`; void judgeEl.offsetWidth; judgeEl.classList.add('show'); }
  function setCombo() { comboEl.textContent = combo > 2 ? `🔥 ${combo} combo · x${mult()}` : ''; }
  // Fair rounds: every round has the same number of beats and double beats, and the same speed-up.
  // Lanes, exact timing and which beats are doubles are random.
  const FALL0 = 1700, FALL1 = 950, LAST_HIT = 43400, chart = [];
  const fallAt = t => FALL0 + (FALL1 - FALL0) * Math.min(1, t / 45000);
  (() => {
    const times = [];
    for (let t = 2600; t < LAST_HIT; t += 720 - 430 * (t / 45000)) times.push([t, 720 - 430 * (t / 45000)]);
    const late = times.map((_, i) => i).filter(i => times[i][0] > 15000);
    for (let i = late.length - 1; i > 0; i--) { const k = Math.random() * (i + 1) | 0; [late[i], late[k]] = [late[k], late[i]]; }
    const doubles = new Set(late.slice(0, 12));
    times.forEach(([t, gap], i) => {
      const hit = t + (Math.random() - .5) * gap * .5, fall = fallAt(t), lane = Math.random() * 3 | 0;
      chart.push({ lane, fall, at: hit - fall });
      if (doubles.has(i)) chart.push({ lane: (lane + 1 + (Math.random() * 2 | 0)) % 3, fall, at: hit - fall });
    });
    chart.sort((a, b) => a.at - b.at);
  })();
  function spawn(now) {
    while (chart.length && now - t0 >= chart[0].at) {
      const c = chart.shift(), n = document.createElement('i');
      n.className = `note n${c.lane}`; lanes[c.lane].appendChild(n);
      notes.push({ lane: c.lane, el: n, born: t0 + c.at, fall: c.fall, hit: false });
    }
  }
  function frame(now) {
    if (!alive) return;
    spawn(now);
    notes = notes.filter(n => {
      const p = (now - n.born) / n.fall * HIT;
      n.el.style.top = `${p * 100}%`;
      if (p > HIT + .1) { n.el.remove(); if (!n.hit) { miss++; combo = 0; setCombo(); judge('Miss', 'bad'); } return false; }
      return true;
    });
    raf = requestAnimationFrame(frame);
  }
  function tap(lane) {
    if (!alive) return;
    sound(lane); pads[lane].classList.add('hit'); setTimeout(() => pads[lane].classList.remove('hit'), 110);
    const now = performance.now();
    let bestN = null, bestD = 1;
    notes.forEach(n => { if (n.lane !== lane || n.hit) return; const d = Math.abs((now - n.born) / n.fall * HIT - HIT); if (d < bestD) { bestD = d; bestN = n; } });
    if (bestN && bestD < .13) {
      bestN.hit = true; bestN.el.classList.add('gone'); combo++; best = Math.max(best, combo);
      if (bestD < .055) { perfect++; api.add(30 * mult()); judge(`Perfect! +${30 * mult()}`, 'good'); } else { good++; api.add(15 * mult()); judge(`Good +${15 * mult()}`, 'ok'); }
    } else { combo = 0; api.add(-5); judge('Off beat −5', 'bad'); }
    setCombo();
  }
  const onPad = e => { e.preventDefault(); tap(+e.currentTarget.dataset.pad); };
  pads.forEach(p => p.addEventListener('pointerdown', onPad));
  const KEYS = { a: 0, s: 1, d: 2, j: 0, k: 1, l: 2, arrowleft: 0, arrowdown: 1, arrowright: 2 };
  const onKey = e => { const l = KEYS[e.key.toLowerCase()]; if (l !== undefined && !e.repeat) { e.preventDefault(); tap(l); } };
  document.addEventListener('keydown', onKey);
  lanes.forEach(l => l.querySelectorAll('.note').forEach(n => n.remove()));
  comboEl.textContent = ''; judgeEl.textContent = '';
  raf = requestAnimationFrame(frame);
  return {
    stop() { alive = false; cancelAnimationFrame(raf); pads.forEach(p => p.removeEventListener('pointerdown', onPad)); document.removeEventListener('keydown', onKey); },
    stats: () => `${perfect} perfect · ${good} good · ${miss} missed · best combo ${best}`
  };
} });
