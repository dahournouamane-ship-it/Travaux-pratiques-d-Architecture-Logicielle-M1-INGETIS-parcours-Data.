# TP 3 · Diagrammes de classes (parcours Data)

## 1. L'existant : `ReportService` (God class)

```mermaid
classDiagram
  class ReportService {
    -dbFile : URL
    -smtp : host, port, user, password
    +outbox : Array
    +history : Array
    +loadOrders()
    +generate(month, format, recipient)
  }
  class FreeReportService {
    +generate(month, format, recipient)
  }
  class orders_json {
    <<fichier>>
  }
  class fs {
    <<module>>
  }
  class console {
    <<technique>>
  }
  class Date {
    <<technique>>
  }
  class SMTP {
    <<SMTP simulé>>
  }

  ReportService <|-- FreeReportService : hérite mais refuse
  ReportService ..> fs : readFileSync
  ReportService ..> orders_json : lit
  ReportService ..> console : console.log
  ReportService ..> Date : new Date
  ReportService ..> SMTP : envoie
```

`generate()` calcule, met en forme (3 formats en `if`), journalise et envoie : 5 responsabilités dans une classe qui crée elle-même fichier, console, date et SMTP.

## 2. La cible : un refactoring complet

```mermaid
classDiagram
  direction LR

  class ReportService {
    -orders : OrderRepository
    -formatters : FormatterRegistry
    -mailer : Mailer
    -logger : Logger
    -clock : Clock
    -policy : ReportPolicy
    +generate(month, format, recipient)
  }

  class OrderRepository {
    <<interface>>
    +all()
  }
  class Mailer {
    <<interface>>
    +send(message)
  }
  class Logger {
    <<interface>>
    +info(message)
  }
  class Clock {
    <<interface>>
    +now()
  }
  class Formatter {
    <<interface>>
    +format(stats)
  }
  class ReportPolicy {
    <<interface>>
    +check(format, recipient)
  }

  class salesStats {
    <<fonction pure>>
    +computeStats(orders, month)
  }
  class EmailAddress {
    +valider(texte)
  }
  class FormatterRegistry {
    +register(nom, formatter)
    +get(nom)
  }

  class JsonFileOrderRepository
  class SmtpMailer
  class ConsoleLogger
  class SystemClock
  class CsvFormatter
  class HtmlFormatter
  class JsonFormatter
  class ProPolicy
  class FreePolicy

  class main {
    +buildReportService()
  }

  ReportService --> OrderRepository
  ReportService --> Mailer
  ReportService --> Logger
  ReportService --> Clock
  ReportService --> FormatterRegistry
  ReportService --> ReportPolicy
  ReportService ..> salesStats : appelle computeStats
  ReportService ..> EmailAddress : valide le destinataire
  FormatterRegistry o-- Formatter : contient plusieurs

  OrderRepository <|.. JsonFileOrderRepository
  Mailer <|.. SmtpMailer
  Logger <|.. ConsoleLogger
  Clock <|.. SystemClock
  Formatter <|.. CsvFormatter
  Formatter <|.. HtmlFormatter
  Formatter <|.. JsonFormatter
  ReportPolicy <|.. ProPolicy
  ReportPolicy <|.. FreePolicy

  JsonFileOrderRepository ..> orders_json : lit
  SmtpMailer ..> env : mot de passe SMTP lu dans l'environnement
  main ..> ReportService : assemble et injecte
```

La composition root `main.js` est le seul fichier qui fait des `new` d'adaptateurs ; `ReportService` ne dépend que des interfaces (`OrderRepository`, `Mailer`, `Logger`, `Clock`, `Formatter`, `ReportPolicy`).

### La cible respecte-t-elle les 5 principes ?

| Principe | Comment la cible le respecte |
|---|---|
| S | Une classe par responsabilité : calcul (`salesStats`), formats (un `Formatter` par format), lecture (`OrderRepository`), envoi (`Mailer`), journal (`Logger`), règle d'adresse (`EmailAddress`). |
| O | Un nouveau format = une nouvelle classe `Formatter` enregistrée dans `FormatterRegistry` ; `ReportService` n'est pas rouvert. |
| L | Plus d'héritage qui refuse : l'offre gratuite est une `FreePolicy` qui implémente `ReportPolicy`, injectée, et `ReportService` reste le même pour tous. |
| I | De petites interfaces à une méthode (`all`, `send`, `info`, `now`, `format`, `check`) : chaque client n'utilise que ce dont il a besoin. |
| D | `ReportService` dépend d'abstractions ; le fichier, le SMTP, la console et l'horloge sont des détails branchés par `main.js` ; le mot de passe SMTP vient de l'environnement. |

### Ce que j'ai réellement implémenté (parcours Data : une seule extraction)

`salesStats` (le calcul), injecté dans `ReportService` par le constructeur : `new ReportService({ computeStats })`. Le reste du diagramme est la cible à atteindre (parcours Dev), pas du code livré.
