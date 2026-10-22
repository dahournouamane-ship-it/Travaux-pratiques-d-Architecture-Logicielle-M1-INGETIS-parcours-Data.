# PATTERNS — TP 4 · Nouamane Dahour · parcours Data

## Tableau des patterns

| Pattern | Problème résolu (dans QueenBee) | Alternative écartée | Pourquoi écartée |
|---|---|---|---|
| **Factory Method + registre** (B1) | BeeAfrica veut un canal « SMS à toute une coopérative » sans toucher au code de notification existant : on crée la classe, on l'enregistre sous `sms-groupe`, la fabrique la trouve. | Ajouter un `case 'sms-groupe'` dans la fabrique (`factory.js`). | Rouvrir du code déjà testé pour chaque nouveau canal viole le principe ouvert/fermé ; le test du kit vérifie d'ailleurs que `factory.js` n'est pas modifié. |
| **Decorator** (B2) | Empiler cache, nouvelle tentative et journal autour du client HTTP de la passerelle, à la carte, sans modifier le client. | Mettre cache, retry et log dans une seule classe de client. | Classe énorme, comportements impossibles à activer ou désactiver séparément, et ordre figé alors qu'il change le résultat (voir B2). |
| **Adapter** (C) | Deux sources de mesures (trames LoRa, relevés papier en CSV) doivent alimenter le contexte « Santé des colonies », qui n'attend qu'un seul contrat `Mesure`. | Un gros `if (source === ...)` dans le client `toutesLesMesures`. | Le client apprendrait tous les formats ; ajouter une troisième source obligerait à le modifier (OCP) et mélangerait conversion et usage (SRP). |

## Parcours Data / Cyber · Partie A

| N° | Pattern | Problème résolu | Indice dans le code |
|---|---|---|---|
| 1 | **Factory Method** (avec registre) | Créer le bon type de capteur à partir d'un nom venant de la configuration, sans `if`/`switch` dispersés dans le code appelant ; un nouveau type = une ligne dans le registre. | Table `types`, fonction `creerCapteur(type, hiveId)` qui fait le `new C(hiveId)` ; erreur « Capteur inconnu ». |
| 2 | **Builder** | Construire un rapport d'impact avec beaucoup de paramètres, certains répétables (sites, indicateurs), sans constructeur à dix arguments, et refuser un rapport incohérent. | Appels chaînés (`.periode().sites().indicateur()…`), et `.construire()` qui valide « au moins un site et un indicateur ». |
| 3 | **Adapter** | Le modèle de prédiction veut une température externe simple ; l'API OpenWeather a sa propre URL et son propre format (`main.temp`, `dt` en secondes). L'adaptateur traduit sans toucher au modèle ni à l'API. | Classe qui enveloppe `clientHttp` et expose `temperatureExterne(site)`, en convertissant la réponse en `{ celsius, mesureLe }`. |
| 4 | **Composite** | Calculer le poids total d'un pays, d'un site ou d'une ruche avec le même appel, quelle que soit la profondeur de la hiérarchie. | `Ruche` (feuille) et `Groupe` (nœud) exposent tous deux `poidsTotal()` ; `Groupe` additionne ses enfants, qui peuvent être des groupes (récursion). |
| 5 | **Decorator** | Chiffrer la position GPS avant écriture et la déchiffrer à la lecture, de façon transparente pour le reste de l'application, sans modifier `DepotPostgres`. | Même interface (`enregistrer`, `lire`) que le dépôt enveloppé ; il ajoute le chiffrement puis délègue ; `new DepotMesuresChiffre(new DepotPostgres(pool), cle)`. |
| 6 | **Proxy** (virtuel, chargement différé) | Ne pas charger tout de suite un modèle de 300 Mo : il n'est chargé qu'au premier appel de `predire`. | Même interface `predire(features)` ; `#modele ??= await chargerModele(...)` crée l'objet réel à la demande. |

**Deux extraits ont presque la même structure : les extraits 5 et 6** (Decorator et Proxy). Dans les deux cas, un objet enveloppe un autre de même interface et lui délègue les appels. L'intention les distingue :
- le **Decorator** (5) *ajoute un comportement* (le chiffrement) à un objet déjà utilisable, et on peut en empiler plusieurs ;
- le **Proxy** (6) *contrôle l'accès* à l'objet réel (ici sa création différée) sans changer ce que le client reçoit.

## Parcours Data / Cyber · Partie B2

Sorties observées : voir `node seance4-patterns/tp4-dahour/ordre-decorateurs.js` (compositions A, B et C).

1. **Pourquoi le 2e appel à `/api/ruches` n'est-il pas journalisé en A, mais l'est en B ?** En A, le cache est à l'extérieur : il répond tout seul au 2e appel (`[cache] HIT`) et la requête n'atteint jamais le `Retry` ni le `Log`, qui sont plus profonds. En B, le `Log` est à l'extérieur : il voit passer tous les appels, y compris ceux servis par le cache (d'où le « 0 ms »).
2. **Dans B, voit-on dans les journaux que `/api/instable` a échoué une première fois ?** Non, pas dans les lignes `[log]`. Le `Log` est au-dessus du `Retry`, qui absorbe la panne : le `Log` ne voit que le résultat final, une seule ligne d’environ 100 ms (deux fois 50 ms), présentée comme un succès. Seule la ligne `[retry] tentative 1 échouée` que le `Retry` écrit lui-même trahit la panne. En A, le `Log` est sous le `Retry` : il enregistre chaque tentative réelle, donc deux lignes `[log]` pour `/api/instable`.
3. **Quel ordre choisir pour la passerelle QueenBee ?** **A : Cache( Retry( Log( base ) ) ).**
   - Le cache à l'extérieur évite toute émission pour une donnée déjà connue, ce qui compte quand le temps d'émission radio est limité.
   - Le `Retry` ne rejoue que les vrais échecs. Le cache ne stocke que les succès (l'écriture a lieu après la réponse, une erreur levée n'est jamais mise en cache).
   - Le `Log` au plus près de la liaison enregistre chaque tentative réelle, échecs compris, ce qui sert à mesurer la qualité du lien. La composition C n'est pas retenue pour cela : son journal masque les échecs intermédiaires.
   - À prévoir : un nombre de tentatives borné et une attente croissante entre essais, car chaque nouvelle tentative consomme du temps d'émission.

## Parcours Data / Cyber · Partie C · Adapter

- **Problème :** deux sources non modifiables aux formats différents (noms de champs, poids en kg ou en grammes, température en °C ou en °F, date ISO ou « JJ/MM/AAAA HH:MM », données déjà structurées ou CSV) doivent alimenter le contexte « Santé des colonies », qui n'attend qu'un contrat `Mesure`.
- **Pattern retenu :** Adapter, un par source (`LoRaAdapter`, `ReleveManuelAdapter`). **Pourquoi :** chaque conversion est écrite à un seul endroit ; le client `toutesLesMesures` ne connaît que `Mesure` et fusionne par ordre chronologique ; une nouvelle source = un nouvel adaptateur, sans toucher au client ni aux autres (OCP).
- **Alternative écartée :** un `if (source === 'lora') … else …` dans le client. **Pourquoi :** le client connaîtrait tous les formats et devrait être modifié à chaque nouvelle source. Une Facade ne convient pas non plus : elle simplifie l'accès à un sous-système, alors qu'ici il faut rendre compatibles des interfaces différentes.
- **Réponses aux questions :**
  1. **Propriétaire du contrat `Mesure` :** le contexte « Santé des colonies ». C'est lui qui consomme les mesures et définit ce dont il a besoin ; les sources s'y conforment par leurs adaptateurs, qui jouent le rôle de couche anti-corruption. Ce n'est pas un contrat décidé par les capteurs.
  2. **Ligne incomplète en production :** la **mettre en quarantaine**. La rejeter en silence fait perdre une donnée sans que personne le sache. La corriger automatiquement inventerait une valeur (un poids manquant n'a aucune valeur plausible) et fausserait les statistiques. On conserve donc la ligne brute avec la source, la date et la raison du rejet dans un espace à part, pour la corriger à la main (resaisie du papier) puis la rejouer, et on surveille le taux de rejet. Une correction automatique n'est acceptable que pour des règles sûres (espaces en trop, par exemple). Dans le TP, on se contente de l'écarter, comme le demande le test.
  3. **Capteur d'humidité :** ajouter au contrat un champ **optionnel** `humiditePct`. C'est un changement compatible : les consommateurs actuels l'ignorent. `LoRaAdapter` ne l'ajoute que si la trame le contient, et `ReleveManuelAdapter` ne le renseigne pas, car cette source n'en a pas. On ne l'ajoute pas avec la valeur `undefined`, pour ne pas casser les tests `deepEqual` existants. Si un jour un changement incompatible devient nécessaire, on publie `Mesure` v2 avec un champ de version et on garde un adaptateur de v1 vers v2.
