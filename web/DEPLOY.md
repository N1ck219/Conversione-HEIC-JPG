# Pubblicare il sito (versione online)

La cartella `web/` è un sito **statico** (nessun server): la conversione avviene nel browser.

## 1. Deploy gratuito su Cloudflare Pages (consigliato)
1. Crea un account su <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Scegli il repository `Conversione-HEIC-JPG` e il branch `versione-web-online` (poi quello che userai in produzione).
3. Impostazioni di build: *Framework preset* **None**, *Build command* vuoto, *Build output directory* **`web`**.
4. **Save and Deploy**: ottieni un indirizzo `https://nome.pages.dev`. Ogni push aggiorna il sito.
5. (Facoltativo) Un dominio tuo, ~10 €/anno, si collega da *Custom domains*. Aiuta molto con AdSense.

Alternativa: Netlify (trascina la cartella `web` su <https://app.netlify.com/drop>).
Evita GitHub Pages (i termini vietano attività commerciali) e il piano gratuito di Vercel (solo uso non commerciale).

## 2. Configurazione (`web/site-config.js`)
- `contactEmail`: **metti la tua email**, compare nella pagina privacy.
- `adsenseClient` e `adSlots`: vedi sotto. Finché `adsenseClient` è vuoto, il sito non mostra annunci né banner cookie.
- Anteprima degli spazi pubblicitari: apri il sito con `?ads=preview`.

## 3. Pubblicità con Google AdSense
1. Pubblica prima il sito su un dominio e lascialo online qualche settimana, con un po' di visite.
2. Iscriviti su <https://adsense.google.com> con il tuo sito. Riceverai un ID editore `ca-pub-…`.
3. Dopo l'approvazione crea 3 blocchi annuncio (due verticali 160×600, uno orizzontale) e copia ID e slot in `site-config.js`.
4. Metti la riga fornita da AdSense in `web/ads.txt`.
5. Il banner di consenso è già incluso: gli annunci partono solo dopo "Accetta". Per mostrare annunci personalizzati a utenti UE/UK Google richiede un consenso tramite CMP certificato (es. quello integrato in AdSense "Privacy e messaggi"): se lo attivi, puoi togliere il banner di `ads.js`.

## 4. Guadagni e percentuali
- Hosting gratuito: nessuna percentuale sugli annunci. Chi trattiene una quota è la rete pubblicitaria (AdSense ~32%).
- I ricavi dipendono dal traffico da Google: servono tempo e visite.
- In Italia i guadagni vanno dichiarati; oltre certe soglie serve la partita IVA. Chiedi a un commercialista.

## 5. Note tecniche
- Librerie incluse in `web/lib/` (heic2any, JSZip): nessuna dipendenza esterna a runtime.
- Il browser non copia i metadati EXIF nei JPG (orientamento corretto, niente GPS).
