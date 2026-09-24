// Enlaces al registro del newsletter: usan la dirección de config.js o quedan desactivados con un aviso.
(function () {
  var url = (window.METGEO && window.METGEO.newsletterUrl) || "";
  document.querySelectorAll("[data-newsletter]").forEach(function (a) {
    if (url) {
      a.href = url.replace(/\/$/, "") + "/";
    } else {
      a.removeAttribute("href");
      a.setAttribute("aria-disabled", "true");
      a.setAttribute("role", "link");
    }
  });
  document.querySelectorAll("[data-newsletter-soon]").forEach(function (el) {
    el.hidden = Boolean(url);
  });
})();
