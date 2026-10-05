# Convertitore HEIC → JPG

Piccolo programma con interfaccia grafica: indichi una cartella, scegli quali foto HEIC convertire e le salva come JPG.

## Installazione
Serve Python 3.9+ (con tkinter, incluso nell'installer ufficiale di Windows/macOS).

    pip install -r requirements.txt

## Uso
    python heic_converter.py

1. Incolla il percorso della cartella (o "Sfoglia…") e premi **Carica**.
2. Scegli le foto: Ctrl/Shift+clic, **Seleziona tutte**, oppure **Prime N**.
3. (Opzionale) cambia cartella di destinazione (di default `<cartella>/jpg`) e qualità.
4. Premi **Converti selezionate**.

I file esistenti non vengono sovrascritti (si aggiunge `_1`, `_2`…). Orientamento ed EXIF sono mantenuti.
