// Noticias científicas: lee data/noticias.json (lo genera el newsletter cada madrugada).
//  - noticias.html: todas las noticias por área, con filtros (#areas, #area-chips, #updated).
//  - index.html: las últimas tres, de áreas distintas (#ultimas).
// Cada nota lleva una ilustración dibujada por código (sin imágenes de terceros): cada área tiene cinco
// dibujos distintos y se elige el que calza con las palabras de la nota, sin repetir dentro del área.
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

  /* ---------- Ilustraciones ---------- */

  var PW = 640, PH = 280, TAU = Math.PI * 2;
  var NAVY = "#00295B", DEEP = "#001B3D", SKY = "#4E94C3", SKY2 = "#8FC3E6", MIST = "#E8F1F9", WHITE = "#FFFFFF";

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

  function dot(c, x, y, r, color) {
    c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }

  function line(c, pts, color, width) {
    c.strokeStyle = color; c.lineWidth = width || 1.5; c.beginPath();
    pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
    c.stroke();
  }

  function closedCurve(c, cx, cy, r, amp, ph, sx) {
    c.beginPath();
    for (var i = 0; i <= 72; i++) {
      var t = (i / 72) * TAU;
      var rr = r + amp * (Math.sin(3 * t + ph) * 0.5 + Math.sin(5 * t - ph * 1.3) * 0.3);
      var x = cx + rr * Math.cos(t) * sx, y = cy + rr * Math.sin(t);
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath();
  }

  function arrow(c, x, y, ang, len, color) {
    var x2 = x + len * Math.cos(ang), y2 = y + len * Math.sin(ang);
    c.strokeStyle = color; c.lineWidth = 1.4; c.beginPath();
    c.moveTo(x, y); c.lineTo(x2, y2);
    c.moveTo(x2 - 5 * Math.cos(ang - 0.5), y2 - 5 * Math.sin(ang - 0.5)); c.lineTo(x2, y2);
    c.lineTo(x2 - 5 * Math.cos(ang + 0.5), y2 - 5 * Math.sin(ang + 0.5));
    c.stroke();
  }

  function stars(c, r, n) {
    for (var i = 0; i < n; i++) dot(c, r() * PW, r() * PH, r() * 1.4 + 0.3, rgba(WHITE, 0.2 + r() * 0.6));
  }

  // Dibujos base. Cada uno recibe el contexto y un generador aleatorio con semilla propia de la nota.
  var D = {
    // Franjas de temperatura con la serie encima.
    stripes: function (c, r) {
      var n = 48, w = PW / n, vals = [];
      for (var i = 0; i < n; i++) vals.push(i / n * 0.8 + (r() - 0.5) * 0.45 + 0.1);
      vals.forEach(function (v, i) { c.fillStyle = v < 0.5 ? mix(MIST, SKY, v * 2) : mix(SKY, DEEP, (v - 0.5) * 2); c.fillRect(i * w, 0, w + 1, PH); });
      line(c, vals.map(function (v, i) { return [(i + 0.5) * w, PH * 0.85 - v * PH * 0.6]; }), WHITE, 3);
    },
    // Globo con la capa polar destacada (ozono, hielo, atmósfera).
    globe: function (c, r) {
      stars(c, r, 80);
      var cx = PW * (0.45 + r() * 0.1), cy = PH * 0.55, R = 118, tilt = -0.3 + r() * 0.2;
      var g = c.createRadialGradient(cx - 40, cy - 40, 10, cx, cy, R);
      g.addColorStop(0, SKY); g.addColorStop(1, DEEP);
      dot(c, cx, cy, R, g);
      c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
      c.strokeStyle = rgba(SKY2, 0.4); c.lineWidth = 1;
      for (var k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(cx, cy + k * 40, R, 14, tilt, 0, TAU); c.stroke(); }
      for (var m = 0; m < 6; m++) { c.beginPath(); c.ellipse(cx, cy, R * Math.abs(Math.cos(m * 0.52)) + 1, R, tilt, 0, TAU); c.stroke(); }
      var cap = c.createRadialGradient(cx, cy + R * 0.8, 5, cx, cy + R * 0.8, 70);
      cap.addColorStop(0, rgba(MIST, 0.95)); cap.addColorStop(1, rgba(MIST, 0));
      c.fillStyle = cap; c.fillRect(cx - R, cy, 2 * R, R);
      c.restore();
      c.strokeStyle = rgba(SKY2, 0.7); c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, R + 8, 0, TAU); c.stroke();
    },
    // Anomalías en barras sobre y bajo el promedio.
    bars: function (c, r) {
      var n = 36, w = PW / n, y0 = PH * 0.6;
      for (var i = 0; i < n; i++) {
        var v = (i / n - 0.45) * 1.6 + (r() - 0.5) * 0.7;
        c.fillStyle = v > 0 ? rgba(SKY2, 0.95) : rgba(SKY, 0.8);
        c.fillRect(i * w + 3, v > 0 ? y0 - v * 90 : y0, w - 6, Math.abs(v) * 90);
      }
      line(c, [[0, y0], [PW, y0]], WHITE, 1.5);
    },
    // Suelo agrietado por la sequía.
    cracks: function (c, r) {
      c.fillStyle = mix(SKY2, SKY, 0.4); c.fillRect(0, 0, PW, PH);
      var pts = [];
      for (var i = 0; i < 34; i++) pts.push([r() * PW, r() * PH]);
      pts.forEach(function (p) {
        var near = pts.slice().sort(function (a, b) { return Math.hypot(a[0] - p[0], a[1] - p[1]) - Math.hypot(b[0] - p[0], b[1] - p[1]); });
        for (var k = 1; k <= 3; k++) {
          var q = near[k], seg = [p];
          for (var s = 1; s < 5; s++) seg.push([p[0] + (q[0] - p[0]) * s / 5 + (r() - 0.5) * 10, p[1] + (q[1] - p[1]) * s / 5 + (r() - 0.5) * 10]);
          seg.push(q);
          line(c, seg, DEEP, 2.2);
        }
      });
    },
    // Mapa de calor de una región.
    heatmap: function (c, r) {
      var nx = 32, ny = 14, cw = PW / nx, ch = PH / ny, a = r() * 6, b = r() * 6;
      for (var j = 0; j < ny; j++) {
        for (var i = 0; i < nx; i++) {
          var v = 0.5 + 0.3 * Math.sin(i / 4 + a) * Math.cos(j / 3 + b) + 0.2 * Math.sin((i + j) / 6);
          c.fillStyle = mix(MIST, DEEP, v); c.fillRect(i * cw, j * ch, cw + 1, ch + 1);
        }
      }
    },
    // Isobaras de una baja (B) y una alta (A).
    isobars: function (c, r) {
      var centers = [[PW * (0.25 + r() * 0.15), PH * (0.4 + r() * 0.2), "B"], [PW * (0.7 + r() * 0.15), PH * (0.45 + r() * 0.2), "A"]];
      c.lineWidth = 1.6;
      centers.forEach(function (ct, k) {
        for (var L = 1; L <= 8; L++) {
          c.strokeStyle = rgba(k ? SKY2 : WHITE, 0.75 - L * 0.07);
          closedCurve(c, ct[0], ct[1], L * 22, 4 + L * 1.5, r() * 6, 1.4); c.stroke();
        }
        c.fillStyle = WHITE; c.font = "700 34px Montserrat, Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(ct[2], ct[0], ct[1]);
      });
    },
    // Ciclón visto desde arriba.
    cyclone: function (c, r) {
      var cx = PW * (0.45 + r() * 0.1), cy = PH * 0.5, rot = r() * TAU;
      for (var arm = 0; arm < 4; arm++) {
        for (var w = 0; w < 3; w++) {
          var pts = [];
          for (var t = 0; t < 4.4 * Math.PI; t += 0.08) {
            var rr = 14 + t * 11 + w * 6, ang = t + rot + arm * TAU / 4;
            pts.push([cx + rr * Math.cos(ang) * 1.3, cy + rr * Math.sin(ang)]);
          }
          line(c, pts, rgba(w ? SKY2 : WHITE, 0.55 - w * 0.12), 3 - w * 0.6);
        }
      }
      dot(c, cx, cy, 11, DEEP);
    },
    // Lluvia bajo una nube.
    rain: function (c, r) {
      for (var i = 0; i < 140; i++) {
        var x = r() * PW, y = PH * 0.3 + r() * PH * 0.7, L = 10 + r() * 16;
        line(c, [[x, y], [x - L * 0.35, y + L]], rgba(SKY2, 0.35 + r() * 0.5), 1.4);
      }
      for (var k = 0; k < 9; k++) dot(c, PW * (0.15 + k * 0.09) + (r() - 0.5) * 30, PH * (0.2 + (r() - 0.5) * 0.12), 34 + r() * 26, rgba(MIST, 0.9));
    },
    // Témpanos de hielo sobre agua oscura.
    ice: function (c, r) {
      for (var i = 0; i < 26; i++) {
        var cx = r() * PW, cy = r() * PH, R = 14 + r() * 38, sides = 5 + Math.floor(r() * 4), pts = [];
        for (var k = 0; k < sides; k++) { var a = k / sides * TAU + r() * 0.5; pts.push([cx + R * (0.7 + r() * 0.4) * Math.cos(a), cy + R * 0.7 * (0.7 + r() * 0.4) * Math.sin(a)]); }
        c.fillStyle = rgba(i % 3 ? WHITE : MIST, 0.75 + r() * 0.25); c.beginPath();
        pts.forEach(function (p, j) { if (j) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
        c.closePath(); c.fill();
      }
    },
    // Líneas de flujo del viento o de una corriente.
    flow: function (c, r) {
      var ph = r() * 6;
      for (var i = 0; i < 12; i++) {
        var y0 = (i + 0.5) * PH / 12, pts = [];
        for (var x = -20; x <= PW; x += 10) pts.push([x, y0 + 18 * Math.sin(x / 90 + ph + i * 0.4)]);
        line(c, pts, rgba(i % 3 ? SKY2 : WHITE, 0.6), 1.8);
        var j = Math.floor(pts.length * (0.3 + r() * 0.5)), p = pts[j], q = pts[j + 1];
        arrow(c, p[0], p[1], Math.atan2(q[1] - p[1], q[0] - p[0]), 14, WHITE);
      }
    },
    // Olas en capas.
    waves: function (c, r) {
      for (var L = 0; L < 7; L++) {
        var base = PH * (0.22 + L * 0.12), amp = 10 + r() * 14, k = 0.012 + r() * 0.01, ph = r() * 6;
        c.beginPath(); c.moveTo(0, PH);
        for (var x = 0; x <= PW; x += 8) c.lineTo(x, base + amp * Math.sin(x * k + ph) + amp * 0.4 * Math.sin(x * k * 2.3 + ph));
        c.lineTo(PW, PH); c.closePath();
        c.fillStyle = mix(SKY2, DEEP, L / 6); c.globalAlpha = 0.9; c.fill(); c.globalAlpha = 1;
      }
    },
    // Campo de corrientes en flechas alrededor de un remolino.
    currents: function (c, r) {
      var cx = PW * (0.3 + r() * 0.4), cy = PH * (0.4 + r() * 0.2);
      for (var y = 18; y < PH; y += 28) {
        for (var x = 18; x < PW; x += 28) {
          var dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) + 1;
          arrow(c, x, y, Math.atan2(dx / d * 0.8 - 0.25, -dy / d * 0.8 + 0.5), 8 + 8 * Math.min(1, 90 / d), rgba(SKY2, 0.8));
        }
      }
    },
    // Perfiles verticales de temperatura del océano.
    profile: function (c, r) {
      for (var b = 0; b < 8; b++) { c.fillStyle = mix(SKY, DEEP, b / 7); c.fillRect(0, b * PH / 8, PW, PH / 8 + 1); }
      for (var p = 0; p < 5; p++) {
        var x0 = PW * (0.12 + p * 0.18), depth = 0.3 + r() * 0.2, pts = [];
        for (var y = 0; y <= PH; y += 6) pts.push([x0 + 60 * (1 - Math.tanh((y / PH - depth) * 6)) / 2, y]);
        line(c, pts, p === 2 ? WHITE : rgba(SKY2, 0.85), p === 2 ? 3 : 2);
      }
    },
    // Cardumen o colonia: figuras pequeñas que siguen una misma trayectoria.
    school: function (c, r) {
      var ph = r() * 6;
      for (var i = 0; i < 110; i++) {
        var t = r(), x = t * PW, y = PH * 0.5 + 70 * Math.sin(t * 5 + ph) + (r() - 0.5) * 60;
        var ang = Math.atan(70 * 5 / PW * Math.cos(t * 5 + ph));
        c.save(); c.translate(x, y); c.rotate(ang);
        c.fillStyle = rgba(i % 4 ? SKY2 : WHITE, 0.8);
        c.beginPath(); c.ellipse(0, 0, 9, 3.5, 0, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(-8, 0); c.lineTo(-14, -4); c.lineTo(-14, 4); c.fill();
        c.restore();
      }
    },
    // Estratos plegados.
    strata: function (c, r) {
      var k = 0.006 + r() * 0.006, ph = r() * 6, amp = 30 + r() * 30;
      for (var L = 0; L < 10; L++) {
        c.beginPath(); c.moveTo(0, PH);
        for (var x = 0; x <= PW; x += 8) c.lineTo(x, PH * (0.05 + L * 0.1) + amp * Math.sin(x * k + ph) + 6 * Math.sin(x * 0.05 + L));
        c.lineTo(PW, PH); c.closePath();
        c.fillStyle = L % 2 ? mix(SKY, NAVY, L / 10) : mix(SKY2, DEEP, L / 11); c.fill();
      }
    },
    // Cráter de impacto.
    crater: function (c, r) {
      c.fillStyle = mix(SKY, NAVY, 0.3); c.fillRect(0, 0, PW, PH);
      var cx = PW * (0.4 + r() * 0.2), cy = PH * 0.52;
      for (var i = 0; i < 40; i++) { var a = r() * TAU, L = 110 + r() * 150; line(c, [[cx + 90 * Math.cos(a), cy + 45 * Math.sin(a)], [cx + L * Math.cos(a), cy + L * 0.5 * Math.sin(a)]], rgba(SKY2, 0.35), 2); }
      c.fillStyle = mix(SKY2, SKY, 0.3); c.beginPath(); c.ellipse(cx, cy, 110, 55, 0, 0, TAU); c.fill();
      c.fillStyle = DEEP; c.beginPath(); c.ellipse(cx + 6, cy + 5, 88, 42, 0, 0, TAU); c.fill();
      dot(c, cx, cy + 4, 12, rgba(SKY2, 0.7));
    },
    // Curvas de nivel de un relieve.
    topo: function (c, r) {
      [[0.3, 0.45], [0.72, 0.5]].forEach(function (p, k) {
        var ox = (r() - 0.5) * 20;
        for (var L = 9; L >= 1; L--) {
          c.strokeStyle = rgba(L % 3 ? SKY2 : WHITE, 0.35 + (9 - L) * 0.06);
          c.lineWidth = L % 3 ? 1.2 : 2;
          closedCurve(c, PW * p[0] + ox, PH * p[1], L * 16, 4 + L, k * 2 + r(), 1.4); c.stroke();
        }
      });
    },
    // Red cristalina: átomos y enlaces.
    crystal: function (c, r) {
      var s = 44, skew = 18 + r() * 10;
      for (var j = -1; j < PH / s + 1; j++) {
        for (var i = -1; i < PW / s + 1; i++) {
          var x = i * s + (j * skew) % s, y = j * s;
          line(c, [[x, y], [x + s, y]], rgba(SKY2, 0.5), 1.5);
          line(c, [[x, y], [x + skew, y + s]], rgba(SKY2, 0.5), 1.5);
          dot(c, x, y, (i + j) % 2 ? 6 : 9, (i + j) % 2 ? SKY2 : WHITE);
        }
      }
    },
    // Falla: dos bloques de estratos desplazados.
    fault: function (c, r) {
      var off = 30 + r() * 30, x0 = PW * (0.4 + r() * 0.2);
      function layers(dy) {
        for (var L = -1; L < 10; L++) { c.fillStyle = (L + 10) % 2 ? mix(SKY, NAVY, L / 9) : mix(SKY2, DEEP, L / 10); c.fillRect(0, L * PH / 9 + dy, PW, PH / 9 + 1); }
      }
      layers(0);
      c.save(); c.beginPath(); c.moveTo(x0 + 60, 0); c.lineTo(PW, 0); c.lineTo(PW, PH); c.lineTo(x0 - 60, PH); c.closePath(); c.clip();
      layers(off);
      c.restore();
      line(c, [[x0 + 60, 0], [x0 - 60, PH]], WHITE, 3);
      arrow(c, x0 - 40, PH * 0.4, -Math.PI / 2, 30, WHITE); arrow(c, x0 + 40, PH * 0.5, Math.PI / 2, 30, WHITE);
    },
    // Sismograma de tres estaciones.
    seismogram: function (c, r) {
      for (var s = 0; s < 3; s++) {
        var y0 = PH * (0.25 + s * 0.25), t0 = PW * (0.3 + s * 0.08 + r() * 0.05), decay = 90 + r() * 30, pts = [];
        for (var x = 0; x <= PW; x += 2) {
          var env = x < t0 ? 0.04 : Math.exp(-(x - t0) / decay) * Math.min(1, (x - t0) / 12);
          pts.push([x, y0 + (r() - 0.5) * 2 * (3 + env * 70)]);
        }
        line(c, pts, s === 1 ? WHITE : rgba(SKY2, 0.7), s === 1 ? 2 : 1.4);
      }
    },
    // Epicentro con ondas que se propagan sobre el relieve.
    epicenter: function (c, r) {
      D.topo(c, r);
      var cx = PW * (0.3 + r() * 0.4), cy = PH * (0.35 + r() * 0.3);
      c.setLineDash([6, 6]);
      for (var R = 20; R < 300; R += 26) { c.strokeStyle = rgba(WHITE, Math.max(0.1, 0.8 - R / 320)); c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke(); }
      c.setLineDash([]);
      c.fillStyle = WHITE; c.beginPath();
      for (var k = 0; k < 10; k++) { var a = k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? 7 : 16; c.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
      c.closePath(); c.fill();
    },
    // Red de estaciones conectadas.
    stations: function (c, r) {
      var pts = [];
      for (var i = 0; i < 14; i++) pts.push([40 + r() * (PW - 80), 40 + r() * (PH - 80)]);
      pts.forEach(function (p, i) { var q = pts[(i + 1 + Math.floor(r() * 3)) % pts.length]; line(c, [p, q], rgba(SKY2, 0.45), 1.3); });
      pts.forEach(function (p) {
        c.fillStyle = WHITE; c.beginPath(); c.moveTo(p[0], p[1] - 11); c.lineTo(p[0] + 10, p[1] + 7); c.lineTo(p[0] - 10, p[1] + 7); c.closePath(); c.fill();
        c.strokeStyle = rgba(SKY2, 0.6); c.lineWidth = 1.2; c.beginPath(); c.arc(p[0], p[1], 22, -2.4, -0.7); c.stroke();
      });
    },
    // Volcán con su columna de ceniza.
    volcano: function (c, r) {
      var cx = PW * (0.45 + r() * 0.2);
      for (var i = 0; i < 90; i++) {
        var t = r(), y = PH * 0.42 - t * PH * 0.4, x = cx + (r() - 0.5) * (20 + t * 220);
        dot(c, x, y, 6 + t * 22 * r(), rgba(i % 3 ? SKY2 : WHITE, 0.15 + r() * 0.3));
      }
      c.beginPath(); c.moveTo(cx - 260, PH); c.lineTo(cx - 34, PH * 0.44); c.lineTo(cx + 34, PH * 0.44); c.lineTo(cx + 280, PH); c.closePath();
      var g = c.createLinearGradient(0, PH * 0.44, 0, PH); g.addColorStop(0, SKY); g.addColorStop(1, DEEP); c.fillStyle = g; c.fill();
    },
    // Volcán con flujos de lava por las laderas.
    lava: function (c, r) {
      var cx = PW * 0.5;
      c.beginPath(); c.moveTo(cx - 300, PH); c.lineTo(cx - 40, PH * 0.3); c.lineTo(cx + 40, PH * 0.3); c.lineTo(cx + 300, PH); c.closePath();
      c.fillStyle = mix(SKY, DEEP, 0.5); c.fill();
      for (var f = 0; f < 5; f++) {
        var x = cx + (r() - 0.5) * 60, y = PH * 0.3, dir = r() < 0.5 ? -1 : 1, pts = [[x, y]];
        while (y < PH) { y += 12; x += dir * (8 + r() * 10) + (r() - 0.5) * 8; pts.push([x, y]); }
        line(c, pts, rgba(SKY2, 0.95), 5 - f * 0.5); line(c, pts, WHITE, 1.5);
      }
      var g = c.createRadialGradient(cx, PH * 0.28, 4, cx, PH * 0.28, 90);
      g.addColorStop(0, rgba(WHITE, 0.9)); g.addColorStop(1, rgba(SKY2, 0)); c.fillStyle = g; c.fillRect(0, 0, PW, PH);
    },
    // Columna eruptiva de gas y ceniza.
    plume: function (c, r) {
      var cx = PW * (0.4 + r() * 0.2);
      for (var i = 0; i < 70; i++) {
        var t = r(), y = PH - t * PH * 0.95, x = cx + (r() - 0.5) * (30 + t * t * 420);
        dot(c, x, y, 14 + t * 34 * r(), mix(SKY2, NAVY, r() * 0.7));
      }
      c.fillStyle = DEEP; c.beginPath(); c.moveTo(cx - 180, PH); c.lineTo(cx - 20, PH * 0.86); c.lineTo(cx + 20, PH * 0.86); c.lineTo(cx + 180, PH); c.fill();
    },
    // Caldera: relieve con una depresión central.
    caldera: function (c, r) {
      var cx = PW * 0.5, cy = PH * 0.52;
      for (var L = 11; L >= 1; L--) {
        c.strokeStyle = rgba(L > 4 ? SKY2 : WHITE, 0.3 + (11 - L) * 0.05); c.lineWidth = L === 4 ? 3 : 1.3;
        closedCurve(c, cx, cy, L * 22, 3 + L * 0.8, r() * 6, 1.6); c.stroke();
      }
      c.fillStyle = rgba(SKY, 0.8); closedCurve(c, cx, cy, 44, 5, 1, 1.6); c.fill();
    },
    // Interferencia de dos fuentes.
    interference: function (c, r) {
      var a = [PW * (0.3 + r() * 0.1), PH * 0.5], b = [PW * (0.6 + r() * 0.1), PH * 0.5];
      [a, b].forEach(function (p, k) {
        for (var R = 14; R < 520; R += 18) {
          c.strokeStyle = rgba(k ? SKY2 : WHITE, Math.max(0.05, 0.5 - R / 1100)); c.lineWidth = 1.3;
          c.beginPath(); c.arc(p[0], p[1], R, 0, TAU); c.stroke();
        }
        dot(c, p[0], p[1], 5, WHITE);
      });
    },
    // Átomo: núcleo y órbitas de electrones.
    atom: function (c, r) {
      stars(c, r, 50);
      var cx = PW * 0.5, cy = PH * 0.5, rot = r();
      for (var k = 0; k < 3; k++) {
        var a = rot + k * Math.PI / 3;
        c.strokeStyle = rgba(SKY2, 0.8); c.lineWidth = 2; c.beginPath(); c.ellipse(cx, cy, 170, 50, a, 0, TAU); c.stroke();
        var t = r() * TAU;
        dot(c, cx + 170 * Math.cos(t) * Math.cos(a) - 50 * Math.sin(t) * Math.sin(a), cy + 170 * Math.cos(t) * Math.sin(a) + 50 * Math.sin(t) * Math.cos(a), 7, WHITE);
      }
      for (var n = 0; n < 12; n++) dot(c, cx + (r() - 0.5) * 30, cy + (r() - 0.5) * 30, 9, n % 2 ? SKY : MIST);
    },
    // Luz que atraviesa un prisma y se abre en un abanico.
    prism: function (c, r) {
      var cx = PW * 0.45, cy = PH * 0.52;
      line(c, [[0, cy + 40], [cx - 30, cy + 8]], WHITE, 4);
      for (var k = 0; k < 7; k++) line(c, [[cx + 30, cy + 4], [PW, cy - 90 + k * 34 + (r() - 0.5) * 8]], mix(MIST, SKY, k / 6), 5);
      c.fillStyle = rgba(WHITE, 0.15); c.strokeStyle = WHITE; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(cx, cy - 80); c.lineTo(cx + 80, cy + 60); c.lineTo(cx - 80, cy + 60); c.closePath(); c.fill(); c.stroke();
    },
    // Ondas de distinta frecuencia, como en un osciloscopio.
    spectrum: function (c, r) {
      for (var k = 0; k < 5; k++) {
        var y0 = PH * (0.14 + k * 0.18), f = 0.02 + k * 0.012 + r() * 0.01, ph = r() * 6, pts = [];
        for (var x = 0; x <= PW; x += 3) pts.push([x, y0 + 16 * Math.sin(x * f + ph) * Math.exp(-Math.pow((x - PW * 0.5) / 260, 2))]);
        line(c, pts, k === 2 ? WHITE : rgba(SKY2, 0.8), k === 2 ? 2.5 : 1.6);
      }
    },
    // Órbitas y un planeta.
    orbits: function (c, r) {
      stars(c, r, 160);
      var cx = PW * (0.4 + r() * 0.2), cy = PH * 0.55;
      c.strokeStyle = rgba(SKY2, 0.55); c.lineWidth = 1.2;
      for (var o = 1; o <= 3; o++) { c.beginPath(); c.ellipse(cx, cy, 70 * o, 22 * o, -0.25, 0, TAU); c.stroke(); }
      var g = c.createRadialGradient(cx - 10, cy - 10, 4, cx, cy, 34); g.addColorStop(0, WHITE); g.addColorStop(1, SKY);
      dot(c, cx, cy, 30, g);
      var ang = r() * 6;
      dot(c, cx + 140 * Math.cos(ang), cy + 44 * Math.sin(ang), 8, SKY2);
    },
    // Galaxia espiral.
    galaxy: function (c, r) {
      stars(c, r, 90);
      var cx = PW * 0.5, cy = PH * 0.5, rot = r() * TAU;
      for (var i = 0; i < 900; i++) {
        var arm = i % 2, t = r() * 3.2, rr = 12 + t * 42, a = t * 1.25 + arm * Math.PI + rot + (r() - 0.5) * 0.45;
        dot(c, cx + rr * Math.cos(a) * 1.5, cy + rr * Math.sin(a) * 0.62, r() * 1.8 + 0.4, rgba(r() < 0.3 ? WHITE : SKY2, 0.3 + r() * 0.6));
      }
      var g = c.createRadialGradient(cx, cy, 2, cx, cy, 50); g.addColorStop(0, WHITE); g.addColorStop(1, rgba(SKY2, 0));
      c.fillStyle = g; c.fillRect(0, 0, PW, PH);
    },
    // Radiotelescopio que recibe señales.
    dish: function (c, r) {
      stars(c, r, 110);
      var cx = PW * (0.35 + r() * 0.1), cy = PH * 0.62;
      for (var k = 1; k <= 5; k++) { c.strokeStyle = rgba(SKY2, 0.7 - k * 0.1); c.lineWidth = 2; c.beginPath(); c.arc(cx + 60, cy - 70, 30 * k, -1.3, 0.2); c.stroke(); }
      c.fillStyle = MIST; c.beginPath(); c.ellipse(cx, cy, 90, 38, -0.6, 0, Math.PI); c.fill();
      line(c, [[cx, cy], [cx + 44, cy - 50]], WHITE, 3); dot(c, cx + 44, cy - 50, 6, WHITE);
      c.fillStyle = MIST; c.fillRect(cx - 10, cy + 20, 20, PH - cy); c.fillRect(cx - 60, PH - 12, 120, 12);
    },
    // Estrella o Sol con protuberancias.
    sun: function (c, r) {
      stars(c, r, 60);
      var cx = PW * 0.3, cy = PH * 0.55, R = 130;
      var g = c.createRadialGradient(cx, cy, 10, cx, cy, R); g.addColorStop(0, WHITE); g.addColorStop(0.6, SKY2); g.addColorStop(1, SKY);
      dot(c, cx, cy, R, g);
      for (var i = 0; i < 7; i++) {
        var a = -1.1 + i * 0.35 + (r() - 0.5) * 0.1, h = 40 + r() * 60;
        c.strokeStyle = rgba(SKY2, 0.8); c.lineWidth = 3; c.beginPath();
        c.arc(cx + (R + h * 0.3) * Math.cos(a), cy + (R + h * 0.3) * Math.sin(a), h * 0.5, a + Math.PI * 0.6, a - Math.PI * 0.6, true); c.stroke();
      }
    },
    // Superficie con cráteres (Luna, Marte, asteroides).
    moon: function (c, r) {
      stars(c, r, 80);
      var cx = PW * 0.62, cy = PH * 0.5, R = 125;
      dot(c, cx, cy, R, mix(SKY2, SKY, 0.25));
      c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
      for (var i = 0; i < 24; i++) {
        var x = cx + (r() - 0.5) * 2 * R, y = cy + (r() - 0.5) * 2 * R, rr = 5 + r() * 20;
        dot(c, x + 2, y + 2, rr, rgba(NAVY, 0.45)); dot(c, x, y, rr * 0.8, rgba(MIST, 0.35));
      }
      var sh = c.createLinearGradient(cx - R, 0, cx + R, 0); sh.addColorStop(0.55, rgba(DEEP, 0)); sh.addColorStop(1, rgba(DEEP, 0.85));
      c.fillStyle = sh; c.fillRect(cx - R, cy - R, 2 * R, 2 * R);
      c.restore();
    },
    // Red de anillos hexagonales.
    hexagons: function (c, r) {
      var s = 34, h = s * Math.sqrt(3) / 2;
      for (var row = -1; row < PH / (s * 1.5) + 1; row++) {
        for (var col = -1; col < PW / (h * 2) + 1; col++) {
          if (r() < 0.45) continue;
          var cx = col * h * 2 + (row % 2 ? h : 0), cy = row * s * 1.5, pts = [];
          for (var k = 0; k <= 6; k++) { var a = Math.PI / 6 + k * Math.PI / 3; pts.push([cx + s * Math.cos(a), cy + s * Math.sin(a)]); }
          line(c, pts, rgba(r() < 0.25 ? WHITE : SKY2, 0.7), 2);
          dot(c, pts[0][0], pts[0][1], 3.5, WHITE);
        }
      }
    },
    // Molécula de esferas y enlaces.
    molecule: function (c, r) {
      var nodes = [[PW * 0.5, PH * 0.5]];
      for (var i = 1; i < 14; i++) {
        var p = nodes[Math.floor(r() * nodes.length)], a = r() * TAU;
        nodes.push([Math.max(40, Math.min(PW - 40, p[0] + 70 * Math.cos(a))), Math.max(35, Math.min(PH - 35, p[1] + 55 * Math.sin(a))), p]);
      }
      nodes.forEach(function (n) { if (n[2]) line(c, [n, n[2]], rgba(SKY2, 0.8), 5); });
      nodes.forEach(function (n, i) {
        var rr = i % 3 ? 13 : 20, g = c.createRadialGradient(n[0] - rr / 3, n[1] - rr / 3, 2, n[0], n[1], rr);
        g.addColorStop(0, WHITE); g.addColorStop(1, i % 3 ? SKY : SKY2); dot(c, n[0], n[1], rr, g);
      });
    },
    // Matraz con líquido y burbujas.
    flask: function (c, r) {
      var cx = PW * 0.5, top = PH * 0.12, neck = 26, base = 120, bottom = PH * 0.9;
      function shape() { c.beginPath(); c.moveTo(cx - neck, top); c.lineTo(cx - neck, PH * 0.4); c.lineTo(cx - base, bottom); c.lineTo(cx + base, bottom); c.lineTo(cx + neck, PH * 0.4); c.lineTo(cx + neck, top); }
      c.save(); shape(); c.closePath(); c.clip();
      c.fillStyle = rgba(SKY2, 0.85); c.fillRect(0, PH * 0.58, PW, PH);
      for (var i = 0; i < 22; i++) dot(c, cx + (r() - 0.5) * 180, PH * 0.6 + r() * PH * 0.3, 3 + r() * 7, rgba(WHITE, 0.6));
      c.restore();
      c.strokeStyle = WHITE; c.lineWidth = 3; shape(); c.stroke();
      for (var k = 0; k < 6; k++) dot(c, cx + (r() - 0.5) * 30, top - 10 - k * 14, 3 + r() * 4, rgba(MIST, 0.6));
    },
    // Aerogeneradores frente al sol.
    turbines: function (c, r) {
      var g = c.createRadialGradient(PW * 0.78, PH * 0.3, 10, PW * 0.78, PH * 0.3, 140);
      g.addColorStop(0, rgba(SKY2, 0.9)); g.addColorStop(1, rgba(SKY2, 0)); c.fillStyle = g; c.fillRect(0, 0, PW, PH);
      var ph = r() * 6;
      c.fillStyle = rgba(SKY, 0.6); c.beginPath(); c.moveTo(0, PH);
      for (var x = 0; x <= PW; x += 16) c.lineTo(x, PH * 0.82 + 12 * Math.sin(x * 0.01 + ph));
      c.lineTo(PW, PH); c.fill();
      [[0.18, 1], [0.42, 0.8], [0.62, 0.62]].forEach(function (t) {
        var tx = PW * t[0], top = PH * (0.85 - 0.62 * t[1]), L = 70 * t[1], a0 = r() * 6;
        c.lineCap = "round"; line(c, [[tx, PH * 0.86], [tx, top]], WHITE, 4 * t[1]);
        for (var b = 0; b < 3; b++) { var a = a0 + b * 2.094; line(c, [[tx, top], [tx + L * Math.cos(a), top + L * Math.sin(a)]], WHITE, 3 * t[1]); }
        c.lineCap = "butt"; dot(c, tx, top, 5 * t[1], WHITE);
      });
    },
    // Paneles solares en perspectiva.
    solar: function (c, r) {
      var g = c.createRadialGradient(PW * 0.82, PH * 0.18, 8, PW * 0.82, PH * 0.18, 120);
      g.addColorStop(0, WHITE); g.addColorStop(0.3, rgba(SKY2, 0.8)); g.addColorStop(1, rgba(SKY2, 0)); c.fillStyle = g; c.fillRect(0, 0, PW, PH);
      for (var row = 0; row < 3; row++) {
        var y = PH * (0.48 + row * 0.17), w = 150 + row * 30, h = 34 + row * 6;
        for (var i = 0; i < 5; i++) {
          var x = -40 + i * (w + 14) + row * 30 + r() * 4;
          c.fillStyle = mix(SKY, NAVY, 0.3); c.strokeStyle = MIST; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(x + 20, y); c.lineTo(x + w + 20, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); c.fill(); c.stroke();
          for (var k = 1; k < 6; k++) line(c, [[x + 20 + k * w / 6, y], [x + k * w / 6, y + h]], rgba(MIST, 0.5), 1);
          line(c, [[x + 10, y + h / 2], [x + w + 10, y + h / 2]], rgba(MIST, 0.5), 1);
        }
      }
    },
    // Batería con su carga.
    battery: function (c, r) {
      var x = PW * 0.3, y = PH * 0.25, w = PW * 0.4, h = PH * 0.5, level = 3 + Math.floor(r() * 3);
      c.strokeStyle = WHITE; c.lineWidth = 5; c.strokeRect(x, y, w, h);
      c.fillStyle = WHITE; c.fillRect(x + w, y + h * 0.3, 16, h * 0.4);
      for (var i = 0; i < 5; i++) { c.fillStyle = i < level ? mix(SKY2, SKY, i / 5) : rgba(SKY, 0.2); c.fillRect(x + 12 + i * (w - 24) / 5, y + 12, (w - 24) / 5 - 8, h - 24); }
      c.fillStyle = WHITE; c.beginPath();
      [[0.54, 0.12], [0.44, 0.52], [0.52, 0.52], [0.46, 0.88], [0.58, 0.44], [0.5, 0.44]].forEach(function (p, i) { var px = x + w * p[0], py = y + h * p[1]; if (i) c.lineTo(px, py); else c.moveTo(px, py); });
      c.closePath(); c.fill();
    },
    // Torres y líneas de transmisión eléctrica.
    grid: function (c, r) {
      var xs = [0.12, 0.42, 0.72].map(function (t) { return PW * (t + (r() - 0.5) * 0.04); });
      xs.forEach(function (x, i) {
        var s = 1 - i * 0.18, top = PH * (0.18 + i * 0.1), base = PH;
        line(c, [[x - 40 * s, base], [x, top], [x + 40 * s, base]], WHITE, 3 * s);
        for (var k = 1; k < 5; k++) { var y = top + (base - top) * k / 5, hw = 40 * s * k / 5; line(c, [[x - hw, y], [x + hw, y]], rgba(WHITE, 0.7), 1.5); }
        line(c, [[x - 50 * s, top + 22], [x + 50 * s, top + 22]], WHITE, 3 * s);
      });
      for (var side = -1; side <= 1; side += 2) {
        for (var i = 0; i < 2; i++) {
          var a = xs[i] + side * 50 * (1 - i * 0.18), b = xs[i + 1] + side * 50 * (1 - (i + 1) * 0.18);
          var ya = PH * (0.18 + i * 0.1) + 22, yb = PH * (0.18 + (i + 1) * 0.1) + 22, pts = [];
          for (var t = 0; t <= 1.001; t += 0.05) pts.push([a + (b - a) * t, ya + (yb - ya) * t + 30 * Math.sin(Math.PI * t)]);
          line(c, pts, rgba(SKY2, 0.9), 1.5);
        }
      }
    },
    // Pistas de un circuito con un chip.
    circuit: function (c, r) {
      var step = 32;
      for (var i = 0; i < 26; i++) {
        var x = Math.round(r() * PW / step) * step, y = Math.round(r() * PH / step) * step, pts = [[x, y]];
        for (var s = 0; s < 4; s++) { if (r() < 0.5) x += (r() < 0.5 ? -1 : 1) * step * (1 + Math.floor(r() * 3)); else y += (r() < 0.5 ? -1 : 1) * step * (1 + Math.floor(r() * 2)); pts.push([x, y]); }
        line(c, pts, rgba(i % 4 ? SKY2 : WHITE, 0.75), 2);
        c.fillStyle = DEEP; c.strokeStyle = WHITE; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); c.stroke();
      }
      c.fillStyle = WHITE; c.fillRect(PW / 2 - 50, PH / 2 - 34, 100, 68);
      c.fillStyle = NAVY; c.fillRect(PW / 2 - 40, PH / 2 - 24, 80, 48);
    },
    // Red neuronal en capas.
    neural: function (c, r) {
      var cols = [4, 6, 6, 5, 3].map(function (n, i) {
        var pts = [];
        for (var k = 0; k < n; k++) pts.push([PW * (0.12 + i * 0.19), PH * (k + 1) / (n + 1)]);
        return pts;
      });
      for (var i = 0; i < cols.length - 1; i++) cols[i].forEach(function (a) { cols[i + 1].forEach(function (b) { line(c, [a, b], rgba(SKY2, 0.12 + r() * 0.4), 1.2); }); });
      cols.forEach(function (col) { col.forEach(function (p) { dot(c, p[0], p[1], 11, r() < 0.35 ? WHITE : SKY2); dot(c, p[0], p[1], 4, DEEP); }); });
    },
    // Código fuente como bloques con sangría.
    code: function (c, r) {
      c.fillStyle = rgba(DEEP, 0.7); c.fillRect(PW * 0.08, PH * 0.1, PW * 0.84, PH * 0.8);
      var indent = 0;
      for (var i = 0; i < 11; i++) {
        var y = PH * 0.16 + i * 19;
        if (r() < 0.3 && indent < 3) indent++; else if (r() < 0.25 && indent > 0) indent--;
        c.fillStyle = rgba(SKY, 0.5); c.fillRect(PW * 0.11, y, 14, 8);
        var x = PW * 0.16 + indent * 26, segs = 1 + Math.floor(r() * 3);
        for (var s = 0; s < segs; s++) { var w = 30 + r() * 110; c.fillStyle = rgba(s ? SKY2 : WHITE, 0.8); c.fillRect(x, y, w, 8); x += w + 10; }
      }
      c.fillStyle = rgba(WHITE, 0.9); c.font = "700 90px Courier New, monospace"; c.textAlign = "right"; c.textBaseline = "middle";
      c.fillText("{ }", PW * 0.9, PH * 0.55);
    },
    // Cúbits: esferas con su vector de estado.
    qubits: function (c, r) {
      for (var j = 0; j < 2; j++) {
        for (var i = 0; i < 4; i++) {
          var cx = PW * (0.14 + i * 0.24), cy = PH * (0.3 + j * 0.42), R = 48;
          c.strokeStyle = rgba(SKY2, 0.7); c.lineWidth = 1.5;
          c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
          c.beginPath(); c.ellipse(cx, cy, R, 14, 0, 0, TAU); c.stroke();
          arrow(c, cx, cy, r() * TAU, R * 0.9, WHITE); dot(c, cx, cy, 3, WHITE);
        }
      }
    },
    // Red de nodos.
    network: function (c, r) {
      var pts = [];
      for (var i = 0; i < 40; i++) pts.push([r() * PW, r() * PH]);
      pts.forEach(function (p, i) {
        for (var j = i + 1; j < pts.length; j++) {
          var d = Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1]);
          if (d < 130) line(c, [p, pts[j]], rgba(SKY2, 0.6 * (1 - d / 130)), 1.2);
        }
        dot(c, p[0], p[1], 2.4, WHITE);
      });
    },
  };

  // Cinco dibujos por área. `k`: comienzos de palabras (sin tildes) que hacen preferir ese dibujo.
  var AREAS = {
    climatologia: [
      { d: "stripes", k: ["clima", "tendencia", "serie", "calentamiento", "global"] },
      { d: "globe", k: ["ozono", "antart", "polar", "atmosfer", "capa"] },
      { d: "bars", k: ["temperatura", "calor", "record", "grado", "anomal"] },
      { d: "cracks", k: ["sequia", "arid", "desiert", "suelo", "incendio"] },
      { d: "heatmap", k: ["mapa", "region", "patron", "dano", "objetivo", "impacto"] },
    ],
    meteorologia: [
      { d: "isobars", k: ["presion", "frente", "pronostico", "anticiclon"] },
      { d: "cyclone", k: ["huracan", "ciclon", "tormenta", "tifon", "tornado"] },
      { d: "rain", k: ["lluvia", "precipit", "inundac", "nube", "granizo"] },
      { d: "ice", k: ["hielo", "artico", "deshielo", "nieve", "glaciar", "fusion"] },
      { d: "flow", k: ["viento", "circulacion", "corriente", "atlantico", "chorro"] },
    ],
    oceanografia: [
      { d: "waves", k: ["ola", "oleaje", "marea", "costa", "nivel"] },
      { d: "currents", k: ["corriente", "circulacion", "remolino"] },
      { d: "profile", k: ["temperatura", "profund", "calent", "oxigeno", "salin", "acidific"] },
      { d: "ice", k: ["hielo", "antart", "polar", "glaciar"] },
      { d: "school", k: ["especie", "pinguino", "pez", "peces", "ballena", "biodivers", "coral", "fauna", "krill"] },
    ],
    geologia: [
      { d: "strata", k: ["carbono", "sediment", "registro", "capa", "historia", "millones"] },
      { d: "crater", k: ["crater", "impacto", "meteor", "asteroide"] },
      { d: "topo", k: ["montana", "relieve", "glaciar", "cordillera", "erosion", "rio"] },
      { d: "crystal", k: ["mineral", "roca", "cristal", "diamante"] },
      { d: "fault", k: ["placa", "tecton", "falla", "corteza", "manto"] },
    ],
    sismologia: [
      { d: "seismogram", k: ["onda", "senal", "registro", "sismic", "sismograma"] },
      { d: "fault", k: ["falla", "subduccion", "placa", "tecton", "desgarr"] },
      { d: "epicenter", k: ["terremoto", "sismo", "epicentro", "magnitud", "ruptur"] },
      { d: "stations", k: ["red", "estacion", "monitoreo", "alerta", "deteccion", "sensor"] },
      { d: "waves", k: ["tsunami", "maremoto"] },
    ],
    vulcanologia: [
      { d: "volcano", k: ["volcan", "erupcion", "cono"] },
      { d: "lava", k: ["lava", "flujo", "fundid"] },
      { d: "plume", k: ["ceniza", "gas", "columna", "emision", "azufre", "pluma"] },
      { d: "caldera", k: ["caldera", "supererupcion", "magma", "camara", "yellowstone"] },
      { d: "seismogram", k: ["enjambre", "sismic", "senal", "advertencia", "alerta"] },
    ],
    fisica: [
      { d: "interference", k: ["interferencia", "gravitacion", "gravedad"] },
      { d: "atom", k: ["atomo", "particula", "cuantic", "electron", "nucle", "proton", "neutrino"] },
      { d: "prism", k: ["luz", "laser", "optic", "foton"] },
      { d: "spectrum", k: ["frecuencia", "onda", "sonido", "vibracion", "senal"] },
      { d: "crystal", k: ["material", "superconduc", "cristal", "solido", "magnet"] },
    ],
    astronomia: [
      { d: "orbits", k: ["planeta", "orbita", "exoplaneta", "sistema"] },
      { d: "galaxy", k: ["galaxia", "universo", "cosmolog", "oscura", "materia"] },
      { d: "dish", k: ["radio", "telescopio", "senal", "hidrogeno", "antena"] },
      { d: "sun", k: ["sol", "estrella", "solar", "llamarada", "supernova"] },
      { d: "moon", k: ["luna", "marte", "crater", "asteroide", "cometa", "lunar"] },
    ],
    quimica: [
      { d: "hexagons", k: ["carbono", "organic", "anillo", "grafeno"] },
      { d: "molecule", k: ["molecula", "sintesis", "farmaco", "compuesto", "proteina"] },
      { d: "flask", k: ["reaccion", "catalizador", "laboratorio", "solucion", "agua"] },
      { d: "crystal", k: ["cristal", "material", "metal", "bateria", "solido"] },
      { d: "spectrum", k: ["espectro", "analisis", "deteccion", "sensor"] },
    ],
    renovables: [
      { d: "turbines", k: ["eolic", "viento", "turbina", "aerogenerador"] },
      { d: "solar", k: ["solar", "fotovolt", "panel", "sol"] },
      { d: "battery", k: ["bateria", "almacen", "litio", "carga"] },
      { d: "waves", k: ["marea", "oleaje", "undimotriz", "oceano", "hidro"] },
      { d: "grid", k: ["red", "electric", "hidrogeno", "transmision", "consumo"] },
    ],
    computacion: [
      { d: "circuit", k: ["chip", "hardware", "procesador", "semiconductor"] },
      { d: "neural", k: ["inteligencia", "artificial", "aprendizaje", "neuronal", "modelo", "ia", "robot"] },
      { d: "code", k: ["software", "codigo", "algoritmo", "programa"] },
      { d: "qubits", k: ["cuantic", "qubit", "cubit"] },
      { d: "network", k: ["red", "internet", "datos", "seguridad", "nube"] },
    ],
  };
  var OTRAS = [{ d: "network", k: [] }, { d: "topo", k: [] }, { d: "flow", k: [] }, { d: "hexagons", k: [] }, { d: "spectrum", k: [] }];

  function words(text) {
    return String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
  }

  // Elige el dibujo de una nota: el primero cuyas palabras aparezcan en la nota y que no se haya usado en el área;
  // si ninguno calza, el siguiente sin usar; con más de cinco notas, vuelve a empezar (con otra semilla).
  function pickVariant(clave, n, used) {
    var list = Object.prototype.hasOwnProperty.call(AREAS, clave) ? AREAS[clave] : OTRAS;
    var toks = words(n.titulo + " " + (n.resumen || ""));
    var matches = function (v) { return v.k.some(function (kw) { return toks.some(function (t) { return t.indexOf(kw) === 0; }); }); };
    var count = used.count || 0, i;
    for (i = 0; i < list.length; i++) if (!used[i] && matches(list[i])) break;
    if (i === list.length) for (i = 0; i < list.length; i++) if (!used[i]) break;
    if (i === list.length) i = count % list.length;
    used[i] = true;
    used.count = count + 1;
    return list[i].d;
  }

  function drawPic(canvas, dibujo, seed) {
    var c = canvas.getContext("2d");
    if (!c) return;
    var g = c.createLinearGradient(0, 0, PW, PH);
    g.addColorStop(0, NAVY); g.addColorStop(1, DEEP);
    c.fillStyle = g; c.fillRect(0, 0, PW, PH);
    c.strokeStyle = "rgba(255, 255, 255, 0.06)"; c.lineWidth = 1;
    for (var x = 32; x < PW; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, PH); c.stroke(); }
    for (var y = 32; y < PH; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(PW, y); c.stroke(); }
    (Object.prototype.hasOwnProperty.call(D, dibujo) ? D[dibujo] : D.network)(c, rng(seed));
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
    drawPic(canvas, canvas.dataset.dibujo, Number(canvas.dataset.seed));
  }

  function lazyDraw(canvas) {
    if (observer) observer.observe(canvas); else paint(canvas);
  }

  /* ---------- Tarjetas ---------- */

  function card(n, area, used) {
    var href = safeUrl(n.enlace);
    if (!href) return null;
    var li = el("li", "item");
    var pic = el("div", "pic");
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.dataset.dibujo = pickVariant(area.clave, n, used);
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
    var ul = el("ul", "items"), used = {};
    area.noticias.forEach(function (n) { ul.appendChild(card(n, area, used)); });
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
    var usedAreas = {}, cards = [];
    for (var i = 0; i < all.length && cards.length < 3; i++) {
      if (usedAreas[all[i].a.clave]) continue;
      var li = card(all[i].n, all[i].a, {});
      if (li) { usedAreas[all[i].a.clave] = true; cards.push(li); }
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
