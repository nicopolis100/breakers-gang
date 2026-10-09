// ===================================================================
// PM — PETITES MAINS (tarifs de gros + calculatrice de vente)
// ===================================================================
function sortedItemsByCategory() {
  return [...DB.items].sort((a, b) => {
    if (a.categorie !== b.categorie) return a.categorie.localeCompare(b.categorie);
    return a.nom.localeCompare(b.nom);
  });
}

/** Rafraîchit les listes d'objets de la calculatrice (un objet ajouté/renommé doit y apparaître sans relancer l'appli). */
function refreshPmCalcOptions() {
  document.querySelectorAll('#pmCalcRows .pm-calc-item').forEach(sel => {
    const cur = sel.value;
    sel.innerHTML = optionsForItemsById(cur);
    if (cur && !findItem(cur)) sel.value = '';
  });
}

function renderPmBasePrices() {
  refreshPmCalcOptions();
  const body = document.getElementById('pmBasePricesBody');
  const searchEl = document.getElementById('pmSearch');
  if (!searchEl.dataset.wired) {
    searchEl.addEventListener('input', renderPmBasePrices);
    searchEl.dataset.wired = '1';
  }
  const q = normText(searchEl.value);
  const all = sortedItemsByCategory();
  const list = q ? all.filter(i => normText(i.nom).includes(q)) : all;
  if (!list.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="3">${all.length ? 'Aucun objet ne correspond à cette recherche.' : "Aucun objet catalogué — ajoute-en dans l'onglet Objets."}</td></tr>`;
    return;
  }
  body.innerHTML = list.map(i => `
    <tr>
      <td><strong>${escapeHtml(i.nom)}</strong></td>
      <td><span class="badge">${catIcon(i.categorie)} ${escapeHtml(i.categorie)}</span></td>
      <td><span class="row-edit-price" data-action="edit-pm-base-price" data-id="${i.id}" title="Cliquer pour modifier">${fmtMoney(getPmBasePrice(i.id))}</span>${isPmBasePriceCustom(i.id) ? '' : ' <span class="td-dim">(50 % revente)</span>'}</td>
    </tr>`).join('');
}

function editPmBasePriceInline(itemId, cellEl) {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.step = '1';
  input.value = getPmBasePrice(itemId);
  input.style.width = '110px';
  cellEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = async () => {
    const val = Math.max(0, parseFloat(input.value) || 0);
    DB.pmBasePrices[itemId] = val;
    await dbSave();
    renderPmBasePrices();
    updatePmCalcTotals();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') renderPmBasePrices();
  });
  input.addEventListener('blur', commit);
}

function renderPMs() {
  const body = document.getElementById('pmsBody');
  if (!DB.pms.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="4">Aucune petite main pour l'instant — ajoute la première.</td></tr>`;
  } else {
    body.innerHTML = [...DB.pms].sort((a, b) => a.nom.localeCompare(b.nom)).map(p => {
      const nbCustom = Object.keys(p.customPrices || {}).length;
      return `
      <tr>
        <td><strong>${escapeHtml(p.nom)}</strong></td>
        <td class="td-dim">${escapeHtml(p.notes) || '—'}</td>
        <td>${nbCustom ? `<span class="pm-count-badge">${nbCustom} objet${nbCustom > 1 ? 's' : ''}</span>` : '<span class="td-dim">—</span>'}</td>
        <td class="td-actions">
          <button class="btn btn-ghost btn-sm" data-action="pm-tariffs" data-id="${p.id}">Tarifs</button>
          <button class="btn btn-ghost btn-sm" data-action="edit-pm" data-id="${p.id}">Modifier</button>
          <button class="btn btn-danger btn-sm" data-action="del-pm" data-id="${p.id}">Suppr.</button>
        </td>
      </tr>`;
    }).join('');
  }
  populatePmCalcSelect();
}

function openPmModal(id) {
  const isNew = !id;
  const p = isNew ? newPM() : findPM(id);
  const box = openModal(`
    <h2>${isNew ? 'Nouvelle petite main' : 'Modifier la petite main'}</h2>
    <div class="field"><label>Nom</label><input type="text" id="f-nom" value="${escapeHtml(p.nom)}" placeholder="Pseudo ou nom RP"></div>
    <div class="field"><label>Notes</label><input type="text" id="f-notes" value="${escapeHtml(p.notes)}"></div>
    <div class="modal-actions">
      ${isNew ? '' : '<button class="btn btn-danger" id="btnDelete" style="margin-right:auto">Supprimer</button>'}
      <button class="btn btn-ghost" id="btnCancel">Annuler</button>
      <button class="btn btn-primary" id="btnSave">Enregistrer</button>
    </div>
  `);
  box.querySelector('#btnCancel').onclick = closeModal;
  if (!isNew) {
    box.querySelector('#btnDelete').onclick = () => { closeModal(); deletePM(p.id); };
  }
  box.querySelector('#btnSave').onclick = async () => {
    const nom = box.querySelector('#f-nom').value.trim();
    if (!nom) { toast('Le nom de la PM est obligatoire.', 'error'); return; }
    p.nom = nom;
    p.notes = box.querySelector('#f-notes').value.trim();
    if (isNew) DB.pms.push(p);
    await dbSave();
    closeModal();
    renderPMs();
    toast('Petite main enregistrée.', 'success');
  };
}

function deletePM(id) {
  const p = findPM(id);
  if (!p) return;
  if (!confirm(`Supprimer la petite main "${p.nom}" ?`)) return;
  DB.pms = DB.pms.filter(x => x.id !== id);
  dbSave();
  renderPMs();
  updatePmCalcTotals();
  toast('Petite main supprimée.', 'success');
}

function openPmTariffsModal(pmId) {
  const p = findPM(pmId);
  if (!p) return;
  const list = sortedItemsByCategory();
  const rowsHtml = list.map(i => {
    const custom = p.customPrices && p.customPrices[i.id] != null ? p.customPrices[i.id] : '';
    return `
      <div class="pm-tariff-row" data-id="${i.id}">
        <div class="pm-tariff-name">${escapeHtml(i.nom)} <span class="td-dim">(base ${fmtMoney(getPmBasePrice(i.id))})</span></div>
        <input type="number" min="0" step="1" class="pm-tariff-input" placeholder="base" value="${custom}">
      </div>`;
  }).join('');

  const box = openModal(`
    <h2>Tarifs personnalisés — ${escapeHtml(p.nom)}</h2>
    <p class="craft-avail-note" style="margin-top:-8px;margin-bottom:10px">Laisse un champ vide pour appliquer le tarif de base de cet objet à cette PM.</p>
    <div class="field"><input type="text" id="pmTariffSearch" placeholder="🔍 Rechercher un objet…"></div>
    <div class="ingredients-box" style="max-height:320px">${rowsHtml || '<p class="td-dim" style="padding:8px">Aucun objet catalogué pour l\'instant.</p>'}</div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="btnCancel">Annuler</button>
      <button class="btn btn-primary" id="btnSave">Enregistrer</button>
    </div>
  `);
  box.querySelector('#btnCancel').onclick = closeModal;
  box.querySelector('#pmTariffSearch').addEventListener('input', (e) => {
    const q = normText(e.target.value);
    box.querySelectorAll('.pm-tariff-row').forEach(row => {
      const it = findItem(row.dataset.id);
      row.style.display = (!q || (it && normText(it.nom).includes(q))) ? '' : 'none';
    });
  });
  box.querySelector('#btnSave').onclick = async () => {
    const newCustom = {};
    box.querySelectorAll('.pm-tariff-row').forEach(row => {
      const id = row.dataset.id;
      const val = row.querySelector('.pm-tariff-input').value;
      if (val !== '') newCustom[id] = Math.max(0, parseFloat(val) || 0);
    });
    p.customPrices = newCustom;
    await dbSave();
    closeModal();
    renderPMs();
    updatePmCalcTotals();
    toast('Tarifs personnalisés enregistrés.', 'success');
  };
}

// ----- Calculatrice de vente -----
function populatePmCalcSelect() {
  const sel = document.getElementById('pmCalcSelect');
  const prevVal = sel.value;
  sel.innerHTML = optionsForPMs(prevVal);
  if (!sel.dataset.wired) {
    sel.addEventListener('change', updatePmCalcTotals);
    sel.dataset.wired = '1';
  }
}

function pmCalcRowHtml(itemId, qty) {
  itemId = itemId || '';
  qty = qty || 1;
  return `
    <div class="pm-calc-row">
      <select class="pm-calc-item">${optionsForItemsById(itemId)}</select>
      <input type="number" min="1" step="1" class="pm-calc-qty" value="${qty}">
      <div class="pm-calc-unit">—</div>
      <div class="pm-calc-subtotal">—</div>
      <button class="btn btn-danger btn-icon" data-action="remove-pm-calc-row" type="button">✕</button>
    </div>`;
}

function initPmCalculatorRows() {
  document.getElementById('pmCalcRows').innerHTML = pmCalcRowHtml('', 1);
  updatePmCalcTotals();
}

function initPmCalculator() {
  const rows = document.getElementById('pmCalcRows');
  rows.innerHTML = pmCalcRowHtml('', 1);
  document.getElementById('btnPmCalcSell').onclick = validatePmSale;

  document.getElementById('btnPmCalcAddRow').onclick = () => {
    rows.insertAdjacentHTML('beforeend', pmCalcRowHtml('', 1));
    updatePmCalcTotals();
  };
  rows.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="remove-pm-calc-row"]');
    if (!btn) return;
    const row = btn.closest('.pm-calc-row');
    if (rows.children.length > 1) {
      row.remove();
    } else {
      row.querySelector('.pm-calc-item').value = '';
      row.querySelector('.pm-calc-qty').value = 1;
    }
    updatePmCalcTotals();
  });
  rows.addEventListener('change', (e) => {
    if (e.target.classList.contains('pm-calc-item') || e.target.classList.contains('pm-calc-qty')) updatePmCalcTotals();
  });
  rows.addEventListener('input', (e) => {
    if (e.target.classList.contains('pm-calc-qty')) updatePmCalcTotals();
  });

  updatePmCalcTotals();
}

function updatePmCalcTotals() {
  const pmId = document.getElementById('pmCalcSelect').value;
  const pm = findPM(pmId);
  let total = 0;
  document.querySelectorAll('#pmCalcRows .pm-calc-row').forEach(row => {
    const itemId = row.querySelector('.pm-calc-item').value;
    const qty = Math.max(1, parseInt(row.querySelector('.pm-calc-qty').value, 10) || 1);
    const unitEl = row.querySelector('.pm-calc-unit');
    const subEl = row.querySelector('.pm-calc-subtotal');
    if (!itemId) {
      unitEl.textContent = '—';
      subEl.textContent = '—';
      return;
    }
    const unit = getPmPriceFor(pm, itemId);
    const sub = unit * qty;
    unitEl.textContent = fmtMoney(unit);
    subEl.textContent = fmtMoney(sub);
    total += sub;
  });
  document.getElementById('pmCalcTotal').textContent = fmtMoney(total);
}
