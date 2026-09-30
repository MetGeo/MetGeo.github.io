// Formulario de contacto. El sitio es estático: no envía ni guarda datos. Arma un correo con lo que
// escribió la persona y abre su programa de correo, dirigido a la dirección de config.js.
(function () {
  var form = document.getElementById("form-contacto");
  if (!form) return;
  var status = document.getElementById("form-status");
  var to = (window.METGEO && window.METGEO.contactoEmail) || "";
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

  // Quita caracteres de control y recorta al largo máximo. En el asunto, además, sin saltos de línea.
  function limpio(value, max, unaLinea) {
    var s = String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    if (unaLinea) s = s.replace(/[\r\n]+/g, " ");
    return s.trim().slice(0, max);
  }

  function aviso(texto, error) {
    status.textContent = texto;
    status.classList.toggle("is-error", Boolean(error));
    status.hidden = false;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!/^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/.test(to)) {
      aviso("El formulario no está disponible. Escríbenos por LinkedIn o Instagram.", true);
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      aviso("Revisa los campos marcados: nombre, un correo válido y tu mensaje.", true);
      return;
    }
    var nombre = limpio(form.elements.nombre.value, 100, true);
    var correo = limpio(form.elements.correo.value, 120, true);
    var org = limpio(form.elements.organizacion.value, 120, true);
    var clave = form.elements.servicio.value;
    var tema = Object.prototype.hasOwnProperty.call(TEMAS, clave) ? TEMAS[clave] : TEMAS.otro;
    var mensaje = limpio(form.elements.mensaje.value, 1000, false);

    var lineas = ["Nombre: " + nombre, "Correo: " + correo];
    if (org) lineas.push("Organización: " + org);
    lineas.push("Tema: " + tema, "", mensaje);
    var asunto = "Contacto desde el sitio: " + tema + " · " + nombre;

    var href = "mailto:" + to + "?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(lineas.join("\r\n"));
    // Varios programas de correo cortan o ignoran enlaces mailto muy largos (las tildes ocupan 6 caracteres codificadas).
    if (href.length > MAX_HREF) {
      aviso("Tu mensaje es muy largo para abrirlo en tu programa de correo. Acórtalo o escríbenos directamente a " + to + ".", true);
      return;
    }
    window.location.href = href;
    aviso("Si se abrió tu programa de correo, revisa el mensaje y envíalo desde ahí. Si no se abrió, escríbenos directamente a " + to + ".", false);
  });
})();
