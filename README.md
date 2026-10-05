# Convertitore HEIC → JPG (pagina web locale)

## Installazione
Serve Python 3.9+.

    pip install -r requirements.txt

## Uso
    python app.py

Si apre il browser su http://127.0.0.1:8765 (il server è raggiungibile solo dal tuo computer).

1. **Cartella di input** → "Sfoglia…" per navigare tra le cartelle (o incolla il percorso) → "Carica": compaiono le miniature delle foto HEIC.
2. Scegli le foto cliccando le miniature (Shift+clic per un intervallo), oppure "Seleziona tutte" / "Prime N".
3. **Cartella di output** → "Sfoglia…": dentro la posizione scelta viene sempre creata la cartella `Foto convertite`.
4. "Converti selezionate".

I file esistenti non vengono sovrascritti (si aggiunge `_1`, `_2`…). Orientamento ed EXIF sono mantenuti.
