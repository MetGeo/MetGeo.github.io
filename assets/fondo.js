// Fondos del sitio, dibujados por código (sin imágenes de terceros):
//  - Portada: cordilleras con neblina y una red de puntos, al estilo del banner de LinkedIn de MetGeo.
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

  /* ---------- Portada: cordillera al estilo del banner de LinkedIn ---------- */

  // Generador pseudoaleatorio con semilla: el paisaje es siempre el mismo.
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Perfil de una cordillera por desplazamiento de punto medio (valores entre -1 y 1).
  function ridge(rand, n, rough) {
    var size = 1;
    while (size < n) size *= 2;
    var p = new Float32Array(size + 1);
    p[0] = rand() * 2 - 1; p[size] = rand() * 2 - 1;
    for (var step = size, amp = 1; step > 1; step /= 2, amp *= rough) {
      for (var i = step / 2; i < size; i += step) {
        p[i] = (p[i - step / 2] + p[i + step / 2]) / 2 + (rand() * 2 - 1) * amp;
      }
    }
    return p;
  }

  function mix(a, b, t) {
    return "rgb(" + [0, 1, 2].map(function (k) { return Math.round(a[k] + (b[k] - a[k]) * t); }).join(",") + ")";
  }

  function drawGeo(canvas) {
    var f = fit(canvas), ctx = f.ctx, w = f.w, h = f.h, rand = rng(20260924);

    // Cielo: celeste arriba, casi blanco en el horizonte.
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#5E98C8");
    sky.addColorStop(0.45, "#A8C9E4");
    sky.addColorStop(0.75, "#DDEBF6");
    sky.addColorStop(1, "#EEF5FB");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    var glow = ctx.createRadialGradient(w * 0.62, h * 0.55, 0, w * 0.62, h * 0.55, Math.max(w, h) * 0.55);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.55)");
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Seis cordilleras, de la más lejana (clara) a la más cercana (azul profundo).
    var far = [184, 210, 232], near = [22, 66, 112];
    var layers = 6, n = Math.ceil(w / 12) + 2;
    for (var L = 0; L < layers; L++) {
      var t = L / (layers - 1);
      var baseY = h * (0.52 + 0.08 * L);
      var amp = h * (0.14 + 0.06 * t);
      var prof = ridge(rand, n, 0.56 + 0.03 * t);
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (var i = 0; i <= n; i++) {
        var x = (i / n) * w;
        var k = Math.min(prof.length - 1, Math.round((i / n) * (prof.length - 1)));
        ctx.lineTo(x, baseY - amp * (prof[k] + 0.25));
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      var fill = ctx.createLinearGradient(0, baseY - amp * 1.3, 0, h);
      fill.addColorStop(0, mix(far, near, t));
      fill.addColorStop(1, mix(far, near, Math.min(1, t + 0.18)));
      ctx.fillStyle = fill;
      ctx.fill();

      // Neblina en el valle, delante de cada cordillera salvo la última.
      if (L < layers - 1) {
        var fog = ctx.createLinearGradient(0, baseY - amp * 0.2, 0, baseY + h * 0.10);
        fog.addColorStop(0, "rgba(232, 242, 250, 0)");
        fog.addColorStop(1, "rgba(232, 242, 250, " + (0.55 - 0.08 * L) + ")");
        ctx.fillStyle = fog;
        ctx.fillRect(0, baseY - amp * 0.2, w, h);
      }
    }

    // Red de puntos blancos sobre el paisaje.
    var pts = [], count = Math.round(Math.min(70, Math.max(24, w / 22)));
    for (var p = 0; p < count; p++) pts.push([rand() * w, rand() * h, 1 + rand() * 1.6]);
    ctx.lineWidth = 0.8;
    for (var a = 0; a < pts.length; a++) {
      for (var b = a + 1; b < pts.length; b++) {
        var dx = pts[a][0] - pts[b][0], dy = pts[a][1] - pts[b][1], d = Math.sqrt(dx * dx + dy * dy);
        if (d < 150) {
          ctx.strokeStyle = "rgba(255, 255, 255, " + (0.45 * (1 - d / 150)).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(pts[a][0], pts[a][1]); ctx.lineTo(pts[b][0], pts[b][1]); ctx.stroke();
        }
      }
    }
    for (var q = 0; q < pts.length; q++) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath(); ctx.arc(pts[q][0], pts[q][1], pts[q][2], 0, Math.PI * 2); ctx.fill();
    }
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
