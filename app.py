"""App web locale per convertire foto HEIC in JPG.

Avvio:  python app.py   (si apre il browser su http://127.0.0.1:8765)
Il server ascolta solo su questo computer.
"""
import json
import os
import string
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import heic_converter as hc

HOST, PORT = "127.0.0.1", 8765
STATIC = Path(__file__).parent / "static"
_thumb_cache = {}
_thumb_lock = threading.Lock()


def browse(path):
    """Elenca le sottocartelle di `path` (vuoto = cartella utente / unità)."""
    if not path:
        if os.name == "nt":
            drives = [f"{d}:\\" for d in string.ascii_uppercase if Path(f"{d}:\\").exists()]
            return {"path": "", "parent": None, "dirs": [{"name": d, "path": d} for d in drives]}
        path = str(Path.home())
    p = Path(path).expanduser().resolve()
    if not p.is_dir():
        raise NotADirectoryError(f"Cartella non trovata: {p}")
    dirs = []
    try:
        for c in sorted(p.iterdir(), key=lambda x: x.name.lower()):
            try:
                if c.is_dir() and not c.name.startswith("."):
                    dirs.append({"name": c.name, "path": str(c)})
            except OSError:
                pass
    except PermissionError:
        raise PermissionError(f"Accesso negato: {p}")
    parent = str(p.parent) if p.parent != p else ("" if os.name == "nt" else None)
    return {"path": str(p), "parent": parent, "dirs": dirs, "home": str(Path.home())}


def thumbnail(folder, name):
    src = Path(folder) / Path(name).name  # niente path traversal
    if src.suffix.lower() not in hc.HEIC_EXTENSIONS or not src.is_file():
        raise FileNotFoundError(name)
    key = (str(src), src.stat().st_mtime)
    with _thumb_lock:
        data = _thumb_cache.get(key)
    if data is None:
        data = hc.make_thumbnail(src)
        with _thumb_lock:
            if len(_thumb_cache) > 2000:
                _thumb_cache.clear()
            _thumb_cache[key] = data
    return data


def convert(folder, out_parent, name, quality):
    src = Path(folder) / Path(name).name
    if src.suffix.lower() not in hc.HEIC_EXTENSIONS or not src.is_file():
        raise FileNotFoundError(name)
    out_dir = Path(out_parent).expanduser() / hc.OUTPUT_FOLDER_NAME
    dest = hc.convert_file(src, out_dir, max(1, min(100, int(quality))))
    return {"output": str(dest), "out_dir": str(out_dir)}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _send(self, code, body, ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
        elif isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store" if ctype == "application/json" else "max-age=300")
        self.end_headers()
        self.wfile.write(body)

    def _host_ok(self):
        # difesa da DNS rebinding: accetta solo richieste dirette a localhost
        return self.headers.get("Host", "").split(":")[0] in ("127.0.0.1", "localhost")

    def do_GET(self):
        if not self._host_ok():
            return self._send(403, {"error": "host non consentito"})
        u = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        try:
            if u.path == "/":
                return self._send(200, (STATIC / "index.html").read_bytes(), "text/html; charset=utf-8")
            if u.path == "/api/browse":
                return self._send(200, browse(q.get("path", "")))
            if u.path == "/api/list":
                files = hc.list_heic_files(q.get("folder", ""))
                return self._send(200, {"files": [p.name for p in files]})
            if u.path == "/api/thumb":
                return self._send(200, thumbnail(q.get("folder", ""), q.get("name", "")), "image/jpeg")
            return self._send(404, {"error": "non trovato"})
        except Exception as e:  # noqa: BLE001
            return self._send(400, {"error": str(e)})

    def do_POST(self):
        if not self._host_ok() or self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            return self._send(403, {"error": "richiesta non consentita"})
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            if urlparse(self.path).path == "/api/convert":
                return self._send(200, convert(body["folder"], body["out_parent"], body["name"], body.get("quality", 90)))
            return self._send(404, {"error": "non trovato"})
        except Exception as e:  # noqa: BLE001
            return self._send(400, {"error": str(e)})


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    url = f"http://{HOST}:{PORT}"
    print(f"Convertitore HEIC → JPG attivo su {url}  (Ctrl+C per chiudere)")
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
