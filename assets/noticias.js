// Noticias científicas: lee data/noticias.json (lo genera el newsletter cada madrugada).
//  - noticias.html: todas las noticias por área, con filtros (#areas, #area-chips, #updated).
//  - index.html: las últimas tres, de áreas distintas (#ultimas).
// Cada nota lleva una ilustración dibujada por código según su área (sin imágenes de terceros).
(function () {
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var chipsEl = document.getElementById("area-chips");
  var listEl = document.getElementById("areas");
  var updatedEl = document.getElementById("updated");
  var latestEl = document.getElementById("ultimas");
  if (!listEl && !latestEl) return;

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

  // Fecha de un instante en la hora de Chile, como "AAAA-MM-DD".
  function chileDay(date) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }

  // «Publicada hoy, 24 de septiembre», «Publicada ayer, …» o «Publicada el 22 de septiembre de 2026».
  function publishedLabel(iso) {
    if (!iso) return null;
    var when = new Date(iso);
    if (isNaN(when)) return null;
    var day = chileDay(when), p = day.split("-").map(Number);
    var short = p[2] + " de " + MESES[p[1] - 1];
    var now = new Date();
    if (day === chileDay(now)) return "Publicada hoy, " + short;
    if (day === chileDay(new Date(now.getTime() - 864e5))) return "Publicada ayer, " + short;
    return "Publicada el " + short + " de " + p[0];
  }

  // Solo enlaces https: todas las fuentes actuales los usan.
  function safeUrl(u) {
    return typeof u === "string" && /^https:\/\/[^\s]+$/i.test(u) ? u : null;
  }

  // Deja solo lo que se puede mostrar: áreas con clave y nombre, y notas con título y enlace válido.
  // Así un área mal formada no rompe la página y los contadores coinciden con las tarjetas visibles.
  function normalize(data) {
    return {
      dia: /^\d{4}-\d{2}-\d{2}$/.test(data.dia) ? data.dia : null,
      areas: data.areas.filter(function (a) {
        return a && typeof a.clave === "string" && /^[a-z0-9_-]+$/i.test(a.clave) && typeof a.nombre === "string";
      }).map(function (a) {
        return {
          clave: a.clave,
          nombre: a.nombre,
          fuentes: Array.isArray(a.fuentes) ? a.fuentes.filter(function (f) { return typeof f === "string"; }) : [],
          actualizada: /^\d{4}-\d{2}-\d{2}$/.test(a.actualizada) ? a.actualizada : null,
          noticias: (Array.isArray(a.noticias) ? a.noticias : []).filter(function (n) {
            return n && typeof n.titulo === "string" && safeUrl(n.enlace);
          }),
        };
      }),
    };
  }

  /* ---------- Ilustraciones por área ---------- */

  var PW = 640, PH = 280;
  var NAVY = "#00295B", DEEP = "#001B3D", SKY = "#4E94C3", SKY2 = "#8FC3E6", MIST = "#E8F1F9";

  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function mix(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    var pa = [1, 3, 5].map(function (i) { return parseInt(a.substr(i, 2), 16); });
    var pb = [1, 3, 5].map(function (i) { return parseInt(b.substr(i, 2), 16); });
    return "rgb(" + pa.map(function (v, k) { return Math.round(v + (pb[k] - v) * t); }).join(",") + ")";
  }

  function rgba(hex, a) {
    return "rgba(" + [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16); }).join(",") + "," + a + ")";
  }

  function closedCurve(c, cx, cy, r, amp, ph, sx) {
    c.beginPath();
    for (var i = 0; i <= 72; i++) {
      var t = (i / 72) * Math.PI * 2;
      var rr = r + amp * (Math.sin(3 * t + ph) * 0.5 + Math.sin(5 * t - ph * 1.3) * 0.3);
      var x = cx + rr * Math.cos(t) * sx, y = cy + rr * Math.sin(t);
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath();
  }

  function dot(c, x, y, r, color) {
    c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }

  var MOTIVOS = {
    // Franjas de temperatura con la serie encima.
    climatologia: function (c, r) {
      var n = 48, w = PW / n, vals = [];
      for (var i = 0; i < n; i++) vals.push(i / n * 0.8 + (r() - 0.5) * 0.45 + 0.1);
      vals.forEach(function (v, i) { c.fillStyle = v < 0.5 ? mix(MIST, SKY, v * 2) : mix(SKY, DEEP, (v - 0.5) * 2); c.fillRect(i * w, 0, w + 1, PH); });
      c.strokeStyle = "#FFFFFF"; c.lineWidth = 3; c.beginPath();
      vals.forEach(function (v, i) { var x = (i + 0.5) * w, y = PH * 0.85 - v * PH * 0.6; if (i) c.lineTo(x, y); else c.moveTo(x, y); });
      c.stroke();
    },
    // Isobaras alrededor de una baja (B) y una alta (A).
    meteorologia: function (c, r) {
      var centers = [[PW * (0.25 + r() * 0.15), PH * (0.4 + r() * 0.2), "B"], [PW * (0.7 + r() * 0.15), PH * (0.45 + r() * 0.2), "A"]];
      c.lineWidth = 1.6;
      centers.forEach(function (ct, k) {
        for (var L = 1; L <= 8; L++) {
          c.strokeStyle = rgba(k ? SKY2 : "#FFFFFF", 0.75 - L * 0.07);
          closedCurve(c, ct[0], ct[1], L * 22, 4 + L * 1.5, r() * 6, 1.4); c.stroke();
        }
        c.fillStyle = "#FFFFFF"; c.font = "700 34px Montserrat, Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(ct[2], ct[0], ct[1]);
      });
    },
    // Olas en capas.
    oceanografia: function (c, r) {
      for (var L = 0; L < 7; L++) {
        var base = PH * (0.22 + L * 0.12), amp = 10 + r() * 14, k = 0.012 + r() * 0.01, ph = r() * 6;
        c.beginPath(); c.moveTo(0, PH);
        for (var x = 0; x <= PW; x += 8) c.lineTo(x, base + amp * Math.sin(x * k + ph) + amp * 0.4 * Math.sin(x * k * 2.3 + ph));
        c.lineTo(PW, PH); c.closePath();
        c.fillStyle = mix(SKY2, DEEP, L / 6); c.globalAlpha = 0.9; c.fill(); c.globalAlpha = 1;
      }
    },
    // Estratos plegados.
    geologia: function (c, r) {
      var k = 0.006 + r() * 0.006, ph = r() * 6, amp = 30 + r() * 30;
      for (var L = 0; L < 10; L++) {
        c.beginPath(); c.moveTo(0, PH);
        for (var x = 0; x <= PW; x += 8) c.lineTo(x, PH * (0.05 + L * 0.1) + amp * Math.sin(x * k + ph) + 6 * Math.sin(x * 0.05 + L));
        c.lineTo(PW, PH); c.closePath();
        c.fillStyle = L % 2 ? mix(SKY, NAVY, L / 10) : mix(SKY2, DEEP, L / 11); c.fill();
      }
    },
    // Sismograma de tres estaciones.
    sismologia: function (c, r) {
      for (var s = 0; s < 3; s++) {
        var y0 = PH * (0.25 + s * 0.25), t0 = PW * (0.3 + s * 0.08 + r() * 0.05), decay = 90 + r() * 30;
        c.strokeStyle = s === 1 ? "#FFFFFF" : rgba(SKY2, 0.7); c.lineWidth = s === 1 ? 2 : 1.4; c.beginPath();
        for (var x = 0; x <= PW; x += 2) {
          var env = x < t0 ? 0.04 : Math.exp(-(x - t0) / decay) * Math.min(1, (x - t0) / 12);
          var y = y0 + (r() - 0.5) * 2 * (3 + env * 70);
          if (x) c.lineTo(x, y); else c.moveTo(x, y);
        }
        c.stroke();
      }
    },
    // Volcán con su columna de ceniza.
    vulcanologia: function (c, r) {
      var cx = PW * (0.45 + r() * 0.2);
      for (var i = 0; i < 90; i++) {
        var t = r(), y = PH * 0.42 - t * PH * 0.4, x = cx + (r() - 0.5) * (20 + t * 220);
        dot(c, x, y, 6 + t * 22 * r(), rgba(i % 3 ? SKY2 : "#FFFFFF", 0.15 + r() * 0.3));
      }
      c.beginPath(); c.moveTo(cx - 260, PH); c.lineTo(cx - 34, PH * 0.44); c.lineTo(cx + 34, PH * 0.44); c.lineTo(cx + 280, PH); c.closePath();
      var g = c.createLinearGradient(0, PH * 0.44, 0, PH); g.addColorStop(0, SKY); g.addColorStop(1, DEEP); c.fillStyle = g; c.fill();
    },
    // Interferencia de dos fuentes.
    fisica: function (c, r) {
      var a = [PW * (0.3 + r() * 0.1), PH * 0.5], b = [PW * (0.6 + r() * 0.1), PH * 0.5];
      [a, b].forEach(function (p, k) {
        for (var R = 14; R < 520; R += 18) {
          c.strokeStyle = rgba(k ? SKY2 : "#FFFFFF", Math.max(0.05, 0.5 - R / 1100)); c.lineWidth = 1.3;
          c.beginPath(); c.arc(p[0], p[1], R, 0, Math.PI * 2); c.stroke();
        }
        dot(c, p[0], p[1], 5, "#FFFFFF");
      });
    },
    // Estrellas, órbitas y un planeta.
    astronomia: function (c, r) {
      for (var i = 0; i < 160; i++) dot(c, r() * PW, r() * PH, r() * 1.6 + 0.3, rgba("#FFFFFF", 0.2 + r() * 0.7));
      var cx = PW * (0.4 + r() * 0.2), cy = PH * 0.55;
      c.strokeStyle = rgba(SKY2, 0.55); c.lineWidth = 1.2;
      for (var o = 1; o <= 3; o++) { c.beginPath(); c.ellipse(cx, cy, 70 * o, 22 * o, -0.25, 0, Math.PI * 2); c.stroke(); }
      var g = c.createRadialGradient(cx - 10, cy - 10, 4, cx, cy, 34); g.addColorStop(0, "#FFFFFF"); g.addColorStop(1, SKY);
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 30, 0, Math.PI * 2); c.fill();
      var ang = r() * 6;
      dot(c, cx + 140 * Math.cos(ang), cy + 44 * Math.sin(ang), 8, SKY2);
    },
    // Red de anillos hexagonales.
    quimica: function (c, r) {
      var s = 34, h = s * Math.sqrt(3) / 2;
      for (var row = -1; row < PH / (s * 1.5) + 1; row++) {
        for (var col = -1; col < PW / (h * 2) + 1; col++) {
          if (r() < 0.45) continue;
          var cx = col * h * 2 + (row % 2 ? h : 0), cy = row * s * 1.5;
          c.strokeStyle = rgba(r() < 0.25 ? "#FFFFFF" : SKY2, 0.7); c.lineWidth = 2; c.beginPath();
          for (var k = 0; k <= 6; k++) { var a = Math.PI / 6 + k * Math.PI / 3, x = cx + s * Math.cos(a), y = cy + s * Math.sin(a); if (k) c.lineTo(x, y); else c.moveTo(x, y); }
          c.stroke();
          dot(c, cx + s * Math.cos(Math.PI / 6), cy + s * Math.sin(Math.PI / 6), 3.5, "#FFFFFF");
        }
      }
    },
    // Aerogeneradores frente al sol.
    renovables: function (c, r) {
      var g = c.createRadialGradient(PW * 0.78, PH * 0.3, 10, PW * 0.78, PH * 0.3, 140);
      g.addColorStop(0, rgba(SKY2, 0.9)); g.addColorStop(1, rgba(SKY2, 0)); c.fillStyle = g; c.fillRect(0, 0, PW, PH);
      var ph = r() * 6;
      c.fillStyle = rgba(SKY, 0.6); c.beginPath(); c.moveTo(0, PH);
      for (var x = 0; x <= PW; x += 16) c.lineTo(x, PH * 0.82 + 12 * Math.sin(x * 0.01 + ph));
      c.lineTo(PW, PH); c.fill();
      [[0.18, 1], [0.42, 0.8], [0.62, 0.62]].forEach(function (t) {
        var tx = PW * t[0], top = PH * (0.85 - 0.62 * t[1]), L = 70 * t[1], a0 = r() * 6;
        c.strokeStyle = "#FFFFFF"; c.lineCap = "round"; c.lineWidth = 4 * t[1];
        c.beginPath(); c.moveTo(tx, PH * 0.86); c.lineTo(tx, top); c.stroke();
        c.lineWidth = 3 * t[1];
        for (var b = 0; b < 3; b++) { var a = a0 + b * 2.094; c.beginPath(); c.moveTo(tx, top); c.lineTo(tx + L * Math.cos(a), top + L * Math.sin(a)); c.stroke(); }
        dot(c, tx, top, 5 * t[1], "#FFFFFF");
      });
    },
    // Pistas de un circuito.
    computacion: function (c, r) {
      var step = 32;
      for (var i = 0; i < 26; i++) {
        var x = Math.round(r() * PW / step) * step, y = Math.round(r() * PH / step) * step;
        c.strokeStyle = rgba(i % 4 ? SKY2 : "#FFFFFF", 0.75); c.lineWidth = 2; c.beginPath(); c.moveTo(x, y);
        for (var s = 0; s < 4; s++) { if (r() < 0.5) x += (r() < 0.5 ? -1 : 1) * step * (1 + Math.floor(r() * 3)); else y += (r() < 0.5 ? -1 : 1) * step * (1 + Math.floor(r() * 2)); c.lineTo(x, y); }
        c.stroke();
        c.fillStyle = DEEP; c.strokeStyle = "#FFFFFF"; c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill(); c.stroke();
      }
      c.fillStyle = "#FFFFFF"; c.fillRect(PW / 2 - 50, PH / 2 - 34, 100, 68);
      c.fillStyle = NAVY; c.fillRect(PW / 2 - 40, PH / 2 - 24, 80, 48);
    },
    // Red de puntos (áreas sin motivo propio).
    red: function (c, r) {
      var pts = [];
      for (var i = 0; i < 40; i++) pts.push([r() * PW, r() * PH]);
      pts.forEach(function (p, i) {
        for (var j = i + 1; j < pts.length; j++) {
          var d = Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1]);
          if (d < 130) { c.strokeStyle = rgba(SKY2, 0.6 * (1 - d / 130)); c.lineWidth = 1.2; c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(pts[j][0], pts[j][1]); c.stroke(); }
        }
        dot(c, p[0], p[1], 2.4, "#FFFFFF");
      });
    },
  };

  function drawPic(canvas, clave, seed) {
    var c = canvas.getContext("2d");
    if (!c) return;
    var g = c.createLinearGradient(0, 0, PW, PH);
    g.addColorStop(0, NAVY); g.addColorStop(1, DEEP);
    c.fillStyle = g; c.fillRect(0, 0, PW, PH);
    c.strokeStyle = "rgba(255, 255, 255, 0.06)"; c.lineWidth = 1;
    for (var x = 32; x < PW; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, PH); c.stroke(); }
    for (var y = 32; y < PH; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(PW, y); c.stroke(); }
    var motivo = Object.prototype.hasOwnProperty.call(MOTIVOS, clave) ? MOTIVOS[clave] : MOTIVOS.red;
    motivo(c, rng(seed));
  }

  // Dibuja cada ilustración recién cuando está por aparecer en pantalla.
  var observer = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      observer.unobserve(e.target);
      paint(e.target);
    });
  }, { rootMargin: "300px 0px" }) : null;

  function paint(canvas) {
    canvas.width = PW; canvas.height = PH;
    drawPic(canvas, canvas.dataset.clave, Number(canvas.dataset.seed));
  }

  function lazyDraw(canvas) {
    if (observer) observer.observe(canvas); else paint(canvas);
  }

  /* ---------- Tarjetas ---------- */

  function card(n, area) {
    var href = safeUrl(n.enlace);
    if (!href) return null;
    var li = el("li", "item");
    var pic = el("div", "pic");
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.dataset.clave = area.clave;
    canvas.dataset.seed = String(hash(String(n.titulo || "") + area.clave));
    lazyDraw(canvas);
    pic.appendChild(canvas);
    pic.appendChild(el("span", "pic-tag", area.nombre));
    li.appendChild(pic);
    var txt = el("div", "txt");
    txt.appendChild(el("h4", null, n.titulo));
    if (n.resumen) txt.appendChild(el("p", null, n.resumen));
    var label = publishedLabel(n.fecha);
    if (label) {
      var t = el("time", "fecha", label);
      t.dateTime = n.fecha;
      txt.appendChild(t);
    }
    var a = el("a", null, "Leer la nota original en " + (typeof n.fuente === "string" && n.fuente ? n.fuente : new URL(href).hostname) + " ↗");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    txt.appendChild(a);
    li.appendChild(txt);
    return li;
  }

  function renderArea(area, today) {
    var sec = el("section", "area");
    sec.id = "area-" + area.clave; // prefijo: una clave del JSON no puede tapar ids de la página
    sec.dataset.area = area.clave;
    var head = el("div", "area-head");
    head.appendChild(el("h3", null, area.nombre));
    if (area.fuentes.length) head.appendChild(el("span", "area-src", "Fuentes: " + area.fuentes.join(", ")));
    sec.appendChild(head);
    sec.appendChild(el("div", "bar"));
    // Un área sin novedades hoy conserva sus últimas noticias: se avisa desde cuándo son.
    if (area.actualizada && area.actualizada !== today && area.noticias.length) {
      var p = area.actualizada.split("-").map(Number);
      sec.appendChild(el("p", "stale", "Sin novedades hoy · última actualización: " + p[2] + " de " + MESES[p[1] - 1]));
    }
    if (!area.noticias.length) {
      sec.appendChild(el("p", "empty", "Hoy no hay novedades destacadas en esta área."));
      return sec;
    }
    var ul = el("ul", "items");
    area.noticias.forEach(function (n) { ul.appendChild(card(n, area)); });
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

  function renderAll(data) {
    var total = data.areas.reduce(function (s, a) { return s + a.noticias.length; }, 0);
    updatedEl.textContent = (data.dia ? "Actualizado el " + longDate(data.dia) + " · " : "") + total + " noticias";
    listEl.replaceChildren();
    chipsEl.replaceChildren(chip("todas", "Todas", total));
    data.areas.forEach(function (a) {
      chipsEl.appendChild(chip(a.clave, a.nombre, a.noticias.length));
      listEl.appendChild(renderArea(a, data.dia));
    });
    var wanted = location.hash.slice(1);
    select(data.areas.some(function (a) { return a.clave === wanted; }) ? wanted : "todas");
  }

  // Portada: las tres más recientes, de áreas distintas.
  function renderLatest(data) {
    var all = [];
    data.areas.forEach(function (a) {
      a.noticias.forEach(function (n) { all.push({ n: n, a: a, t: Date.parse(n.fecha) || 0 }); });
    });
    all.sort(function (x, y) { return y.t - x.t; });
    var used = {}, cards = [];
    for (var i = 0; i < all.length && cards.length < 3; i++) {
      if (used[all[i].a.clave]) continue;
      var li = card(all[i].n, all[i].a);
      if (li) { used[all[i].a.clave] = true; cards.push(li); }
    }
    if (cards.length) latestEl.replaceChildren.apply(latestEl, cards);
    else latestEl.replaceChildren(el("li", "empty", "Hoy no hay noticias disponibles."));
  }

  fetch("data/noticias.json", { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function (data) {
      if (!data || !Array.isArray(data.areas)) throw new Error("formato");
      data = normalize(data);
      if (listEl) renderAll(data);
      if (latestEl) renderLatest(data);
    })
    .catch(function () {
      var msg = "No se pudieron cargar las noticias de hoy. Vuelve a intentarlo en unos minutos.";
      if (listEl) listEl.replaceChildren(el("p", "empty", msg));
      if (chipsEl) chipsEl.replaceChildren();
      if (updatedEl) updatedEl.textContent = "";
      if (latestEl) latestEl.replaceChildren(el("li", "empty", msg));
    });
})();
