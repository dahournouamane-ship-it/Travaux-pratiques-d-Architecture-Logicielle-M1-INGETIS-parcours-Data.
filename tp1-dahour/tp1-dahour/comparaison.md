# TP 1 · Comparaison MVC / MVP / MVVM (parcours Data)

## Tableau comparatif

| Critère | MVC | MVP | MVVM |
|---|---|---|---|
| Couplage entre la vue et la logique | Moyen : la vue ne connaît que le Controller (via des `bind…`), mais le Controller connaît la vue et appelle `render`. | Faible : le Presenter ne connaît la vue que par une interface (`getCredentials`, `showError`…) ; la vue est passive. | Le plus faible : le ViewModel ignore totalement la vue ; seule la vue connaît le ViewModel (par ses liaisons). |
| Ce qu'on peut tester sans navigateur | Le Model (règles, notifications). Le Controller avec une fausse vue. | Le Presenter entier, avec une fausse vue (ex. `fakeView`) : validation, messages, ordre `setLoading`. | Le ViewModel entier (`visibles`, `total`…) sans aucune page. |
| Où valider une saisie | Dans le **Model** (`TodoModel.add`). | Dans le **Presenter** (`LoginPresenter.onSubmit`). | Dans le **ViewModel** (commande) ou le modèle derrière. |
| Cas d'usage typique | Petite appli web, rendu côté serveur, formulaires simples. | Écrans avec interactions et états (chargement, erreurs), vue interchangeable (web, console). | Interfaces riches et réactives : tableaux de bord, Angular, Vue, WPF. |

## Question Data

**Où vivent les données de la Todo-list ?** Dans le tableau privé `#todos` de `TodoModel`, en mémoire du navigateur. **Qui peut les modifier, et comment ?** Seul le modèle, par `add`, `toggle` et `remove`. Le code l'empêche de deux façons : le champ privé `#todos` n'est pas accessible de l'extérieur (`m.#todos` hors de la classe → `SyntaxError`), et `all()` renvoie des copies (`{ ...t }`) : modifier `all()[0].done` ou `.title` ne change rien dans le modèle (vérifié par un petit script). **Au rechargement de la page**, les tâches sont perdues : tout est en mémoire vive. **Pour les conserver**, il faut changer le **Model** et rien d'autre : lui injecter un stockage (par exemple `localStorage` ou une API) qui charge les tâches dans son constructeur et les sauvegarde dans `#notify()`. La View et le Controller restent inchangés ; c'est la même idée que le port `OrderRepository` du TP 2.
