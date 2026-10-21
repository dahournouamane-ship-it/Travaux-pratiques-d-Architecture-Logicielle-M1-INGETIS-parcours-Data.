# Note de spécialité · Data : le contrat des données de la commande

Fichiers lus : `domain/Order.js`, `adapters/secondary/InMemoryOrderRepository.js`, `container.js`.

**1. Champs.** Stockés : `id`, `customerId`, `createdAt`, `lines[]` (chacune `{sku, qty, unitPrice}`). Calculé : `total` (getter : somme des `qty × unitPrice`, jamais stocké). *Vérifié :* `curl localhost:3000/orders/CMD-0001` → `total` présent dans le JSON, alors que le constructeur ne le reçoit pas.

**2. Prix copié dans la ligne.** Le catalogue peut changer de prix ; la ligne garde le prix payé. Sans cette copie, l'historique serait faux (une vieille commande changerait de montant) et les statistiques de chiffre d'affaires par période seraient fausses. C'est un instantané figé à la commande. *Vérifié :* `lines[0].unitPrice = 49` dans la réponse, valeur lue au catalogue au moment du `POST`.

**3. `findById` si absent.** Il renvoie `undefined` (retour de `Map.get`), **pas `null`**. *Vérifié :* `await repo.findById('nope') === null` → `false`. Ce comportement n'est écrit nulle part : `httpServer.js` s'appuie dessus sans le dire (`order ? 200 : 404`). Le contrat du port devrait le préciser (« `null` si absente »), et c'est un test de contrat à ajouter.

**4. Redémarrage et identifiants.** Les commandes sont perdues (données dans une `Map` en mémoire). *Vérifié :* création de CMD-0001, arrêt/relance du serveur, `GET /orders/CMD-0001` → `404 Commande introuvable`. Les ids viennent d'un compteur local dans `container.js` (`++n`, formaté `CMD-0001`) : il repart de 0 au redémarrage, donc une nouvelle commande **réutiliserait CMD-0001**. En base, il faudrait une séquence ou un UUID. Autre constat : la CLI et le serveur ont chacun leur propre `buildApp()`, donc leurs commandes ne se voient pas.

**5. Constat de typage (vérifié par requête).** `qty: 1.5` est accepté (`201`, total 73.5) et `qty: "2"` aussi (stocké comme texte, total 98 par coercition) : le domaine ne teste que `qty > 0`. Un schéma SQL avec `INTEGER` casserait ces cas à l'écriture : la règle « quantité entière » doit être dans le domaine.

**6. Schéma PostgreSQL d'un futur `PostgresOrderRepository`.**

```sql
CREATE TABLE orders (
  id           VARCHAR(20) PRIMARY KEY,           -- 'CMD-0001'
  customer_id  VARCHAR(50) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL
);
CREATE TABLE order_lines (
  order_id         VARCHAR(20) NOT NULL REFERENCES orders(id),
  line_no          SMALLINT    NOT NULL,
  sku              VARCHAR(50) NOT NULL,
  qty              INTEGER     NOT NULL CHECK (qty > 0),
  unit_price_cents INTEGER     NOT NULL CHECK (unit_price_cents >= 0),  -- prix figé
  PRIMARY KEY (order_id, line_no)
);
-- total : non stocké, calculé (SUM(qty * unit_price_cents)) ou via une vue
```

La traduction objet `Order` ⇄ lignes de tables se ferait dans **`adapters/secondary/PostgresOrderRepository.js`** (méthodes `save` / `findById`), et nulle part ailleurs ; `container.js` changerait d'une ligne.

## Règle d'architecture cassée puis réparée

Ligne ajoutée en tête de `domain/Order.js` : `import { buildApp } from '../container.js';`

```
$ npm run lint:archi
✗ Règle violée : le domaine dépend de l'extérieur :
   seance2-architecture/hexagonal/domain/Order.js  ->  ../container.js
```

Ligne retirée, relance : `✓ Règle de dépendance respectée : aucun fichier domain/ n'importe l'extérieur.` (fichier remis dans son état d'origine).
