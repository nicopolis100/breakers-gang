# BREAKERS — Gestion du Gang (version Electron)

Version Electron de l'appli, avec la même fenêtre custom violette (sans barre de titre Windows,
boutons min/max/fermer maison) que ton ancienne appli Peyo, et le thème visuel repris de ton logo.

Les onglets de l'appli :
- 🏠 **Accueil** — stats globales + valeur d'inventaire par catégorie
- 📦 **Stockages** — tes planques/coffres/caches, l'inventaire par catégorie et les recettes réalisables
- 🎒 **Objets** — catalogue par catégorie (quantité, prix, stockage lié)
- 🔧 **Recettes** — recettes de craft connues (ingrédients choisis dans un menu déroulant + lieu de craft)
- 🖱️ Dans **Stockages**, clique sur le nombre de crafts possibles (ex. `3x`) : composants nécessaires, stock, manque. Saisis la quantité craftée puis **✔ J'ai crafté** : les composants sont déduits et l'objet produit ajouté au stock.
- 💵 **Prix de revente** — clique un prix dans le tableau pour le modifier en direct
- 🖥️ **Hacking** — les bornes hackables que tu repères en jeu, avec un minuteur de 30 min et une notif sonore
- 🚨 **Infractions** — braquage de commerce, racket, vente de drogue, vol de voiture, vol de données, avec un minuteur de récidive de 4h
- 🤝 **PM** — tes tarifs de vente en gros à tes petites mains, un tarif personnalisé par objet si besoin pour chacune, et une calculatrice pour chiffrer une vente
- 🗺️ **Carte** — la carte des codes postaux du serveur, avec des balises cliquables que tu poses toi-même

### L'onglet Stockages

En plus de la liste de tes planques, l'onglet contient maintenant :
- **Inventaire par catégorie** : une grille avec tous tes objets groupés par catégorie (Hacking,
  Drogue...), chacun avec un champ pour indiquer la quantité que tu possèdes — tape la valeur et
  appuie sur Tab/Entrée ou clique ailleurs pour l'enregistrer. La valeur (quantité × prix de
  revente) et le total par catégorie se recalculent automatiquement.
- **Recettes réalisables avec ton stock actuel** : pour chaque recette de l'onglet Recettes qui a
  des ingrédients renseignés, l'appli calcule combien d'exemplaires tu peux fabriquer avec ce que
  tu as en stock (limité par l'ingrédient le plus rare) et la valeur de revente que ça représente.
  Dans l'onglet Recettes, chaque ingrédient se choisit désormais dans un **menu déroulant**
  listant tous les objets déjà catalogués (groupés par catégorie) — donc plus de risque de faute
  de frappe qui casserait le calcul. Si une ancienne recette pointait vers un nom d'objet qui
  n'existe pas (ou plus) dans l'onglet Objets, elle s'affiche avec un ⚠️ dans la liste déroulante :
  il suffit de resélectionner le bon objet.

### L'onglet Hacking

- **+ Nouvelle borne** pour ajouter une borne au fur et à mesure que tu les repères en jeu (nom +
  notes optionnelles).
- Clique **⚡ Braqué** sur une borne dès que tu viens de la hacker → un minuteur de **30 minutes**
  démarre, affiché en direct (mm:ss) sur la carte.
- Quand le minuteur arrive à 0 : **bip sonore** (généré directement par l'appli, pas de fichier
  audio requis), **notification Windows** (si autorisée), un **toast** dans l'appli, et la carte de
  la borne clignote en vert — même si tu es sur un autre onglet ou en train de jouer, la vérification
  tourne en fond toutes les secondes.
- Le minuteur est basé sur l'heure réelle, pas sur un compteur en mémoire : si tu fermes et rouvres
  l'appli pendant le cooldown, le temps restant est recalculé correctement.
- Bouton crayon pour modifier une borne, croix pour la supprimer.

### L'onglet Infractions

- 5 types fixes : **Braquage de commerce**, **Racket**, **Vente de drogue**, **Vol de voiture**,
  **Vol de données**.
- Clique **🚔 Arrestation** juste après t'être fait arrêter pour l'une d'elles → un minuteur de
  **4 heures** démarre, la carte passe en rouge et affiche **⚠ Récidive** avec le temps restant
  (mm:ss), même si tu changes d'onglet.
- Comme pour le Hacking, le minuteur est basé sur l'heure réelle (pas un compteur en mémoire) :
  il survit à une fermeture/réouverture de l'appli.
- Tu peux recliquer "Arrestation" pendant une récidive si tu te fais réarrêter entre-temps — ça
  relance le minuteur de 4h à partir de ce nouveau moment.
- Un petit message apparaît automatiquement quand la période de récidive se termine.

### L'onglet Carte

- La carte couvre désormais la quasi-totalité du comté de Los Santos (de Paleto Bay et Mont Chiliad
  au nord jusqu'au port/aéroport au sud, en passant par Vinewood Hills, Sandy Shores, l'Alamo Sea et
  le quartier Procopio/Shrapspeed), assemblée à partir de tes captures de la carte du jeu via un
  recalage par reconnaissance de motifs. Chaque nouvel envoi de captures est refusionné avec la carte
  existante plutôt que de la remplacer, pour couvrir une zone toujours plus large sans perdre ce qui
  était déjà là.
- **Clique n'importe où sur la carte** → une fenêtre s'ouvre pour donner un titre, une catégorie
  (optionnelle, réutilise les mêmes catégories que le reste de l'appli) et une description à ta balise.
- **Clique une balise existante** pour voir sa description, la modifier ou la supprimer.
- **Zoom** avec les boutons +/− en haut de la carte (la position des balises reste alignée quel que
  soit le niveau de zoom).
- **Clic droit maintenu + glisser** pour déplacer la carte (comme sur Google Maps) — pratique une
  fois zoomé. Le clic gauche reste réservé à la pose de balises.
- Filtre les balises affichées par catégorie avec le menu déroulant du haut.
- Les balises sont sauvegardées dans le même `data.json` que le reste (nouveau champ `markers`).

### L'onglet PM

- **Tarifs de base** : un tarif par défaut (en $) pour chaque objet catalogué, appliqué à toutes tes
  petites mains tant que tu n'as pas mis de tarif personnalisé. Par défaut = **50 % du prix de revente**
  de l'objet (suit les changements de prix de revente) ; clique une valeur pour la fixer à la main.
  Une barre de recherche permet de filtrer par nom (idem dans l'onglet Objets et dans la fenêtre Tarifs).
- **Mes petites mains** : **+ Nouvelle PM** pour ajouter un nom (pseudo RP) et des notes. Le bouton
  **Tarifs** d'une PM ouvre la liste de tous tes objets : laisse un champ vide pour garder le tarif de
  base, ou renseigne un prix différent juste pour cette PM (plus cher, en gros, en dépannage...).
- **Calculatrice de vente** : choisis la PM, ajoute une ou plusieurs lignes d'objet + quantité — le
  tarif unitaire (personnalisé si tu en as mis un, sinon le tarif de base) et le total se calculent
  automatiquement.

Les 5 catégories (Hacking, Drogue, Braconnage & Pillage, Vol Véhicules, Recel), tous les objets et
prix de rachat de tes fiches sont préremplis, ainsi que la recette de la clé USB fabriquée.

## Installation (une seule fois)

Prérequis : **Node.js 18+** — https://nodejs.org

Dans le dossier du projet :
```bash
npm install
```
(télécharge Electron — nécessite une connexion internet la première fois)

## Lancer l'application

```bash
npm start
```

## Créer l'application Windows (.exe)
```
npm install
npm run dist
```
Génère `dist/BreakersGang Setup 1.2.0.exe` : un **installateur** (sans droits admin) qui installe l'appli dans ton profil
et crée un raccourci Bureau + menu Démarrer. Ce raccourci peut être **épinglé à la barre des tâches** et lancé au
démarrage de Windows. Tes données (`~/BreakersGang`) ne sont jamais touchées par l'installation / la mise à jour.

Variantes : `npm run dist:dir` (dossier `dist/win-unpacked/BreakersGang.exe`, sans installation) ; `npm run dist:portable`
(un seul exe, mais **non épinglable** : il se décompresse dans un dossier temporaire à chaque lancement).

## Où sont stockées tes données ?

Dans `~/BreakersGang/data.json` (`C:\Users\<toi>\BreakersGang\data.json` sous Windows) —
**exactement le même dossier et la même structure que la version Java**, donc si tu utilises les
deux versions, elles partagent les mêmes données automatiquement. Rien n'est envoyé sur internet.

## Structure du projet

```
main.js            processus principal Electron (fenêtre, lecture/écriture data.json)
preload.js          pont sécurisé entre l'appli et le processus principal
index.html          structure de l'interface (titlebar, sidebar, 5 pages, modale, toasts)
src/css/main.css    thème violet "Breakers"
src/js/data.js      modèle de données, catégories, données de départ
src/js/ui.js        navigation, toasts, modale, helpers de formulaire
src/js/pages.js      rendu de chaque page + logique d'ajout/modif/suppression
src/js/init.js       démarrage de l'appli, câblage des événements
assets/              logo, icônes .png/.ico
```

## ⚠️ Note de transparence

Je n'ai pas pu lancer Electron lui-même dans mon environnement de développement (pas d'accès
réseau pour télécharger le runtime Electron, et pas d'affichage graphique). En revanche, j'ai :
- vérifié la syntaxe de **tous** les fichiers JS (`node --check`, aucune erreur),
- testé la logique de données (`data.js`) dans un environnement Node isolé : chargement,
  données de départ (40 objets, 5 recettes), liaison stockage/objet, sauvegarde — tout fonctionne,
- vérifié que chaque identifiant HTML utilisé par le JS existe bien dans `index.html` (aucun manquant).

Le rendu visuel final n'a donc pas pu être capturé par mes soins — teste chez toi avec
`npm install && npm start` et dis-moi si un réglage visuel ou fonctionnel doit être ajusté.


## Nouveautés (v1.1)
- 📜 **Historique** : chaque variation de stock (craft, vente, ajustement) est datée et filtrable.
- ⚠ **Stock bas** : champ « Alerte stock bas » sur chaque objet ; l'objet passe en rouge et apparaît sur l'accueil.
- 🛒 **Liste de courses** (onglet Stockages) : choisis une recette + une quantité → composants manquants et coût.
- 💹 **Coût & marge** par recette dans « Recettes réalisables ».
- 💵 **Valider la vente** (onglet PM) : retire les objets du stock et enregistre la vente.
- 📈 **Bilan** : encaissé par période, par PM et par catégorie.
- 💾 **Sauvegardes auto** : copie datée de `data.json` à chaque lancement dans `~/BreakersGang/backups` (30 gardées). Export / import JSON depuis l'accueil.
- 🚀 **Lancer au démarrage de Windows** (case à cocher sur l'accueil). Avec `npm start` cela relance via electron ; avec un .exe empaqueté c'est l'exe lui-même.
- 🔍 **Ctrl+K** : recherche globale (objets, recettes, PM, stockages, pages). Colonnes de tableaux **triables** d'un clic.
- ⏱ **Panneau Timers** dans la barre latérale ; bip + notif aussi à la fin d'une récidive.

## Thème hacker (v1.2)
Interface terminal néon vert (logo Breakers conservé), scanlines, titres façon shell, pluie « Matrix » discrète en fond (désactivable depuis l'accueil). Correctif : la liste d'objets de la calculatrice PM se met maintenant à jour quand tu ajoutes/renommes un objet.

## Mises à jour automatiques (v1.3)
Voir **MISE-A-JOUR.md** pour la mise en place (compte GitHub gratuit). Code découpé : `src/js/pages/*.js` (un fichier par onglet), `extras.js` (tri, Ctrl+K, timers, Matrix), `updater.js`.
