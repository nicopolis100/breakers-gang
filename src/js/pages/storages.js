// ===================================================================
// STOCKAGES
// ===================================================================
function renderStorages() {
  const body = document.getElementById('storagesBody');
  if (!DB.storages.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="5">Aucun stockage pour l'instant — ajoute ta première planque.</td></tr>`;
    return;
  }
  body.innerHTML = DB.storages.map(s => `
    <tr>
      <td><strong>${escapeHtml(s.nom)}</strong></td>
      <td class="td-mono">${escapeHtml(s.place) || '—'}</td>
      <td>${s.categorie ? `<span class="badge">${catIcon(s.categorie)} ${escapeHtml(s.categorie)}</span>` : '<span class="td-dim">—</span>'}</td>
      <td class="td-dim">${escapeHtml(s.notes) || '—'}</td>
      <td class="td-actions">
        <button class="btn btn-ghost btn-sm" data-action="edit-storage" data-id="${s.id}">Modifier</button>
        <button class="btn btn-danger btn-sm" data-action="del-storage" data-id="${s.id}">Suppr.</button>
      </td>
    </tr>`).join('');
}

function openStorageModal(id) {
  const isNew = !id;
  const s = isNew ? newStorage() : findStorage(id);
  const box = openModal(`
    <h2>${isNew ? 'Nouveau stockage' : 'Modifier le stockage'}</h2>
    <div class="field"><label>Nom du stockage</label><input type="text" id="f-nom" value="${escapeHtml(s.nom)}" placeholder="Ex : Appart Vinewood"></div>
    <div class="field"><label>Emplacement (adresse)</label><input type="text" id="f-place" value="${escapeHtml(s.place)}" placeholder="Ex : Vinewood Hills, 42"></div>
    <div class="field"><label>Catégorie liée</label><select id="f-cat">${optionsForCategories(s.categorie, true)}</select></div>
    <div class="field"><label>Notes</label><input type="text" id="f-notes" value="${escapeHtml(s.notes)}"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="btnCancel">Annuler</button>
      <button class="btn btn-primary" id="btnSave">Enregistrer</button>
    </div>
  `);
  box.querySelector('#btnCancel').onclick = closeModal;
  box.querySelector('#btnSave').onclick = async () => {
    const nom = box.querySelector('#f-nom').value.trim();
    if (!nom) { toast('Le nom du stockage est obligatoire.', 'error'); return; }
    s.nom = nom;
    s.place = box.querySelector('#f-place').value.trim();
    s.categorie = box.querySelector('#f-cat').value;
    s.notes = box.querySelector('#f-notes').value.trim();
    if (isNew) DB.storages.push(s);
    await dbSave();
    closeModal();
    renderStorages(); renderItems(); renderDashboard();
    toast('Stockage enregistré.', 'success');
  };
}

function deleteStorage(id) {
  const s = findStorage(id);
  if (!s) return;
  if (!confirm(`Supprimer le stockage "${s.nom}" ?`)) return;
  DB.storages = DB.storages.filter(x => x.id !== id);
  for (const it of DB.items) if (it.storageId === id) it.storageId = '';
  dbSave();
  renderStorages(); renderItems(); renderDashboard();
  toast('Stockage supprimé.', 'success');
}

// ===================================================================
// INVENTAIRE PAR CATÉGORIE (grille éditable, dans l'onglet Stockages)
// ===================================================================
function renderInventoryGrid() {
  const container = document.getElementById('inventoryGrid');
  const groups = CATEGORIES
    .map(c => ({ cat: c, items: DB.items.filter(i => i.categorie === c.id) }))
    .filter(g => g.items.length > 0);

  if (!groups.length) {
    container.innerHTML = `<div class="td-dim" style="padding:10px 0;font-style:italic">Aucun objet catalogué pour l'instant — ajoute-en depuis l'onglet Objets.</div>`;
    return;
  }

  container.innerHTML = groups.map(g => {
    const total = g.items.reduce((s, i) => s + i.quantite * i.prixRevente, 0);
    return `
    <div class="inv-category" data-cat="${escapeHtml(g.cat.id)}">
      <div class="inv-cat-header">
        <span>${g.cat.icon} ${escapeHtml(g.cat.id)}</span>
        <span class="inv-cat-total">${fmtMoney(total)}</span>
      </div>
      <div class="inv-cat-items">
        ${g.items.map(i => `
          <div class="inv-item-row ${isLowStock(i) ? 'low' : ''}" id="inv-row-${i.id}">
            <div class="inv-item-name" title="${escapeHtml(i.nom)}${isLowStock(i) ? ' — stock bas (seuil ' + i.seuilBas + ')' : ''}">${isLowStock(i) ? '⚠ ' : ''}${escapeHtml(i.nom)}</div>
            <input type="number" min="0" step="1" class="inv-item-qty" data-id="${i.id}" value="${i.quantite}">
            <div class="inv-item-value" id="inv-val-${i.id}">${fmtMoney(i.quantite * i.prixRevente)}</div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }).join('');
}

/** Appelé au 'change' (après blur / Entrée) d'un champ quantité de la grille. */
async function onInventoryQtyChange(e) {
  if (!e.target.classList.contains('inv-item-qty')) return;
  const id = e.target.dataset.id;
  const it = findItem(id);
  if (!it) return;
  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
  const before = it.quantite;
  it.quantite = val;
  e.target.value = val;
  logMove(it, val - before, 'ajustement', 'Modifié dans la grille');
  await dbSave();
  const rowEl = document.getElementById(`inv-row-${id}`);
  if (rowEl) rowEl.classList.toggle('low', isLowStock(it));
  const valEl = document.getElementById(`inv-val-${id}`);
  if (valEl) valEl.textContent = fmtMoney(it.quantite * it.prixRevente);

  // Le total affiché en haut du bloc de catégorie n'est pas recalculé par le rendu de la ligne
  // ci-dessus : on le met à jour ici pour que ça reste correct sans devoir recharger la grille entière.
  const catBlock = Array.from(document.querySelectorAll('.inv-category')).find(el => el.dataset.cat === it.categorie);
  if (catBlock) {
    const catTotal = DB.items
      .filter(i => i.categorie === it.categorie)
      .reduce((s, i) => s + i.quantite * i.prixRevente, 0);
    const totalEl = catBlock.querySelector('.inv-cat-total');
    if (totalEl) totalEl.textContent = fmtMoney(catTotal);
  }

  renderItems(); renderPrices(); renderDashboard(); renderCraftAvailability();
}
