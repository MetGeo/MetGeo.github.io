# Sitio web de MetGeo Spa (metgeo.github.io)

Sitio estático en GitHub Pages (repositorio `MetGeo/MetGeo.github.io`, rama `main`, publicación automática al hacer push). Sin compilación: HTML, CSS y JavaScript planos. La identidad visual general de MetGeo está en la skill `metgeo-marca`; este archivo fija las reglas propias del sitio. La estructura (portada con bandas, servicios con imagen, nosotros, noticias con imagen y contacto) se inspiró en el sitio de la empresa amiga GFDas (gfdas.com).

## Reglas que no se rompen

- **Subir solo lo que cambiaste.** Antes de cada commit, `git status` y `git add <archivo>` uno por uno. Nunca `git add -A` ni `git add .`: en esta carpeta hay archivos privados que no se publican (`metgeo_equipo/` y `metgeo_servicios/`, excluidos en `.gitignore`). El repositorio es **público**.
- **No incrustar el monitor.** Streamlit Community Cloud queda en blanco dentro de un `<iframe>` de otro dominio (comprobado en Chrome). `monitor.html` muestra una vista previa (`assets/monitor.png`) y abre el monitor en una pestaña nueva.
- **Sin imágenes de terceros.** Los fondos se dibujan con código en `assets/fondo.js`; las ilustraciones de servicios y equipo son SVG propios en `assets/img/`, y las de cada noticia se dibujan en `assets/noticias.js`. No usar fotos de bancos, ni la imagen original de una noticia, ni imágenes con derechos.
- **Texto siempre como texto.** El contenido de `data/noticias.json` viene de fuentes externas: se inserta con `textContent`, nunca con `innerHTML`, y los enlaces se aceptan solo si empiezan con `https://`. `noticias.js` descarta las áreas o notas mal formadas antes de dibujar (los contadores cuentan solo lo que se muestra) y usa `area-<clave>` como id de cada sección, para que una clave nueva no tape otros ids de la página.
- **Sin scripts ni estilos en línea.** Cada página declara una política de seguridad (`<meta http-equiv="Content-Security-Policy">`) que solo permite scripts y estilos de archivos del propio sitio (más Google Fonts). No usar `<script>` con código dentro, `onclick=` ni `style="…"`: no funcionarían. Para un ajuste puntual, crear una clase en `style.css` (por ejemplo `.mt`).
- **Enlaces externos** con `target="_blank" rel="noopener noreferrer"`.
- **Español neutro, forma «tú»,** sin modismos chilenos ni rioplatenses (nada de «podés», «mirá», «bacán», «po»).
- **Una sola configuración:** las direcciones externas (newsletter, monitor y correo del formulario) viven en `assets/config.js`.

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | Portada: título y bajada (con el ejemplo del temporal de julio en Los Ángeles), banda «MetGeo en cifras», «Qué hacemos» (modelación numérica, análisis de datos, asesoría técnica, consultoría), cuatro tarjetas de servicio con imagen, banda «Cómo trabajamos», «Por qué MetGeo» (seis puntos), las tres noticias más recientes (`#ultimas`), vista previa del monitor y banda final de contacto |
| `nosotros.html` | Equipo de geofísicos: especialidades con el diagrama `img/equipo.svg`, banda con el propósito, seis compromisos (`#proposito`) y las tarjetas del equipo (`#equipo`) |
| `servicios.html` | Los cuatro servicios, uno por fila con su imagen (`#eventos`, `#modelacion`, `#capacitaciones`, `#ambiental`), banda de análisis de datos y «De acceso libre» (`#libre`: monitor y noticias) |
| `contacto.html` | Formulario de contacto (`assets/contacto.js`) y tarjetas de correo, LinkedIn, Instagram y ubicación |
| `monitor.html` | Descripción del monitor y enlace a la app en Streamlit |
| `noticias.html` | Pestaña «Noticias científicas» y bloque de registro al newsletter (`#newsletter`) |
| `equipo.html` | Solo redirige a `nosotros.html#equipo`, para no romper enlaces antiguos |
| `assets/style.css` | Estilos de todo el sitio, con tokens de color y modo oscuro |
| `assets/fondo.js` | Cordilleras con neblina de las portadas (`canvas.geo`) y red de puntos del fondo que sigue al cursor |
| `assets/noticias.js` | Lee `data/noticias.json`: en `noticias.html` dibuja áreas, filtros, fechas y avisos; en `index.html` las tres últimas. Cada tarjeta lleva una ilustración dibujada por código: cada área tiene cinco dibujos (`AREAS`) y se elige el que calza con las palabras del título y el resumen (por ejemplo «huracán» → ciclón, «hielo» → témpanos, «galaxia» → espiral), sin repetir dentro del área; con más de cinco notas, se repiten con otra semilla. Los dibujos base están en `D` |
| `assets/site.js` | Se carga en `<head>` en todas las páginas: menú de teléfono, cabecera que se compacta al bajar, botones `[data-newsletter]` y enlaces `[data-monitor]` según `config.js` |
| `assets/contacto.js` | Formulario de contacto: lo envía al Worker del newsletter (ver abajo) |
| `assets/config.js` | `newsletterUrl`, `monitorUrl`, `contactoUrl` (Worker que recibe el formulario) y `contactoEmail` (respaldo) |
| `assets/img/` | Ilustraciones SVG propias: `servicio-eventos.svg` (hietograma con período de retorno), `servicio-modelacion.svg` (bahía con malla, corrientes y pluma), `servicio-capacitacion.svg` (editor con Python y mapa de calor), `servicio-ambiental.svg` (cuenca con curvas de nivel y estaciones), `equipo.svg` (cuatro especialidades: modelación numérica, hidrología, climatología y energías renovables) y `topo.svg` (curvas de nivel de fondo de las bandas). Se generaron con un script de Python de un solo uso; se pueden editar a mano |
| `assets/icono.png` | Ícono de pestaña (símbolo de MetGeo sin texto, 256×256, fondo transparente). Es el mismo `logo_solo.png` que usa el monitor. No usar `logo.png` como ícono: es alargado y se ve aplastado |
| `data/noticias.json` | Lo genera y sube cada madrugada la app del newsletter. **No se edita a mano.** |

Cada página repite la misma cabecera, el mismo `<canvas class="net">` y el mismo pie. **Si cambia el menú o el pie, cambiarlo en las seis páginas.** Una página nueva debe copiar esa estructura (incluida la meta de seguridad), cargar `config.js` y `site.js` en `<head>` y `fondo.js` al final.

- **Cabecera:** placa blanca con el logo (470 px en escritorio, 300 px al bajar por la página, 360 px bajo 1120 px, 270 px bajo 900 px, 220 px bajo 640 px y 175 px bajo 440 px), menú «Nosotros · Servicios · Monitor · Noticias» y el botón destacado «Contacto» (`.nav-cta`), y la franja celeste `.accent`. Bajo 900 px el menú se abre con el botón `.menu-btn`; sin JavaScript queda visible debajo del logo. `logo.png` mide 480×123, así que no conviene mostrarlo a más de 480 px.
- **Pie:** azul profundo, logo sobre placa blanca, mapa del sitio, correo, LinkedIn e Instagram, y una línea legal con las fuentes de datos de la página (monitor o noticias).

## Diseño

- **Tipografías (Google Fonts):** Montserrat 500/600/700 para títulos, botones y etiquetas; Source Sans 3 400/600/700 para el texto; `Courier New` para etiquetas técnicas (eyebrows, fechas, «kicker», números).
- **Colores (tokens en `:root` de `style.css`):** azul marino `#00295B`, azul profundo `#001B3D`, celeste `#4E94C3`, celeste claro `#8FC3E6`, niebla `#E8F1F9`, fondo `#EEF2F6`, texto `#20242A`, gris `#4B586A`, líneas `#D6E2EE`. El modo oscuro redefine los mismos tokens.
- **Portadas (`.hero`, `.hero-sm`):** paisaje de `fondo.js`, velo claro a la izquierda (parejo en teléfono) y texto en azul marino. Botones `.btn-sky` (sólido) y `.btn-ghost` (borde).
- **Bandas (`.band`):** franjas azul marino a todo el ancho con las curvas de nivel de `img/topo.svg`, para hacer contraste entre secciones. Llevan una frase (`.band-statement`, con la parte destacada en `<em>` celeste), cifras (`.figures`) o una llamada a la acción (`.band-cta`, botones `.btn-light` y `.btn-line`).
- **Secciones:** `.kicker` en `Courier New` mayúsculas, `h2` en Montserrat y `.rule` bajo el título. `.sec-head` pone a la derecha un enlace «Ver todos…».
- **Tarjetas:** `.cap` (capacidad con ícono), `.svc-card` (servicio con imagen, enlaza a `servicios.html#…`), `.feature` (punto numerado), `.purpose article` (compromiso), `.member` (persona), `.card` (genérica) y `.item` (noticia con imagen).
- **Íconos:** SVG en línea con `stroke="currentColor"`, dibujados a mano y genéricos (sobre, cuadro con «in», cámara, capas, gráfico, portapapeles, globo de diálogo, ubicación).
- **Noticias:** una tarjeta por nota con ilustración del área, título, resumen, «Publicada hoy / ayer / el …» (hora de Chile) y «Leer la nota original en <medio> ↗». Cada área muestra sus fuentes. Si un área no trae novedades hoy, conserva las últimas y muestra «Sin novedades hoy · última actualización: …». El aviso de créditos aclara que las ilustraciones son de MetGeo y no de la noticia.
- **Accesibilidad:** enlace «Saltar al contenido», foco visible, `prefers-reduced-motion` respetado (la red de puntos queda quieta y no hay transiciones), sin desplazamiento horizontal a 400 px.

## Servicios que muestra

Los mismos cuatro, en este orden, en `index.html#servicios` (tarjetas cortas) y en `servicios.html` (detalle):

1. **Estudios técnicos periciales** (`#eventos`): peritajes y consultoría ante temporales, lluvias, vientos, marejadas, olas de calor y sequías, con un informe técnico pericial para aseguradoras, liquidadores, instituciones y particulares. El ejemplo del temporal de julio en Los Ángeles va solo en la bajada de la portada (sin nombrar a la persona).
2. **Modelación numérica y monitoreo de pronósticos** (`#modelacion`): WRF, CROCO e hidrológicos; fichas 1, 2 y 3 de `metgeo_servicios/`.
3. **Capacitaciones técnicas** (`#capacitaciones`): cursos generales (atmósfera, océano, hidrología, energías renovables), evaluación del error en modelación numérica y análisis estadístico (Python, MATLAB, R, SQL).
4. **Estudios de evaluación ambiental** (`#ambiental`): componentes para una DIA o un EIA en el SEIA; ficha 4.

Cada fila de `servicios.html` lleva imagen, etiqueta, título, un párrafo, tres o cuatro puntos en `.gets` y el botón «Consultar por este servicio», que abre `contacto.html?servicio=<clave>` con el tema ya elegido. Al agregar un servicio: sumar la fila (`.svc`, y `.svc-alt` para alternar el lado de la imagen), la tarjeta de la portada, la opción en el `<select>` de `contacto.html` y la clave en `TEMAS` de `contacto.js`.

## Formulario de contacto

`contacto.js` envía el mensaje (JSON) a `contactoUrl` de `config.js`: el Worker del newsletter (`POST /api/contacto`), que lo guarda en Cloudflare D1 hasta que el computador de MetGeo lo reenvía por Gmail a metgeo.spa@gmail.com cada 15 minutos (detalle y anti-spam en el `CLAUDE.md` del newsletter). La página muestra «¡Gracias! Recibimos tu mensaje…» cuando el Worker responde bien. Si el Worker no responde, ofrece un enlace «Abrir mi programa de correo» con el mensaje listo para `contactoEmail` (respaldo `mailto:`, recortado si supera 1.900 caracteres).

- La meta de seguridad de `contacto.html` permite `connect-src` hacia `https://metgeo-newsletter.metgeo.workers.dev`. Si cambia la dirección del Worker, actualizar ahí y en `config.js`.
- El Worker solo acepta envíos desde `https://metgeo.github.io` (`CONTACT_ORIGINS` en su `wrangler.toml`): si el sitio pasa a un dominio propio, agregarlo allá.
- El campo oculto `website` (`.trap`) es una trampa para bots: no borrarlo ni hacerlo visible.
- Límites: nombre 100, correo y organización 120, mensaje 2.000 caracteres. Los temas (`TEMAS`) deben coincidir con `TOPICS` del Worker.

## Probar y publicar

```bash
python3 -m http.server 8000     # y abrir http://localhost:8000 (con doble clic no cargan las noticias)
git status                      # revisar qué cambió
git add <archivos> && git commit -m "…" && git push
```

Revisar en escritorio y a 400 px de ancho (menú de teléfono, portada legible, sin desplazamiento horizontal). GitHub Pages tarda uno o dos minutos y guarda caché unos diez minutos: recargar con `Ctrl+Shift+R`. Activar Pages o cambiar su configuración solo puede hacerlo la cuenta **MetGeo** (es una cuenta personal: los colaboradores no pueden administrarla).

## Relación con el newsletter

El proyecto `MetGeo/metgeo-newsletter` escribe `data/noticias.json` cada día a las 05:30 (hora de Chile) y lo sube con un commit «Noticias científicas del AAAA-MM-DD». El registro del newsletter está en `https://metgeo-newsletter.metgeo.workers.dev`. Las áreas científicas y su orden se definen allá (`app/news.py`), no aquí. Si se agrega un área, conviene sumar su dibujo en `MOTIVOS` de `assets/noticias.js` (mientras tanto usa la red de puntos).
