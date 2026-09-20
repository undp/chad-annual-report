// Stato degli asset che arrivano dal cliente, letto a build time.
//
// Il PDF del report è un file del cliente: finché non ce lo consegnano, il
// segnaposto in src/assets/files pesa 0 byte. Un <a download> su un file vuoto
// scarica un file vuoto, quindi i template chiedono qui se il link va reso
// attivo. Quando il PDF vero prende il posto del segnaposto, la pagina torna
// a scaricarlo senza toccare il markup.
import { statSync } from 'node:fs';

function weighs(path) {
  try {
    return statSync(path).size > 0;
  } catch {
    return false;
  }
}

export default {
  reportPdf: weighs('src/assets/files/undp-chad-annual-report-2025-en.pdf'),
};
