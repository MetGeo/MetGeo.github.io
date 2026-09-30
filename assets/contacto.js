// Formulario de contacto. Envía el mensaje al Worker del newsletter (contactoUrl en config.js), que lo guarda
// hasta que el computador de MetGeo lo reenvía al correo del equipo. Si el Worker no responde, ofrece abrir
// el programa de correo de la persona con el mensaje listo (contactoEmail).
(function () {
  var form = document.getElementById("form-contacto");
  if (!form) return;
  var status = document.getElementById("form-status");
  var button = form.querySelector('button[type="submit"]');
  var cfg = window.METGEO || {};
  var endpoint = /^https:\/\//.test(cfg.contactoUrl || "") ? cfg.contactoUrl : "";
  var to = /^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/.test(cfg.contactoEmail || "") ? cfg.contactoEmail : "";
  var started = Date.now();
  var MAX_HREF = 1900;
  var TEMAS = {
    eventos: "Estudio de un evento extremo",
    modelacion: "Modelación numérica y monitoreo",
    capacitaciones: "Capacitación técnica",
    ambiental: "Evaluación ambiental (SEIA)",
    otro: "Otro tema",
  };

  // Tema preseleccionado desde los botones de servicios.html (?servicio=...), solo si es uno conocido.
  var pedido = new URLSearchParams(location.search).get("servicio");
  if (pedido && Object.prototype.hasOwnProperty.call(TEMAS, pedido)) form.elements.servicio.value = pedido;

  // Quita caracteres de control y recorta al largo máximo. En los campos de una línea, además, sin saltos.
  function limpio(value, max, unaLinea) {
    var s = String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    if (unaLinea) s = s.replace(/[\r\n]+/g, " ");
    return s.trim().slice(0, max);
  }

  function aviso(texto, error, enlace) {
    status.replaceChildren(document.createTextNode(texto));
    if (enlace) {
      status.appendChild(document.createTextNode(" "));
      status.appendChild(enlace);
    }
    status.classList.toggle("is-error", Boolean(error));
    status.hidden = false;
  }

  function datos() {
    var clave = form.elements.servicio.value;
    return {
      name: limpio(form.elements.nombre.value, 100, true),
      email: limpio(form.elements.correo.value, 120, true),
      organization: limpio(form.elements.organizacion.value, 120, true),
      topic: Object.prototype.hasOwnProperty.call(TEMAS, clave) ? clave : "otro",
      message: limpio(form.elements.mensaje.value, 2000, false),
      website: form.elements.website ? form.elements.website.value : "",
      elapsed: Date.now() - started,
    };
  }

  // Respaldo: enlace mailto con el mensaje listo, si cabe en el largo que aceptan los programas de correo.
  function enlaceCorreo(d) {
    if (!to) return null;
    var lineas = ["Nombre: " + d.name, "Correo: " + d.email];
    if (d.organization) lineas.push("Organización: " + d.organization);
    lineas.push("Tema: " + TEMAS[d.topic], "", d.message);
    var href = "mailto:" + to + "?subject=" + encodeURIComponent("Contacto desde el sitio: " + TEMAS[d.topic] + " · " + d.name) +
      "&body=" + encodeURIComponent(lineas.join("\r\n"));
    var a = document.createElement("a");
    a.href = href.length <= MAX_HREF ? href : "mailto:" + to;
    a.textContent = "Abrir mi programa de correo";
    return a;
  }

  function falloDeEnvio(d) {
    aviso("No pudimos enviar tu mensaje en este momento." + (to ? " Puedes escribirnos a " + to + "." : ""), true, enlaceCorreo(d));
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      aviso("Revisa los campos marcados: nombre, un correo válido y tu mensaje.", true);
      return;
    }
    var d = datos();
    if (!endpoint) { falloDeEnvio(d); return; }

    button.disabled = true;
    aviso("Enviando…", false);
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
      credentials: "omit",
      referrerPolicy: "strict-origin",
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) { return { status: r.status, body: body }; });
      })
      .then(function (res) {
        if (res.status >= 200 && res.status < 300 && res.body.ok) {
          form.reset();
          started = Date.now();
          aviso("¡Gracias! Recibimos tu mensaje y te responderemos por correo.", false);
        } else if (res.status === 422 || res.status === 429) {
          aviso(typeof res.body.error === "string" ? res.body.error : "Revisa los datos e inténtalo de nuevo.", true);
        } else {
          falloDeEnvio(d);
        }
      })
      .catch(function () { falloDeEnvio(d); })
      .then(function () { button.disabled = false; });
  });
})();
