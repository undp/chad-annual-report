#!/usr/bin/env bash
# Pubblica la demo riservata su https://chad.mio.guru (basic auth, utente "undp").
# L'origine accetta traffico solo dall'edge Cloudflare: l'IP del server non è
# raggiungibile direttamente. Config nginx: /etc/nginx/sites-available/chad.mio.guru
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
rsync -az --delete -e ssh _site/ box.mio.guru:/var/www/chad/
ssh box.mio.guru 'chown -R www-data:www-data /var/www/chad'
echo "→ https://chad.mio.guru/en/"
