// DOMAINE : calcul pur des indicateurs de ventes d'un mois.
// Aucun import, aucun fichier, aucun e-mail, aucune date système :
// on lui donne des commandes, il rend des chiffres. Réutilisable (tableau de bord, tests…).
export function computeStats(orders, month) {
  const ofMonth = orders.filter(o => o.date.startsWith(month));

  let revenueHT = 0;
  let count = 0;
  const byCategory = {};
  for (const o of ofMonth) {
    if (o.status === 'CANCELLED') continue; // règle qualité : commande annulée exclue
    count++;
    for (const l of o.lines) {
      const amount = l.qty * l.unitPrice;
      revenueHT += amount;
      byCategory[l.category] = (byCategory[l.category] || 0) + amount;
    }
  }
  const vat = Math.round(revenueHT * 0.2 * 100) / 100;
  const revenueTTC = revenueHT + vat;
  const average = count === 0 ? 0 : Math.round((revenueHT / count) * 100) / 100;

  return { month, count, revenueHT, vat, revenueTTC, average, byCategory };
}
