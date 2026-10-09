// ===================================================================
// HISTORIQUE DES MOUVEMENTS
// ===================================================================
function renderHistory() {
  const typeSel = document.getElementById('histType');
  if (!typeSel.dataset.filled) {
    typeSel.innerHTML = `<option value="">Tous les mouvements</option>` + Object.entries(MOVE_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    typeSel.dataset.filled = '1';
    typeSel.addEventListener('change', renderHistory);
    document.getElementById('histSearch').addEventListener('input', renderHistory);
    document.getElementById('btnClearHistory').onclick = async () => {
      if (!confirm("Vider tout l'historique des mouvements ? (le stock n'est pas modifié)")) return;
      DB.history = [];
      clearUndo();
      await dbSave();
      renderHistory();
      toast('Historique vidé.', 'success');
    };
  }
  const type = typeSel.value;
  const q = normText(document.getElementById('histSearch').value);
  const list = DB.history.filter(h => (!type || h.type === type) && (!q || normText(h.nom).includes(q) || normText(h.detail).includes(q)))
    .slice().sort((a, b) => b.ts - a.ts).slice(0, 500);
  const body = document.getElementById('histBody');
  if (!list.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="6">${DB.history.length ? 'Aucun mouvement ne correspond.' : 'Aucun mouvement enregistré pour l\'instant.'}</td></tr>`;
    return;
  }
  body.innerHTML = list.map(h => `<tr>
    <td class="td-dim" data-sort="${h.ts}">${fmtDateTime(h.ts)}</td>
    <td>${MOVE_TYPES[h.type] || escapeHtml(h.type)}</td>
    <td><strong>${escapeHtml(h.nom)}</strong></td>
    <td class="td-mono ${h.delta >= 0 ? 'td-green' : 'td-red'}" data-sort="${h.delta}">${h.delta > 0 ? '+' : '−'}${Math.abs(h.delta)}</td>
    <td class="td-mono">${h.after}</td>
    <td class="td-dim">${escapeHtml(h.detail)}</td>
  </tr>`).join('');
}
