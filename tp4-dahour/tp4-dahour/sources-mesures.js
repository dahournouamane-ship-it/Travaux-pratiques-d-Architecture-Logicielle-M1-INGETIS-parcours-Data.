// C · DATA — Adapter : deux sources de mesures hétérogènes, un seul contrat.
//
// Contrat attendu par le reste de QueenBee (contexte « Santé des colonies ») :
//   Mesure = { hiveId: string, at: string ISO 8601 (UTC), poidsKg: number, temperatureC: number, source: string }

// --- Source 1 : trames capteurs déjà décodées (format 6.5 du cahier des charges) — NON modifiable
export class CapteurLoRaSource {
  async trames() {
    return [
      { hive_id: 'SN-CASA-014', site_id: 'SN-CASA', timestamp: '2027-03-14T08:15:00Z', weight_kg: 34.2, temp_internal_c: 34.8 },
      { hive_id: 'SN-CASA-015', site_id: 'SN-CASA', timestamp: '2027-03-14T08:30:00Z', weight_kg: 29.9, temp_internal_c: 35.1 },
    ];
  }
}

// --- Source 2 : anciens relevés papier numérisés (CSV) — NON modifiable
// colonnes : ruche ; date « JJ/MM/AAAA HH:MM » (heure UTC) ; poids en GRAMMES ; température en °F
export class ReleveManuelSource {
  async lignes() {
    return [
      'CM-BAF-003;13/03/2027 07:00;41850;93.2',
      'CM-BAF-004;13/03/2027 07:20;;95.0', // poids manquant : ligne inexploitable
      'CM-BAF-005;14/03/2027 09:05;38100;94.1',
    ];
  }
}

// --- Adaptateurs

// C-Data.1 : LoRaAdapter — renomme les champs de la trame vers le contrat Mesure
export class LoRaAdapter {
  constructor(source) { this.source = source; }
  async mesures() {
    const trames = await this.source.trames();
    return trames.map(t => ({
      hiveId: t.hive_id,
      at: new Date(t.timestamp).toISOString(),
      poidsKg: t.weight_kg,
      temperatureC: t.temp_internal_c,
      source: 'capteur',
    }));
  }
}

// C-Data.2 : ReleveManuelAdapter — découpe le CSV, convertit date, poids et température,
// et écarte les lignes incomplètes ou illisibles (qualité des données).
const DATE_FR = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/;

function lireLigne(ligne) {
  const champs = ligne.split(';').map(c => c.trim());
  if (champs.length !== 4 || champs.some(c => c === '')) return null; // champ manquant

  const [hiveId, dateTexte, grammesTexte, fahrenheitTexte] = champs;

  const d = DATE_FR.exec(dateTexte);
  if (!d) return null;
  const [jour, mois, annee, heure, minute] = d.slice(1).map(Number);
  const date = new Date(Date.UTC(annee, mois - 1, jour, heure, minute));
  if (date.getUTCMonth() !== mois - 1 || date.getUTCDate() !== jour) return null; // ex. 31/02

  const grammes = Number(grammesTexte);
  const fahrenheit = Number(fahrenheitTexte);
  if (!Number.isFinite(grammes) || !Number.isFinite(fahrenheit)) return null;

  return {
    hiveId,
    at: date.toISOString(),
    poidsKg: grammes / 1000,
    temperatureC: Math.round(((fahrenheit - 32) * 5 / 9) * 10) / 10,
    source: 'releve-manuel',
  };
}

export class ReleveManuelAdapter {
  constructor(source) { this.source = source; }
  async mesures() {
    const lignes = await this.source.lignes();
    return lignes.map(lireLigne).filter(m => m !== null);
  }
}

// --- Client : ne connaît que le contrat Mesure (fourni)
export async function toutesLesMesures(adaptateurs) {
  const lots = await Promise.all(adaptateurs.map(a => a.mesures()));
  return lots.flat().sort((a, b) => a.at.localeCompare(b.at));
}
