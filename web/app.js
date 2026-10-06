const $ = id => document.getElementById(id);
let items = [];          // {file, name, state, cache:{q,blob}, thumb, el, removed}
let results = [];        // [{name, blob}] dell'ultima conversione
let busy = false;        // conversione in corso
let thumbRunning = false;

const isHeic = f => /\.(heic|heif)$/i.test(f.name) || /image\/hei[cf]/.test(f.type);
function fmt(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}
function setStatus(msg, err) { $("status").textContent = msg; $("status").className = err ? "err" : "hint"; }
const quality = () => $("quality").value / 100;

// preferenza "avvia subito"
try { if (localStorage.getItem("autostart") === "no") $("autoStart").checked = false; } catch { /* ignora */ }
$("autoStart").onchange = () => { try { localStorage.setItem("autostart", $("autoStart").checked ? "yes" : "no"); } catch { /* ignora */ } };

// ---- decodifica HEIC (una alla volta; i risultati sono in cache e riusati dalla conversione finale)
let lock = Promise.resolve();
function serial(fn) { const p = lock.then(fn, fn); lock = p.catch(() => {}); return p; }
async function decode(file, q) {
  const out = await heic2any({blob: file, toType: "image/jpeg", quality: q});
  return Array.isArray(out) ? out[0] : out;
}
function ensureBlob(it, q) {
  if (it.cache && it.cache.q === q) return Promise.resolve(it.cache.blob);
  if (it.pending && it.pending.q === q) return it.pending.p;
  const p = serial(async () => {
    await new Promise(r => setTimeout(r, 0));            // lascia ridisegnare la pagina
    const blob = await decode(it.file, q);
    it.cache = {q, blob};
    await makeThumb(it, blob);
    return blob;
  }).finally(() => { if (it.pending && it.pending.p === p) it.pending = null; });
  it.pending = {q, p};
  return p;
}
async function makeThumb(it, blob) {
  if (it.thumb) return;
  let url;
  try {
    const bmp = await createImageBitmap(blob, {resizeWidth: 320, resizeQuality: "medium"});
    const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
    c.getContext("2d").drawImage(bmp, 0, 0); bmp.close();
    url = URL.createObjectURL(await new Promise(r => c.toBlob(r, "image/jpeg", 0.8)));
  } catch { url = URL.createObjectURL(blob); }
  it.thumb = url; updateCard(it);
}

// ---- elenco e miniature
function createCard(it) {
  const d = document.createElement("div"); d.className = "thumb";
  d.innerHTML = '<div class="ph">🖼️</div><span></span>';
  d.querySelector("span").textContent = it.name; d.querySelector("span").title = it.name;
  const x = Object.assign(document.createElement("button"), {className: "x", textContent: "×", title: "Rimuovi"});
  x.setAttribute("aria-label", "Rimuovi " + it.name);
  x.onclick = () => removeItem(it);
  d.appendChild(x); it.el = d;
}
function updateCard(it) {
  const d = it.el; if (!d) return;
  d.className = "thumb " + it.state;
  const media = d.firstElementChild;
  if (it.thumb && media.tagName !== "IMG") {
    const img = Object.assign(document.createElement("img"), {src: it.thumb, alt: it.name});
    media.replaceWith(img);
  }
  d.querySelector(".tag")?.remove();
  const tag = {done: ["Convertita", "done"], fail: ["Errore", "fail"]}[it.state];
  if (tag) d.insertAdjacentHTML("beforeend", `<div class="tag">${tag[0]}</div>`);
  d.querySelector(".x").hidden = busy;
}
function removeItem(it) {
  if (busy) return;
  it.removed = true; if (it.thumb) URL.revokeObjectURL(it.thumb);
  items = items.filter(i => i !== it); it.el.remove(); results = []; $("done").hidden = true; buttons();
}
function buttons() {
  $("convert").textContent = `Converti (${items.length})`;
  $("convert").disabled = busy || !items.length;
  $("clearAll").disabled = busy || !items.length;
  items.forEach(updateCard);
}

async function addFiles(list) {
  if (busy) return;
  const all = [...list], good = all.filter(isHeic);
  const known = new Set(items.map(i => i.file.name + i.file.size));
  const fresh = good.filter(f => !known.has(f.name + f.size)).sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
  const added = fresh.map(f => {
    const it = {file: f, name: f.name, state: "idle"}; createCard(it); items.push(it); $("grid").appendChild(it.el); return it;
  });
  if (!good.length && all.length) setStatus("Nessuna foto HEIC/HEIF tra i file scelti.", true);
  else setStatus("");
  $("done").hidden = true; results = [];
  buttons();
  if (!fresh.length) return;
  await quickThumbs(added);                    // anteprime immediate (miniatura incorporata nel file)
  if ($("autoStart").checked) startConvert(); else previewThumbs();
}

// anteprima istantanea: legge la miniatura già presente nel file HEIC, senza decodificare la foto
async function quickThumbs(list) {
  for (const it of list) {
    if (it.removed || it.thumb) continue;
    const url = await window.quickThumb(it.file);
    if (url && !it.removed && !it.thumb) { it.thumb = url; updateCard(it); }
    else if (url) URL.revokeObjectURL(url);
  }
}

// miniature in background per le foto senza anteprima incorporata (solo se la conversione non parte da sola)
async function previewThumbs() {
  if (thumbRunning) return;
  thumbRunning = true;
  try {
    for (;;) {
      const it = items.find(i => !i.thumb && !i.removed && !i.failedPreview);
      if (!it || busy) break;
      it.state = "busy"; updateCard(it);
      try { await ensureBlob(it, quality()); } catch { it.failedPreview = true; }
      if (it.state === "busy") it.state = "idle";
      updateCard(it);
    }
  } finally { thumbRunning = false; }
}

// ---- scelta file: pulsanti, trascinamento (anche di intere cartelle)
const drop = $("drop"), fileInput = $("fileInput"), dirInput = $("dirInput");
drop.onclick = () => fileInput.click();
drop.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } };
$("pickFiles").onclick = () => fileInput.click();
$("pickDir").onclick = () => dirInput.click();
fileInput.onchange = () => { addFiles(fileInput.files); fileInput.value = ""; };
dirInput.onchange = () => { addFiles(dirInput.files); dirInput.value = ""; };

async function readEntry(entry, out) {
  if (entry.isFile) { out.push(await new Promise((res, rej) => entry.file(res, rej))); return; }
  const reader = entry.createReader();
  for (;;) {
    const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
    if (!batch.length) break;
    for (const e of batch) await readEntry(e, out);
  }
}
async function filesFromDrop(dt) {
  const entries = [...dt.items].map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);  // da leggere subito
  if (!entries.length) return [...dt.files];
  const out = [];
  for (const e of entries) await readEntry(e, out);
  return out;
}
window.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
window.addEventListener("dragleave", e => { if (!e.relatedTarget) drop.classList.remove("over"); });
window.addEventListener("drop", async e => {
  e.preventDefault(); drop.classList.remove("over");
  addFiles(await filesFromDrop(e.dataTransfer));
});
$("clearAll").onclick = () => {
  items.forEach(i => { i.removed = true; i.thumb && URL.revokeObjectURL(i.thumb); });
  items = []; results = []; $("grid").innerHTML = ""; $("done").hidden = true; $("progWrap").hidden = true; setStatus(""); buttons();
};
$("quality").oninput = () => $("qVal").textContent = $("quality").value;

// ---- conversione (una foto alla volta, per avanzamento e stime)
function uniqueName(base, used) {
  let n = base, k = 1;
  while (used.has(n.toLowerCase())) n = base.replace(/\.jpg$/i, "") + `_${k++}.jpg`;
  used.add(n.toLowerCase()); return n;
}
$("convert").onclick = startConvert;
async function startConvert() {
  if (busy || !items.length) return;
  busy = true; results = []; const used = new Set();
  const q = quality(), list = [...items], total = list.length;
  list.forEach(i => { i.state = "idle"; });
  $("done").hidden = true; $("progWrap").hidden = false; buttons();
  $("bar").classList.add("running"); $("barFill").style.width = "0%";
  $("stProg").textContent = `0/${total}`; $("stLeft").textContent = $("stTotal").textContent = "calcolo…";
  const t0 = performance.now();
  const tick = setInterval(() => { $("stElapsed").textContent = fmt((performance.now() - t0) / 1000); }, 500);
  const errors = [];
  let computed = 0, computeSec = 0;                     // stima basata solo sulle foto da decodificare davvero
  for (const [n, it] of list.entries()) {
    it.state = "busy"; updateCard(it); setStatus(`Converto ${it.name}…`);
    const cached = it.cache && it.cache.q === q, ts = performance.now();
    try {
      const blob = await ensureBlob(it, q);
      it.state = "done";
      results.push({name: uniqueName(it.name.replace(/\.[^.]+$/, "") + ".jpg", used), blob});
    } catch (e) { it.state = "fail"; errors.push(`${it.name}: ${e.message || e.code || "errore"}`); }
    if (!cached) { computed++; computeSec += (performance.now() - ts) / 1000; }
    updateCard(it); it.el.scrollIntoView({block: "nearest"});
    const done = n + 1, elapsed = (performance.now() - t0) / 1000;
    const per = computed ? computeSec / computed : 0;
    const todo = list.slice(done).filter(i => !(i.cache && i.cache.q === q)).length;
    $("barFill").style.width = `${done / total * 100}%`;
    $("stProg").textContent = `${done}/${total}`; $("stElapsed").textContent = fmt(elapsed);
    $("stLeft").textContent = done < total ? "~" + fmt(per * todo) : "0s";
    $("stTotal").textContent = "~" + fmt(elapsed + per * todo);
  }
  clearInterval(tick);
  const elapsed = (performance.now() - t0) / 1000;
  $("bar").classList.remove("running");
  $("stElapsed").textContent = $("stTotal").textContent = fmt(elapsed); $("stLeft").textContent = "0s";
  busy = false; buttons();
  setStatus(errors.length ? `${errors.length} errori: ${errors.slice(0, 3).join("; ")}` : "", errors.length > 0);
  if (results.length) {
    $("doneSub").textContent = `${results.length} ${results.length === 1 ? "foto convertita" : "foto convertite"} in ${fmt(elapsed)}. Scarica il risultato qui sotto.`;
    $("saveDir").hidden = !window.showDirectoryPicker;
    $("done").hidden = false; $("done").scrollIntoView({behavior: "smooth", block: "nearest"});
  }
}

// ---- download
function saveBlob(blob, name) {
  const a = Object.assign(document.createElement("a"), {href: URL.createObjectURL(blob), download: name});
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
$("dlZip").onclick = async () => {
  if (!results.length) return;
  if (results.length === 1) return saveBlob(results[0].blob, results[0].name);
  $("dlZip").disabled = true; setStatus("Creo lo ZIP…");
  try {
    const zip = new JSZip();
    results.forEach(r => zip.file(r.name, r.blob, {binary: true}));   // i JPG sono già compressi
    saveBlob(await zip.generateAsync({type: "blob", compression: "STORE"}), "Foto convertite.zip");
    setStatus("");
  } catch (e) { setStatus("Impossibile creare lo ZIP: " + e.message, true); }
  $("dlZip").disabled = false;
};
// Chrome/Edge: scrittura diretta in una cartella scelta dall'utente
$("saveDir").onclick = async () => {
  try {
    const dir = await window.showDirectoryPicker({mode: "readwrite"});
    const sub = await dir.getDirectoryHandle("Foto convertite", {create: true});
    for (const r of results) {
      const w = await (await sub.getFileHandle(r.name, {create: true})).createWritable();
      await w.write(r.blob); await w.close();
    }
    setStatus(`Salvate ${results.length} foto in “${dir.name}/Foto convertite”.`);
  } catch (e) { if (e.name !== "AbortError") setStatus("Salvataggio non riuscito: " + e.message, true); }
};
window.addEventListener("beforeunload", e => { if (busy) { e.preventDefault(); e.returnValue = ""; } });
buttons();
