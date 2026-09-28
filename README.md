# Lineage — L’Arbre des liens

Un arbre céleste dessiné automatiquement à partir de vos personnages : tronc lumineux, rameaux, racines, étoiles et cartouches inspirés du visuel de référence.

## Ouvrir le site sous Windows

1. Extraire tout le ZIP dans un dossier.
2. Installer Node.js 24 si nécessaire.
3. Double-cliquer sur **LANCER-WINDOWS.bat**.
4. Garder la fenêtre du terminal ouverte pendant l’utilisation.

Au premier lancement, les dépendances sont installées automatiquement. Le navigateur ouvre ensuite `http://localhost:5173`. Si ce port est déjà occupé par l’ancienne version, fermer son terminal et relancer le fichier.

## Autres systèmes / lancement manuel

Node.js 22.12 ou supérieur requis. Dans le dossier contenant `package.json` :

```sh
npm ci
npm run dev
```

Ouvrir l’adresse affichée dans le terminal. Ne pas ouvrir `index.html` par double-clic.

## Deux modes : consultation et édition

Le site s’ouvre en **Lecture seule**. Vous pouvez explorer l’arbre, rechercher un personnage, lire sa fiche et sa biographie, ouvrir ses souvenirs, mettre un clan en évidence et filtrer les liens. Aucun ajout, changement de personnage, suppression, import de photo ou changement de décor n’est proposé dans ce mode.

Pour modifier : cliquez sur **Lecture seule · Déverrouiller** en haut du site. Au premier passage, choisissez un mot de passe d’au moins 8 caractères et confirmez-le. Les fois suivantes, saisissez ce même mot de passe. Le bouton **Édition · Verrouiller** referme les outils de modification ; recharger la page remet aussi le site en lecture seule. Les brouillons non enregistrés sont abandonnés lorsque vous verrouillez.

Le mot de passe est conservé sous forme d’empreinte salée, séparément des personnages. Conservez-le : aucune récupération de mot de passe n’est intégrée.

**Portée du verrou :** cette version utilise le stockage local du navigateur, pas un serveur. Le mot de passe est donc propre à ce navigateur et à cette adresse de site. Il empêche les modifications par l’interface en lecture seule, mais une personne ayant accès aux outils du navigateur peut modifier le stockage local. Ce n’est pas une authentification partagée pour un site public ; un serveur avec contrôle des droits serait nécessaire pour cela. Aucune session d’édition n’est conservée dans le stockage.

## Mode Aura et plein écran

Le bouton **Mode Aura**, en haut à droite de l’arbre, masque l’en-tête et la barre latérale, puis demande le plein écran au navigateur. L’arbre conserve ses cartes, ses fiches consultables, ses filtres et son zoom. **Quitter Aura** ou **Échap** ramène à la vue normale. Si le navigateur refuse ou ne propose pas le plein écran, Aura occupe simplement toute la fenêtre.

Aura est disponible en lecture seule comme en édition et ne change pas vos permissions. Le cadrage s’adapte à l’entrée, à la sortie et au redimensionnement de la fenêtre. Si un personnage est mis en évidence, **Tous les liens** annule ce focus sans quitter Aura.

Les contrôles proposent deux cadrages : **Voir tout l’arbre** inclut le tronc et les ornements ; **Cadrer les personnages** rapproche les cartes pour faciliter la lecture.

## Sens de lecture et couleurs

La généalogie descend désormais : **parents en haut, enfants en dessous**, puis petits-enfants. Les flèches partent du bas des cartes des parents et arrivent au-dessus des enfants. Le grand arbre doré reste un décor ; il ne remplace pas les liens familiaux explicites.

En mode édition, ouvrir **Apparence → Couleurs des relations** pour choisir séparément les couleurs des liens parent-enfant, frère/sœur et couple. Ces couleurs sont conservées après rechargement et reprises sur les traits, les flèches, les cartouches, la légende et les fiches. **Rétablir les couleurs** restaure la palette d’origine. Les pointillés et doubles traits restent distincts, même si plusieurs couleurs se ressemblent.

## Des relations mieux distinguées

- **Parent → enfant** : trait doré continu et flèche vers l’enfant.
- **Frère / sœur** : pointillés bleus, sous les cartes.
- **Couple** : double trait rose, au-dessus des cartes.

Chaque lien porte un cartouche explicite. La légende au bas de l’arbre permet de masquer ou montrer chaque type, avec son nombre de liens. **Tous** réaffiche l’ensemble. Ces filtres sont disponibles en lecture seule et ne modifient pas les données.

Cliquer sur un personnage ouvre sa fiche et met ses proches en évidence. Le bouton **Focus actif** permet de revenir à la vue normale. Les branches décoratives s’atténuent lorsque les liens familiaux sont affichés.

En mode édition, **Relier deux personnages** crée une relation entre deux personnages déjà présents, sans les recréer. Les doublons, liens vers soi-même et boucles de parenté sont refusés. Un lien existant peut être retiré dans la fiche du personnage, sans supprimer les personnages.

## Le dessin automatique

- Les cartes se placent automatiquement, avec les parents au-dessus de leurs enfants. Les familles indépendantes restent distinctes.
- Chaque ajout ou suppression recalcule les rameaux et le cadrage. Les détails sont stables entre deux rendus.
- Le fond étoilé, l’arbre et les ornements sont dessinés en SVG : pas d’image fixe à repositionner ni de génération d’image à attendre.
- Le zoom et le déplacement entraînent ensemble les personnages et les branches. Le bouton de cadrage permet de revoir tout l’arbre.
- Dans **Apparence**, choisir la couleur du fond et celle de la lumière des branches. Les réglages sont conservés après rechargement.
- Les branches sont décoratives. Seuls les liens étiquetés « Parent → enfant », « Fratrie » et « Couple » représentent une relation familiale. Leur affichage peut être filtré dans la légende.

## Clans et familles

Le champ **Clan** reste indépendant de la parenté. Lors de l’ajout, **Sans lien familial** est le choix par défaut. Un clan peut réunir plusieurs familles et des personnages sans lien de sang.

Le clan se modifie dans la fiche du personnage. La liste latérale met ses membres en lumière. Le bouton × d’un lien familial permet de le retirer après confirmation sans supprimer les personnages ni leur clan.

## Données existantes

La clé locale `lineage.minecraft.family.v1` est conservée. Utiliser le même navigateur et la même adresse (notamment le même port) pour retrouver les données. Les anciennes préférences de couleur restent appliquées : choisir **Nuit étoilée** dans Apparence pour retrouver l’ambiance du nouveau thème.

Les données sont locales à cet appareil et ce navigateur. Il n’y a pas de synchronisation entre appareils. Les skins fournis par pseudo nécessitent mc-heads.net ; un fichier PNG peut être utilisé à la place.

## Compilation et vérifications

```sh
npm test
npm run build
npm run preview
```

Les tests vérifient la création et la vérification du mot de passe, les erreurs de stockage et de verrou, les doublons et les cycles de parenté, les générations, l’indépendance des clans, le retrait d’un personnage, la stabilité du dessin et l’absence de chevauchement des cartes sur des arbres allant jusqu’à 60 personnages. Le dossier `dist` contient la version compilée, à servir par HTTP. L’archive ne contient pas `node_modules`.

## Arbres partagés en ligne (Supabase, gratuit)

Sans configuration, le site reste local. Pour que chacun crée **son** arbre avec un mot de passe commun et voie ceux des autres (dont en Mode Aura, en diaporama) :

1. Créer un projet sur supabase.com, puis **SQL Editor** : coller `supabase/setup.sql` (après avoir remplacé `CHANGE-MOI` par votre mot de passe de groupe) et **Run**.
2. **Project Settings → API Keys** : copier l’URL et la clé « Publishable ».
3. En local : copier `.env.example` en `.env.local` et y coller les deux valeurs.
4. Sur GitHub : **Settings → Secrets and variables → Actions → Variables**, créer `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, puis relancer le déploiement.

Fonctionnement : la page d’accueil propose **Créer un arbre** (nom + mot de passe) et **Explorer les arbres**. Tout le monde voit tous les arbres ; le mot de passe sert à créer ou modifier. Sauvegarde automatique, liste rafraîchie toutes les 30 s. En modification, **Importer des persos** copie des personnages (ou un arbre entier) venant des autres arbres. En **Mode Aura**, ‹ › changent d’arbre et « Auto » les fait défiler toutes les 15 s. Pour changer le mot de passe : la requête `update` en commentaire dans `setup.sql`.
