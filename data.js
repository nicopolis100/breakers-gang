// ===== CATEGORIES =====
const CATEGORIES = [
  { id: 'Hacking',              icon: '💻' },
  { id: 'Drogue',                icon: '💊' },
  { id: 'Braconnage & Pillage',  icon: '🏹' },
  { id: 'Vol Véhicules',         icon: '🚗' },
  { id: 'Recel',                 icon: '💰' },
  { id: 'Autre',                 icon: '⚙️' },
];
const ALL_CATS = 'Toutes les catégories';

function catIcon(id) {
  const c = CATEGORIES.find(x => x.id === id);
  return c ? c.icon : '•';
}
function catLabel(id) {
  return `${catIcon(id)}  ${id}`;
}

// ===== DATA STORE =====
let DB = null;

async function dbLoad() {
  DB = await window.breakers.loadData();
  if (!DB || !Array.isArray(DB.storages)) DB = getDefaultData();
  if (!DB.storages.length && !DB.items.length && !DB.recipes.length) {
    DB = getDefaultData();
    await dbSave();
  }
  if (!Array.isArray(DB.markers)) DB.markers = []; // compat avec une sauvegarde antérieure à l'onglet Carte
  if (!Array.isArray(DB.bornes)) DB.bornes = [];   // compat avec une sauvegarde antérieure à l'onglet Hacking
  if (!Array.isArray(DB.infractions)) DB.infractions = [];
  if (!DB.infractionsInit) {
    // Première ouverture depuis l'ajout des infractions personnalisées : on ne remet les infractions de base qu'une seule fois,
    // pour que celles que tu supprimes ne reviennent pas au prochain lancement.
    if (!DB.infractions.length) DB.infractions = INFRACTION_TYPES.map(t => newInfraction(t));
    DB.infractionsInit = true;
  }
  if (!Array.isArray(DB.hackZones)) DB.hackZones = []; // compat avec une sauvegarde antérieure aux minuteurs de zone
  for (const nom of HACK_ZONE_NAMES) {
    if (!DB.hackZones.some(z => z.nom === nom)) DB.hackZones.push(newHackZone(nom));
  }
  if (!Array.isArray(DB.pms)) DB.pms = []; // compat avec une sauvegarde antérieure à l'onglet PM
  if (!DB.pmBasePrices || typeof DB.pmBasePrices !== 'object') DB.pmBasePrices = {};
  if (!Array.isArray(DB.history)) DB.history = []; // compat : historique des mouvements de stock
  if (!Array.isArray(DB.sales)) DB.sales = [];     // compat : ventes aux PM
  if (!Array.isArray(DB.timers)) DB.timers = [];   // compat : minuteurs libres
  for (const p of DB.pms) { if (!p.customPrices || typeof p.customPrices !== 'object') p.customPrices = {}; }
  return DB;
}

async function dbSave() {
  await window.breakers.saveData(DB);
}

function uuid() {
  return (crypto && crypto.randomUUID) ? crypto.randomUUID()
    : (Date.now().toString(36) + Math.random().toString(36).slice(2));
}

function fmtMoney(n) {
  const r = Math.round(n || 0);
  return new Intl.NumberFormat('fr-FR').format(r) + ' $';
}

function newStorage() {
  return { id: uuid(), nom: '', place: '', categorie: '', notes: '' };
}
function newItem() {
  return { id: uuid(), nom: '', categorie: 'Autre', quantite: 0, prixRevente: 0, seuilBas: 0, storageId: '', notes: '' };
}
function newRecipe() {
  return { id: uuid(), nomObjet: '', categorie: 'Autre', lieuCraft: '', ingredients: [], notes: '' };
}
function newMarker() {
  // x, y : position relative sur l'image (0 à 1), indépendante du zoom / de la résolution.
  return { id: uuid(), x: 0.5, y: 0.5, titre: '', categorie: '', description: '' };
}

function findStorage(id) { return DB.storages.find(s => s.id === id) || null; }
function findItem(id) { return DB.items.find(i => i.id === id) || null; }
function findRecipe(id) { return DB.recipes.find(r => r.id === id) || null; }
function findMarker(id) { return DB.markers.find(m => m.id === id) || null; }
function findBorne(id) { return DB.bornes.find(b => b.id === id) || null; }
function findInfraction(id) { return DB.infractions.find(x => x.id === id) || null; }
function findHackZone(id) { return DB.hackZones.find(z => z.id === id) || null; }
function findPM(id) { return DB.pms.find(p => p.id === id) || null; }

// ===== PM (PETITES MAINS) : tarifs de gros =====
function newPM() {
  return { id: uuid(), nom: '', notes: '', customPrices: {} };
}
/** Tarif de base (identique pour toutes les PM) appliqué à un objet. */
const PM_DEFAULT_RATIO = 0.5; // par défaut : on achète aux PM à 50 % du prix de revente
function getPmBasePrice(itemId) {
  const v = DB.pmBasePrices[itemId];
  if (typeof v === 'number') return v; // tarif défini manuellement
  const it = findItem(itemId);
  return it ? Math.round((it.prixRevente || 0) * PM_DEFAULT_RATIO) : 0;
}
/** Vrai si le tarif de base de cet objet a été modifié à la main (sinon : 50 % du prix de revente). */
function isPmBasePriceCustom(itemId) {
  return typeof DB.pmBasePrices[itemId] === 'number';
}

/** Normalise un texte pour la recherche : minuscules, sans accents. */
function normText(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
/** Tarif réellement appliqué à une PM donnée pour un objet : son tarif personnalisé s'il existe, sinon le tarif de base. */
function getPmPriceFor(pm, itemId) {
  if (pm && pm.customPrices && pm.customPrices[itemId] != null) return pm.customPrices[itemId];
  return getPmBasePrice(itemId);
}

// ===== HACKING : bornes hackables & minuteur de cooldown =====
const HACK_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

// Zones de hacking (Maze Bank, Parking Rouge) : un minuteur de 30 min avant de pouvoir y retourner.
const HACK_ZONE_NAMES = ['Maze Bank', 'Parking Rouge'];
function newHackZone(nom) {
  return { id: uuid(), nom, lastAt: null, notified: true };
}

function newBorne() {
  return { id: uuid(), nom: '', notes: '', lastBraqueAt: null, notified: true };
}

function fmtCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function valeurTotaleInventaire(items) {
  return (items || DB.items).reduce((sum, i) => sum + (i.quantite * i.prixRevente), 0);
}

// ===== INFRACTIONS : arrestations & minuteur de récidive =====
const INFRACTION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 heures
const INFRACTION_TYPES = [
  { type: 'Braquage de commerce', icon: '🏪' },
  { type: 'Racket',               icon: '🖐️' },
  { type: 'Vente de drogue',      icon: '💊' },
  { type: 'Vol de voiture',       icon: '🚗' },
  { type: 'Vol de données',       icon: '💾' },
];

function newInfraction(def) {
  return { id: uuid(), type: def.type, icon: def.icon, cooldownMs: INFRACTION_COOLDOWN_MS, notes: '', lastArrestAt: null, notified: true };
}
/** Délai de récidive propre à une infraction (4 h par défaut). */
function infractionCooldownMs(x) {
  return x && x.cooldownMs > 0 ? x.cooldownMs : INFRACTION_COOLDOWN_MS;
}

// ===== DONNÉES DE DÉPART =====
// Reprises telles quelles des fiches d'activités du gang (catégories, rachats, recette connue).
function getDefaultData() {
  const items = [];
  const addItem = (categorie, nom, prixRevente) => {
    items.push({ id: uuid(), nom, categorie, quantite: 0, prixRevente, seuilBas: 0, storageId: '', notes: '' });
  };

  // ---- HACKING ----
  addItem('Hacking', 'Ordinateur', 200);
  addItem('Hacking', 'Télé', 200);
  addItem('Hacking', 'Montre connectée', 30);
  addItem('Hacking', 'Écouteur', 20);
  addItem('Hacking', 'Téléphone', 30);
  addItem('Hacking', 'Batterie ext.', 15);
  addItem('Hacking', 'Bombox', 15);
  addItem('Hacking', 'Appareil photo', 50);
  addItem('Hacking', 'Circuit élec.', 12);
  addItem('Hacking', 'Disque dur plein', 1200);
  addItem('Hacking', 'Disque dur vide (vente)', 80);

  // ---- DROGUE ----
  addItem('Drogue', 'Deludamol', 8);
  addItem('Drogue', 'Equanox', 7);
  addItem('Drogue', 'Anti dépresseur', 10);
  addItem('Drogue', 'Alcool Iso', 17);
  addItem('Drogue', 'Azote', 25);
  addItem('Drogue', 'Lidocaïne', 12);
  addItem('Drogue', 'Paraliz', 550);

  // ---- BRACONNAGE & PILLAGE ----
  addItem('Braconnage & Pillage', 'Bougeoir en argent', 40);
  addItem('Braconnage & Pillage', 'Photo', 20);
  addItem('Braconnage & Pillage', 'Peau de bête', 0);
  addItem('Braconnage & Pillage', 'Pelle (vente)', 100);

  // ---- VOL VÉHICULES ----
  addItem('Vol Véhicules', 'Pièce mécanique', 15);
  addItem('Vol Véhicules', 'Fusibles', 10);
  addItem('Vol Véhicules', 'Bougies allumage', 12);
  addItem('Vol Véhicules', 'Plaquette de frein', 11);
  addItem('Vol Véhicules', 'Batterie', 80);
  addItem('Vol Véhicules', 'GPS', 75);
  addItem('Vol Véhicules', 'Filtre à air', 40);
  addItem('Vol Véhicules', 'Autoradio', 70);
  addItem('Vol Véhicules', 'Plaque', 125);
  addItem('Vol Véhicules', 'Crochet (vente)', 20);

  // ---- RECEL ----
  addItem('Recel', 'Clope', 10);
  addItem('Recel', 'Liasse billets marqués', 13);
  addItem('Recel', 'Liasse billets', 10);
  addItem('Recel', 'Préservatifs', 6);
  addItem('Recel', 'Ticket', 5);
  addItem('Recel', 'Chewing-gum', 5);
  addItem('Recel', 'Tongues', 12);
  addItem('Recel', 'Bobine cuivre', 8);

  const recipes = [
    {
      id: uuid(),
      nomObjet: 'Clé (USB fabriquée)',
      categorie: 'Hacking',
      lieuCraft: 'Hôtel 6177',
      ingredients: [
        { nom: 'Clé USB', quantite: 1 },
        { nom: 'Circuits', quantite: 2 },
        { nom: 'Condensateurs', quantite: 4 },
        { nom: 'Bobines cuivre', quantite: 3 },
      ],
      notes: 'PC hacking + imprimante 8044 / craft Hangarway 9292 + Liberty Street 7026',
    },
    { id: uuid(), nomObjet: '(à compléter)', categorie: 'Drogue', lieuCraft: 'Eglise curé 8079 / Table craft 7130 + 8217 (petit garage ouvert)', ingredients: [], notes: 'Lieu de craft repéré pour cette catégorie — modifie ou complète cette recette.' },
    { id: uuid(), nomObjet: '(à compléter)', categorie: 'Braconnage & Pillage', lieuCraft: 'Hangarway 9287', ingredients: [], notes: 'Lieu de craft repéré pour cette catégorie — modifie ou complète cette recette.' },
    { id: uuid(), nomObjet: '(à compléter)', categorie: 'Vol Véhicules', lieuCraft: 'LS Cust aéroport 10032', ingredients: [], notes: 'Lieu de craft repéré pour cette catégorie — modifie ou complète cette recette.' },
    { id: uuid(), nomObjet: '(à compléter)', categorie: 'Recel', lieuCraft: 'Miror 7343 (derrière coiffeur)', ingredients: [], notes: 'Lieu de craft repéré pour cette catégorie — modifie ou complète cette recette.' },
  ];

  const infractions = INFRACTION_TYPES.map(t => newInfraction(t));

  return { storages: [], items, recipes, markers: [], bornes: [], infractions, infractionsInit: true, pms: [], pmBasePrices: {}, hackZones: HACK_ZONE_NAMES.map(n => newHackZone(n)), history: [], sales: [], timers: [] };
}


// ===== HISTORIQUE DES MOUVEMENTS DE STOCK =====
const HISTORY_MAX = 3000; // on garde les 3000 derniers mouvements
const MOVE_TYPES = { craft: '🔧 Craft', vente: '💵 Vente', ajustement: '✏️ Ajustement' };

/** Enregistre un mouvement de stock (delta ≠ 0). L'appelant se charge de dbSave(). */
function logMove(item, delta, type, detail) {
  if (!item || !delta) return;
  DB.history.push({
    id: uuid(), ts: Date.now(), type,
    itemId: item.id, nom: item.nom, categorie: item.categorie,
    delta, after: item.quantite, detail: detail || ''
  });
  if (DB.history.length > HISTORY_MAX) DB.history.splice(0, DB.history.length - HISTORY_MAX);
}

function fmtDateTime(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ===== STOCK BAS =====
function isLowStock(it) {
  return (it.seuilBas || 0) > 0 && it.quantite <= it.seuilBas;
}

// ===== CRAFT : coût & marge =====
function findOwnedByName(nom) {
  return DB.items.find(i => i.nom.trim().toLowerCase() === String(nom).trim().toLowerCase());
}
/** Coût d'un craft = valeur de revente des composants consommés. */
function recipeUnitCost(r) {
  return (r.ingredients || []).reduce((s, ing) => {
    const o = findOwnedByName(ing.nom);
    return s + ing.quantite * (o ? o.prixRevente : 0);
  }, 0);
}

// ===== VENTES AUX PM : bilan =====
const PERIODS = [
  { id: 'today', label: "Aujourd'hui" },
  { id: '7d',    label: '7 derniers jours' },
  { id: '30d',   label: '30 derniers jours' },
  { id: 'all',   label: 'Depuis le début' },
];
function periodStart(id, now) {
  now = now || Date.now();
  if (id === 'today') { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); }
  if (id === '7d') return now - 7 * 24 * 3600 * 1000;
  if (id === '30d') return now - 30 * 24 * 3600 * 1000;
  return 0;
}
/** Agrège les ventes d'une période : total, par PM, par catégorie. */
function computeBilan(sales, periodId, now) {
  const from = periodStart(periodId, now);
  const list = sales.filter(s => s.ts >= from);
  const byPm = {}, byCat = {};
  let total = 0, units = 0;
  for (const s of list) {
    total += s.total;
    const k = s.pmNom || '(PM supprimée)';
    byPm[k] = byPm[k] || { nom: k, nb: 0, total: 0 };
    byPm[k].nb += 1; byPm[k].total += s.total;
    for (const l of s.lines) {
      units += l.qty;
      byCat[l.categorie] = byCat[l.categorie] || { nom: l.categorie, qty: 0, total: 0 };
      byCat[l.categorie].qty += l.qty; byCat[l.categorie].total += l.qty * l.unit;
    }
  }
  return { list, total, units, byPm: Object.values(byPm).sort((a, b) => b.total - a.total), byCat: Object.values(byCat).sort((a, b) => b.total - a.total) };
}


// ===== ANNULER LA DERNIÈRE ACTION =====
// Avant chaque action qui modifie le stock, on garde une photo de l'état (objets, tarifs PM, tailles de l'historique et des ventes).
const UNDO_MAX = 30;
let UNDO = [];

function pushUndo(label) {
  UNDO.push({
    label,
    items: JSON.parse(JSON.stringify(DB.items)),
    pmBasePrices: Object.assign({}, DB.pmBasePrices),
    pmCustom: Object.fromEntries(DB.pms.map(p => [p.id, Object.assign({}, p.customPrices || {})])),
    histLen: DB.history.length,
    salesLen: DB.sales.length,
  });
  if (UNDO.length > UNDO_MAX) UNDO.shift();
  if (typeof updateUndoButton === 'function') updateUndoButton();
}

function clearUndo() {
  UNDO = [];
  if (typeof updateUndoButton === 'function') updateUndoButton();
}

/** Restaure la dernière photo et renvoie son libellé (ou null s'il n'y a rien à annuler). */
function applyUndo() {
  const s = UNDO.pop();
  if (!s) return null;
  DB.items = s.items;
  DB.pmBasePrices = s.pmBasePrices;
  for (const p of DB.pms) { if (s.pmCustom[p.id]) p.customPrices = s.pmCustom[p.id]; }
  if (DB.history.length > s.histLen) DB.history.splice(s.histLen);
  if (DB.sales.length > s.salesLen) DB.sales.splice(s.salesLen);
  if (typeof updateUndoButton === 'function') updateUndoButton();
  return s.label;
}

// ===== MINUTEURS LIBRES =====
function newCustomTimer(nom, durationMs) {
  return { id: uuid(), nom: nom || 'Minuteur', durationMs, startAt: Date.now(), notified: false };
}
function customTimerRemaining(t) {
  return t.startAt ? t.durationMs - (Date.now() - t.startAt) : 0;
}
function fmtDuration(ms) {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return [h ? h + ' h' : '', m ? m + ' min' : '', s ? s + ' s' : ''].filter(Boolean).join(' ') || '0 s';
}
