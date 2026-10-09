// ===================================================================
// DONNÉES : export / import / sauvegardes / démarrage auto
// ===================================================================
function initDataCard() {
  document.getElementById('btnExport').onclick = async () => {
    const r = await window.breakers.exportData(DB);
    if (r && r.ok) toast('Export enregistré.', 'success');
  };
  document.getElementById('btnImport').onclick = async () => {
    const r = await window.breakers.importData();
    if (!r || r.canceled) return;
    if (!r.ok) { toast(r.error || 'Import impossible.', 'error'); return; }
    if (!confirm("Remplacer TOUTES tes données actuelles par celles du fichier ?\n(Une sauvegarde automatique de l'état actuel vient d'être faite.)")) return;
    await window.breakers.saveData(r.data);
    location.reload();
  };
  document.getElementById('btnBackups').onclick = () => window.breakers.openBackups();
  const chk = document.getElementById('chkAutostart');
  window.breakers.getAutostart().then(v => { chk.checked = !!v; }).catch(() => {});
  chk.addEventListener('change', async () => {
    const v = await window.breakers.setAutostart(chk.checked);
    chk.checked = !!v;
    toast(v ? 'Lancement au démarrage activé.' : 'Lancement au démarrage désactivé.', 'info');
  });
}
