Vas a ayudarme a crear una extensión personalizada para **ChatGPT Desktop Linux**, una aplicación de escritorio que muestra chatgpt.com en su propia ventana. Respóndeme en español.

## Qué es una extensión

Una extensión personalizada es una extensión web en formato Chrome **Manifest V3** que se ejecuta **solo en la página de ChatGPT** (https://chatgpt.com/). Puede leer y modificar esa página: añadir botones, cambiar el diseño o el estilo, añadir atajos de teclado dentro de la página y guardar sus propios ajustes. No puede acceder a archivos, ejecutar programas ni modificar la propia aplicación.

## Reglas que debe cumplir la extensión

La aplicación rechaza la extensión si incumple alguna de estas reglas.

- `manifest.json` usa `"manifest_version": 3`, un `name` (60 caracteres como máximo) y una `version` como `1.0.0`. Se recomiendan `description` y `author`.
- El código se ejecuta solo mediante `content_scripts`. Cada patrón `matches` empieza por `https://chatgpt.com/` (por ejemplo `https://chatgpt.com/*`).
- El único permiso permitido es `"storage"`. `host_permissions`, si existe, solo contiene patrones `https://chatgpt.com/`.
- No se permite: `background` (sin service worker), `action`/popup, páginas de opciones, `chrome_url_overrides`, `devtools_page`, `externally_connectable`.
- Usa `chrome.storage.local` para guardar datos (`chrome.storage.sync` no está disponible). La mayoría de las demás API `chrome.*` tampoco están disponibles: limítate al DOM de la página y a `chrome.storage.local`.
- Solo JavaScript y CSS simples, sin paso de compilación ni bibliotecas externas cargadas desde internet. Cada archivo citado en `manifest.json` debe formar parte de la extensión.
- La página de ChatGPT no es una API pública y cambia con el tiempo. Prefiere referencias estables (`data-testid`, roles y etiquetas ARIA) a las clases generadas, espera los elementos con un `MutationObserver` en lugar de retrasos fijos y falla en silencio si falta un elemento.
- Nunca envíes el contenido de las conversaciones a ningún sitio y nunca cargues código remoto.

## Ejemplo mínimo

`manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Mi extensión",
  "version": "1.0.0",
  "description": "Lo que hace, en una frase.",
  "author": "Tu nombre",
  "permissions": ["storage"],
  "content_scripts": [
    {
      "matches": ["https://chatgpt.com/*"],
      "js": ["content.js"],
      "css": ["style.css"],
      "run_at": "document_idle"
    }
  ]
}
```

## Lo que espero de ti

1. Hazme preguntas si mi petición no está clara.
2. Escribe cada archivo de la extensión completo, con comentarios breves.
3. Entrégala como un **archivo .zip** con `manifest.json` en la raíz del archivo. Si no puedes crear archivos, dame cada archivo y el comando para crear el archivo, por ejemplo `zip -r mi-extension.zip manifest.json content.js style.css`.
4. Explícame cómo instalarla: en ChatGPT Desktop Linux, **Ajustes → Extensiones → Añadir una extensión (.zip)…** y elige el archivo .zip.

## La extensión que quiero
