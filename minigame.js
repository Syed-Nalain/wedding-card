// Screens for Dhol Beat: name + team form, play screen, results + scoreboard.
window.MiniGame = function (gameId, { seconds, start }) {
  const WS = window.WeddingScores, Board = WS.board(gameId);
  const $ = s => document.querySelector(s);
  const screens = ['start', 'play', 'over'].map(n => [n, $(`[data-screen="${n}"]`)]);
  const show = n => { screens.forEach(([k, el]) => { el.hidden = k !== n; }); window.scrollTo({ top: 0 }); };
  const form = $('[data-player-form]'), nameInput = $('#playerName');
  let player = WS.player.get(), running = null;
  if (player) {
    nameInput.value = player.name;
    const r = form.querySelector(`input[name="team"][value="${CSS.escape(player.team)}"]`); if (r) r.checked = true;
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = nameInput.value.replace(/\s+/g, ' ').trim().slice(0, 24);
    const team = form.querySelector('input[name="team"]:checked')?.value;
    $('[data-name-error]').hidden = !!name; $('[data-team-error]').hidden = !!team;
    if (!name || !team) return;
    player = { name, team }; WS.player.set(player); play();
  });
  $('[data-show-board]').addEventListener('click', () => over(null));
  $('[data-play-again]').addEventListener('click', () => (player ? play() : show('start')));
  $('[data-change-player]').addEventListener('click', () => show('start'));

  const hud = { score: $('[data-hud-score]'), time: $('[data-hud-time]') };
  function play() {
    show('play');
    $('[data-hud-name]').textContent = player.name; $('[data-hud-team]').textContent = player.team.toUpperCase();
    let score = 0, left = seconds, done = false;
    hud.score.textContent = 0; hud.time.textContent = left;
    const api = {
      add(n) { score = Math.max(0, score + Math.round(n)); hud.score.textContent = score; return score; },
      get score() { return score; },
      addTime(s) { left += s; hud.time.textContent = left; },
      finish(stats) { if (done) return; done = true; clearInterval(timer); running?.stop?.(); over({ name: player.name, team: player.team, score, at: Date.now() }, stats); }
    };
    const timer = setInterval(() => { left--; hud.time.textContent = Math.max(0, left); if (left <= 0) api.finish(running?.stats?.()); }, 1000);
    running = start(api);
  }

  async function over(entry, stats) {
    show('over');
    $('[data-result]').hidden = !entry;
    let note = '';
    if (entry) {
      $('[data-result-name]').textContent = entry.name; $('[data-result-score]').textContent = entry.score;
      $('[data-result-team]').textContent = entry.team; $('[data-result-stats]').textContent = stats || '';
      try { await Board.add(entry); } catch (_) { note = 'Saved on this phone only.'; }
    }
    let rows;
    try { rows = await Board.top(1000); } catch (_) { rows = Board.localTop(1000); note = 'Could not reach the shared scoreboard. Showing scores from this phone.'; }
    if (!Board.shared && !note) note = 'Scores played on this phone.';
    const st = WS.teamStandings(rows);
    WS.renderStandings($('[data-standings]'), st, player && player.team);
    $('[data-banter]').textContent = st[0]?.total ? `${st[0].team} aage hain! Baqi teams, kuch karo! 🔥` : 'No team has scored yet. Be the first!';
    const rank = WS.renderRows($('[data-board]'), rows.slice(0, 15), entry && entry.name);
    $('[data-result-rank]').textContent = entry && rank ? (rank === 1 ? 'You are #1! 👑' : `You are #${rank} on the scoreboard.`) : '';
    $('[data-board-note]').textContent = note;
  }
};
