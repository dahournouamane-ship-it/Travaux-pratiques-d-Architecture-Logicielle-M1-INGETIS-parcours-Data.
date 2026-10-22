// Tests de CARACTÉRISATION fournis : ils figent le comportement actuel du rapport.
// Ils doivent rester verts pendant TOUT le refactoring.
// Lancer : node --test seance3-solid/tp3/ReportService.caracterisation.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ReportService } from './ReportService.js';

const CSV_SEPT = 'categorie;montant_ht\ninformatique;416\nlivres;135\n' +
  'TOTAL HT;551\nTVA;110.2\nTOTAL TTC;661.2\n';

test('CSV de septembre 2026 (commande annulée exclue)', () => {
  assert.equal(new ReportService().generate('2026-09', 'csv'), CSV_SEPT);
});

test('HTML de septembre 2026', () => {
  assert.equal(new ReportService().generate('2026-09', 'html'),
    '<h1>Ventes 2026-09</h1><p>3 commande(s), panier moyen 183.67 €</p><ul>' +
    '<li>informatique : 416 €</li><li>livres : 135 €</li></ul><p><b>Total TTC : 661.2 €</b></p>');
});

test('JSON de septembre 2026', () => {
  assert.deepEqual(JSON.parse(new ReportService().generate('2026-09', 'json')), {
    month: '2026-09', count: 3, revenueHT: 551, vat: 110.2, revenueTTC: 661.2,
    average: 183.67, byCategory: { informatique: 416, livres: 135 },
  });
});

test('mois sans commande : totaux à zéro', () => {
  assert.equal(new ReportService().generate('2026-01', 'csv'),
    'categorie;montant_ht\nTOTAL HT;0\nTVA;0\nTOTAL TTC;0\n');
});

test('format inconnu refusé', () => {
  assert.throws(() => new ReportService().generate('2026-09', 'pdf'), /Format non supporté/);
});

test('envoi par e-mail : un message dans la boîte d’envoi', () => {
  const s = new ReportService();
  s.generate('2026-09', 'csv', 'direction@shoplite.fr');
  assert.equal(s.outbox.length, 1);
  assert.equal(s.outbox[0].to, 'direction@shoplite.fr');
  assert.equal(s.outbox[0].body, CSV_SEPT);
});

test('adresse e-mail invalide refusée', () => {
  assert.throws(() => new ReportService().generate('2026-09', 'csv', 'direction'), /Adresse invalide/);
});
