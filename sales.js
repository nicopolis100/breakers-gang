// ===================================================================
// VENTE AUX PM + BILAN
// ===================================================================
/** Lignes valides (objet choisi) de la calculatrice : [{ item, qty, unit }]. */
function readPmCalcLines() {
  const pm = findPM(document.getElementById('pmCalcSelect').value);
  const lines = [];
  document.querySelectorAll('#pmCalcRows .pm-calc-row').forEach(row => {
    const itemId = row.querySelector('.pm-calc-item').value;
    const qty = Math.max(1, parseInt(row.querySelector('.pm-calc-qty').value, 10) || 1);
    const item = findItem(itemId);
    if (item) lines.push({ item, qty, unit: getPmPriceFor(pm, itemId) });
  });
  return { pm, lines };
}

async function validatePmSale() {
  const { pm, lines } = readPmCalcLines();
  if (!pm) { toast('Choisis une PM pour enregistrer la vente.', 'error'); return; }
  if (!lines.length) { toast('Ajoute au moins un objet à la vente.', 'error'); return; }
  // Regroupe les lignes du même objet pour vérifier le stock correctement.
  const need = new Map();
  for (const l of lines) need.set(l.item.id, (need.get(l.item.id) || 0) + l.qty);
  const short = [];
  for (const [id, n] of need) {
    const it = findItem(id);
    if (it.quantite < n) short.push(`${it.nom} (stock ${it.quantite}, vendu ${n})`);
  }
  if (short.length && !confirm(`Stock insuffisant pour :\n- ${short.join('\n- ')}\n\nEnregistrer quand même ? Le stock sera mis à 0 pour ces objets.`)) return;
  const total = lines.reduce((s, l) => s + l.qty * l.unit, 0);
  const sale = {
    id: uuid(), ts: Date.now(), pmId: pm.id, pmNom: pm.nom, total,
    lines: lines.map(l => ({ itemId: l.item.id, nom: l.item.nom, categorie: l.item.categorie, qty: l.qty, unit: l.unit }))
  };
  pushUndo(`Vente à ${pm.nom} (${fmtMoney(total)})`);
  for (const [id, n] of need) {
    const it = findItem(id);
    const before = it.quantite;
    it.quantite = Math.max(0, it.quantite - n);
    logMove(it, it.quantite - before, 'vente', `Vendu à ${pm.nom}`);
  }
  DB.sales.push(sale);
  await dbSave();
  initPmCalculatorRows();
  renderInventoryGrid(); renderCraftAvailability(); renderItems(); renderPrices(); renderDashboard(); renderHistory(); renderBilan(); renderShoppingList();
  toast(`Vente à ${pm.nom} enregistrée : ${fmtMoney(total)}`, 'success');
}

function renderBilan() {
  const sel = document.getElementById('bilanPeriod');
  if (!sel.dataset.filled) {
    sel.innerHTML = PERIODS.map(p => `<option value="${p.id}">${p.label}</option>`).join('');
    sel.value = '7d';
    sel.dataset.filled = '1';
    sel.addEventListener('change', renderBilan);
  }
  const b = computeBilan(DB.sales, sel.value);
  document.getElementById('bilanStats').innerHTML = `
    <div class="stat-card" style="--accent-color:var(--green)"><div class="stat-label">Total encaissé</div><div class="stat-value" style="color:var(--green)">${fmtMoney(b.total)}</div></div>
    <div class="stat-card" style="--accent-color:var(--purple)"><div class="stat-label">Ventes</div><div class="stat-value">${b.list.length}</div></div>
    <div class="stat-card" style="--accent-color:var(--gold)"><div class="stat-label">Objets vendus</div><div class="stat-value">${b.units}</div></div>
    <div class="stat-card" style="--accent-color:var(--purple-light)"><div class="stat-label">Moyenne / vente</div><div class="stat-value">${fmtMoney(b.list.length ? b.total / b.list.length : 0)}</div></div>`;
  const empty = (n, msg) => `<tr class="empty-row"><td colspan="${n}">${msg}</td></tr>`;
  document.getElementById('bilanPmBody').innerHTML = b.byPm.length
    ? b.byPm.map(x => `<tr><td><strong>${escapeHtml(x.nom)}</strong></td><td class="td-mono">${x.nb}</td><td class="td-mono td-green">${fmtMoney(x.total)}</td></tr>`).join('')
    : empty(3, 'Aucune vente sur cette période.');
  document.getElementById('bilanCatBody').innerHTML = b.byCat.length
    ? b.byCat.map(x => `<tr><td><span class="badge">${catIcon(x.nom)} ${escapeHtml(x.nom)}</span></td><td class="td-mono">${x.qty}</td><td class="td-mono td-green">${fmtMoney(x.total)}</td></tr>`).join('')
    : empty(3, 'Aucune vente sur cette période.');
  document.getElementById('bilanSalesBody').innerHTML = b.list.length
    ? b.list.slice().sort((a, c) => c.ts - a.ts).slice(0, 200).map(s => `<tr>
        <td class="td-dim" data-sort="${s.ts}">${fmtDateTime(s.ts)}</td>
        <td><strong>${escapeHtml(s.pmNom)}</strong></td>
        <td class="td-dim">${s.lines.map(l => `${l.qty}x ${escapeHtml(l.nom)}`).join(', ')}</td>
        <td class="td-mono td-green" data-sort="${s.total}">${fmtMoney(s.total)}</td>
        <td class="td-actions"><button class="btn btn-danger btn-sm" data-action="del-sale" data-id="${s.id}" title="Supprime la vente du bilan (le stock n'est pas remis)">Suppr.</button></td>
      </tr>`).join('')
    : empty(5, 'Aucune vente sur cette période.');
}

async function deleteSale(id) {
  const s = DB.sales.find(x => x.id === id);
  if (!s) return;
  if (!confirm(`Retirer cette vente de ${fmtMoney(s.total)} du bilan ?\n(Le stock ne sera pas remis — corrige-le à la main si besoin.)`)) return;
  DB.sales = DB.sales.filter(x => x.id !== id);
  clearUndo(); // les positions mémorisées ne correspondent plus
  await dbSave();
  renderBilan();
  toast('Vente retirée du bilan.', 'success');
}
