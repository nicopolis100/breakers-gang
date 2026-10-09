// ===================================================================
// INFRACTIONS — ARRESTATIONS & MINUTEUR DE RÉCIDIVE
// ===================================================================
function renderInfractions() {
  const grid = document.getElementById('infractionsList');
  grid.innerHTML = DB.infractions.map(x => infractionCardHtml(x)).join('');
}

function infractionCardHtml(x) {
  const remaining = x.lastArrestAt ? INFRACTION_COOLDOWN_MS - (Date.now() - x.lastArrestAt) : 0;
  const recidive = remaining > 0;
  return `
    <div class="infraction-card ${recidive ? 'recidive' : ''}" data-id="${x.id}">
      <div class="infraction-head">
        <span class="infraction-icon">${x.icon || '🚨'}</span>
        <div class="infraction-name">${escapeHtml(x.type)}</div>
      </div>
      <div class="infraction-badge">⚠ Récidive</div>
      <div class="infraction-timer" id="infraction-timer-${x.id}">${recidive ? fmtCountdown(remaining) : '—'}</div>
      <button class="btn ${recidive ? 'btn-ghost' : 'btn-primary'} btn-full" data-action="arrestation" data-id="${x.id}">
        ${recidive ? 'En récidive...' : '🚔 Arrestation'}
      </button>
    </div>`;
}

async function startArrestation(id) {
  const x = findInfraction(id);
  if (!x) return;
  x.lastArrestAt = Date.now();
  x.notified = false;
  await dbSave();
  tickInfractions();
  toast(`Arrestation enregistrée pour "${x.type}" — récidive 4h.`, 'info');
}

/** Boucle appelée chaque seconde : met à jour tous les minuteurs de récidive. */
function tickInfractions() {
  if (!DB || !Array.isArray(DB.infractions) || !DB.infractions.length) return;
  const now = Date.now();
  let changed = false;
  for (const x of DB.infractions) {
    if (!x.lastArrestAt) continue;
    const remaining = INFRACTION_COOLDOWN_MS - (now - x.lastArrestAt);
    if (remaining <= 0 && x.notified === false) {
      x.notified = true;
      changed = true;
      playBeep();
      try { if (window.Notification && Notification.permission === 'granted') new Notification('Fin de récidive', { body: `${x.type} : tu n'es plus en récidive.` }); } catch (e) { /* tant pis */ }
    }
    updateInfractionTimerDisplay(x, remaining);
  }
  if (changed) dbSave();
}

function updateInfractionTimerDisplay(x, remaining) {
  const timerEl = document.getElementById(`infraction-timer-${x.id}`);
  const card = document.querySelector(`.infraction-card[data-id="${x.id}"]`);
  if (!timerEl || !card) return;
  const recidive = remaining > 0;
  const wasRecidive = card.classList.contains('recidive');
  timerEl.textContent = recidive ? fmtCountdown(remaining) : '—';
  card.classList.toggle('recidive', recidive);
  const btn = card.querySelector('[data-action="arrestation"]');
  if (btn) {
    btn.classList.toggle('btn-primary', !recidive);
    btn.classList.toggle('btn-ghost', recidive);
    btn.textContent = recidive ? 'En récidive...' : '🚔 Arrestation';
  }
  if (wasRecidive && !recidive) {
    toast(`"${x.type}" : fin de la période de récidive.`, 'success');
  }
}
