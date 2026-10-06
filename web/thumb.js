// Miniature rapide: legge la piccola anteprima incorporata nei file HEIC (di solito 320 px)
// con libheif, senza decodificare l'intera foto. Se il file non ne ha una, restituisce null.
(function () {
  let modPromise = null;
  function loadLib() {
    if (modPromise) return modPromise;
    modPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "lib/libheif-bundle.js";
      s.onload = () => Promise.resolve(window.libheif()).then(resolve, reject);
      s.onerror = () => reject(new Error("libheif non caricata"));
      document.head.appendChild(s);
    });
    return modPromise;
  }

  function extract(m, buf) {
    const i32 = a => m.HEAP32[a >> 2];
    const mem = m._malloc(buf.length), err = m._malloc(12), p = m._malloc(8);   // heif_error = {code, subcode, message*}
    const ctx = m._heif_context_alloc(), handles = [];
    let img = 0;
    try {
      m.HEAPU8.set(buf, mem);
      m._heif_context_read_from_memory_without_copy(err, ctx, mem, buf.length, 0);
      if (i32(err)) return null;
      m._heif_context_get_primary_image_handle(err, ctx, p);
      if (i32(err)) return null;
      const main = i32(p); handles.push(main);
      const n = m._heif_image_handle_get_number_of_thumbnails(main);
      if (!n) return null;
      const ids = m._malloc(4 * n);
      m._heif_image_handle_get_list_of_thumbnail_IDs(main, ids, n);
      const id = i32(ids); m._free(ids);
      m._heif_image_handle_get_thumbnail(err, main, id, p);
      if (i32(err)) return null;
      const th = i32(p); handles.push(th);
      m._heif_decode_image(err, th, p, 1 /* RGB */, 10 /* interleaved RGB */, 0);
      if (i32(err)) return null;
      img = i32(p);
      const strideP = m._malloc(4), ptr = m._heif_image_get_plane_readonly2(img, 10, strideP), stride = i32(strideP);
      m._free(strideP);
      const w = m._heif_image_get_width(img, 10), h = m._heif_image_get_height(img, 10);
      if (!ptr || !w || !h) return null;
      const rgba = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++) {
        let s = ptr + y * stride, d = y * w * 4;
        for (let x = 0; x < w; x++, s += 3, d += 4) {
          rgba[d] = m.HEAPU8[s]; rgba[d + 1] = m.HEAPU8[s + 1]; rgba[d + 2] = m.HEAPU8[s + 2]; rgba[d + 3] = 255;
        }
      }
      return {w, h, rgba};
    } finally {
      if (img) m._heif_image_release(img);
      handles.forEach(h => m._heif_image_handle_release(h));
      m._heif_context_free(ctx); m._free(mem); m._free(err); m._free(p);
    }
  }

  // Restituisce un URL (blob:) con la miniatura, oppure null se non disponibile.
  window.quickThumb = async function (file) {
    try {
      const m = await loadLib();
      const r = extract(m, new Uint8Array(await file.arrayBuffer()));
      if (!r) return null;
      const c = document.createElement("canvas"); c.width = r.w; c.height = r.h;
      c.getContext("2d").putImageData(new ImageData(r.rgba, r.w, r.h), 0, 0);
      const blob = await new Promise(res => c.toBlob(res, "image/jpeg", 0.85));
      return blob ? URL.createObjectURL(blob) : null;
    } catch { return null; }
  };
  setTimeout(() => loadLib().catch(() => {}), 500);   // precarica la libreria mentre l'utente sceglie le foto
})();
