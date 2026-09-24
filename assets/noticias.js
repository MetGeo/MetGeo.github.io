// Pestaña «Noticias científicas»: lee data/noticias.json (lo genera el newsletter cada madrugada) y lo muestra por área.
(function () {
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var chipsEl = document.getElementById("area-chips");
  var listEl = document.getElementById("areas");
  var updatedEl = document.getElementById("updated");

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text; // siempre texto: el contenido viene de fuentes externas
    return node;
  }

  function longDate(iso) {
    var p = iso.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    return DIAS[d.getDay()] + " " + p[2] + " de " + MESES[p[1] - 1] + " de " + p[0];
  }

  function safeUrl(u) {
    return /^https?:\/\//i.test(u) ? u : null;
  }

  function renderArea(area) {
    var sec = el("section", "area");
    sec.id = area.clave;
    sec.dataset.area = area.clave;
    var head = el("div", "area-head");
    head.appendChild(el("h3", null, area.nombre));
    head.appendChild(el("span", "area-src", "Fuentes: " + area.fuentes.join(", ")));
    sec.appendChild(head);
    sec.appendChild(el("div", "bar"));
    if (!area.noticias.length) {
      sec.appendChild(el("p", "empty", "Hoy no hay novedades destacadas en esta área."));
      return sec;
    }
    var ul = el("ul", "items");
    area.noticias.forEach(function (n) {
      var href = safeUrl(n.enlace);
      if (!href) return;
      var li = el("li", "item");
      li.appendChild(el("h4", null, n.titulo));
      if (n.resumen) li.appendChild(el("p", null, n.resumen));
      var a = el("a", null, "Leer la nota original en " + n.fuente + " ↗");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      li.appendChild(a);
      ul.appendChild(li);
    });
    sec.appendChild(ul);
    return sec;
  }

  function select(key) {
    chipsEl.querySelectorAll(".chip").forEach(function (c) {
      c.setAttribute("aria-pressed", String(c.dataset.key === key));
    });
    listEl.querySelectorAll(".area").forEach(function (s) {
      s.hidden = key !== "todas" && s.dataset.area !== key;
    });
  }

  function chip(key, label, count) {
    var li = el("li");
    var b = el("button", "chip", label + " ");
    b.type = "button";
    b.dataset.key = key;
    b.appendChild(el("span", "n", "(" + count + ")"));
    b.addEventListener("click", function () {
      select(key);
      try { history.replaceState(null, "", key === "todas" ? "#noticias" : "#" + key); } catch (e) { /* sin historial */ }
    });
    li.appendChild(b);
    return li;
  }

  fetch("data/noticias.json", { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function (data) {
      var total = data.areas.reduce(function (s, a) { return s + a.noticias.length; }, 0);
      updatedEl.textContent = "Actualizado el " + longDate(data.dia) + " · " + total + " noticias";
      listEl.replaceChildren();
      chipsEl.replaceChildren(chip("todas", "Todas", total));
      data.areas.forEach(function (a) {
        chipsEl.appendChild(chip(a.clave, a.nombre, a.noticias.length));
        listEl.appendChild(renderArea(a));
      });
      var wanted = location.hash.slice(1);
      select(data.areas.some(function (a) { return a.clave === wanted; }) ? wanted : "todas");
    })
    .catch(function () {
      listEl.replaceChildren(el("p", "empty", "No se pudieron cargar las noticias de hoy. Vuelve a intentarlo en unos minutos."));
    });
})();
