// ===================================================================
// DASHBOARD
// ===================================================================
function renderDashboard() {
  const statsEl = document.getElementById('dashStats');
  const nbStorages = DB.storages.length;
  const nbItems = DB.items.length;
  const nbRecipes = DB.recipes.length;
  const valeur = valeurTotaleInventaire();

  statsEl.innerHTML = `
    <div class="stat-card" style="--accent-color:var(--purple)">
      <div class="stat-label">Stockages</div>
      <div class="stat-value">${nbStorages}</div>
    </div>
    <div class="stat-card" style="--accent-color:var(--purple-light)">
      <div class="stat-label">Objets catalogués</div>
      <div class="stat-value">${nbItems}</div>
    </div>
    <div class="stat-card" style="--accent-color:var(--gold)">
      <div class="stat-label">Recettes connues</div>
      <div class="stat-value">${nbRecipes}</div>
    </div>
    <div class="stat-card" style="--accent-color:var(--green)">
      <div class="stat-label">Valeur inventaire</div>
      <div class="stat-value" style="color:var(--green)">${fmtMoney(valeur)}</div>
    </div>
  `;

  const breakdownEl = document.getElementById('dashBreakdown');
  const parCat = {};
  const qteCat = {};
  for (const c of CATEGORIES) { parCat[c.id] = 0; qteCat[c.id] = 0; }
  for (const i of DB.items) {
    parCat[i.categorie] = (parCat[i.categorie] || 0) + i.quantite * i.prixRevente;
    qteCat[i.categorie] = (qteCat[i.categorie] || 0) + i.quantite;
  }
  const max = Math.max(1, ...Object.values(parCat));

  const low = DB.items.filter(isLowStock);
  document.getElementById('dashLowCard').style.display = low.length ? '' : 'none';
  document.getElementById('dashLow').innerHTML = low.map(i =>
    `<div class="low-row"><span>${catIcon(i.categorie)} <strong>${escapeHtml(i.nom)}</strong></span><span class="td-mono td-red">${i.quantite} <span class="td-dim">/ seuil ${i.seuilBas}</span></span></div>`).join('');

  breakdownEl.innerHTML = CATEGORIES.map(c => {
    const v = parCat[c.id] || 0;
    const q = qteCat[c.id] || 0;
    const pct = Math.max(2, Math.round((v / max) * 100));
    return `
      <div class="bar-row">
        <div class="bar-label">${c.icon} ${escapeHtml(c.id)}</div>
        <div class="bar-outer"><div class="bar-inner" style="width:${pct}%"></div></div>
        <div class="bar-value">${fmtMoney(v)} · ${q} unités</div>
      </div>`;
  }).join('');
}
