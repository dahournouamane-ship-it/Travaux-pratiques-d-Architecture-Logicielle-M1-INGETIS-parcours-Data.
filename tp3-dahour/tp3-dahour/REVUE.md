# REVUE.md

> **Revue croisée non faite par un autre binôme.** Ce fichier contient une **auto-vérification** ; à remplacer ou compléter par les remarques d'un binôme relecteur si l'enseignant en désigne un.

## Auto-vérification (commandes lancées)

- [x] Les 7 tests de caractérisation fournis passent, **fichier non modifié** : `diff` identique à l'original.
- [x] Mon test d'injection passe : `node --test seance3-solid/tp3-dahour/ReportService.caracterisation.test.js seance3-solid/tp3-dahour/ReportService.injection.test.js` → `pass 8`, `fail 0`.
- [x] Le calcul extrait se teste seul : `salesStats.test.js` → 3 tests, sans fichier.
- [x] `npm run lint:archi` : vert, `domain/salesStats.js` n'importe rien.
- [x] Sortie de `demo.js` identique à celle du code d'origine (horodatage mis à part).
- [ ] Pas fait (volontairement, parcours Data : une seule extraction) : formats, repository, mailer, logger, offre gratuite, mot de passe sortis du code.

## Remarques

- **Qualité :** l'extraction est petite et sûre : le calcul devient une fonction pure sans import, réutilisable, avec une valeur par défaut qui ne casse aucun appelant.
- **Amélioration :** `computeStats` reproduit à l'identique les défauts de qualité des données (statuts, arrondis) pour ne pas changer le comportement ; ils sont listés dans `VIOLATIONS.md` et se corrigeraient ensuite, avec de nouveaux tests.
