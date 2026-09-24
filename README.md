# Sitio web de MetGeo Spa

Sitio estático para GitHub Pages. Reúne los servicios de MetGeo:

| Página | Contenido |
|---|---|
| `index.html` | Portada, servicios y acceso al monitor |
| `monitor.html` | El monitor meteorológico del Gran Concepción: descripción, vista previa y enlace a la app en Streamlit |
| `noticias.html` | Noticias científicas del día por área, con enlace a cada fuente, y el registro al newsletter |

No necesita compilarse ni instalar nada: son archivos HTML, CSS y JavaScript.

## Cómo se actualizan las noticias

`data/noticias.json` lo genera cada madrugada la app del newsletter (`MetGeo-Newsletter`): `prepare_news` elige y resume las noticias de las 13 áreas con Claude, y `export_news` escribe este archivo. Con `SITE_PUSH=1` además hace commit y push, y GitHub Pages publica el cambio en uno o dos minutos. La página lo lee al abrirse, así que no hay que tocar el HTML.

Cada nota aparece una sola vez y enlaza a su fuente original. La página indica que los resúmenes son de MetGeo con apoyo de inteligencia artificial y que el contenido pertenece a cada medio.

El monitor no va incrustado dentro de la página: Streamlit Community Cloud queda en blanco dentro de un marco de otro dominio (se comprobó en Chrome el 24 de septiembre de 2026), así que la página lo enlaza y abre en una pestaña nueva. Si más adelante el monitor se publica en un servidor propio, se puede volver a incrustar.

## Configuración

Todo lo que cambia está en `assets/config.js`:

- `newsletterUrl`: la dirección pública de la app del newsletter. Mientras esté vacía, el botón «Recibir mi newsletter» aparece desactivado con el aviso «El registro abre muy pronto».
- `monitorUrl`: la dirección del monitor en Streamlit.

## Publicar en GitHub Pages

1. En la cuenta **MetGeo** de GitHub, crea un repositorio público llamado **`MetGeo.github.io`**. Con ese nombre exacto, el sitio queda en `https://metgeo.github.io/`. Con otro nombre, por ejemplo `metgeo-web`, queda en `https://metgeo.github.io/metgeo-web/`.
2. Sube el contenido de esta carpeta a la rama `main`.
3. En el repositorio, abre **Settings > Pages** y en **Source** elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
4. Espera uno o dos minutos y abre la dirección.

Para que otra cuenta (por ejemplo `IPartarrieu`) pueda subir cambios, agrégala en **Settings > Collaborators** del repositorio.

### Dominio propio, más adelante

Crea en esta carpeta un archivo `CNAME` con una sola línea, por ejemplo `www.metgeo.cl`, y en tu proveedor de dominio agrega un registro `CNAME` de `www` hacia `metgeo.github.io`. Luego, en **Settings > Pages**, escribe el dominio y activa **Enforce HTTPS**. Los detalles vigentes están en la documentación de GitHub Pages («Managing a custom domain»).

## Publicación automática de noticias desde el servidor del newsletter

En el servidor donde corre el newsletter:

1. Crea una llave de despliegue: `ssh-keygen -t ed25519 -f ~/.ssh/metgeo_site -N ""`.
2. En el repositorio del sitio, **Settings > Deploy keys > Add deploy key**, pega el contenido de `~/.ssh/metgeo_site.pub` y marca **Allow write access**. La llave solo puede escribir en este repositorio.
3. Clona el sitio con esa llave:
   ```bash
   GIT_SSH_COMMAND="ssh -i ~/.ssh/metgeo_site" git clone git@github.com:MetGeo/MetGeo.github.io.git ~/metgeo-web
   cd ~/metgeo-web && git config core.sshCommand "ssh -i ~/.ssh/metgeo_site"
   git config user.name "MetGeo Noticias" && git config user.email "metgeo.spa@gmail.com"
   ```
4. En el `.env` del newsletter agrega `SITE_DIR=/home/<usuario>/metgeo-web` y `SITE_PUSH=1`.

Desde ese momento, la preparación de las 05:30 también publica las noticias del día en el sitio.

## Probar en tu computador

```bash
python3 -m http.server 8000
```

Y abre `http://localhost:8000`. Abrir el HTML con doble clic no carga las noticias, porque el navegador bloquea la lectura de `data/noticias.json` desde un archivo local.
