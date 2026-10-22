# TP 3 · Diagnostic de `ReportService.js` (parcours Data)

Auteure : Nouamane Dahour · Date : 2026-10-22

> Numéros de ligne : ceux du fichier `ReportService.js` d'origine fourni par l'enseignant, avant mon extraction (le fichier rendu a quelques lignes de plus). Entre parenthèses, ceux du listing de l'énoncé PDF, qui est numéroté autrement.

## Tableau des violations

| # | Principe | Ligne(s) (PDF) | Problème | Conséquence concrète |
|---|---|---|---|---|
| 1 | **S** (responsabilité unique) | 25-88 (20-73) | `generate()` fait cinq métiers : lire les données (27), calculer (30-44), mettre en forme (47-70), journaliser (73-75), envoyer l'e-mail (78-86). | Quatre équipes différentes (finance pour la TVA, produit pour les formats, ops pour le journal, infra pour le SMTP) modifient la même méthode : risque de régression à chaque changement, conflits Git, impossible de tester une partie seule. |
| 2 | **O** (ouvert/fermé) | 47-70 (42-55) | Un `if / else if` sur le format (`csv`, `html`, `json`, sinon erreur). | Ajouter un format PDF ou Markdown oblige à rouvrir `generate()`, déjà testée et en production, au lieu d'ajouter une classe. |
| 3 | **L** (substitution de Liskov) | 92-98 (77-83) | `FreeReportService extends ReportService` mais refuse ce que le parent accepte : tout format sauf `csv` (94) et tout destinataire (95). Elle ignore aussi `recipient` en appelant `super.generate(month, format)` (96). | Un code écrit pour `ReportService` plante (`Format réservé aux comptes Pro`) dès qu'on lui passe un `FreeReportService` : le sous-type ne tient pas les promesses du parent. |
| 4 | **D** (inversion des dépendances) | 9-17 (9-12) et 21 (16) | Le constructeur crée lui-même ses dépendances concrètes (`new URL('./orders.json')`, config SMTP, `outbox`, `history`) et `loadOrders()` appelle `fs.readFileSync`. | Impossible de remplacer le fichier ou le SMTP dans un test : tout test lit le vrai `orders.json`. Changer de source (PostgreSQL) oblige à modifier la classe métier. |
| 5 | **D** / autre (déterminisme) | 73-74 (58-59) | `new Date().toISOString()` et `console.log` directement dans le traitement. | Le journal change à chaque exécution (non testable à l'identique), et la console est polluée pendant les tests (visible dans la sortie de `node --test`). |
| 6 | Autre : **secret dans le code** | 10-15, mot de passe en 14 (10) | Le mot de passe SMTP `Sh0pL1te!` est écrit en clair, dans un champ public `this.smtp`. | Il est dans l'historique Git pour toujours et lisible par tout code qui a l'objet (`service.smtp.password`, vérifié). À sortir vers une variable d'environnement et à renouveler. |
| 7 | **I** (ségrégation des interfaces) | 25 (20), 16-17 (11-12) | Une seule méthode `generate(month, format, recipient)` impose le paramètre `recipient` à tous, même à l'offre gratuite qui le refuse ; `outbox` et `history` sont publics. | Les clients dépendent de plus que ce qu'ils utilisent ; les tests lisent l'état interne (`service.outbox`) au lieu d'un contrat. (Violation moins nette que les autres.) |
| 8 | Autre : **validation et ordre** | 79 (64) et 73-75 puis 78 | L'adresse est « valide » dès qu'elle contient `@` (`a@` passe), et la validation arrive **après** le journal : le journal annonce le rapport avant l'échec de l'envoi. | Adresses fausses acceptées ; journal incohérent (ligne écrite pour un envoi refusé). La règle devrait être dans un objet du domaine (`EmailAddress`). |

## Question de spécialité · DATA

**Où est le calcul des indicateurs ?** Dans `generate()`, lignes 30-44 (PDF 25-39) : CA HT, nombre de commandes, ventilation par catégorie, TVA (ligne 42), TTC (43) et panier moyen (44) sont des variables locales de la méthode.

**Peut-on le réutiliser pour un tableau de bord sans le fichier ni l'e-mail ?** Non, avant. Pour obtenir un chiffre il faut passer par `generate()`, qui lit `orders.json`, formate, écrit dans la console et l'historique, puis envoie l'e-mail si on donne un destinataire ; la seule astuce est de relire sa sortie JSON. **Après mon extraction**, oui : `computeStats(orders, month)` (`domain/salesStats.js`) reçoit des commandes en mémoire et renvoie les indicateurs. Prouvé par `salesStats.test.js` (3 tests, sans fichier ni e-mail).

**Règles de qualité des données déjà appliquées :**

| Règle | Ligne(s) (PDF) | Vérification |
|---|---|---|
| Commande annulée exclue (`status === 'CANCELLED'`) | 34 (29) | Septembre : 3 commandes sur 4, la CMD-103 est exclue |
| Mois sans commande : tout à 0, panier moyen 0 (pas de division par zéro) | 44 (39) | Test « mois sans commande », `2026-01` |
| Arrondi à 2 décimales de la TVA et du panier moyen | 42, 44 (37, 39) | `vat: 110.2`, `average: 183.67` |
| Filtre du mois par préfixe de date | 27 (22) | Seules les commandes `2026-09-…` comptent |

**Règles qui manquent (vérifiées en lançant le code) :**

1. **Statuts : la plus grave.** Seul `CANCELLED` est exclu. Une commande `PENDING`, `REFUNDED`, ou `cancelled` en minuscules est comptée comme vente (10 € comptés dans chaque cas). Le chiffre d'affaires peut être surestimé. À corriger dans `computeStats` (domaine) : ne compter que les statuts payés (liste blanche), pas seulement exclure un statut.
2. **Arrondis : HT et TTC ne sont jamais arrondis.** 3 × 0,10 € donne `revenueHT 0.30000000000000004` et `revenueTTC 0.36000000000000004` ; un autre cas donne `63.97999999999999`. À corriger en travaillant en centimes entiers dans `computeStats`.
3. **Données d'entrée non validées :** quantité négative acceptée (`qty -2` donne -20 € de CA), prix non numérique (`'abc'`) donne `null` partout, catégorie absente donne une clé `"undefined"`. À valider à l'entrée, dans l'adaptateur qui lit les commandes, ou dans le domaine pour les règles.
4. **Mois non validé :** `'2026-1'` renvoie les commandes d'octobre et `''` renvoie tout (4 commandes). Il faut exiger le format `AAAA-MM`.
