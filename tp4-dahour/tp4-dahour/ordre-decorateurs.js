// B2 · L'ordre des décorateurs a-t-il un effet ? Lancer : node seance4-patterns/tp4-dahour/ordre-decorateurs.js
// Les compositions utilisent exactement les mêmes classes, empilées dans un ordre différent.
import { FakeHttpClient, LoggingClient, CachingClient, RetryClient } from '../structuraux/decorator.js';

async function scenario(nom, fabriquer) {
  const base = new FakeHttpClient();
  const client = fabriquer(base);
  console.log(`\n${nom}`);
  await client.get('/api/ruches');
  await client.get('/api/ruches');
  await client.get('/api/instable');
  console.log(`  → appels réels sur le client de base : ${base.calls}`);
}

// Composition A : le cache est à l'extérieur
await scenario('A · Cache( Retry( Log( base ) ) )', base => new CachingClient(new RetryClient(new LoggingClient(base))));

// Composition B : la journalisation est à l'extérieur
await scenario('B · Log( Cache( Retry( base ) ) )', base => new LoggingClient(new CachingClient(new RetryClient(base))));

// Composition C (la mienne) : cache à l'extérieur comme en A, mais journal AU-DESSUS de la nouvelle tentative
// comme en B : le journal ne voit qu'une ligne par appel réel (résultat final), jamais les échecs intermédiaires.
await scenario('C · Cache( Log( Retry( base ) ) )', base => new CachingClient(new LoggingClient(new RetryClient(base))));

// Réponses aux questions B2 : voir PATTERNS.md
