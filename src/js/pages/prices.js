// ===================================================================
// PRIX DE REVENTE
// ===================================================================
function populatePricesFilter() {
  const sel = document.getElementById('pricesFilterCat');
  if (sel.dataset.filled) return;
  sel.innerHTML = `<option value="${ALL_CATS}">${ALL_CATS}</option>` + optionsForCategories(null, false);
  sel.dataset.filled = '1';
  sel.addEventListener('change', renderPrices);
}

function renderPrices() {
  populatePricesFilter();
  const filter = document.getElementById('pricesFilterCat').value || ALL_CATS;
  const body = document.getElementById('pricesBody');
  const list = DB.items.filter(i => filter === ALL_CATS || i.categorie === filter);

  if (!list.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="3">Aucun objet dans cette catégorie.</td></tr>`;
  } else {
    body.innerHTML = list.map(i => `
      <tr>
        <td><strong>${escapeHtml(i.nom)}</strong></td>
        <td><span class="badge">${catIcon(i.categorie)} ${escapeHtml(i.categorie)}</span></td>
        <td><span class="row-edit-price" data-action="edit-price" data-id="${i.id}" title="Cliquer pour modifier">${fmtMoney(i.prixRevente)}</span></td>
      </tr>`).join('');
  }

  const total = valeurTotaleInventaire(list);
  document.getElementById('pricesTotal').textContent = fmtMoney(total);
}


function editPriceInline(id, cellEl) {
  const it = findItem(id);
  if (!it) return;
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.step = '1';
  input.value = it.prixRevente;
  input.style.width = '110px';
  cellEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = async () => {
    const val = Math.max(0, parseFloat(input.value) || 0);
    it.prixRevente = val;
    await dbSave();
    renderPrices(); renderItems(); renderDashboard(); renderInventoryGrid(); renderCraftAvailability(); renderPmBasePrices(); updatePmCalcTotals();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { renderPrices(); }
  });
  input.addEventListener('blur', commit);
}
