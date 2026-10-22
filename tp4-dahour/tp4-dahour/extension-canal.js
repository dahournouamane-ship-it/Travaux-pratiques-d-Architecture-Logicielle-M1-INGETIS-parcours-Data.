// B1 · Étendre sans modifier : ajouter le canal « sms-groupe » à la fabrique de notifications
// (un SMS envoyé à toutes les apicultrices d'une coopérative). factory.js n'est PAS modifié.
import { Notification, registerChannel } from '../creationnels/factory.js';

// B1.1 : nouvelle classe qui hérite de Notification et respecte son contrat send(msg)
export class SmsGroupeNotification extends Notification {
  send(msg) {
    return `[SMS-GROUPE] ${msg}`;
  }
}

export function installerCanalGroupe() {
  // B1.2 : une seule ligne, le registre de la fabrique fait le reste
  registerChannel('sms-groupe', SmsGroupeNotification);
}
