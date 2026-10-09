// ===== NAVIGATION =====
function showPage(pageId) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === `page-${pageId}`);
  });
  if (pageId === 'dashboard') renderDashboard();
  if (pageId === 'bilan') renderBilan();
  if (pageId === 'history') renderHistory();
}

// ===== TOAST =====
function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ===== MODAL =====
function openModal(innerHtml) {
  const overlay = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-box');
  box.innerHTML = innerHtml;
  box.style.width = '';
  overlay.classList.add('open');
  const firstInput = box.querySelector('input, select, textarea');
  if (firstInput) setTimeout(() => firstInput.focus(), 30);
  return box;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('modal-box').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-overlay');
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });
});

// ===== FORM HELPERS =====
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function optionsForCategories(selected, includeNone) {
  let html = '';
  if (includeNone) html += `<option value="">(aucune)</option>`;
  for (const c of CATEGORIES) {
    const sel = c.id === selected ? 'selected' : '';
    html += `<option value="${escapeHtml(c.id)}" ${sel}>${c.icon} ${escapeHtml(c.id)}</option>`;
  }
  return html;
}

function optionsForStorages(selectedId) {
  let html = `<option value="">(aucun)</option>`;
  for (const s of DB.storages) {
    const sel = s.id === selectedId ? 'selected' : '';
    html += `<option value="${s.id}" ${sel}>${escapeHtml(s.nom)}</option>`;
  }
  return html;
}

/** Liste déroulante des objets catalogués (onglet Objets), triés par catégorie puis par nom,
 *  pour choisir un ingrédient de recette sans risque de faute de frappe. */
function optionsForItemNames(selectedNom) {
  if (!DB.items.length) {
    return `<option value="">(aucun objet catalogué — ajoute-en dans l'onglet Objets)</option>`;
  }
  const sorted = [...DB.items].sort((a, b) => {
    if (a.categorie !== b.categorie) return a.categorie.localeCompare(b.categorie);
    return a.nom.localeCompare(b.nom);
  });
  const matches = selectedNom && DB.items.some(i => i.nom === selectedNom);
  let html = `<option value="">— Choisir un objet —</option>`;
  if (selectedNom && !matches) {
    html += `<option value="${escapeHtml(selectedNom)}" selected>⚠️ ${escapeHtml(selectedNom)} (introuvable — choisis dans la liste)</option>`;
  }
  let currentCat = null;
  for (const i of sorted) {
    if (i.categorie !== currentCat) {
      if (currentCat !== null) html += `</optgroup>`;
      html += `<optgroup label="${catIcon(i.categorie)} ${escapeHtml(i.categorie)}">`;
      currentCat = i.categorie;
    }
    const sel = i.nom === selectedNom ? 'selected' : '';
    html += `<option value="${escapeHtml(i.nom)}" ${sel}>${escapeHtml(i.nom)}</option>`;
  }
  html += `</optgroup>`;
  return html;
}

/** Comme optionsForItemNames, mais la valeur de chaque <option> est l'id de l'objet (pas son nom) —
 *  utilisé par la calculatrice PM pour retrouver le tarif exact même si deux objets ont le même nom. */
function optionsForItemsById(selectedId) {
  if (!DB.items.length) {
    return `<option value="">(aucun objet catalogué — ajoute-en dans l'onglet Objets)</option>`;
  }
  const sorted = [...DB.items].sort((a, b) => {
    if (a.categorie !== b.categorie) return a.categorie.localeCompare(b.categorie);
    return a.nom.localeCompare(b.nom);
  });
  let html = `<option value="">— Choisir un objet —</option>`;
  let currentCat = null;
  for (const i of sorted) {
    if (i.categorie !== currentCat) {
      if (currentCat !== null) html += `</optgroup>`;
      html += `<optgroup label="${catIcon(i.categorie)} ${escapeHtml(i.categorie)}">`;
      currentCat = i.categorie;
    }
    const sel = i.id === selectedId ? 'selected' : '';
    html += `<option value="${i.id}" ${sel}>${escapeHtml(i.nom)}</option>`;
  }
  html += `</optgroup>`;
  return html;
}

/** Liste déroulante des petites mains (onglet PM), pour la calculatrice de vente. */
function optionsForPMs(selectedId) {
  if (!DB.pms.length) {
    return `<option value="">(aucune PM — ajoute-en une ci-dessus)</option>`;
  }
  let html = `<option value="">— Choisir une PM —</option>`;
  for (const p of [...DB.pms].sort((a, b) => a.nom.localeCompare(b.nom))) {
    const sel = p.id === selectedId ? 'selected' : '';
    html += `<option value="${p.id}" ${sel}>${escapeHtml(p.nom)}</option>`;
  }
  return html;
}
