// ===================================================================
// RECETTES RÉALISABLES (calculées à partir du stock actuel)
// ===================================================================
function renderCraftAvailability() {
  const body = document.getElementById('craftAvailBody');
  const recipes = DB.recipes.filter(r => r.ingredients && r.ingredients.length > 0);

  if (!recipes.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="6">Aucune recette avec ingrédients renseignés — complète-en dans l'onglet Recettes.</td></tr>`;
    return;
  }

  body.innerHTML = recipes.map(r => {
    let craftable = Infinity;
    for (const ing of r.ingredients) {
      const owned = DB.items.find(i => i.nom.trim().toLowerCase() === ing.nom.trim().toLowerCase());
      const qty = owned ? owned.quantite : 0;
      craftable = Math.min(craftable, Math.floor(qty / ing.quantite));
    }
    if (!isFinite(craftable)) craftable = 0;

    const produced = DB.items.find(i => i.nom.trim().toLowerCase() === r.nomObjet.trim().toLowerCase());
    const value = produced ? craftable * produced.prixRevente : null;
    const cost = recipeUnitCost(r);
    const margin = produced ? produced.prixRevente - cost : null;

    return `
      <tr>
        <td><strong>${escapeHtml(r.nomObjet)}</strong></td>
        <td><span class="badge">${catIcon(r.categorie)} ${escapeHtml(r.categorie)}</span></td>
        <td><button type="button" class="craft-qty-badge craft-qty-btn ${craftable > 0 ? 'avail' : 'none'}" data-action="craft-detail" data-id="${r.id}" title="Voir les composants nécessaires">${craftable}x</button></td>
        <td class="td-mono ${value ? 'td-green' : 'td-dim'}">${value != null ? fmtMoney(value) : '— (objet non catalogué)'}</td>
        <td class="td-mono td-dim" title="Valeur de revente des composants">${fmtMoney(cost)}</td>
        <td class="td-mono ${margin == null ? 'td-dim' : margin >= 0 ? 'td-green' : 'td-red'}" ${margin != null ? `data-sort="${margin}"` : ''}>${margin != null ? (margin >= 0 ? '+' : '−') + fmtMoney(Math.abs(margin)) + ' / u.' : '—'}</td>
      </tr>`;
  }).join('');
}

function openCraftDetailModal(recipeId) {
  const r = DB.recipes.find(x => x.id === recipeId);
  if (!r) return;
  const ings = (r.ingredients || []).map(ing => ({ ing, owned: findOwnedByName(ing.nom) }));
  const produced = findOwnedByName(r.nomObjet);
  let n = Infinity;
  for (const { ing, owned } of ings) n = Math.min(n, Math.floor((owned ? owned.quantite : 0) / ing.quantite));
  if (!isFinite(n)) n = 0;

  const rows = ings.map(({ ing }, idx) => `<tr>
      <td><strong>${escapeHtml(ing.nom)}</strong></td>
      <td class="td-mono">${ing.quantite}</td>
      <td class="td-mono td-green" data-need="${idx}"></td>
      <td class="td-mono" data-have="${idx}"></td>
      <td class="td-mono" data-diff="${idx}"></td>
    </tr>`).join('');

  const box = openModal(`
    <h2>${escapeHtml(r.nomObjet)} — composants</h2>
    <p class="craft-avail-note" style="margin-top:-8px;margin-bottom:10px">Avec ton stock actuel tu peux crafter <strong>${n}x</strong>. Change la quantité pour voir ce que ça consomme.</p>
    <div class="field" style="display:flex;flex-direction:row;align-items:center;gap:10px">
      <label style="margin:0">Quantité craftée</label>
      <input type="number" id="craftQty" min="1" step="1" value="${Math.max(n, 1)}" style="width:90px">
      <button type="button" class="btn btn-ghost" id="craftMax">Max (${n})</button>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Composant</th><th>Par craft</th><th>Total</th><th>En stock</th><th>Après craft</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="td-dim" id="craftNote" style="margin-top:10px;font-size:12px"></p>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="btnCancel">Fermer</button>
      <button class="btn btn-primary" id="btnCraftValidate">✔ J'ai crafté</button>
    </div>
  `);

  box.style.width = '640px';
  const qtyEl = box.querySelector('#craftQty');
  const okBtn = box.querySelector('#btnCraftValidate');
  const getQty = () => Math.max(0, parseInt(qtyEl.value, 10) || 0);
  const refresh = () => {
    const q = getQty();
    let possible = q > 0;
    ings.forEach(({ ing, owned }, idx) => {
      const have = owned ? owned.quantite : 0;
      const need = ing.quantite * q;
      const diff = have - need;
      if (diff < 0) possible = false;
      box.querySelector(`[data-need="${idx}"]`).textContent = need;
      box.querySelector(`[data-have="${idx}"]`).textContent = have;
      const d = box.querySelector(`[data-diff="${idx}"]`);
      d.textContent = diff < 0 ? `manque ${-diff}` : `reste ${diff}`;
      d.className = 'td-mono ' + (diff < 0 ? 'td-red' : 'td-dim');
    });
    okBtn.disabled = !possible;
    okBtn.style.opacity = possible ? '' : '.45';
    box.querySelector('#craftNote').textContent = produced
      ? `Le stock de « ${produced.nom} » augmentera de ${q}.`
      : `« ${r.nomObjet} » n'est pas dans ton catalogue : seuls les composants seront déduits.`;
  };
  qtyEl.addEventListener('input', refresh);
  box.querySelector('#craftMax').onclick = () => { qtyEl.value = Math.max(n, 1); refresh(); };
  box.querySelector('#btnCancel').onclick = closeModal;
  okBtn.onclick = async () => {
    const q = getQty();
    if (q <= 0) return;
    for (const { ing, owned } of ings) {
      if (!owned || owned.quantite < ing.quantite * q) { toast('Stock insuffisant pour cette quantité.', 'error'); return; }
    }
    pushUndo(`Craft ${q}x ${r.nomObjet}`);
    for (const { ing, owned } of ings) {
      owned.quantite -= ing.quantite * q;
      logMove(owned, -ing.quantite * q, 'craft', `Composant de ${q}x ${r.nomObjet}`);
    }
    if (produced) {
      produced.quantite += q;
      logMove(produced, q, 'craft', `${q}x crafté`);
    }
    await dbSave();
    closeModal();
    renderInventoryGrid(); renderCraftAvailability(); renderItems(); renderPrices(); renderDashboard(); renderHistory(); renderShoppingList();
    toast(`Craft enregistré : ${q}x ${r.nomObjet}`, 'success');
  };
  refresh();
}

// ===================================================================
// LISTE DE COURSES DE CRAFT
// ===================================================================
function renderShoppingList() {
  const sel = document.getElementById('shopRecipe');
  if (!sel) return;
  const recipes = DB.recipes.filter(r => r.ingredients && r.ingredients.length);
  const prev = sel.value;
  sel.innerHTML = recipes.length
    ? `<option value="">— Choisir une recette —</option>` + recipes.map(r => `<option value="${r.id}" ${r.id === prev ? 'selected' : ''}>${escapeHtml(r.nomObjet)}</option>`).join('')
    : `<option value="">(aucune recette avec ingrédients)</option>`;
  const body = document.getElementById('shopBody');
  const sumEl = document.getElementById('shopSummary');
  const r = recipes.find(x => x.id === sel.value);
  if (!r) {
    body.innerHTML = `<tr class="empty-row"><td colspan="5">Choisis une recette et une quantité à fabriquer.</td></tr>`;
    sumEl.textContent = '';
    return;
  }
  const q = Math.max(1, parseInt(document.getElementById('shopQty').value, 10) || 1);
  let totalCost = 0, totalMissingCost = 0, anyMissing = false;
  body.innerHTML = r.ingredients.map(ing => {
    const o = findOwnedByName(ing.nom);
    const have = o ? o.quantite : 0;
    const need = ing.quantite * q;
    const missing = Math.max(0, need - have);
    const unit = o ? o.prixRevente : 0;
    totalCost += need * unit;
    totalMissingCost += missing * unit;
    if (missing > 0) anyMissing = true;
    return `<tr>
      <td><strong>${escapeHtml(ing.nom)}</strong></td>
      <td class="td-mono">${need}</td>
      <td class="td-mono">${have}</td>
      <td class="td-mono ${missing > 0 ? 'td-red' : 'td-green'}">${missing > 0 ? 'manque ' + missing : '✔ OK'}</td>
      <td class="td-mono td-dim">${missing > 0 ? fmtMoney(missing * unit) : '—'}</td>
    </tr>`;
  }).join('');
  const produced = findOwnedByName(r.nomObjet);
  const gain = produced ? q * produced.prixRevente : null;
  sumEl.innerHTML = `Pour <strong>${q}x ${escapeHtml(r.nomObjet)}</strong> : composants = ${fmtMoney(totalCost)}`
    + (anyMissing ? ` · à trouver/acheter = <span class="td-red">${fmtMoney(totalMissingCost)}</span>` : ' · <span class="td-green">tout est en stock ✔</span>')
    + (gain != null ? ` · valeur obtenue = ${fmtMoney(gain)} · marge = <span class="${gain - totalCost >= 0 ? 'td-green' : 'td-red'}">${fmtMoney(gain - totalCost)}</span>` : '');
}

function initShoppingList() {
  document.getElementById('shopRecipe').addEventListener('change', renderShoppingList);
  document.getElementById('shopQty').addEventListener('input', renderShoppingList);
  renderShoppingList();
}
