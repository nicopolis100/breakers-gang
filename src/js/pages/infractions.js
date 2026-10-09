// ===================================================================
// INFRACTIONS — ARRESTATIONS & MINUTEUR DE RÉCIDIVE
// ===================================================================
function renderInfractions() {
  const grid = document.getElementById('infractionsList');
  grid.innerHTML = DB.infractions.map(x => infractionCardHtml(x)).join('');
}

function infractionCardHtml(x) {
  const remaining = x.lastArrestAt ? infractionCooldownMs(x) - (Date.now() - x.lastArrestAt) : 0;
  const recidive = remaining > 0;
  return `
    <div class="infraction-card ${recidive ? 'recidive' : ''}" data-id="${x.id}">
      <div class="infraction-head">
        <span class="infraction-icon">${x.icon || '🚨'}</span>
        <div class="infraction-name">${escapeHtml(x.type)}</div>
        <div class="infraction-actions">
          <button class="btn btn-icon btn-ghost" data-action="edit-infraction" data-id="${x.id}" title="Modifier (nom, icône, délai)">&#9998;</button>
          <button class="btn btn-icon btn-danger" data-action="del-infraction" data-id="${x.id}" title="Supprimer">&#10005;</button>
        </div>
      </div>
      <div class="infraction-meta">Récidive : ${fmtDuration(infractionCooldownMs(x))}${x.notes ? ' · ' + escapeHtml(x.notes) : ''}</div>
      <div class="infraction-badge">⚠ Récidive</div>
      <div class="infraction-timer" id="infraction-timer-${x.id}">${recidive ? fmtLongCountdown(remaining) : '—'}</div>
      <button class="btn ${recidive ? 'btn-ghost' : 'btn-primary'} btn-full" data-action="arrestation" data-id="${x.id}">
        ${recidive ? 'En récidive...' : '🚔 Arrestation'}
      </button>
      <button class="btn btn-ghost btn-sm btn-full infraction-reset" data-action="reset-infraction" data-id="${x.id}" ${recidive ? '' : 'style="display:none"'} title="Annuler le minuteur (clic par erreur)">⟲ Annuler le minuteur</button>
    </div>`;
}

async function startArrestation(id) {
  const x = findInfraction(id);
  if (!x) return;
  x.lastArrestAt = Date.now();
  x.notified = false;
  await dbSave();
  tickInfractions();
  renderTimerPanel();
  toast(`Arrestation enregistrée pour "${x.type}" — récidive ${fmtDuration(infractionCooldownMs(x))}.`, 'info');
}

/** Boucle appelée chaque seconde : met à jour tous les minuteurs de récidive. */
function tickInfractions() {
  if (!DB || !Array.isArray(DB.infractions) || !DB.infractions.length) return;
  const now = Date.now();
  let changed = false;
  for (const x of DB.infractions) {
    if (!x.lastArrestAt) continue;
    const remaining = infractionCooldownMs(x) - (now - x.lastArrestAt);
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
  timerEl.textContent = recidive ? fmtLongCountdown(remaining) : '—';
  card.classList.toggle('recidive', recidive);
  const btn = card.querySelector('[data-action="arrestation"]');
  if (btn) {
    btn.classList.toggle('btn-primary', !recidive);
    btn.classList.toggle('btn-ghost', recidive);
    btn.textContent = recidive ? 'En récidive...' : '🚔 Arrestation';
  }
  const rst = card.querySelector('.infraction-reset');
  if (rst) rst.style.display = recidive ? '' : 'none';
  if (wasRecidive && !recidive) {
    toast(`"${x.type}" : fin de la période de récidive.`, 'success');
  }
}

async function resetInfraction(id) {
  const x = findInfraction(id);
  if (!x) return;
  x.lastArrestAt = null;
  x.notified = true;
  await dbSave();
  renderInfractions();
  renderTimerPanel();
  toast(`Minuteur de « ${x.type} » annulé.`, 'info');
}

function openInfractionModal(id) {
  const isNew = !id;
  const x = isNew ? newInfraction({ type: '', icon: '🚨' }) : findInfraction(id);
  if (!x) return;
  const cd = infractionCooldownMs(x);
  const h = Math.floor(cd / 3600000), m = Math.round((cd % 3600000) / 60000);
  const box = openModal(`
    <h2>${isNew ? 'Nouvelle infraction' : "Modifier l'infraction"}</h2>
    <div class="field"><label>Nom de l'infraction</label><input type="text" id="f-nom" value="${escapeHtml(x.type)}" placeholder="Ex : Braquage de banque"></div>
    <div class="field"><label>Icône (un emoji)</label><input type="text" id="f-icon" maxlength="4" value="${escapeHtml(x.icon || '🚨')}" style="width:90px"></div>
    <div class="field"><label>Délai de récidive</label>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="number" id="f-h" min="0" step="1" value="${h}" style="width:80px"> <span class="inline-label">h</span>
        <input type="number" id="f-m" min="0" max="59" step="1" value="${m}" style="width:80px"> <span class="inline-label">min</span>
      </div>
    </div>
    <div class="field"><label>Notes (facultatif)</label><input type="text" id="f-notes" value="${escapeHtml(x.notes || '')}" placeholder="Peine, lieu, rappel…"></div>
    <div class="modal-actions">
      ${isNew ? '' : '<button class="btn btn-danger" id="btnDelete" style="margin-right:auto">Supprimer</button>'}
      <button class="btn btn-ghost" id="btnCancel">Annuler</button>
      <button class="btn btn-primary" id="btnSave">Enregistrer</button>
    </div>
  `);
  box.querySelector('#btnCancel').onclick = closeModal;
  if (!isNew) box.querySelector('#btnDelete').onclick = () => { closeModal(); deleteInfraction(x.id); };
  box.querySelector('#btnSave').onclick = async () => {
    const nom = box.querySelector('#f-nom').value.trim();
    if (!nom) { toast("Le nom de l'infraction est obligatoire.", 'error'); return; }
    const hh = Math.max(0, parseInt(box.querySelector('#f-h').value, 10) || 0);
    const mm = Math.max(0, parseInt(box.querySelector('#f-m').value, 10) || 0);
    const ms = (hh * 60 + mm) * 60000;
    if (ms <= 0) { toast('Indique un délai de récidive supérieur à 0.', 'error'); return; }
    x.type = nom;
    x.icon = box.querySelector('#f-icon').value.trim() || '🚨';
    x.cooldownMs = ms;
    x.notes = box.querySelector('#f-notes').value.trim();
    if (isNew) DB.infractions.push(x);
    await dbSave();
    closeModal();
    renderInfractions();
    renderTimerPanel();
    toast('Infraction enregistrée.', 'success');
  };
}

async function deleteInfraction(id) {
  const x = findInfraction(id);
  if (!x) return;
  if (!confirm(`Supprimer l'infraction "${x.type}" ?`)) return;
  DB.infractions = DB.infractions.filter(i => i.id !== id);
  await dbSave();
  renderInfractions();
  renderTimerPanel();
  toast('Infraction supprimée.', 'success');
}
