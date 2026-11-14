// Games page: draw the Shagun Catch icons and load the top 5 of each game's scoreboard.
(() => {
  const WS = window.WeddingScores;

  // Small copies of the Shagun Catch item drawings for the game card.
  function draw(c, kind) {
    const r = 22; c.save(); c.translate(32, 34);
    if (kind === 'ladoo') {
      const g = c.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r); g.addColorStop(0, '#ffd27a'); g.addColorStop(1, '#e88a10');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
      c.fillStyle = '#b8620a'; for (let i = 0; i < 9; i++) { const a = i * 2.4, d = r * (.25 + (i % 3) * .2); c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, r * .07, 0, 7); c.fill(); }
    } else if (kind === 'marigold') {
      for (let ring = 0; ring < 3; ring++) { const n = 12 - ring * 3, rr = r * (.75 - ring * .22); c.fillStyle = ['#e8770c', '#f59a12', '#ffc23a'][ring];
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + ring; c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * (.32 - ring * .06), 0, 7); c.fill(); } }
      c.fillStyle = '#ffd24d'; c.beginPath(); c.arc(0, 0, r * .2, 0, 7); c.fill();
    } else if (kind === 'shagun') {
      const w = r * 1.8, h = r * 1.25;
      c.fillStyle = '#c2185b'; c.fillRect(-w / 2, -h / 2, w, h);
      c.strokeStyle = '#ffd24d'; c.lineWidth = r * .08; c.strokeRect(-w / 2 + r * .14, -h / 2 + r * .14, w - r * .28, h - r * .28);
      c.fillStyle = '#e0457b'; c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(0, h * .1); c.lineTo(w / 2, -h / 2); c.closePath(); c.fill();
      c.fillStyle = '#ffd24d'; c.beginPath(); c.arc(0, h * .08, r * .22, 0, 7); c.fill();
    }
    c.restore();
  }
  document.querySelectorAll('canvas[data-icon]').forEach(cv => draw(cv.getContext('2d'), cv.dataset.icon));

  const me = WS.player.get();
  Object.keys(WS.GAMES).forEach(async id => {
    const list = document.querySelector(`[data-board="${id}"]`);
    const winner = document.querySelector(`[data-winner="${id}"] strong`);
    const board = WS.board(id);
    let rows;
    try { rows = await board.top(1000); } catch (_) { rows = board.localTop(1000); }
    const st = document.querySelector(`[data-standings="${id}"]`);
    if (st) { WS.renderStandings(st, WS.teamStandings(rows), me && me.team); WS.renderRows(list, rows.slice(0, 5), me && me.name); return; }
    rows = rows.slice(0, 5);
    WS.renderRows(list, rows, me && me.name);
    if (rows.length && WS.TEAM_CLASS[rows[0].team]) {
      winner.textContent = rows[0].team;
      winner.classList.add(WS.TEAM_CLASS[rows[0].team]);
    }
  });
})();
