// Comportamiento común de todas las páginas. Se carga en <head>: marca que hay JavaScript
// (el menú de teléfono depende de eso) y espera al documento para lo demás.
document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", function () {
  var cfg = window.METGEO || {};

  // Enlaces al registro del newsletter: usan la dirección de config.js o quedan desactivados con un aviso.
  var newsletter = /^https:\/\//.test(cfg.newsletterUrl || "") ? cfg.newsletterUrl : "";
  document.querySelectorAll("[data-newsletter]").forEach(function (a) {
    if (newsletter) {
      a.href = newsletter.replace(/\/$/, "") + "/";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    } else {
      a.removeAttribute("href");
      a.setAttribute("aria-disabled", "true");
      a.setAttribute("role", "link");
    }
  });
  document.querySelectorAll("[data-newsletter-soon]").forEach(function (el) {
    el.hidden = Boolean(newsletter);
  });

  // Enlaces a los monitores: data-monitor="<clave>" toma la dirección de config.js.
  var monitores = cfg.monitores || {};
  document.querySelectorAll("[data-monitor]").forEach(function (a) {
    var url = monitores[a.getAttribute("data-monitor")];
    if (/^https:\/\//.test(url || "")) a.href = url;
  });

  // Menú de teléfono.
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("menu");
  if (btn && nav) {
    var setOpen = function (open) {
      btn.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    };
    btn.addEventListener("click", function () { setOpen(btn.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); btn.focus(); }
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
  }

  // Cabecera compacta al bajar por la página. Al compactarse la cabecera pierde ~55 px de alto y la
  // página sube lo mismo: con un solo umbral eso la hacía crecer y achicarse sin parar. Por eso se
  // compacta pasados 140 px y vuelve a crecer bajo 20 px (la brecha es mayor que ese salto).
  var top = document.querySelector(".top");
  if (top) {
    var ticking = false;
    var compact = false;
    var update = function () {
      var y = window.scrollY;
      if (!compact && y > 140) compact = true;
      else if (compact && y < 20) compact = false;
      top.classList.toggle("is-compact", compact);
      ticking = false;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }
});
