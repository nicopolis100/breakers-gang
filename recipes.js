// ===================================================================
// RECETTES
// ===================================================================
function renderRecipes() {
  const body = document.getElementById('recipesBody');
  if (!DB.recipes.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="5">Aucune recette pour l'instant.</td></tr>`;
    return;
  }
  body.innerHTML = DB.recipes.map(r => {
    const ing = r.ingredients.length
      ? r.ingredients.map(x => `${x.quantite}x ${escapeHtml(x.nom)}`).join('  +  ')
      : '<span class="td-dim">—</span>';
    return `
    <tr>
      <td><strong>${escapeHtml(r.nomObjet)}</strong></td>
      <td><span class="badge">${catIcon(r.categorie)} ${escapeHtml(r.categorie)}</span></td>
      <td class="td-mono">${escapeHtml(r.lieuCraft) || '—'}</td>
      <td>${ing}</td>
      <td class="td-actions">
        <button class="btn btn-ghost btn-sm" data-action="edit-recipe" data-id="${r.id}">Modifier</button>
        <button class="btn btn-danger btn-sm" data-action="del-recipe" data-id="${r.id}">Suppr.</button>
      </td>
    </tr>`;
  }).join('');
}

function ingredientRowHtml(nom, qte) {
  nom = nom || '';
  qte = qte || 1;
  return `
    <div class="ingredient-row">
      <input type="number" min="1" step="1" class="ing-qte" value="${qte}">
      <select class="ing-nom">${optionsForItemNames(nom)}</select>
      <button class="btn btn-danger btn-icon" data-action="remove-ingredient" type="button">✕</button>
    </div>`;
}

function openRecipeModal(id) {
  const isNew = !id;
  const r = isNew ? newRecipe() : findRecipe(id);
  const box = openModal(`
    <h2>${isNew ? 'Nouvelle recette' : 'Modifier la recette'}</h2>
    <div class="field"><label>Objet produit par la recette</label><input type="text" id="f-nom" value="${escapeHtml(r.nomObjet)}"></div>
    <div class="field"><label>Catégorie</label><select id="f-cat">${optionsForCategories(r.categorie, false)}</select></div>
    <div class="field"><label>Lieu de craft (adresse)</label><input type="text" id="f-lieu" value="${escapeHtml(r.lieuCraft)}"></div>
    <div class="field">
      <label>Ingrédients nécessaires</label>
      <div class="ingredients-box" id="ingredientsBox">
        ${(r.ingredients.length ? r.ingredients : [{ nom: '', quantite: 1 }]).map(x => ingredientRowHtml(x.nom, x.quantite)).join('')}
      </div>
      <button class="btn btn-ghost btn-sm" id="btnAddIngredient" type="button">+ Ajouter un ingrédient</button>
    </div>
    <div class="field"><label>Notes</label><input type="text" id="f-notes" value="${escapeHtml(r.notes)}"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="btnCancel">Annuler</button>
      <button class="btn btn-primary" id="btnSave">Enregistrer</button>
    </div>
  `);

  const ingredientsBox = box.querySelector('#ingredientsBox');
  box.querySelector('#btnAddIngredient').onclick = () => {
    ingredientsBox.insertAdjacentHTML('beforeend', ingredientRowHtml('', 1));
  };
  ingredientsBox.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="remove-ingredient"]');
    if (btn) btn.closest('.ingredient-row').remove();
  });

  box.querySelector('#btnCancel').onclick = closeModal;
  box.querySelector('#btnSave').onclick = async () => {
    const nom = box.querySelector('#f-nom').value.trim();
    if (!nom) { toast("L'objet produit est obligatoire.", 'error'); return; }
    r.nomObjet = nom;
    r.categorie = box.querySelector('#f-cat').value;
    r.lieuCraft = box.querySelector('#f-lieu').value.trim();
    r.notes = box.querySelector('#f-notes').value.trim();
    r.ingredients = [];
    ingredientsBox.querySelectorAll('.ingredient-row').forEach(row => {
      const ingNom = row.querySelector('.ing-nom').value.trim();
      if (!ingNom) return;
      const qte = Math.max(1, parseInt(row.querySelector('.ing-qte').value, 10) || 1);
      r.ingredients.push({ nom: ingNom, quantite: qte });
    });
    if (isNew) DB.recipes.push(r);
    await dbSave();
    closeModal();
    renderRecipes(); renderDashboard(); renderCraftAvailability();
    toast('Recette enregistrée.', 'success');
  };
}

function deleteRecipe(id) {
  const r = findRecipe(id);
  if (!r) return;
  if (!confirm(`Supprimer cette recette ("${r.nomObjet}") ?`)) return;
  DB.recipes = DB.recipes.filter(x => x.id !== id);
  dbSave();
  renderRecipes(); renderDashboard(); renderCraftAvailability();
  toast('Recette supprimée.', 'success');
}
