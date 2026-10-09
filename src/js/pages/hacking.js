// ===================================================================
// HACKING — BORNES & MINUTEUR
// ===================================================================
function renderHacking() {
  const grid = document.getElementById('hackingList');
  if (!DB.bornes.length) {
    grid.innerHTML = `<div class="empty-row" style="grid-column:1/-1;padding:26px;text-align:center;color:var(--text3);font-style:italic">
      Aucune borne pour l'instant — ajoute la première borne hackable que tu repères en jeu.
    </div>`;
    return;
  }
  grid.innerHTML = DB.bornes.map(b => borneCardHtml(b)).join('');
}

function borneCardHtml(b) {
  const remaining = b.lastBraqueAt ? HACK_COOLDOWN_MS - (Date.now() - b.lastBraqueAt) : 0;
  const ready = remaining <= 0;
  return `
    <div class="borne-card ${ready ? 'ready' : 'cooldown'}" data-id="${b.id}">
      <div class="borne-card-head">
        <div class="borne-name">${escapeHtml(b.nom)}</div>
        <div class="borne-actions">
          <button class="btn btn-icon btn-ghost" data-action="edit-borne" data-id="${b.id}" title="Modifier">&#9998;</button>
          <button class="btn btn-icon btn-danger" data-action="del-borne" data-id="${b.id}" title="Supprimer">&#10005;</button>
        </div>
      </div>
      ${b.notes ? `<div class="borne-notes">${escapeHtml(b.notes)}</div>` : ''}
      <div class="borne-timer" id="timer-${b.id}">${ready ? 'Disponible' : fmtCountdown(remaining)}</div>
      <button class="btn ${ready ? 'btn-primary' : 'btn-ghost'} btn-full" data-action="braquer" data-id="${b.id}" ${ready ? '' : 'disabled'}>
        ${ready ? '&#9889; Braqué' : 'En recharge...'}
      </button>
    </div>`;
}

function openBorneModal(id) {
  const isNew = !id;
  const b = isNew ? newBorne() : findBorne(id);
  const box = openModal(`
    <h2>${isNew ? 'Nouvelle borne' : 'Modifier la borne'}</h2>
    <div class="field"><label>Nom / emplacement</label><input type="text" id="f-nom" value="${escapeHtml(b.nom)}" placeholder="Ex : Borne Banque Pacific"></div>
    <div class="field"><label>Notes</label><input type="text" id="f-notes" value="${escapeHtml(b.notes)}" placeholder="Précisions, code d'accès..."></div>
    <div class="modal-actions">
      ${isNew ? '' : '<button class="btn btn-danger" id="btnDelete" style="margin-right:auto">Supprimer</button>'}
      <button class="btn btn-ghost" id="btnCancel">Annuler</button>
      <button class="btn btn-primary" id="btnSave">Enregistrer</button>
    </div>
  `);
  box.querySelector('#btnCancel').onclick = closeModal;
  if (!isNew) {
    box.querySelector('#btnDelete').onclick = () => { closeModal(); deleteBorne(b.id); };
  }
  box.querySelector('#btnSave').onclick = async () => {
    const nom = box.querySelector('#f-nom').value.trim();
    if (!nom) { toast('Le nom de la borne est obligatoire.', 'error'); return; }
    b.nom = nom;
    b.notes = box.querySelector('#f-notes').value.trim();
    if (isNew) DB.bornes.push(b);
    await dbSave();
    closeModal();
    renderHacking();
    toast('Borne enregistrée.', 'success');
  };
}

function deleteBorne(id) {
  const b = findBorne(id);
  if (!b) return;
  if (!confirm(`Supprimer la borne "${b.nom}" ?`)) return;
  DB.bornes = DB.bornes.filter(x => x.id !== id);
  dbSave();
  renderHacking();
  toast('Borne supprimée.', 'success');
}

async function startBraquage(id) {
  const b = findBorne(id);
  if (!b) return;
  b.lastBraqueAt = Date.now();
  b.notified = false;
  await dbSave();
  tickBornes();
  toast(`Minuteur lancé pour "${b.nom}" — 30 min.`, 'info');
}

/** Boucle appelée chaque seconde : met à jour tous les compte-à-rebours et déclenche la notif à 0. */
function tickBornes() {
  if (!DB || !Array.isArray(DB.bornes) || !DB.bornes.length) return;
  const now = Date.now();
  let changed = false;
  for (const b of DB.bornes) {
    if (!b.lastBraqueAt) continue;
    const remaining = HACK_COOLDOWN_MS - (now - b.lastBraqueAt);
    if (remaining <= 0 && !b.notified) {
      b.notified = true;
      notifyBorneReady(b);
      changed = true;
    }
    updateBorneTimerDisplay(b, remaining);
  }
  if (changed) dbSave();
}

function updateBorneTimerDisplay(b, remaining) {
  const timerEl = document.getElementById(`timer-${b.id}`);
  const card = document.querySelector(`.borne-card[data-id="${b.id}"]`);
  if (!timerEl || !card) return;
  const ready = remaining <= 0;
  timerEl.textContent = ready ? 'Disponible' : fmtCountdown(remaining);
  card.classList.toggle('ready', ready);
  card.classList.toggle('cooldown', !ready);
  const btn = card.querySelector('[data-action="braquer"]');
  if (btn) {
    btn.disabled = !ready;
    btn.classList.toggle('btn-primary', ready);
    btn.classList.toggle('btn-ghost', !ready);
    btn.innerHTML = ready ? '&#9889; Braqué' : 'En recharge...';
  }
}

function notifyBorneReady(b) {
  playBeep();
  toast(`⚡ Borne "${b.nom}" de nouveau disponible !`, 'success');
  try {
    if (window.Notification) {
      if (Notification.permission === 'granted') {
        new Notification('Borne disponible', { body: `${b.nom} peut être hackée.` });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          if (p === 'granted') new Notification('Borne disponible', { body: `${b.nom} peut être hackée.` });
        });
      }
    }
  } catch (e) { /* notifications non supportées, tant pis */ }
  const card = document.querySelector(`.borne-card[data-id="${b.id}"]`);
  if (card) {
    card.classList.add('ready-flash');
    setTimeout(() => card.classList.remove('ready-flash'), 3200);
  }
}

/** Bip sonore généré via Web Audio (aucun fichier audio nécessaire). */
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [0, 0.22, 0.44];
    notes.forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = i % 2 === 0 ? 880 : 1100;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + t;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      osc.start(start);
      osc.stop(start + 0.22);
    });
    setTimeout(() => ctx.close(), 900);
  } catch (e) { console.error('Bip impossible :', e); }
}

// ===================================================================
// HACKING — ZONES (Maze Bank, Parking Rouge) : minuteur de 30 min avant de retourner dans la zone
// ===================================================================
function renderHackZones() {
  document.getElementById('hackZonesList').innerHTML = DB.hackZones.map(z => hackZoneCardHtml(z)).join('');
}

function hackZoneCardHtml(z) {
  const remaining = z.lastAt ? HACK_COOLDOWN_MS - (Date.now() - z.lastAt) : 0;
  const ready = remaining <= 0;
  return `
    <div class="borne-card ${ready ? 'ready' : 'cooldown'}" data-zone="${z.id}">
      <div class="borne-card-head"><div class="borne-name">&#128205; ${escapeHtml(z.nom)}</div></div>
      <div class="borne-timer" id="zone-timer-${z.id}">${ready ? 'Zone disponible' : fmtCountdown(remaining)}</div>
      <button class="btn ${ready ? 'btn-primary' : 'btn-ghost'} btn-full" data-action="zone-start" data-id="${z.id}">
        ${ready ? '&#9201; Lancer 30 min' : 'Relancer le minuteur'}
      </button>
    </div>`;
}

async function startHackZone(id) {
  const z = findHackZone(id);
  if (!z) return;
  z.lastAt = Date.now();
  z.notified = false;
  await dbSave();
  tickHackZones();
  toast(`Minuteur lancé pour "${z.nom}" — 30 min avant d'y retourner.`, 'info');
}

function tickHackZones() {
  if (!DB || !Array.isArray(DB.hackZones)) return;
  const now = Date.now();
  let changed = false;
  for (const z of DB.hackZones) {
    if (!z.lastAt) continue;
    const remaining = HACK_COOLDOWN_MS - (now - z.lastAt);
    if (remaining <= 0 && !z.notified) {
      z.notified = true;
      changed = true;
      notifyHackZoneReady(z);
    }
    updateHackZoneDisplay(z, remaining);
  }
  if (changed) dbSave();
}

function updateHackZoneDisplay(z, remaining) {
  const timerEl = document.getElementById(`zone-timer-${z.id}`);
  const card = document.querySelector(`.borne-card[data-zone="${z.id}"]`);
  if (!timerEl || !card) return;
  const ready = remaining <= 0;
  timerEl.textContent = ready ? 'Zone disponible' : fmtCountdown(remaining);
  card.classList.toggle('ready', ready);
  card.classList.toggle('cooldown', !ready);
  const btn = card.querySelector('[data-action="zone-start"]');
  if (btn) {
    btn.classList.toggle('btn-primary', ready);
    btn.classList.toggle('btn-ghost', !ready);
    btn.innerHTML = ready ? '&#9201; Lancer 30 min' : 'Relancer le minuteur';
  }
}

function notifyHackZoneReady(z) {
  playBeep();
  toast(`📍 ${z.nom} : tu peux y retourner !`, 'success');
  try {
    if (window.Notification && Notification.permission === 'granted') {
      new Notification('Zone disponible', { body: `${z.nom} : les 30 minutes sont écoulées.` });
    }
  } catch (e) { /* notifications non supportées, tant pis */ }
  const card = document.querySelector(`.borne-card[data-zone="${z.id}"]`);
  if (card) {
    card.classList.add('ready-flash');
    setTimeout(() => card.classList.remove('ready-flash'), 3200);
  }
}
