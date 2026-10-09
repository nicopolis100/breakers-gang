// ===================================================================
// MINUTEURS LIBRES (durée au choix, notif + bip à la fin)
// ===================================================================
const TIMER_PRESETS = [
  { label: '5 min', ms: 5 * 60e3 }, { label: '10 min', ms: 10 * 60e3 }, { label: '15 min', ms: 15 * 60e3 },
  { label: '30 min', ms: 30 * 60e3 }, { label: '1 h', ms: 3600e3 }, { label: '2 h', ms: 2 * 3600e3 }, { label: '4 h', ms: 4 * 3600e3 },
];

function customTimerCardHtml(t) {
  const rem = customTimerRemaining(t);
  const done = rem <= 0;
  return `
    <div class="borne-card ${done ? 'ready' : 'cooldown'}" data-timer="${t.id}">
      <div class="borne-card-head">
        <div class="borne-name">${escapeHtml(t.nom)}</div>
        <div class="borne-actions">
          <button class="btn btn-icon btn-danger" data-action="del-timer" data-id="${t.id}" title="Supprimer">&#10005;</button>
        </div>
      </div>
      <div class="borne-notes">Durée : ${fmtDuration(t.durationMs)}</div>
      <div class="borne-timer" id="ctimer-${t.id}">${done ? 'Terminé' : fmtLongCountdown(rem)}</div>
      <button class="btn ${done ? 'btn-primary' : 'btn-ghost'} btn-full" data-action="restart-timer" data-id="${t.id}">↻ ${done ? 'Relancer' : 'Recommencer'}</button>
    </div>`;
}

function renderTimers() {
  const grid = document.getElementById('timersList');
  if (!grid) return;
  grid.innerHTML = DB.timers.length
    ? DB.timers.map(customTimerCardHtml).join('')
    : `<div class="empty-row" style="grid-column:1/-1;padding:26px;text-align:center;color:var(--text3);font-style:italic">Aucun minuteur — lance-en un ci-dessus.</div>`;
}

function readTimerForm() {
  const n = (id) => Math.max(0, parseInt(document.getElementById(id).value, 10) || 0);
  const ms = (n('tmH') * 3600 + n('tmM') * 60 + n('tmS')) * 1000;
  return { nom: document.getElementById('tmName').value.trim(), ms };
}

async function launchTimerFromForm() {
  const { nom, ms } = readTimerForm();
  if (ms <= 0) { toast('Indique une durée (heures / minutes / secondes).', 'error'); return; }
  DB.timers.push(newCustomTimer(nom, ms));
  await dbSave();
  document.getElementById('tmName').value = '';
  renderTimers();
  renderTimerPanel();
  toast(`Minuteur lancé : ${fmtDuration(ms)}.`, 'info');
}

async function restartTimer(id) {
  const t = DB.timers.find(x => x.id === id);
  if (!t) return;
  t.startAt = Date.now();
  t.notified = false;
  await dbSave();
  renderTimers();
  renderTimerPanel();
}

async function deleteTimer(id) {
  DB.timers = DB.timers.filter(x => x.id !== id);
  await dbSave();
  renderTimers();
  renderTimerPanel();
}

function initTimersPage() {
  const box = document.getElementById('tmPresets');
  box.innerHTML = TIMER_PRESETS.map((p, i) => `<button type="button" class="btn btn-ghost btn-sm" data-preset="${i}">${p.label}</button>`).join('');
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]');
    if (!b) return;
    const ms = TIMER_PRESETS[parseInt(b.dataset.preset, 10)].ms;
    const total = ms / 1000;
    document.getElementById('tmH').value = Math.floor(total / 3600);
    document.getElementById('tmM').value = Math.floor((total % 3600) / 60);
    document.getElementById('tmS').value = total % 60;
  });
  document.getElementById('btnTimerStart').onclick = launchTimerFromForm;
  document.getElementById('page-timers').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') launchTimerFromForm();
  });
  renderTimers();
}

/** Appelé chaque seconde : met à jour les compte-à-rebours et prévient à la fin. */
function tickCustomTimers() {
  if (!DB || !Array.isArray(DB.timers) || !DB.timers.length) return;
  let changed = false;
  for (const t of DB.timers) {
    const rem = customTimerRemaining(t);
    const done = rem <= 0;
    const el = document.getElementById(`ctimer-${t.id}`);
    if (el) el.textContent = done ? 'Terminé' : fmtLongCountdown(rem);
    const card = document.querySelector(`.borne-card[data-timer="${t.id}"]`);
    if (card) {
      card.classList.toggle('ready', done);
      card.classList.toggle('cooldown', !done);
      const btn = card.querySelector('[data-action="restart-timer"]');
      if (btn) { btn.classList.toggle('btn-primary', done); btn.classList.toggle('btn-ghost', !done); btn.textContent = done ? '↻ Relancer' : '↻ Recommencer'; }
    }
    if (done && !t.notified) {
      t.notified = true;
      changed = true;
      playBeep();
      toast(`⏰ ${t.nom} : terminé !`, 'success');
      try { if (window.Notification && Notification.permission === 'granted') new Notification('Minuteur terminé', { body: t.nom }); } catch (e) { /* tant pis */ }
    }
  }
  if (changed) dbSave();
}
