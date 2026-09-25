# Sitio web de MetGeo Spa (metgeo.github.io)

Sitio estático en GitHub Pages (repositorio `MetGeo/MetGeo.github.io`, rama `main`, publicación automática al hacer push). Sin compilación: HTML, CSS y JavaScript planos. La identidad visual general de MetGeo está en la skill `metgeo-marca`; este archivo fija las reglas propias del sitio.

## Reglas que no se rompen

- **Subir solo lo que cambiaste.** Antes de cada commit, `git status` y `git add <archivo>` uno por uno. Nunca `git add -A` ni `git add .`: en esta carpeta hay archivos privados que no se publican (por ejemplo `metgeo_equipo/`, excluido en `.gitignore`). El repositorio es **público**.
- **No incrustar el monitor.** Streamlit Community Cloud queda en blanco dentro de un `<iframe>` de otro dominio (comprobado en Chrome). `monitor.html` muestra una vista previa (`assets/monitor.png`) y abre el monitor en una pestaña nueva.
- **Sin imágenes de terceros.** Los fondos se dibujan con código en `assets/fondo.js`. No usar fotos de bancos ni imágenes con derechos.
- **Texto siempre como texto.** El contenido de `data/noticias.json` viene de fuentes externas: se inserta con `textContent`, nunca con `innerHTML`, y los enlaces se aceptan solo si empiezan con `http://` o `https://`.
- **Español neutro, forma «tú»,** sin modismos chilenos ni rioplatenses (nada de «podés», «mirá», «bacán», «po»).
- **Una sola configuración:** las direcciones externas (newsletter y monitor) viven en `assets/config.js`. No escribirlas a mano en el HTML.

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | Portada: paisaje de cordilleras, cifras del monitor, tarjetas de servicios y vista previa del monitor |
| `monitor.html` | Descripción del monitor y enlace a la app en Streamlit |
| `noticias.html` | Pestaña «Noticias científicas» y bloque de registro al newsletter (`#newsletter`) |
| `assets/style.css` | Estilos de todo el sitio, con tokens de color y modo oscuro |
| `assets/fondo.js` | Portada (cordilleras con neblina, estilo banner de LinkedIn) y red de puntos del fondo que sigue al cursor |
| `assets/noticias.js` | Lee `data/noticias.json` y dibuja las áreas, filtros, fechas y avisos |
| `assets/site.js` | Activa o desactiva los botones `[data-newsletter]` según `config.js` |
| `assets/config.js` | `newsletterUrl` y `monitorUrl` |
| `data/noticias.json` | Lo genera y sube cada madrugada la app del newsletter. **No se edita a mano.** |

Cada página repite la misma cabecera (placa blanca con logo, menú, franja celeste `.accent`), el `<canvas class="net">` del fondo y el pie azul marino. Una página nueva debe copiar esa estructura y cargar `config.js`, `site.js` y `fondo.js`.

## Diseño

- **Tipografías (Google Fonts):** Montserrat 500/600/700 para títulos, botones y etiquetas; Source Sans 3 400/600/700 para el texto; `Courier New` para etiquetas técnicas (eyebrows, fechas, «kicker»).
- **Colores (tokens en `:root` de `style.css`):** azul marino `#00295B`, azul profundo `#001B3D`, celeste `#4E94C3`, celeste claro `#8FC3E6`, niebla `#E8F1F9`, fondo `#EEF2F6`, texto `#20242A`, gris `#4B586A`, líneas `#D6E2EE`. El modo oscuro redefine los mismos tokens; los componentes usan siempre tokens, nunca colores sueltos.
- **Menú:** «Servicios», «Monitor» y el botón destacado «Noticias científicas» (`.nav-cta`). En teléfono solo queda el botón.
- **Portada (`.hero`):** fondo claro con el paisaje de `fondo.js`, velo claro a la izquierda para leer el texto, título y texto en azul marino. Botones: `.btn-sky` (azul sólido) y `.btn-ghost` (borde azul).
- **Secciones:** `.kicker` en `Courier New` mayúsculas, `h2` en Montserrat, y bajo el título `.rule`: barra de 2 px con degradado azul marino a azul profundo.
- **Tarjetas (`.card`):** fondo blanco, borde `--line`, radio 12 px y sombra suave. La de «Próximamente» usa borde punteado (`.card-empty`).
- **Noticias:** una tarjeta por nota con título, resumen, «Publicada hoy / ayer / el …» (hora de Chile) y «Leer la nota original en <medio> ↗». Cada área muestra sus fuentes. Si un área no trae novedades hoy, conserva las últimas y muestra «Sin novedades hoy · última actualización: …».
- **Accesibilidad:** foco visible, `prefers-reduced-motion` respetado (la red de puntos queda quieta), sin desplazamiento horizontal a 400 px.

## Servicios que muestra

Hoy: el **monitor** (Streamlit, de Bruno Herrera) y las **noticias científicas con el newsletter**. «Próximamente»: consultoría, asesoría y divulgación científica. Al agregar un servicio, sumar una `.card` en `index.html#servicios` y, si tiene página propia, una entrada en el menú de las tres páginas.

## Probar y publicar

```bash
python3 -m http.server 8000     # y abrir http://localhost:8000 (con doble clic no cargan las noticias)
git status                      # revisar qué cambió
git add <archivos> && git commit -m "…" && git push
```

GitHub Pages tarda uno o dos minutos y guarda caché unos diez minutos: recargar con `Ctrl+Shift+R`. Activar Pages o cambiar su configuración solo puede hacerlo la cuenta **MetGeo** (es una cuenta personal: los colaboradores no pueden administrarla).

## Relación con el newsletter

El proyecto `MetGeo/metgeo-newsletter` escribe `data/noticias.json` cada día a las 05:30 (hora de Chile) y lo sube con un commit «Noticias científicas del AAAA-MM-DD». El registro del newsletter está en `https://metgeo-newsletter.metgeo.workers.dev`. Las áreas científicas y su orden se definen allá (`app/news.py`), no aquí.
