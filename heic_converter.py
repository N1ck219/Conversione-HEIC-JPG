"""Convertitore HEIC -> JPG con interfaccia grafica.

Inserisci il percorso di una cartella, scegli quali foto HEIC convertire
(selezione singola/multipla, "seleziona tutte", "prime N") e premi Converti.
"""
from pathlib import Path

from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()

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


def run_gui():
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk

    root = tk.Tk()
    root.title("Convertitore HEIC → JPG")
    root.geometry("640x560")

    files = []
    folder_var = tk.StringVar()
    out_var = tk.StringVar()
    quality_var = tk.IntVar(value=90)
    count_var = tk.IntVar(value=1)
    status_var = tk.StringVar(value="Scegli una cartella e premi “Carica”.")

    pad = {"padx": 8, "pady": 4}

    # --- cartella sorgente
    top = ttk.Frame(root)
    top.pack(fill="x", **pad)
    ttk.Label(top, text="Cartella foto:").pack(side="left")
    folder_entry = ttk.Entry(top, textvariable=folder_var)
    folder_entry.pack(side="left", fill="x", expand=True, padx=6)
    ttk.Button(top, text="Sfoglia…", command=lambda: browse_folder()).pack(side="left")
    ttk.Button(top, text="Carica", command=lambda: load_files()).pack(side="left", padx=(6, 0))

    # --- lista file
    mid = ttk.Frame(root)
    mid.pack(fill="both", expand=True, **pad)
    listbox = tk.Listbox(mid, selectmode="extended", activestyle="none")
    scroll = ttk.Scrollbar(mid, orient="vertical", command=listbox.yview)
    listbox.configure(yscrollcommand=scroll.set)
    listbox.pack(side="left", fill="both", expand=True)
    scroll.pack(side="left", fill="y")

    # --- selezione rapida
    sel = ttk.Frame(root)
    sel.pack(fill="x", **pad)
    ttk.Button(sel, text="Seleziona tutte", command=lambda: listbox.select_set(0, "end")).pack(side="left")
    ttk.Button(sel, text="Deseleziona", command=lambda: listbox.select_clear(0, "end")).pack(side="left", padx=6)
    ttk.Label(sel, text="Prime").pack(side="left", padx=(12, 4))
    ttk.Spinbox(sel, from_=1, to=100000, width=6, textvariable=count_var).pack(side="left")
    ttk.Button(sel, text="Seleziona", command=lambda: select_first()).pack(side="left", padx=6)
    ttk.Label(sel, text="(Ctrl/Shift+clic per scegliere a mano)").pack(side="right")

    # --- opzioni di output
    opts = ttk.Frame(root)
    opts.pack(fill="x", **pad)
    ttk.Label(opts, text="Salva in:").pack(side="left")
    ttk.Entry(opts, textvariable=out_var).pack(side="left", fill="x", expand=True, padx=6)
    ttk.Button(opts, text="Sfoglia…", command=lambda: browse_out()).pack(side="left")

    q = ttk.Frame(root)
    q.pack(fill="x", **pad)
    ttk.Label(q, text="Qualità JPG:").pack(side="left")
    ttk.Scale(q, from_=50, to=100, variable=quality_var, orient="horizontal",
              command=lambda v: quality_var.set(int(float(v)))).pack(side="left", fill="x", expand=True, padx=6)
    ttk.Label(q, textvariable=quality_var, width=4).pack(side="left")

    # --- converti
    progress = ttk.Progressbar(root, mode="determinate")
    progress.pack(fill="x", **pad)
    convert_btn = ttk.Button(root, text="Converti selezionate", command=lambda: convert_selected())
    convert_btn.pack(**pad)
    ttk.Label(root, textvariable=status_var).pack(fill="x", **pad)

    def browse_folder():
        d = filedialog.askdirectory(title="Scegli la cartella con le foto")
        if d:
            folder_var.set(d)
            load_files()

    def browse_out():
        d = filedialog.askdirectory(title="Cartella di destinazione")
        if d:
            out_var.set(d)

    def load_files():
        nonlocal files
        try:
            files = list_heic_files(folder_var.get().strip().strip('"'))
        except NotADirectoryError as e:
            messagebox.showerror("Errore", str(e))
            return
        listbox.delete(0, "end")
        for p in files:
            listbox.insert("end", p.name)
        count_var.set(min(max(len(files), 1), 10) if files else 1)
        folder = Path(folder_var.get().strip().strip('"')).expanduser()
        out_var.set(str(folder / "jpg"))
        status_var.set(f"Trovate {len(files)} foto HEIC." if files else "Nessuna foto HEIC in questa cartella.")

    def select_first():
        listbox.select_clear(0, "end")
        try:
            n = int(count_var.get())
        except tk.TclError:
            return
        if n > 0 and files:
            listbox.select_set(0, min(n, len(files)) - 1)

    def convert_selected():
        idx = listbox.curselection()
        if not idx:
            messagebox.showinfo("Nessuna selezione", "Seleziona almeno una foto da convertire.")
            return
        out_dir = out_var.get().strip()
        if not out_dir:
            messagebox.showinfo("Destinazione", "Indica la cartella di destinazione.")
            return
        convert_btn.state(["disabled"])
        progress.configure(maximum=len(idx), value=0)
        errors = []
        for done, i in enumerate(idx, 1):
            src = files[i]
            status_var.set(f"Converto {src.name} ({done}/{len(idx)})…")
            root.update_idletasks()
            try:
                convert_file(src, out_dir, quality_var.get())
            except Exception as e:  # noqa: BLE001 - mostriamo l'errore all'utente
                errors.append(f"{src.name}: {e}")
            progress.configure(value=done)
            root.update()
        convert_btn.state(["!disabled"])
        ok = len(idx) - len(errors)
        status_var.set(f"Fatto: {ok} convertite, {len(errors)} errori. Salvate in {out_dir}")
        if errors:
            messagebox.showwarning("Alcuni errori", "\n".join(errors[:10]))
        else:
            messagebox.showinfo("Completato", f"{ok} foto convertite in:\n{out_dir}")

    folder_entry.bind("<Return>", lambda _e: load_files())
    root.mainloop()


if __name__ == "__main__":
    run_gui()
