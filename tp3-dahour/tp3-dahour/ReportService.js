// TP 3 · Rapport mensuel des ventes de ShopLite (parcours Data).
// Une seule extraction réalisée : le calcul des statistiques vit dans domain/salesStats.js
// et est injecté par le constructeur. Le reste (formats, lecture, envoi, journal, offre gratuite)
// n'est pas encore refactoré : voir VIOLATIONS.md et la cible dans DIAGRAMMES.md.
import fs from 'node:fs';
import { computeStats as defaultComputeStats } from './domain/salesStats.js';

export class ReportService {
  // Le calcul est INJECTÉ (valeur par défaut = le vrai calcul) : un test peut le remplacer.
  constructor({ computeStats = defaultComputeStats } = {}) {
    this.computeStats = computeStats;
    // Dépendances concrètes créées ici : impossible de les remplacer dans un test
    this.dbFile = new URL('./orders.json', import.meta.url);
    this.smtp = {
      host: 'smtp.shoplite.fr',
      port: 587,
      user: 'reports',
      password: 'Sh0pL1te!',
    };
    this.outbox = []; // e-mails « envoyés » (simulation du serveur SMTP)
    this.history = [];
  }

  loadOrders() {
    const raw = fs.readFileSync(this.dbFile, 'utf8');
    return JSON.parse(raw);
  }

  generate(month, format, recipient) {
    // 1. Lecture des données
    const orders = this.loadOrders();

    // 2. Calculs métier : délégués à la fonction extraite (domain/salesStats.js)
    const { count, revenueHT, vat, revenueTTC, average, byCategory } = this.computeStats(
      orders,
      month,
    );

    // 3. Mise en forme : un if par format
    let output;
    if (format === 'csv') {
      output = 'categorie;montant_ht\n';
      for (const c of Object.keys(byCategory).sort())
        output += `${c};${byCategory[c]}\n`;
      output += `TOTAL HT;${revenueHT}\nTVA;${vat}\nTOTAL TTC;${revenueTTC}\n`;
    } else if (format === 'html') {
      output = `<h1>Ventes ${month}</h1><p>${count} commande(s), panier moyen ${average} €</p><ul>`;
      for (const c of Object.keys(byCategory).sort())
        output += `<li>${c} : ${byCategory[c]} €</li>`;
      output += `</ul><p><b>Total TTC : ${revenueTTC} €</b></p>`;
    } else if (format === 'json') {
      output = JSON.stringify({
        month,
        count,
        revenueHT,
        vat,
        revenueTTC,
        average,
        byCategory,
      });
    } else {
      throw new Error(`Format non supporté : ${format}`);
    }

    // 4. Journalisation
    const line = `[${new Date().toISOString()}] rapport ${month} (${format}) : ${count} commande(s)`;
    console.log(line);
    this.history.push(line);

    // 5. Envoi par e-mail
    if (recipient) {
      if (!recipient.includes('@')) throw new Error(`Adresse invalide : ${recipient}`);
      this.outbox.push({
        via: `${this.smtp.host}:${this.smtp.port}`,
        to: recipient,
        subject: `Rapport des ventes ${month}`,
        body: output,
      });
    }
    return output;
  }
}

// Variante « offre gratuite » : elle refuse ce que la classe parente accepte
export class FreeReportService extends ReportService {
  generate(month, format, recipient) {
    if (format !== 'csv') throw new Error('Format réservé aux comptes Pro');
    if (recipient) throw new Error('Envoi par e-mail réservé aux comptes Pro');
    return super.generate(month, format);
  }
}
