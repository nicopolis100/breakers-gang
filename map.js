// ===================================================================
// CARTE
// ===================================================================
let mapZoom = 1;
let mapInitialized = false;
const MAP_ZOOM_MIN = 0.25, MAP_ZOOM_MAX = 3;
let mapDragging = false, mapWasDragged = false;
let mapDragStartX = 0, mapDragStartY = 0, mapDragScrollLeft = 0, mapDragScrollTop = 0;

function populateMapFilter() {
  const sel = document.getElementById('mapFilterCat');
  if (sel.dataset.filled) return;
  sel.innerHTML = `<option value="${ALL_CATS}">${ALL_CATS} (balises)</option>` + optionsForCategories(null, true);
  sel.dataset.filled = '1';
  sel.addEventListener('change', renderMapMarkers);
}

function initMapPage() {
  if (mapInitialized) return;
  mapInitialized = true;

  populateMapFilter();

  const img = document.getElementById('mapImage');
  const inner = document.getElementById('mapInner');
  const scroll = document.getElementById('mapScroll');

  const applyZoom = () => {
    const w = img.naturalWidth || 1546;
    inner.style.width = Math.round(w * mapZoom) + 'px';
    document.getElementById('mapZoomLabel').textContent = Math.round(mapZoom * 100) + '%';
  };

  const setZoom = (z) => {
    mapZoom = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, z));
    applyZoom();
  };

  if (img.complete && img.naturalWidth) applyZoom();
  img.addEventListener('load', applyZoom);

  document.getElementById('mapZoomIn').onclick = () => setZoom(mapZoom * 1.25);
  document.getElementById('mapZoomOut').onclick = () => setZoom(mapZoom / 1.25);
  document.getElementById('mapZoomReset').onclick = () => { setZoom(1); scroll.scrollTo(0, 0); };

  // Clic sur la carte (hors balise) = nouvelle balise à cet endroit
  img.addEventListener('click', (e) => {
    if (mapWasDragged) { mapWasDragged = false; return; } // pas de balise si on vient de faire glisser la carte
    const rect = img.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    openMarkerModal(null, relX, relY);
  });

  // Clic droit maintenu = déplacer la carte (comme un "grab" / pan)
  scroll.addEventListener('contextmenu', (e) => e.preventDefault()); // pas de menu clic-droit du navigateur
  scroll.addEventListener('mousedown', (e) => {
    if (e.button !== 2) return; // seulement le clic droit
    e.preventDefault();
    mapDragging = true;
    mapWasDragged = false;
    mapDragStartX = e.clientX;
    mapDragStartY = e.clientY;
    mapDragScrollLeft = scroll.scrollLeft;
    mapDragScrollTop = scroll.scrollTop;
    scroll.classList.add('map-grabbing');
  });
  window.addEventListener('mousemove', (e) => {
    if (!mapDragging) return;
    const dx = e.clientX - mapDragStartX;
    const dy = e.clientY - mapDragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) mapWasDragged = true;
    scroll.scrollLeft = mapDragScrollLeft - dx;
    scroll.scrollTop = mapDragScrollTop - dy;
  });
  window.addEventListener('mouseup', () => {
    if (!mapDragging) return;
    mapDragging = false;
    scroll.classList.remove('map-grabbing');
  });
}

function renderMap() {
  initMapPage();
  renderMapMarkers();
}

function renderMapMarkers() {
  const filter = document.getElementById('mapFilterCat').value || ALL_CATS;
  const container = document.getElementById('mapMarkers');
  const list = DB.markers.filter(m => filter === ALL_CATS || m.categorie === filter);

  container.innerHTML = list.map(m => `
    <div class="map-pin" data-action="edit-marker" data-id="${m.id}" style="left:${(m.x * 100).toFixed(3)}%;top:${(m.y * 100).toFixed(3)}%">
      <div class="map-pin-dot" title="${escapeHtml(m.titre || 'Balise')}">
        <span class="map-pin-icon">${m.categorie ? catIcon(m.categorie) : '📍'}</span>
      </div>
      <div class="map-pin-label">${escapeHtml(m.titre) || 'Sans titre'}</div>
    </div>
  `).join('');
}

function openMarkerModal(id, prefillX, prefillY) {
  const isNew = !id;
  const m = isNew ? newMarker() : findMarker(id);
  if (isNew) {
    m.x = prefillX != null ? prefillX : 0.5;
    m.y = prefillY != null ? prefillY : 0.5;
  }

  const box = openModal(`
    <h2>${isNew ? 'Nouvelle balise' : 'Modifier la balise'}</h2>
    <div class="field"><label>Titre</label><input type="text" id="f-titre" value="${escapeHtml(m.titre)}" placeholder="Ex : Planque nord, Point de craft..."></div>
    <div class="field"><label>Catégorie liée</label><select id="f-cat">${optionsForCategories(m.categorie, true)}</select></div>
    <div class="field"><label>Description</label><textarea id="f-desc" rows="4" placeholder="Détails, code, horaires, avertissements...">${escapeHtml(m.description)}</textarea></div>
    <div class="modal-actions">
      ${isNew ? '' : '<button class="btn btn-danger" id="btnDelete" style="margin-right:auto">Supprimer</button>'}
      <button class="btn btn-ghost" id="btnCancel">Annuler</button>
      <button class="btn btn-primary" id="btnSave">Enregistrer</button>
    </div>
  `);

  box.querySelector('#btnCancel').onclick = closeModal;
  if (!isNew) {
    box.querySelector('#btnDelete').onclick = () => { closeModal(); deleteMarker(m.id); };
  }
  box.querySelector('#btnSave').onclick = async () => {
    const titre = box.querySelector('#f-titre').value.trim();
    if (!titre) { toast('Le titre de la balise est obligatoire.', 'error'); return; }
    m.titre = titre;
    m.categorie = box.querySelector('#f-cat').value;
    m.description = box.querySelector('#f-desc').value.trim();
    if (isNew) DB.markers.push(m);
    await dbSave();
    closeModal();
    renderMapMarkers();
    toast('Balise enregistrée.', 'success');
  };
}

function deleteMarker(id) {
  const m = findMarker(id);
  if (!m) return;
  if (!confirm(`Supprimer la balise "${m.titre}" ?`)) return;
  DB.markers = DB.markers.filter(x => x.id !== id);
  dbSave();
  renderMapMarkers();
  toast('Balise supprimée.', 'success');
}
