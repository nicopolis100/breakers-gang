document.addEventListener('DOMContentLoaded', async () => {
  await dbLoad();

  try {
    const p = await window.breakers.dataPath();
    document.getElementById('savePath').textContent = p;
  } catch (e) { /* pas grave */ }

  // ---- Fenêtre (titlebar custom) ----
  document.getElementById('btnMin').onclick = () => window.winctl.minimize();
  document.getElementById('btnMax').onclick = () => window.winctl.maximize();
  document.getElementById('btnClose').onclick = () => window.winctl.close();

  // ---- Navigation ----
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => showPage(el.dataset.page));
  });

  // ---- Rendu initial ----
  renderDashboard();
  renderStorages();
  renderInventoryGrid();
  renderCraftAvailability();
  renderItems();
  renderRecipes();
  renderPrices();
  renderHacking();
  renderHackZones();
  renderInfractions();
  renderPmBasePrices();
  renderPMs();
  initPmCalculator();
  renderMap();
  renderHistory();
  renderBilan();
  initTimersPage();
  initShoppingList();
  initDataCard();
  document.querySelectorAll('#content table').forEach(enableTableSort);
  renderTimerPanel();
  MatrixFx.init();
  initUpdater();
  showPage('dashboard');

  // ---- Boutons "+ Nouveau ..." ----
  document.getElementById('btnAddStorage').onclick = () => openStorageModal(null);
  document.getElementById('btnAddItem').onclick = () => openItemModal(null);
  document.getElementById('btnAddRecipe').onclick = () => openRecipeModal(null);
  document.getElementById('btnAddBorne').onclick = () => openBorneModal(null);
  document.getElementById('btnAddPm').onclick = () => openPmModal(null);

  // ---- Grille d'inventaire (Stockages) : quantité modifiée ----
  document.getElementById('inventoryGrid').addEventListener('change', onInventoryQtyChange);

  // ---- Délégation des actions de table (édition / suppression / prix) ----
  document.getElementById('content').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;

    switch (action) {
      case 'edit-storage': openStorageModal(id); break;
      case 'del-storage':  deleteStorage(id); break;
      case 'edit-item':    openItemModal(id); break;
      case 'del-item':     deleteItem(id); break;
      case 'edit-recipe':  openRecipeModal(id); break;
      case 'del-recipe':   deleteRecipe(id); break;
      case 'craft-detail': openCraftDetailModal(id); break;
      case 'del-sale':     deleteSale(id); break;
      case 'restart-timer': restartTimer(id); break;
      case 'del-timer':    deleteTimer(id); break;
      case 'edit-price':   editPriceInline(id, btn); break;
      case 'edit-marker':  openMarkerModal(id); break;
      case 'edit-borne':   openBorneModal(id); break;
      case 'del-borne':    deleteBorne(id); break;
      case 'braquer':      startBraquage(id); break;
      case 'zone-start':   startHackZone(id); break;
      case 'arrestation':  startArrestation(id); break;
      case 'edit-pm':           openPmModal(id); break;
      case 'del-pm':             deletePM(id); break;
      case 'pm-tariffs':         openPmTariffsModal(id); break;
      case 'edit-pm-base-price': editPmBasePriceInline(id, btn); break;
    }
  });

  // ---- Annuler la dernière action : bouton + Ctrl+Z (hors champs de saisie) ----
  document.getElementById('btnUndo').onclick = undoLast;
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      const t = e.target && e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      e.preventDefault();
      undoLast();
    }
  });
  updateUndoButton();

  // ---- Recherche globale : Ctrl+K ----
  document.getElementById('btnPalette').onclick = openPalette;
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  });

  // ---- Minuteurs des bornes / infractions : vérifiés chaque seconde, même sur un autre onglet ----
  if (window.Notification && Notification.permission === 'default') {
    try { Notification.requestPermission(); } catch (e) { /* tant pis */ }
  }
  tickBornes();
  tickInfractions();
  tickHackZones();
  tickCustomTimers();
  setInterval(() => { tickBornes(); tickInfractions(); tickHackZones(); tickCustomTimers(); renderTimerPanel(); }, 1000);
});
