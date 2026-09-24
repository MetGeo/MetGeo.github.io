// Fondos del sitio, dibujados por código (sin imágenes de terceros):
//  - Portada: mapa topográfico con curvas de nivel, grilla de coordenadas y un sismograma.
//  - Resto de la página: red de puntos interconectados que se mueven y siguen al cursor.
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function fit(canvas) {
    var r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }

  /* ---------- Portada: curvas de nivel ---------- */

  // Relieve fijo: cerros gaussianos y ondulaciones suaves. Siempre el mismo dibujo.
  var HILLS = [
    [0.72, 0.30, 0.16, 1.00], [0.88, 0.72, 0.13, 0.85], [0.55, 0.78, 0.20, 0.70],
    [0.95, 0.15, 0.10, 0.55], [0.40, 0.25, 0.14, 0.45], [0.66, 0.58, 0.07, 0.40],
  ];
  function height(x, y) {
    var z = 0.12 * Math.sin(x * 7.1 + y * 2.3) + 0.08 * Math.cos(y * 9.4 - x * 3.2);
    for (var i = 0; i < HILLS.length; i++) {
      var h = HILLS[i], dx = x - h[0], dy = y - h[1];
      z += h[3] * Math.exp(-(dx * dx + dy * dy) / (2 * h[2] * h[2]));
    }
    return z;
  }

  // Marching squares: segmentos de la curva de nivel `level` sobre una grilla de valores.
  function contour(ctx, grid, cols, rows, step, level) {
    ctx.beginPath();
    for (var j = 0; j < rows - 1; j++) {
      for (var i = 0; i < cols - 1; i++) {
        var a = grid[j * cols + i], b = grid[j * cols + i + 1];
        var c = grid[(j + 1) * cols + i + 1], d = grid[(j + 1) * cols + i];
        var idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        var x = i * step, y = j * step;
        var top = [x + step * (level - a) / (b - a), y];
        var right = [x + step, y + step * (level - b) / (c - b)];
        var bottom = [x + step * (level - d) / (c - d), y + step];
        var left = [x, y + step * (level - a) / (d - a)];
        var segs = {
          1: [left, bottom], 2: [bottom, right], 3: [left, right], 4: [top, right],
          5: [left, top, bottom, right], 6: [top, bottom], 7: [left, top], 8: [left, top],
          9: [top, bottom], 10: [left, bottom, top, right], 11: [top, right], 12: [left, right],
          13: [bottom, right], 14: [left, bottom],
        }[idx];
        for (var s = 0; s < segs.length; s += 2) {
          ctx.moveTo(segs[s][0], segs[s][1]);
          ctx.lineTo(segs[s + 1][0], segs[s + 1][1]);
        }
      }
    }
    ctx.stroke();
  }

  function drawGeo(canvas) {
    var f = fit(canvas), ctx = f.ctx, w = f.w, h = f.h;
    ctx.clearRect(0, 0, w, h);

    // Grilla de coordenadas, con las de Concepción como referencia.
    ctx.strokeStyle = "rgba(143, 195, 230, 0.10)";
    ctx.lineWidth = 1;
    var gs = 120;
    ctx.beginPath();
    for (var gx = gs; gx < w; gx += gs) { ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, h); }
    for (var gy = gs; gy < h; gy += gs) { ctx.moveTo(0, gy + 0.5); ctx.lineTo(w, gy + 0.5); }
    ctx.stroke();
    ctx.fillStyle = "rgba(143, 195, 230, 0.35)";
    ctx.font = "10px 'Courier New', monospace";
    var lat = ["36°45′S", "36°49′S", "36°53′S", "36°57′S", "37°01′S"];
    var lon = ["73°15′O", "73°09′O", "73°03′O", "72°57′O", "72°51′O", "72°45′O", "72°39′O", "72°33′O", "72°27′O", "72°21′O", "72°15′O", "72°09′O"];
    for (var k = 1; k * gs < h && k <= lat.length; k++) ctx.fillText(lat[k - 1], w - 58, k * gs - 4);
    for (var m = 1; m * gs < w - 80 && m <= lon.length; m++) ctx.fillText(lon[m - 1], m * gs + 4, 14);

    // Curvas de nivel. Cada quinta es una curva maestra, más gruesa, como en una carta topográfica.
    var step = 6, cols = Math.ceil(w / step) + 1, rows = Math.ceil(h / step) + 1;
    var grid = new Float32Array(cols * rows), lo = Infinity, hi = -Infinity;
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var v = height((i * step) / Math.max(w, 900), (j * step) / Math.max(h, 420));
        grid[j * cols + i] = v;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    var levels = 22;
    for (var L = 1; L < levels; L++) {
      var master = L % 5 === 0;
      ctx.strokeStyle = master ? "rgba(143, 195, 230, 0.42)" : "rgba(143, 195, 230, 0.18)";
      ctx.lineWidth = master ? 1.3 : 0.8;
      contour(ctx, grid, cols, rows, step, lo + ((hi - lo) * L) / levels);
    }

    // Sismograma: ruido de fondo, llegada de la onda P y luego la onda S, más fuerte.
    var base = h - 34, x0 = w * 0.42;
    ctx.strokeStyle = "rgba(78, 148, 195, 0.75)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var x = x0; x < w; x += 1.5) {
      var t = (x - x0) / (w - x0);
      var amp = 1.5;
      if (t > 0.30) amp += 9 * Math.exp(-(t - 0.30) * 18);
      if (t > 0.52) amp += 22 * Math.exp(-(t - 0.52) * 9);
      var y = base + amp * Math.sin(x * 0.9) * Math.cos(x * 0.23 + t * 4);
      if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(143, 195, 230, 0.55)";
    ctx.fillText("P", x0 + (w - x0) * 0.30 - 3, base - 24);
    ctx.fillText("S", x0 + (w - x0) * 0.52 - 3, base - 36);
  }

  var geos = Array.prototype.slice.call(document.querySelectorAll("canvas.geo"));
  function redrawGeo() { geos.forEach(drawGeo); }
  redrawGeo();

  /* ---------- Resto de la página: red de puntos ---------- */

  var net = document.querySelector("canvas.net");
  if (!net) return;
  var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
  var W = 0, H = 0, ctx = null, pts = [];
  var mouse = { x: -9999, y: -9999, on: false };
  var LINK = 140, PULL = 190;

  function colors() {
    return dark && dark.matches
      ? { dot: "143, 195, 230", line: "78, 148, 195", a: 0.55 }
      : { dot: "0, 41, 91", line: "0, 64, 144", a: 0.35 };
  }

  function setup() {
    var f = fit(net);
    ctx = f.ctx; W = f.w; H = f.h;
    var n = Math.round(Math.min(110, Math.max(35, (W * H) / 16000)));
    pts = [];
    for (var i = 0; i < n; i++) {
      pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: 1.2 + Math.random() * 1.6 });
    }
  }

  function frame() {
    var c = colors();
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (!reduce) {
        // Atracción suave hacia el cursor.
        if (mouse.on) {
          var dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < PULL && d > 1) { p.vx += (dx / d) * 0.035; p.vy += (dy / d) * 0.035; }
        }
        p.vx *= 0.985; p.vy *= 0.985;
        var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (sp < 0.12) { p.vx += (Math.random() - 0.5) * 0.05; p.vy += (Math.random() - 0.5) * 0.05; }
        if (sp > 1.6) { p.vx *= 1.6 / sp; p.vy *= 1.6 / sp; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        p.x = Math.max(0, Math.min(W, p.x)); p.y = Math.max(0, Math.min(H, p.y));
      }
      for (var j = i + 1; j < pts.length; j++) {
        var q = pts[j], ex = p.x - q.x, ey = p.y - q.y, e = ex * ex + ey * ey;
        if (e < LINK * LINK) {
          ctx.strokeStyle = "rgba(" + c.line + "," + (c.a * (1 - Math.sqrt(e) / LINK)).toFixed(3) + ")";
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      if (mouse.on) {
        var mx = p.x - mouse.x, my = p.y - mouse.y, md = Math.sqrt(mx * mx + my * my);
        if (md < PULL) {
          ctx.strokeStyle = "rgba(" + c.line + "," + (c.a * 1.4 * (1 - md / PULL)).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      ctx.fillStyle = "rgba(" + c.dot + "," + (c.a + 0.25) + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    if (!reduce && !document.hidden) requestAnimationFrame(frame);
  }

  window.addEventListener("pointermove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; }, { passive: true });
  document.addEventListener("pointerleave", function () { mouse.on = false; });
  document.addEventListener("visibilitychange", function () { if (!document.hidden && !reduce) requestAnimationFrame(frame); });

  var timer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(timer);
    timer = setTimeout(function () { redrawGeo(); setup(); if (reduce) frame(); }, 150);
  });

  setup();
  frame();
})();
