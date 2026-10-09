// ===================================================================
// OBJETS
// ===================================================================
function populateItemsFilter() {
  const sel = document.getElementById('itemsFilterCat');
  if (sel.dataset.filled) return;
  sel.innerHTML = `<option value="${ALL_CATS}">${ALL_CATS}</option>` + optionsForCategories(null, false);
  sel.dataset.filled = '1';
  sel.addEventListener('change', renderItems);
  document.getElementById('itemsSearch').addEventListener('input', renderItems);
}

function renderItems() {
  populateItemsFilter();
  const filter = document.getElementById('itemsFilterCat').value || ALL_CATS;
  const q = normText(document.getElementById('itemsSearch').value);
  const body = document.getElementById('itemsBody');
  const list = DB.items.filter(i =>
    (filter === ALL_CATS || i.categorie === filter) && (!q || normText(i.nom).includes(q)));

  if (!list.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="7">${q ? 'Aucun objet ne correspond à cette recherche.' : 'Aucun objet dans cette catégorie.'}</td></tr>`;
    return;
  }
  body.innerHTML = list.map(i => {
    const st = findStorage(i.storageId);
    return `
    <tr>
      <td><strong>${escapeHtml(i.nom)}</strong></td>
      <td><span class="badge">${catIcon(i.categorie)} ${escapeHtml(i.categorie)}</span></td>
      <td class="td-mono ${isLowStock(i) ? 'td-red' : ''}" data-sort="${i.quantite}" ${isLowStock(i) ? `title="Stock bas (seuil ${i.seuilBas})"` : ''}>${i.quantite}${isLowStock(i) ? ' ⚠' : ''}</td>
      <td class="td-mono">${fmtMoney(i.prixRevente)}</td>
      <td class="td-mono td-green">${fmtMoney(i.quantite * i.prixRevente)}</td>
      <td class="td-dim">${st ? escapeHtml(st.nom) : '—'}</td>
      <td class="td-actions">
        <button class="btn btn-ghost btn-sm" data-action="edit-item" data-id="${i.id}">Modifier</button>
        <button class="btn btn-danger btn-sm" data-action="del-item" data-id="${i.id}">Suppr.</button>
      </td>
    </tr>`;
  }).join('');
}

function openItemModal(id) {
  const isNew = !id;
  const it = isNew ? newItem() : findItem(id);
  const box = openModal(`
    <h2>${isNew ? 'Nouvel objet' : "Modifier l'objet"}</h2>
    <div class="field"><label>Nom de l'objet</label><input type="text" id="f-nom" value="${escapeHtml(it.nom)}"></div>
    <div class="field"><label>Catégorie</label><select id="f-cat">${optionsForCategories(it.categorie, false)}</select></div>
    <div class="field"><label>Quantité possédée</label><input type="number" id="f-qte" min="0" step="1" value="${it.quantite}"></div>
    <div class="field"><label>Prix de revente ($)</label><input type="number" id="f-prix" min="0" step="1" value="${it.prixRevente}"></div>
    <div class="field"><label>Alerte stock bas (0 = aucune)</label><input type="number" id="f-seuil" min="0" step="1" value="${it.seuilBas || 0}"></div>
    <div class="field"><label>Stockage</label><select id="f-storage">${optionsForStorages(it.storageId)}</select></div>
    <div class="field"><label>Notes</label><input type="text" id="f-notes" value="${escapeHtml(it.notes)}"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="btnCancel">Annuler</button>
      <button class="btn btn-primary" id="btnSave">Enregistrer</button>
    </div>
  `);
  box.querySelector('#btnCancel').onclick = closeModal;
  box.querySelector('#btnSave').onclick = async () => {
    const nom = box.querySelector('#f-nom').value.trim();
    if (!nom) { toast("Le nom de l'objet est obligatoire.", 'error'); return; }
    pushUndo(isNew ? `Création de « ${nom} »` : `Modification de « ${it.nom} »`);
    it.nom = nom;
    it.categorie = box.querySelector('#f-cat').value;
    const qBefore = isNew ? 0 : it.quantite;
    it.quantite = Math.max(0, parseInt(box.querySelector('#f-qte').value, 10) || 0);
    it.seuilBas = Math.max(0, parseInt(box.querySelector('#f-seuil').value, 10) || 0);
    it.prixRevente = Math.max(0, parseFloat(box.querySelector('#f-prix').value) || 0);
    it.storageId = box.querySelector('#f-storage').value;
    it.notes = box.querySelector('#f-notes').value.trim();
    if (isNew) DB.items.push(it);
    logMove(it, it.quantite - qBefore, 'ajustement', isNew ? 'Objet créé' : "Modifié via la fiche de l'objet");
    await dbSave();
    closeModal();
    renderItems(); renderPrices(); renderDashboard(); renderInventoryGrid(); renderCraftAvailability();
    renderPmBasePrices(); updatePmCalcTotals(); renderHistory(); renderShoppingList();
    toast('Objet enregistré.', 'success');
  };
}

function deleteItem(id) {
  const it = findItem(id);
  if (!it) return;
  if (!confirm(`Supprimer l'objet "${it.nom}" ?`)) return;
  pushUndo(`Suppression de « ${it.nom} »`);
  DB.items = DB.items.filter(x => x.id !== id);
  delete DB.pmBasePrices[id];
  for (const p of DB.pms) { if (p.customPrices) delete p.customPrices[id]; }
  dbSave();
  renderItems(); renderPrices(); renderDashboard(); renderInventoryGrid(); renderCraftAvailability();
  renderPmBasePrices(); renderPMs(); updatePmCalcTotals();
  toast('Objet supprimé.', 'success');
}
