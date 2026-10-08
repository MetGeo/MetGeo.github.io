// Configuración del sitio. Es lo único que hay que editar al publicar el newsletter o cambiar de dominio.
window.METGEO = {
  // Dirección pública de la app del newsletter (registro con Google). Vacía mientras no esté publicada:
  // el botón «Recibir mi newsletter» se muestra desactivado con un aviso.
  // Ejemplo: "https://newsletter.metgeo.cl" o "https://metgeo-news.duckdns.org"
  newsletterUrl: "https://newsletter.metgeo.cl",
  // Monitores (apps de Streamlit Community Cloud, servidas bajo metgeo.cl por el Worker
  // metgeo-dashboards de Cloudflare). La clave es el valor de data-monitor en los enlaces.
  monitores: {
    concepcion: "https://concepcion.metgeo.cl",
    araucania: "https://araucania.metgeo.cl",
    coronel: "https://coronel.metgeo.cl",
  },
  // Formulario de contacto: lo recibe el Worker del newsletter, que lo guarda hasta que el computador de MetGeo
  // lo reenvía al correo. Si cambia, actualizar también connect-src en la meta de seguridad de contacto.html.
  contactoUrl: "https://newsletter.metgeo.cl/api/contacto",
  // Correo de respaldo: si el Worker no responde, el formulario ofrece abrir el programa de correo con el mensaje.
  contactoEmail: "metgeo.spa@gmail.com",
};
