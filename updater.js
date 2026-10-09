// ===================================================================
// MISES À JOUR AUTOMATIQUES (côté fenêtre)
// ===================================================================
function updateStatusText(s) {
  switch (s.state) {
    case 'checking':    return 'Recherche de mise à jour…';
    case 'available':   return `Mise à jour ${s.version} trouvée, téléchargement…`;
    case 'downloading': return `Téléchargement : ${s.percent}%`;
    case 'downloaded':  return `Version ${s.version} prête à installer.`;
    case 'uptodate':    return 'Tu as la dernière version ✔';
    case 'error':       return `Impossible de vérifier : ${s.message || 'erreur inconnue'}`;
    case 'dev':         return 'Disponible uniquement dans l\'appli installée (npm run dist).';
    case 'unavailable': return 'Module de mise à jour absent (relance npm install).';
    default:            return '';
  }
}

function applyUpdateStatus(s) {
  const txt = document.getElementById('updateText');
  if (txt) txt.textContent = updateStatusText(s);
  const banner = document.getElementById('updateBanner');
  if (banner) {
    banner.style.display = s.state === 'downloaded' ? '' : 'none';
    const b = banner.querySelector('.ub-text');
    if (b) b.textContent = `⬆ Version ${s.version} prête`;
  }
  const inst = document.getElementById('btnInstallUpdate');
  if (inst) inst.style.display = s.state === 'downloaded' ? '' : 'none';
  if (s.state === 'downloaded' && !applyUpdateStatus.notified) {
    applyUpdateStatus.notified = true;
    toast(`Mise à jour ${s.version} téléchargée — clique « Redémarrer » pour l'installer.`, 'success');
  }
}

async function initUpdater() {
  const b = window.breakers;
  if (!b || !b.appVersion) return;
  try { document.getElementById('updateVersion').textContent = 'v' + await b.appVersion(); } catch (e) { /* tant pis */ }
  b.onUpdateStatus(applyUpdateStatus);
  try { applyUpdateStatus(await b.updateState()); } catch (e) { /* tant pis */ }
  document.getElementById('btnCheckUpdate').onclick = async () => applyUpdateStatus(await b.checkUpdate());
  const install = () => b.installUpdate();
  document.getElementById('btnInstallUpdate').onclick = install;
  document.getElementById('btnBannerInstall').onclick = install;
}
