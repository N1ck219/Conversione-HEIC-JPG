// Consenso cookie e caricamento pubblicità: gli annunci partono solo dopo "Accetta".
(function () {
  const cfg = window.SITE || {};
  const KEY = "ads-consent";
  const preview = new URLSearchParams(location.search).get("ads") === "preview";
  const get = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const set = v => { try { localStorage.setItem(KEY, v); } catch { /* ignora */ } };
  const $ = id => document.getElementById(id);
  const slots = [["adLeft", "left", "160x600"], ["adRight", "right", "160x600"], ["adBottom", "bottom", "728x90"]];

  function showPreview() {
    slots.forEach(([id, , size]) => { const e = $(id); e.hidden = false; e.classList.add("preview"); e.textContent = "Spazio pubblicitario " + size; });
  }
  function loadAds() {
    if (!cfg.adsenseClient || window.__adsLoaded) return;
    window.__adsLoaded = true;
    const s = document.createElement("script");
    s.async = true; s.crossOrigin = "anonymous";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(cfg.adsenseClient);
    document.head.appendChild(s);
    slots.forEach(([id, key]) => {
      const box = $(id), slot = (cfg.adSlots || {})[key];
      if (!slot) return;
      box.hidden = false;
      const ins = document.createElement("ins");
      ins.className = "adsbygoogle"; ins.style.display = "block";
      ins.dataset.adClient = cfg.adsenseClient; ins.dataset.adSlot = slot;
      if (key === "bottom") { ins.dataset.adFormat = "horizontal"; ins.dataset.fullWidthResponsive = "true"; }
      else { ins.style.width = "160px"; ins.style.height = "600px"; }
      box.appendChild(ins);
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* ignora */ }
    });
  }
  function apply() {
    if (preview) return showPreview();
    if (!cfg.adsenseClient) return;            // nessuna pubblicità configurata: niente banner cookie
    const c = get();
    if (c === "yes") loadAds();
    else if (c === null) $("consent").hidden = false;
  }
  $("cAccept").onclick = () => { set("yes"); $("consent").hidden = true; loadAds(); };
  $("cReject").onclick = () => { set("no"); $("consent").hidden = true; };
  $("cookiePrefs").onclick = e => {
    e.preventDefault();
    if (!cfg.adsenseClient) return alert("Al momento il sito non mostra pubblicità né usa cookie.");
    $("consent").hidden = false;
    if (get() === "yes") { try { localStorage.removeItem(KEY); } catch { /* ignora */ } location.reload(); }
  };
  apply();
})();
