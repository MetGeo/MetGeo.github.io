// Configuración del sitio. Es lo único que hay que editar al publicar el newsletter o cambiar de dominio.
window.METGEO = {
  // Dirección pública de la app del newsletter (registro con Google). Vacía mientras no esté publicada:
  // el botón «Recibir mi newsletter» se muestra desactivado con un aviso.
  // Ejemplo: "https://newsletter.metgeo.cl" o "https://metgeo-news.duckdns.org"
  newsletterUrl: "https://metgeo-newsletter.metgeo.workers.dev",
  // Monitor meteorológico (Streamlit Community Cloud).
  monitorUrl: "https://metgeo-concepcion.streamlit.app/",
  // Formulario de contacto: lo recibe el Worker del newsletter, que lo guarda hasta que el computador de MetGeo
  // lo reenvía al correo. Si cambia, actualizar también connect-src en la meta de seguridad de contacto.html.
  contactoUrl: "https://metgeo-newsletter.metgeo.workers.dev/api/contacto",
  // Correo de respaldo: si el Worker no responde, el formulario ofrece abrir el programa de correo con el mensaje.
  contactoEmail: "metgeo.spa@gmail.com",
};
