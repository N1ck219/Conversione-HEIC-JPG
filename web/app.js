const $ = id => document.getElementById(id);
let items = [];          // {file, name, state, blob, url, el}
let results = [];        // [{name, blob}] dell'ultima conversione
let busy = false;

const isHeic = f => /\.(heic|heif)$/i.test(f.name) || /image\/hei[cf]/.test(f.type);
function fmt(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}
function setStatus(msg, err) { $("status").textContent = msg; $("status").className = err ? "err" : "hint"; }

// ---- aggiunta file
function addFiles(list) {
  if (busy) return;
  const all = [...list], good = all.filter(isHeic);
  const known = new Set(items.map(i => i.file.name + i.file.size));
  let added = 0;
  for (const f of good) {
    if (known.has(f.name + f.size)) continue;
    items.push({file: f, name: f.name, state: "idle"}); added++;
  }
  if (all.length - good.length) setStatus(`${all.length - good.length} file ignorati: non sono HEIC/HEIF.`, true);
  else setStatus(added ? "" : (good.length ? "Foto già presenti nell'elenco." : ""));
  $("done").hidden = true;
  render();
}
function render() {
  const g = $("grid"); g.innerHTML = "";
  items.forEach((it, i) => {
    const d = document.createElement("div"); d.className = "thumb " + it.state;
    const media = it.url ? Object.assign(document.createElement("img"), {src: it.url, alt: it.name}) : Object.assign(document.createElement("div"), {className: "ph", textContent: "🖼️"});
    const s = Object.assign(document.createElement("span"), {textContent: it.name, title: it.name});
    d.append(media, s);
    if (it.state === "done" || it.state === "fail") d.insertAdjacentHTML("beforeend", `<div class="tag">${it.state === "done" ? "Convertita" : "Errore"}</div>`);
    if (!busy) {
      const x = Object.assign(document.createElement("button"), {className: "x", textContent: "×", title: "Rimuovi"});
      x.setAttribute("aria-label", "Rimuovi " + it.name);
      x.onclick = () => { if (it.url) URL.revokeObjectURL(it.url); items.splice(i, 1); render(); };
      d.appendChild(x);
    }
    it.el = d; g.appendChild(d);
  });
  $("convert").textContent = `Converti (${items.length})`;
  $("convert").disabled = busy || !items.length;
  $("clearAll").disabled = busy || !items.length;
}

const drop = $("drop"), fileInput = $("fileInput"), dirInput = $("dirInput");
drop.onclick = () => fileInput.click();
drop.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } };
$("pickFiles").onclick = () => fileInput.click();
$("pickDir").onclick = () => dirInput.click();
fileInput.onchange = () => { addFiles(fileInput.files); fileInput.value = ""; };
dirInput.onchange = () => { addFiles(dirInput.files); dirInput.value = ""; };
["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => addFiles(e.dataTransfer.files));
// trascinare ovunque nella pagina non deve aprire il file nel browser
["dragover", "drop"].forEach(ev => window.addEventListener(ev, e => e.preventDefault()));
window.addEventListener("drop", e => { if (!drop.contains(e.target)) addFiles(e.dataTransfer.files); });
$("clearAll").onclick = () => { items.forEach(i => i.url && URL.revokeObjectURL(i.url)); items = []; results = []; $("done").hidden = true; $("progWrap").hidden = true; render(); };
$("quality").oninput = () => $("qVal").textContent = $("quality").value;

// ---- conversione (una foto alla volta, per avanzamento e stime)
function uniqueName(base, used) {
  let n = base, k = 1;
  while (used.has(n.toLowerCase())) n = base.replace(/\.jpg$/i, "") + `_${k++}.jpg`;
  used.add(n.toLowerCase()); return n;
}
async function toJpeg(file, quality) {
  const out = await heic2any({blob: file, toType: "image/jpeg", quality});
  return Array.isArray(out) ? out[0] : out;
}
$("convert").onclick = async () => {
  if (busy || !items.length) return;
  busy = true; results = []; const used = new Set();
  const quality = $("quality").value / 100, total = items.length;
  items.forEach(i => { i.state = "idle"; if (i.url) { URL.revokeObjectURL(i.url); i.url = null; } i.blob = null; });
  $("done").hidden = true; $("progWrap").hidden = false; render();
  $("bar").classList.add("running"); $("barFill").style.width = "0%";
  $("stProg").textContent = `0/${total}`; $("stLeft").textContent = $("stTotal").textContent = "calcolo…";
  const t0 = performance.now();
  const tick = setInterval(() => { $("stElapsed").textContent = fmt((performance.now() - t0) / 1000); }, 500);
  const errors = [];
  for (const [n, it] of items.entries()) {
    it.state = "busy"; it.el.className = "thumb busy"; setStatus(`Converto ${it.name}…`);
    await new Promise(r => setTimeout(r, 0));          // lascia ridisegnare la pagina
    try {
      const blob = await toJpeg(it.file, quality);
      it.blob = blob; it.url = URL.createObjectURL(blob); it.state = "done";
      results.push({name: uniqueName(it.name.replace(/\.[^.]+$/, "") + ".jpg", used), blob});
    } catch (e) { it.state = "fail"; errors.push(`${it.name}: ${e.message || e.code || "errore"}`); }
    const done = n + 1, elapsed = (performance.now() - t0) / 1000, per = elapsed / done;
    $("barFill").style.width = `${done / total * 100}%`;
    $("stProg").textContent = `${done}/${total}`; $("stElapsed").textContent = fmt(elapsed);
    $("stLeft").textContent = done < total ? "~" + fmt(per * (total - done)) : "0s";
    $("stTotal").textContent = "~" + fmt(per * total);
    render();                                          // aggiorna miniatura/etichetta
    it.el.scrollIntoView({block: "nearest"});
  }
  clearInterval(tick);
  const elapsed = (performance.now() - t0) / 1000;
  $("bar").classList.remove("running");
  $("stElapsed").textContent = $("stTotal").textContent = fmt(elapsed); $("stLeft").textContent = "0s";
  busy = false; render();
  setStatus(errors.length ? `${errors.length} errori: ${errors.slice(0, 3).join("; ")}` : "", errors.length > 0);
  if (results.length) {
    $("doneSub").textContent = `${results.length} ${results.length === 1 ? "foto convertita" : "foto convertite"} in ${fmt(elapsed)}. Scarica il risultato qui sotto.`;
    $("saveDir").hidden = !window.showDirectoryPicker;
    $("done").hidden = false; $("done").scrollIntoView({behavior: "smooth", block: "nearest"});
  }
};

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
render();
