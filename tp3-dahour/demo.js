// Démonstration du code de départ : node seance3-solid/tp3/demo.js
import { ReportService } from './ReportService.js';
const service = new ReportService();
console.log(service.generate('2026-09', 'csv'));
console.log(service.generate('2026-09', 'html', 'direction@shoplite.fr'));
console.log('E-mails envoyés :', service.outbox.length);
