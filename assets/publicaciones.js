// Publicaciones del equipo de MetGeo: lee data/publicaciones.json (se edita a mano) y dibuja las tarjetas en #pubs.
// Cada entrada: { "titulo", "tipo" (Artículo, Columna, Divulgación…), "autores", "medio", "fecha" (AAAA-MM-DD), "resumen", "enlace" (https://) }.
(function () {
  var list = document.getElementById("pubs");
  if (!list) return;
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function vacio(msg) {
    list.textContent = "";
    list.appendChild(el("li", "empty", msg));
  }

  fetch("data/publicaciones.json", { cache: "no-cache" }).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(function (d) {
    var pubs = (d.publicaciones || []).filter(function (p) {
      return p && typeof p.titulo === "string" && p.titulo;
    }).sort(function (a, b) { return String(b.fecha || "").localeCompare(String(a.fecha || "")); });
    if (!pubs.length) return vacio("Pronto publicaremos aquí los artículos, columnas y trabajos del equipo.");
    list.textContent = "";
    pubs.forEach(function (p) {
      var li = el("li", "pub");
      if (p.tipo) li.appendChild(el("span", "tipo", p.tipo));
      li.appendChild(el("h3", "", p.titulo));
      var meta = [];
      if (p.autores) meta.push(p.autores);
      if (p.medio) meta.push(p.medio);
      var f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.fecha || "");
      if (f) meta.push(+f[3] + " de " + MESES[+f[2] - 1] + " de " + f[1]);
      if (meta.length) li.appendChild(el("p", "", meta.join(" · ")));
      if (p.resumen) li.appendChild(el("p", "", p.resumen));
      if (typeof p.enlace === "string" && p.enlace.indexOf("https://") === 0) {
        var a = el("a", "", "Leer la publicación ↗");
        a.href = p.enlace;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        li.appendChild(a);
      }
      list.appendChild(li);
    });
  }).catch(function () { vacio("No pudimos cargar las publicaciones en este momento."); });
})();
