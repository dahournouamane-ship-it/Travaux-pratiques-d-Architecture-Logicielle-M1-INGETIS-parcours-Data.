// Preuve de l'injection : un faux calcul passé au constructeur remplace le vrai.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ReportService } from './ReportService.js';

test('la responsabilité extraite peut être remplacée par injection', () => {
  const appels = [];
  const faux = (orders, month) => {
    appels.push({ commandesRecues: orders.length, month });
    return {
      month,
      count: 1,
      revenueHT: 100,
      vat: 20,
      revenueTTC: 120,
      average: 100,
      byCategory: { test: 100 },
    };
  };
  const service = new ReportService({ computeStats: faux });
  assert.equal(
    service.generate('2026-09', 'csv'),
    'categorie;montant_ht\ntest;100\nTOTAL HT;100\nTVA;20\nTOTAL TTC;120\n',
  );
  // le service a bien transmis toutes les commandes lues et le mois demandé
  assert.deepEqual(appels, [{ commandesRecues: 5, month: '2026-09' }]);
});
