# ADR-0001 : Isoler le stockage derrière le port OrderRepository

- Date : 2026-10-21
- Statut : Accepté
- Décideurs : Nouamane Dahour (parcours Data)

## Contexte

Le module Commande de ShopLite stocke aujourd'hui ses commandes dans une `Map` en mémoire :
tout est perdu au redémarrage du serveur, et le compteur d'identifiants (dans `container.js`)
repart de zéro, ce qui ferait réutiliser `CMD-0001`. Un stockage durable (PostgreSQL) est
prévu, avec un schéma de tables (`orders`, `order_lines`) et un prix unitaire copié dans
chaque ligne pour garder l'historique. Le cas d'utilisation et le domaine ne doivent pas être
réécrits le jour où la base change, et les tests doivent rester rapides, sans base de données.

## Décision

Le stockage est isolé derrière le port `OrderRepository` (`save(order)`, `findById(id)`).
Le domaine et `PlaceOrder` ne connaissent que ce contrat ; chaque technologie (mémoire,
PostgreSQL) est un adaptateur secondaire, choisi uniquement dans `container.js`. La règle
« `domain/` n'importe rien » est vérifiée par `npm run lint:archi`.

## Conséquences

- (+) Passer de la mémoire à PostgreSQL ne modifie que `PostgresOrderRepository.js` et une ligne de `container.js`.
- (+) Les tests du cas d'utilisation tournent sans serveur ni base (3 tests passent en moins d'une seconde).
- (+) Le contrat des données est écrit en un seul endroit (le port) au lieu d'être dispersé dans le code.
- (-) Plus de fichiers et d'indirections à comprendre pour un nouvel arrivant.
- (-) Une traduction explicite entre l'objet `Order` et les tables est à écrire et à maintenir (et à garder cohérente avec le schéma SQL).
- (-) Le port n'est qu'un contrat implicite en JavaScript : sans test de contrat, deux adaptateurs peuvent diverger (aujourd'hui `findById` renvoie `undefined`, pas `null`).

## Alternatives considérées

- Architecture en couches classique (domaine appelant directement l'accès base de données) : rejetée parce que le domaine dépendrait de la base et que les tests exigeraient une base réelle.
- Brancher directement un ORM dans `PlaceOrder` : rejetée parce que le cas d'utilisation serait lié à un outil et à son modèle de données, et changer de base obligerait à le modifier.
