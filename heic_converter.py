"""Logica di conversione HEIC -> JPG (usata dall'app web in app.py)."""
from pathlib import Path

from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()

OUTPUT_FOLDER_NAME = "Foto convertite"
THUMB_SIZE = 240
HEIC_EXTENSIONS = {".heic", ".heif"}


def list_heic_files(folder):
    """Restituisce i file HEIC/HEIF presenti nella cartella, ordinati per nome."""
    folder = Path(folder).expanduser()
    if not folder.is_dir():
        raise NotADirectoryError(f"Cartella non trovata: {folder}")
    return sorted(
        (p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in HEIC_EXTENSIONS),
        key=lambda p: p.name.lower(),
    )


def unique_path(path):
    """Se il file esiste già aggiunge _1, _2, ... per non sovrascriverlo."""
    if not path.exists():
        return path
    n = 1
    while (candidate := path.with_name(f"{path.stem}_{n}{path.suffix}")).exists():
        n += 1
    return candidate


def convert_file(src, out_dir, quality=90):
    """Converte un singolo file HEIC in JPG e restituisce il percorso creato."""
    src = Path(src)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = unique_path(out_dir / (src.stem + ".jpg"))
    with Image.open(src) as img:
        exif = img.info.get("exif")
        img = ImageOps.exif_transpose(img)  # applica l'orientamento corretto
        if img.mode != "RGB":
            img = img.convert("RGB")
        save_kwargs = {"quality": quality}
        if exif:
            save_kwargs["exif"] = exif
        try:
            img.save(dest, "JPEG", **save_kwargs)
        except Exception:
            # EXIF non scrivibile: riprova senza
            save_kwargs.pop("exif", None)
            img.save(dest, "JPEG", **save_kwargs)
    return dest


def make_thumbnail(src, size=THUMB_SIZE):
    """Restituisce i byte JPEG di una miniatura (con orientamento corretto)."""
    import io

    with Image.open(src) as img:
        img = ImageOps.exif_transpose(img)
        img.thumbnail((size, size))
        buf = io.BytesIO()
        img.convert("RGB").save(buf, "JPEG", quality=75)
    return buf.getvalue()
