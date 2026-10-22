// Le calcul se teste seul : pas de fichier orders.json, pas d'e-mail, pas de console.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from './domain/salesStats.js';

const ligne = (category, qty, unitPrice) => ({ sku: 'X', category, qty, unitPrice });
const cmd = (id, date, status, lines) => ({ id, date, customer: 'C-1', status, lines });

test('indicateurs d’un mois calculés sur des commandes en mémoire', () => {
  const orders = [
    cmd('1', '2026-09-02', 'PAID', [ligne('informatique', 2, 49), ligne('informatique', 1, 19)]),
    cmd('2', '2026-09-05', 'PAID', [ligne('livres', 1, 45)]),
    cmd('3', '2026-10-01', 'PAID', [ligne('livres', 1, 100)]), // autre mois : ignorée
  ];
  assert.deepEqual(computeStats(orders, '2026-09'), {
    month: '2026-09',
    count: 2,
    revenueHT: 162,
    vat: 32.4,
    revenueTTC: 194.4,
    average: 81,
    byCategory: { informatique: 117, livres: 45 },
  });
});

test('une commande annulée est exclue du chiffre d’affaires et du nombre', () => {
  const orders = [cmd('1', '2026-09-02', 'CANCELLED', [ligne('livres', 1, 45)])];
  assert.equal(computeStats(orders, '2026-09').count, 0);
  assert.equal(computeStats(orders, '2026-09').revenueHT, 0);
});

test('mois sans commande : tout est à zéro, panier moyen 0 (pas de division par zéro)', () => {
  assert.deepEqual(computeStats([], '2026-01'), {
    month: '2026-01', count: 0, revenueHT: 0, vat: 0, revenueTTC: 0, average: 0, byCategory: {},
  });
});
