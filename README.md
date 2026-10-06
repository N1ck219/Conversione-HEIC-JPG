# Convertitore HEIC → JPG

Piccola app che gira nel browser (in locale, sul tuo computer): scegli una cartella con foto `.heic`/`.heif`,
vedi le miniature, selezioni quali convertire e le salva come JPG in una cartella `Foto convertite`.
Le foto non vengono mai inviate a internet.

## Funzioni
- Navigazione tra le cartelle con il tasto **Sfoglia…** (input e output) oppure incolla il percorso.
- **Miniature** di tutte le foto HEIC della cartella.
- Selezione: clic sulle miniature, Shift+clic per un intervallo, "Seleziona tutte", "Prime N".
- Qualità JPG regolabile (50–100, predefinita 90).
- Nella cartella di output scelta viene creata sempre la sottocartella **`Foto convertite`**.
- Durante la conversione: barra di avanzamento con **tempo trascorso, rimanente e totale stimato**.
- A lavoro finito compare un messaggio di conferma e il tasto **Apri cartella** per aprire la cartella con le foto convertite.
- Orientamento corretto ed EXIF mantenuti. I file esistenti non vengono sovrascritti (`foto.jpg`, `foto_1.jpg`, …).

## Requisiti
- **Windows 10/11** (per il file `.bat`; l'app funziona anche su macOS/Linux, vedi sotto)
- **Python 3.9 o superiore**
- Connessione a internet solo la prima volta, per scaricare le librerie (`Pillow`, `pillow-heif`)

## Installazione su Windows (consigliata)

### 1. Installa Python
1. Vai su <https://www.python.org/downloads/> e scarica l'ultima versione di Python 3.
2. Avvia l'installer e **spunta "Add python.exe to PATH"** in basso, poi *Install Now*.
3. Per verificare, apri il Prompt dei comandi e scrivi `python --version`
   (oppure `py -3 --version`): deve comparire un numero di versione.

### 2. Scarica il programma
- Con Git: `git clone https://github.com/N1ck219/Conversione-HEIC-JPG.git`
- Oppure da GitHub: **Code → Download ZIP**, poi estrai lo ZIP in una cartella a tua scelta
  (ad esempio `C:\Programmi-miei\Conversione-HEIC-JPG`). Non usare la cartella *dentro* lo ZIP senza estrarla.

### 3. Avvia con doppio clic
Fai doppio clic su **`avvia.bat`**. Alla **prima esecuzione**:
1. crea l'ambiente virtuale `.venv` nella cartella del programma;
2. installa le librerie necessarie (1–2 minuti);
3. avvia l'app e apre il browser su <http://127.0.0.1:8765>.

Dalle volte successive parte in pochi secondi. Lascia aperta la finestra nera finché usi l'app;
**per chiuderla basta chiudere la finestra** (o premere `Ctrl+C`).

> Se Windows mostra "Windows ha protetto il PC" (SmartScreen): *Ulteriori informazioni → Esegui comunque*.
> Succede con qualsiasi `.bat` scaricato da internet.

### Creare un collegamento sul Desktop
Tasto destro su `avvia.bat` → *Invia a* → *Desktop (crea collegamento)*.

## Come si usa
1. **Cartella di input** → **Sfoglia…** → naviga fino alla cartella con le foto → **Scegli questa cartella**.
   Compaiono le miniature.
2. Seleziona le foto da convertire.
3. **Cartella di output** → **Sfoglia…** → scegli *dove* salvare. Dentro verrà creata la cartella `Foto convertite`
   (se non scegli nulla, viene usata la cartella di input).
4. Premi **Converti selezionate**. Una barra mostra l'avanzamento; al termine vedi il percorso dei file creati.

## Installazione manuale (macOS / Linux / senza .bat)
```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
Poi apri <http://127.0.0.1:8765> se il browser non si apre da solo.

## Aggiornare
Scarica/`git pull` la nuova versione. Se compaiono errori sulle librerie, elimina la cartella `.venv`
e rilancia `avvia.bat`: verrà ricreata da zero.

## Problemi comuni
| Problema | Soluzione |
|---|---|
| "Python non trovato" | Reinstalla Python spuntando **Add python.exe to PATH**, poi riavvia `avvia.bat`. |
| Installazione dipendenze fallita | Controlla la connessione/proxy, poi rilancia. Se persiste, elimina `.venv` e riprova. |
| La pagina non si apre | Apri a mano <http://127.0.0.1:8765>. Se dice "porta in uso", chiudi altre finestre dell'app già aperte. |
| Nessuna miniatura / foto non convertita | Il file potrebbe essere danneggiato o non essere un vero HEIC; l'errore compare nella barra di stato. |
| Cartella non accessibile | Scegli una cartella dove hai i permessi di scrittura (es. Documenti o Immagini). |

## Struttura del progetto
- `avvia.bat` – avvio con doppio clic (crea il venv se manca)
- `app.py` – server web locale (solo `127.0.0.1`)
- `heic_converter.py` – conversione e miniature
- `static/index.html` – interfaccia
- `requirements.txt` – dipendenze

## Sicurezza
Il server ascolta solo su `127.0.0.1`, quindi non è raggiungibile da altri computer della rete.
