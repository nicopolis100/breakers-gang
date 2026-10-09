# Mises à jour automatiques — mise en place (une seule fois, ~10 min)

L'appli installée vérifie seule s'il existe une version plus récente sur **GitHub** (gratuit) et se met à jour.
Un robot GitHub (« Actions ») construit l'installateur Windows pour toi : tu n'as **rien à compiler**.

## 1. Créer le dépôt
1. Crée un compte sur https://github.com (gratuit).
2. Clique **+ → New repository**. Nom : `breakers-gang`. Choisis **Public** (obligatoire pour que l'appli puisse télécharger sans mot de passe). Coche *Add a README*. **Create repository**.
   - Public = les fichiers du code sont visibles par tous (ton `data.json` reste chez toi, il n'est jamais envoyé).

## 2. Renseigner ton pseudo dans l'appli
Dans `package.json`, section `"publish"`, remplace `TON_PSEUDO_GITHUB` par ton pseudo GitHub (et `breakers-gang` si tu as choisi un autre nom de dépôt).

## 3. Envoyer le projet sur GitHub
Sur la page du dépôt : **Add file → Upload files**, puis glisse **tout le contenu du dossier du projet** (y compris le dossier caché `.github`, `package.json`, `main.js`, `src`, `assets`…) **sauf `node_modules` et `dist`**. Valide avec **Commit changes**.
> Astuce : si le dossier `.github` n'apparaît pas dans l'explorateur Windows, active *Affichage → Éléments masqués*.

## 4. Publier la première version
Sur le dépôt : **Releases → Draft a new release** → *Choose a tag* → tape `v1.3.0` (le même numéro que `"version"` dans `package.json`, précédé de `v`) → **Create new tag** → **Publish release**.
Onglet **Actions** : un robot construit l'installateur (≈5 min) et l'ajoute à la release (`BreakersGang Setup 1.3.0.exe` + `latest.yml`).
Télécharge-le, installe-le, épingle-le à la barre des tâches. C'est ta version « de départ ».

## 5. Pour chaque mise à jour future
1. Je te donne les nouveaux fichiers (avec `version` augmentée dans `package.json`, ex. 1.4.0).
2. Sur GitHub : **Add file → Upload files** (écrase les anciens) → Commit.
3. **Releases → Draft a new release** → tag `v1.4.0` → Publish.
4. Quelques minutes plus tard, toutes les appli installées se mettent à jour toutes seules (bandeau « Redémarrer » en haut, ou installation à la fermeture).

⚠ Le tag doit toujours correspondre au `"version"` de `package.json`, et être **plus grand** que le précédent.

## Notes
- Les données (`~/BreakersGang`) ne sont jamais écrasées par une mise à jour.
- Windows peut afficher « éditeur inconnu » (SmartScreen) à la première installation : *Informations complémentaires → Exécuter quand même*. Les mises à jour suivantes se font sans cela.
- Pas de mise à jour auto avec `npm start` ni avec la version portable.
