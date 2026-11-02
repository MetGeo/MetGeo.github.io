// Pronóstico del día en Concepción, hora a hora (#pronostico en index.html).
// Mediana de los mismos 7 modelos del monitor y del newsletter, consultados a Open-Meteo (sin clave).
(function () {
  var root = document.getElementById("pronostico-datos");
  if (!root) return;

  var LAT = -36.83, LON = -73.05, ZONA = "America/Santiago";
  var MODELOS = ["gfs_seamless", "ecmwf_ifs025", "icon_seamless", "gem_seamless", "jma_seamless", "ukmo_seamless", "meteofrance_seamless"];
  var VARS = ["temperature_2m", "weather_code", "is_day", "cloud_cover", "precipitation", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"];
  var COL = 62, ALTO_GRAF = 120;
  var SVGNS = "http://www.w3.org/2000/svg";
  var BRUJULA = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function mediana(v) {
    if (!v.length) return null;
    v = v.slice().sort(function (a, b) { return a - b; });
    var m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }
  function brujula(g) { return BRUJULA[Math.floor(((g % 360) + 360) % 360 / 45 + 0.5) % 8]; }
  function coma(x) { return String(x).replace(".", ","); }

  // Une las series "<variable>_<modelo>" en una sola: mediana de los modelos con dato.
  // El viento se promedia como vector (la mediana de ángulos falla cerca del norte).
  function medianas(h) {
    var out = [];
    h.time.forEach(function (t, i) {
      function vals(v) {
        return MODELOS.map(function (m) { var a = h[v + "_" + m]; return a ? a[i] : null; })
          .filter(function (x) { return x !== null && x !== undefined; });
      }
      var temp = vals("temperature_2m"), lluvia = vals("precipitation"), vel = vals("wind_speed_10m");
      if (!temp.length || !lluvia.length || !vel.length) return;
      var u = 0, w = 0;
      MODELOS.forEach(function (m) {
        var d = h["wind_direction_10m_" + m], s = h["wind_speed_10m_" + m];
        if (d && s && d[i] != null && s[i] != null) {
          u += s[i] * Math.sin(d[i] * Math.PI / 180);
          w += s[i] * Math.cos(d[i] * Math.PI / 180);
        }
      });
      var pp = mediana(lluvia), rafaga = vals("wind_gusts_10m");
      var dia = vals("is_day");
      out.push({
        hora: +t.slice(11, 13),
        temp: mediana(temp),
        pp: Math.round(pp * 10) / 10,
        nubes: mediana(vals("cloud_cover")) || 0,
        codigo: codigo(vals("weather_code").map(Math.round), pp >= 0.1),
        dia: dia.length ? dia[0] === 1 : (+t.slice(11, 13) >= 7 && +t.slice(11, 13) < 20),
        dir: (Math.atan2(u, w) * 180 / Math.PI + 360) % 360,
        vel: mediana(vel),
        rafaga: Math.max(rafaga.length ? mediana(rafaga) : 0, mediana(vel)),
      });
    });
    return out;
  }
  // Código WMO más repetido entre los modelos que coinciden con la lluvia mediana (empate: el más severo).
  // Sin lluvia solo se conserva la niebla; el resto del cielo sale de la nubosidad.
  function codigo(codes, mojado) {
    var pool = codes.filter(function (c) { return (c >= 51) === mojado; });
    if (!pool.length) return mojado ? 61 : null;
    var cuenta = {};
    pool.forEach(function (c) { cuenta[c] = (cuenta[c] || 0) + 1; });
    var tope = Math.max.apply(null, Object.keys(cuenta).map(function (c) { return cuenta[c]; }));
    var c = Math.max.apply(null, Object.keys(cuenta).filter(function (k) { return cuenta[k] === tope; }).map(Number));
    return mojado || c === 45 || c === 48 ? c : null;
  }
  // Ícono y nombre del cielo: los mismos PNG y la misma tabla que usa el newsletter (app/weather.py, _SKY).
  var CIELO = { 0: ["clear", "Despejado"], 1: ["mostly-clear", "Mayormente despejado"], 2: ["partly", "Parcialmente nublado"], 3: ["cloudy!", "Nublado"] };
  function cielo(r) {
    var c = r.codigo;
    if (c === null) c = r.pp >= 0.1 ? 61 : r.nubes < 20 ? 0 : r.nubes < 45 ? 1 : r.nubes < 75 ? 2 : 3;
    var d = CIELO[c];
    if (!d) {
      d = c >= 95 ? ["thunder!", "Tormenta"] : (c >= 71 && c <= 77) || c === 85 || c === 86 ? ["snow!", "Nieve"] :
        c === 65 || c === 67 || c === 82 ? ["heavy-rain!", "Lluvia intensa"] : c >= 80 ? ["showers", "Chubascos"] :
        c >= 61 ? ["rain!", "Lluvia"] : c >= 51 ? ["drizzle!", "Llovizna"] : ["fog!", "Niebla"];
    }
    var n = d[0];
    return [n.slice(-1) === "!" ? n.slice(0, -1) : n + (r.dia ? "-day" : "-night"), d[1]];
  }
  function imagen(nombre, cls, alt) {
    var i = el("img", cls);
    i.src = "assets/weather/" + nombre + ".png";
    i.alt = alt; i.width = 36; i.height = 36; i.loading = "lazy";
    return i;
  }
  // Flecha del newsletter: apunta hacia donde sopla, en 16 direcciones; el largo depende de la velocidad media.
  function flecha(r) {
    var clase = r.vel < 10 ? "calm" : r.vel < 30 ? "moderate" : "strong";
    var k = Math.floor(((r.dir % 360) + 360) % 360 / 22.5 + 0.5) % 16;
    return imagen("wind-" + clase + "-" + (k < 10 ? "0" : "") + k, "", "Viento del " + brujula(r.dir));
  }

  // Lluvia hora a hora: en la misma banda, los mm de cada hora arriba y las barras abajo, alineados con las columnas de la tabla.
  function grafico(filas, ahora) {
    var w = COL * filas.length, ALTO = 78, base = ALTO - 8, techo = 26, tope = Math.max(2, Math.ceil(Math.max.apply(null, filas.map(function (r) { return r.pp; }))));
    var s = svg("svg", { viewBox: "0 0 " + w + " " + ALTO, width: w, height: ALTO, role: "img", "class": "wx-graf",
      "aria-label": "Lluvia por hora en Concepción, en milímetros" });
    var pts = [];
    filas.forEach(function (r, i) {
      if (r.hora === ahora) s.appendChild(svg("rect", { x: i * COL, y: 0, width: COL, height: ALTO, "class": "wx-ahora" }));
    });
    [0.5, 1].forEach(function (f) {
      var y = base - f * (base - techo);
      s.appendChild(svg("line", { x1: 0, x2: w, y1: y, y2: y, "class": "wx-malla" }));
    });
    s.appendChild(svg("line", { x1: 0, x2: w, y1: base, y2: base, "class": "wx-base" }));
    var lt = svg("text", { x: 4, y: techo - 4, "class": "wx-eje" });
    lt.textContent = coma(tope) + " mm";
    s.appendChild(lt);
    filas.forEach(function (r, i) {
      var h = (base - techo) * r.pp / tope, x = i * COL + COL / 2, y = base - h;
      if (r.pp > 0) s.appendChild(svg("rect", { x: i * COL + 10, y: y, width: COL - 20, height: h, rx: 3, "class": "wx-barra" }));
      pts.push(x.toFixed(1) + "," + y.toFixed(1));
      var t = svg("text", { x: x, y: 15, "class": "wx-mmv" });
      t.textContent = coma(r.pp) + " mm";
      s.appendChild(t);
    });
    s.appendChild(svg("polyline", { points: pts.join(" "), "class": "wx-linea" }));
    return s;
  }

  function dibujar(filas, ahora) {
    root.textContent = "";
    var scroll = el("div", "wx-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", "Pronóstico por hora en Concepción (desliza para ver todas las horas)");
    var inner = el("div", "wx-inner");
    var filasDef = [
      ["Hora", function (r) { return (r.hora < 10 ? "0" : "") + r.hora + "h"; }, "wx-hora-c"],
      ["Cielo", function (r) { var c = cielo(r), n = el("span"); n.title = c[1]; n.appendChild(imagen(c[0], "wx-ico", c[1])); return n; }, "wx-cielo"],
      ["Temperatura", function (r) { return Math.round(r.temp) + "°"; }, "wx-temp"],
      ["Viento", function (r) { var n = el("span"); n.title = "Viento del " + brujula(r.dir) + ", " + Math.round(r.vel) + " km/h"; n.appendChild(flecha(r)); return n; }, "wx-dir"],
      ["Velocidad", function (r) { var n = el("span"); n.appendChild(document.createTextNode(Math.round(r.vel) + " ")); n.appendChild(el("small", "", "(" + Math.round(r.rafaga) + ")")); return n; }, "wx-viento"],
    ];
    var tabla = el("div", "wx-tabla");
    tabla.style.gridTemplateColumns = "repeat(" + filas.length + ", " + COL + "px)";
    function fila(def, antes) {
      filas.forEach(function (r) {
        var c = el("div", "wx-c " + def[2]);
        var v = def[1](r);
        if (typeof v === "string") c.textContent = v; else c.appendChild(v);
        if (r.hora === ahora) c.classList.add("is-now");
        c.setAttribute("data-fila", def[0]);
        tabla.appendChild(c);
      });
    }
    filasDef.slice(0, 3).forEach(fila);
    var llu = el("div", "wx-c wx-lluvia");
    llu.appendChild(grafico(filas, ahora));
    tabla.appendChild(llu);
    filasDef.slice(3).forEach(fila);
    inner.appendChild(tabla);
    scroll.appendChild(inner);
    root.appendChild(scroll);

    var ahoraI = filas.map(function (r) { return r.hora; }).indexOf(ahora);
    if (ahoraI > 1) scroll.scrollLeft = Math.max(0, (ahoraI - 1) * COL);

    var t = filas.map(function (r) { return r.temp; });
    var total = filas.reduce(function (a, r) { return a + r.pp; }, 0);
    var res = document.getElementById("pronostico-resumen");
    if (res) res.textContent = "Mínima " + Math.round(Math.min.apply(null, t)) + "° · máxima " + Math.round(Math.max.apply(null, t)) + "° · " +
      (total >= 0.1 ? "lluvia acumulada del día: " + coma(Math.round(total * 10) / 10) + " mm" : "sin lluvia en el día");
  }

  function error() {
    root.textContent = "";
    root.appendChild(el("p", "empty", "No pudimos cargar el pronóstico en este momento. Inténtalo de nuevo en unos minutos o revisa el monitor de Concepción."));
  }

  var hoy = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  var ahora = +new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "2-digit", hourCycle: "h23" }).format(new Date());
  var url = "https://api.open-meteo.com/v1/forecast?latitude=" + LAT + "&longitude=" + LON +
    "&hourly=" + VARS.join(",") + "&models=" + MODELOS.join(",") + "&wind_speed_unit=kmh&timezone=" + encodeURIComponent(ZONA) +
    "&start_date=" + hoy + "&end_date=" + hoy;
  fetch(url).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(function (j) {
    var filas = medianas(j.hourly);
    if (!filas.length) throw new Error("sin datos");
    dibujar(filas, ahora);
  }).catch(error);
})();
