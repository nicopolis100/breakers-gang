// ===================================================================
// TRIS DE COLONNES (cliquer sur un en-tête de tableau)
// ===================================================================
function cellSortValue(td) {
  if (!td) return '';
  if (td.dataset.sort != null) { const n = parseFloat(td.dataset.sort); return isNaN(n) ? td.dataset.sort : n; }
  const raw = td.textContent.trim();
  const t = raw.replace(/[  \s]/g, '').replace(',', '.');
  if (/^[−-]?\d+(\.\d+)?[$x%]?$/.test(t)) return parseFloat(t.replace('−', '-'));
  return raw.toLowerCase();
}

function enableTableSort(table) {
  const tbody = table.tBodies[0];
  const ths = Array.from(table.tHead ? table.tHead.rows[0].cells : []);
  if (!tbody || !ths.length) return;
  const state = { col: -1, dir: 1 };
  let obs = null;

  const apply = () => {
    if (state.col < 0) return;
    if (obs) obs.disconnect();
    const rows = Array.from(tbody.rows).filter(r => !r.classList.contains('empty-row'));
    rows.sort((a, b) => {
      const va = cellSortValue(a.cells[state.col]), vb = cellSortValue(b.cells[state.col]);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * state.dir;
      return String(va).localeCompare(String(vb), 'fr') * state.dir;
    });
    rows.forEach(r => tbody.appendChild(r));
    if (obs) obs.observe(tbody, { childList: true });
  };

  ths.forEach((th, idx) => {
    if (!th.textContent.trim()) return; // colonne d'actions
    th.classList.add('sortable');
    th.title = 'Cliquer pour trier';
    th.addEventListener('click', () => {
      if (state.col === idx) state.dir = -state.dir; else { state.col = idx; state.dir = 1; }
      ths.forEach(t => t.classList.remove('asc', 'desc'));
      th.classList.add(state.dir === 1 ? 'asc' : 'desc');
      apply();
    });
  });
  // Quand le tableau est redessiné (nouvelle donnée), on réapplique le tri choisi.
  obs = new MutationObserver(() => apply());
  obs.observe(tbody, { childList: true });
}

// ===================================================================
// PANNEAU DES TIMERS ACTIFS (barre latérale, visible sur tous les onglets)
// ===================================================================
function collectActiveTimers() {
  const now = Date.now();
  const out = [];
  for (const b of DB.bornes) {
    if (!b.lastBraqueAt) continue;
    out.push({ label: `Borne ${b.nom}`, remaining: HACK_COOLDOWN_MS - (now - b.lastBraqueAt) });
  }
  for (const z of DB.hackZones) {
    if (!z.lastAt) continue;
    out.push({ label: z.nom, remaining: HACK_COOLDOWN_MS - (now - z.lastAt) });
  }
  for (const t of DB.timers) {
    out.push({ label: t.nom, remaining: customTimerRemaining(t) });
  }
  for (const x of DB.infractions) {
    if (!x.lastArrestAt) continue;
    out.push({ label: `Récidive · ${x.type}`, remaining: infractionCooldownMs(x) - (now - x.lastArrestAt) });
  }
  return out.filter(t => t.remaining > 0).sort((a, b) => a.remaining - b.remaining);
}

function fmtLongCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function renderTimerPanel() {
  const el = document.getElementById('timerPanel');
  if (!el || !DB) return;
  const list = collectActiveTimers();
  el.innerHTML = `<div class="timer-title">⏱ Timers actifs</div>` + (list.length
    ? list.map(t => `<div class="timer-row"><span>${escapeHtml(t.label)}</span><span class="t">${fmtLongCountdown(t.remaining)}</span></div>`).join('')
    : `<div class="timer-none">Aucun timer en cours</div>`);
}

// ===================================================================
// RECHERCHE GLOBALE (Ctrl+K)
// ===================================================================
const PAGE_LABELS = [
  ['dashboard', 'Accueil'], ['storages', 'Stockages'], ['items', 'Objets'], ['recipes', 'Recettes'],
  ['prices', 'Prix de revente'], ['hacking', 'Hacking'], ['infractions', 'Infractions'], ['pm', 'PM'],
  ['timers', 'Minuteurs'], ['bilan', 'Bilan'], ['history', 'Historique'], ['map', 'Carte'],
];

function paletteEntries() {
  const e = [];
  for (const [id, label] of PAGE_LABELS) e.push({ icon: '📄', label: `Aller à : ${label}`, sub: 'Page', run: () => showPage(id) });
  for (const i of DB.items) e.push({ icon: catIcon(i.categorie), label: i.nom, sub: `Objet · ${i.quantite} en stock`, run: () => { showPage('items'); openItemModal(i.id); } });
  for (const r of DB.recipes) e.push({ icon: '🔧', label: r.nomObjet, sub: 'Recette', run: () => { if (r.ingredients && r.ingredients.length) { showPage('storages'); openCraftDetailModal(r.id); } else { showPage('recipes'); openRecipeModal(r.id); } } });
  for (const s of DB.storages) e.push({ icon: '📦', label: s.nom, sub: 'Stockage', run: () => { showPage('storages'); openStorageModal(s.id); } });
  for (const p of DB.pms) e.push({ icon: '🤝', label: p.nom, sub: 'PM', run: () => { showPage('pm'); openPmTariffsModal(p.id); } });
  for (const b of DB.bornes) e.push({ icon: '🖥', label: b.nom, sub: 'Borne', run: () => showPage('hacking') });
  for (const m of DB.markers) e.push({ icon: '📍', label: m.titre || '(balise)', sub: 'Carte', run: () => { showPage('map'); openMarkerModal(m.id); } });
  return e;
}

function openPalette() {
  const box = openModal(`
    <input type="text" id="palInput" class="palette-input" placeholder="🔍 Chercher un objet, une recette, une PM, une page…" autocomplete="off">
    <div class="palette-list" id="palList"></div>
  `);
  box.style.width = '560px';
  const input = box.querySelector('#palInput');
  const listEl = box.querySelector('#palList');
  const all = paletteEntries();
  let shown = [], sel = 0;

  const draw = () => {
    const q = normText(input.value);
    shown = (q ? all.filter(x => normText(x.label).includes(q)) : all.filter(x => x.sub === 'Page')).slice(0, 30);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    listEl.innerHTML = shown.length
      ? shown.map((x, i) => `<div class="palette-item ${i === sel ? 'sel' : ''}" data-i="${i}"><span>${x.icon}</span><span>${escapeHtml(x.label)}</span><span class="sub">${escapeHtml(x.sub)}</span></div>`).join('')
      : `<div class="palette-empty">Aucun résultat.</div>`;
    const cur = listEl.querySelector('.sel');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  };
  const choose = (i) => { const x = shown[i]; if (!x) return; closeModal(); x.run(); };

  input.addEventListener('input', () => { sel = 0; draw(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
  });
  listEl.addEventListener('click', (e) => {
    const it = e.target.closest('.palette-item');
    if (it) choose(parseInt(it.dataset.i, 10));
  });
  draw();
}


// ===================================================================
// EFFET MATRIX (pluie de caractères en fond, discret) — désactivable depuis l'accueil
// ===================================================================
const MatrixFx = (() => {
  let cv, ctx, drops = [], timer = null, cols = 0;
  const FS = 16;
  const CHARS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜ01234567890ABCDEF<>/{}[]#$%';
  function resize() {
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    cols = Math.ceil(cv.width / FS);
    drops = Array.from({ length: cols }, () => Math.random() * -50);
  }
  function frame() {
    ctx.fillStyle = 'rgba(3,8,6,.12)';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#00ff9c';
    ctx.font = FS + 'px monospace';
    for (let i = 0; i < cols; i++) {
      const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
      ctx.fillText(ch, i * FS, drops[i] * FS);
      if (drops[i] * FS > cv.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }
  function start() {
    if (timer) return;
    cv.style.display = '';
    timer = setInterval(frame, 70);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (ctx) ctx.clearRect(0, 0, cv.width, cv.height);
    if (cv) cv.style.display = 'none';
  }
  function init() {
    cv = document.getElementById('matrix');
    if (!cv) return;
    ctx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (timer) { clearInterval(timer); timer = null; } } else if (enabled()) start(); });
    const chk = document.getElementById('chkMatrix');
    const on = enabled();
    if (chk) {
      chk.checked = on;
      chk.addEventListener('change', () => {
        try { localStorage.setItem('breakers.matrix', chk.checked ? '1' : '0'); } catch (e) { /* tant pis */ }
        chk.checked ? start() : stop();
      });
    }
    on ? start() : stop();
  }
  function enabled() {
    try { return localStorage.getItem('breakers.matrix') !== '0'; } catch (e) { return true; }
  }
  return { init };
})();


// ===================================================================
// ANNULER LA DERNIÈRE ACTION
// ===================================================================
function updateUndoButton() {
  const b = document.getElementById('btnUndo');
  if (!b) return;
  const last = UNDO[UNDO.length - 1];
  b.disabled = !last;
  b.title = last ? `Annuler : ${last.label}  (Ctrl+Z)` : 'Rien à annuler';
  b.textContent = last ? `↶ Annuler (${UNDO.length})` : '↶ Annuler';
}

function rerenderEverything() {
  renderDashboard(); renderInventoryGrid(); renderCraftAvailability(); renderItems(); renderPrices();
  renderPmBasePrices(); renderPMs(); updatePmCalcTotals(); renderHistory(); renderBilan(); renderShoppingList();
}

async function undoLast() {
  const label = applyUndo();
  if (!label) { toast('Rien à annuler.', 'info'); return; }
  await dbSave();
  rerenderEverything();
  toast(`Annulé : ${label}`, 'success');
}
