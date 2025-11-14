# Debris CIEE — Dashboard

Este proyecto es un dashboard web estático (HTML/JS/CSS) que muestra reentradas de debris sobre un mapa (Leaflet), con modos de Puntos y Calor, filtros, y generación de informe (Chart.js + jsPDF) y vistas adicionales (Trayectoria/Órbita 3D con three.js + satellite.js).

## Características clave

- Mapa Leaflet con dos representaciones: Puntos y Calor (leaflet.heat) con controles de radio/blur/intensidad.
- Búsqueda por NORAD ID (arriba a la derecha) y NORAD ID visible en los popups de objetos.
- Filtros combinables y chips de filtros activos en la barra lateral (los chips solo aparecen cuando hay filtros aplicados).
- Informe con gráficos (Chart.js) y opción de exportar a PDF (jsPDF).
- Vista ilustrativa de Trayectoria y Órbita 3D (three.js + satellite.js) en modales.
- Ayuda en una página aparte (`help.html`) accesible con el ícono “?”; se abre en una nueva pestaña.
- Documentación con tabla de contenido jerárquica y sección dinámica de códigos OWNER de Space‑Track, que lista únicamente los códigos presentes en `data/debris.json`.
- Conmutador de idioma ES/EN con persistencia en `localStorage`.
- Capa base única: IGN Argentina (TMS), con atribución correspondiente.

## Requisitos para que funcione en web (incluye GitHub Pages)

- Debe servirse por HTTP/HTTPS (no abrir `index.html` con `file://`).
- Mantener la estructura de carpetas (especialmente `data/debris.json` e `img/`).
- El navegador debe poder cargar recursos CDN externos (Leaflet, leaflet.heat, Bootstrap, Chart.js, satellite.js). Todos se cargan por `https`.
- `main.js` usa módulos ES y un `importmap` para three.js (compatible con navegadores modernos).

## Ejecutar localmente

En Windows PowerShell, ubícate en la carpeta del proyecto (donde está `index.html`) y ejecuta uno de estos servidores sencillos:

```powershell
# Opción 1: con Python
python -m http.server 8000

# Opción 2: con Node.js (si tienes Node)
npx http-server -p 8000
```

Luego abre: http://localhost:8000

## Datos: formato esperado (`data/debris.json`)

Archivo JSON con una lista de objetos. Campos comunes del dataset actual:

```json
{
  "norad_id": 3145,
  "nombre": "ATLAS AGENA D R/B",
  "constelacion": "NoConstelacion",
  "pais": "US",
  "pais_caida": "United States of America",
  "lanzamiento": "1968-03-04",
  "fecha": "2011-01-18",
  "decay_reportado": "2011-01-18",
  "inclinacion_orbita": 47.5,
  "a": 79325.511,
  "apogeo": 145722.138,
  "perigeo": 172.613,
  "periodo_tle": 3705.771,
  "excentricidad_tle": 0.9174194,
  "tle1": "…",
  "tle2": "…",
  "lugar_caida": { "lat": 45.0, "lon": -87.0 },
  "dias_en_orbita": 15660.0,
  "masa_en_orbita": 600.0,
  "clase_objeto": "Rocket Body",
  "tamano_caida_kg": null,
  "material_principal": null,
  "imagen": null
}
```

Notas:
- `pais` utiliza códigos OWNER de Space‑Track (por ejemplo: `US`, `CIS`, `ARGN`, `ESA`, etc.). La ayuda (`help.html`) muestra dinámicamente su referencia, solo para los códigos presentes en el dataset cargado.
- Algunos campos pueden ser `null` o faltar; el mapa y los filtros toleran vacíos en la mayoría de los casos.

## Despliegue en GitHub Pages

1. Crea un repositorio y sube todo el contenido de la carpeta del proyecto (mantén `index.html` en la raíz).
2. En el repo, ve a Settings → Pages → Source: selecciona `Deploy from a branch` y elige la rama (p. ej. `main`) y la carpeta `/`.
3. Guarda. GitHub creará tu sitio en `https://<usuario>.github.io/<repo>/`.

Nota: Si cambias rutas o carpetas, actualiza las referencias relativas en `index.html` y en los `fetch()` de `main.js`.

## Depuración del modo Calor (Heatmap)

- Si no ves el calor, revisa la Consola del navegador. Este proyecto registra mensajes útiles:
  - `heatData length:` y `heatData preview:` (cantidad de puntos e intensidades)
  - Errores tipo `leaflet.heat no está disponible` si el plugin no cargó aún
  - `No se pudo cargar data/debris.json` si falló el `fetch`
- Si abriste con `file://`, el `fetch` de JSON fallará: sirve por HTTP como se indica arriba.

## Estructura

- `index.html`: Layout, carga de librerías y script principal.
- `main.js`: Lógica de filtros, mapa, puntos/calor, informe y modales (trayectoria/3D).
- `style.css`: Estilos de la app.
- `data/debris.json`: Dataset de reentradas.
- `img/`: Recursos gráficos (logo, texturas de la Tierra, etc.).
- `help.html`: Documentación para usuarios (se abre en nueva pestaña desde el ícono “?”). Incluye ToC jerárquica y referencia dinámica de códigos OWNER.

## Licencias de librerías

- Leaflet y leaflet.heat, Bootstrap, Chart.js, jsPDF, satellite.js y three.js se cargan desde CDNs y conservan sus respectivas licencias.

## Atribución de mapas

- Capa base: Instituto Geográfico Nacional (IGN) — Argentina (TMS). Incluye la atribución correspondiente en la interfaz.

## Problemas comunes

- JSON no carga al abrir con doble clic: usa un server local.
- Plugin de heatmap no disponible: revisa la pestaña Network (CDN bloqueado/extensión) y la consola. El código reintenta unos milisegundos si el plugin todavía no está cargado.
- Contenido mixto (HTTP vs HTTPS): todas las URLs usan `https`. Mantén así para evitar bloqueos en navegadores.

## Créditos y fuentes de datos

- Datos principales: Space‑Track.org y ESA DISCOS, además de fuentes públicas complementarias. La selección es curada y no exhaustiva.
- Proyecto del CIEE (UNLP). Uso educativo y exploratorio; no utilizar para navegación ni decisiones críticas.
