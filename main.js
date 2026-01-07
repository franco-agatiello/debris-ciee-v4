
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ================== Config ==================
const LOGO_SRC = "img/Captura de pantalla 2025-06-06 211123.png";
const EARTH_IMG_SRC = "img/earthmap1k.jpg";
const radioTierra = 6371; // km

// Icons
const iconoAzul = L.icon({iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',iconSize:[18,29],iconAnchor:[9,29],popupAnchor:[1,-30]});
const iconoVerde = L.icon({iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',iconSize:[18,29],iconAnchor:[9,29],popupAnchor:[1,-30]});
const iconoRojo = L.icon({iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',iconSize:[18,29],iconAnchor:[9,29],popupAnchor:[1,-30]});
const iconoAmarillo = L.icon({iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',iconSize:[18,29],iconAnchor:[9,29],popupAnchor:[1,-30]});

let debris = [];
let mapa, capaPuntos, capaCalor, modo = "puntos";
let leyendaPuntos, leyendaCalor;
let mapaTrayectoria = null;
let _heatRetryCount = 0;
let _leafletHeatLoadPromise = null;
let _listenersInitialized = false;
const disabledFilters = new Set(); // guarda keys de filtros desactivados via chips
let markersByNorad = {}; // índice norad -> marker
let noradIndex = []; // índice rápido para autocompletar NORAD

// --- Utilidades UI: alertas simples en el sidebar ---
function showAlert(message, type = 'warning', timeoutMs = 6000) {
  try {
    const sidebar = document.getElementById('sidebar') || document.body;
    const wrapper = document.createElement('div');
    wrapper.className = `alert alert-${type}`;
    wrapper.role = 'alert';
    wrapper.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>${message}`;
    // Insertar debajo del logo si existe
    const logo = sidebar.querySelector('.sidebar-logo');
    if (logo) {
      // colocar después del logo (logo.parentNode es el <a>)
      const anchor = logo.parentNode; // <a> contenedor
      if (anchor.nextSibling) {
        sidebar.insertBefore(wrapper, anchor.nextSibling);
      } else {
        sidebar.appendChild(wrapper);
      }
    } else {
      sidebar.insertBefore(wrapper, sidebar.firstChild);
    }
    if (timeoutMs) setTimeout(()=>{ wrapper.remove(); }, timeoutMs);
  } catch (e) { console.warn('No se pudo mostrar alerta UI:', e); }
}

// ------------------ HEAT LAYER MONKEY-PATCH ------------------
// Ejecutar lo antes posible en main.js para interceptar onAdd de L.HeatLayer
(function ensureHeatLayerWillReadFrequently() {
  try {
    if (!window.L || !L.HeatLayer || !L.HeatLayer.prototype) {
      // si la libreria aún no está cargada, reintentar después (corto)
      setTimeout(ensureHeatLayerWillReadFrequently, 50);
      return;
    }
    const proto = L.HeatLayer.prototype;
    if (!proto.__willReadFreqPatched) {
      const origOnAdd = proto.onAdd;
      proto.onAdd = function(map) {
        // Lógica original (crea canvas internamente)
        origOnAdd.call(this, map);
        try {
          if (this._canvas && this._canvas.getContext) {
            // Intentamos obtener contexto con willReadFrequently: true
            try {
              const ctx = this._canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                this._ctx = ctx;
                console.debug("heat: contexto reasignado con willReadFrequently (onAdd)");
              } else {
                // fallback al contexto sin opciones (ya existente)
                this._ctx = this._canvas.getContext('2d') || this._ctx;
              }
            } catch (e) {
              // navegador no soporta la opción, usamos contexto por defecto
              this._ctx = this._canvas.getContext('2d') || this._ctx;
            }
          }
        } catch (err) {
          // silencioso: no queremos romper la inicialización
          console.debug("heat: error al reasignar contexto onAdd", err);
        }
      };
      proto.__willReadFreqPatched = true;
    }
  } catch (err) {
    // si ocurre algo raro, no bloquear la app
    console.debug("heat: no se pudo aplicar monkey-patch inmediato", err);
  }
})();
// -------------------------------------------------------------

// Cargador robusto del plugin leaflet.heat desde múltiples CDNs
function loadScriptOnce(url) {
  return new Promise((resolve, reject) => {
    try {
      const existing = Array.from(document.getElementsByTagName('script'))
        .some(s => s.src && s.src.includes('leaflet-heat'));
      if (existing && typeof L !== 'undefined' && typeof L.heatLayer === 'function') {
        return resolve();
      }
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    } catch (e) { reject(e); }
  });
}

function loadLeafletHeat() {
  if (typeof L !== 'undefined' && typeof L.heatLayer === 'function') {
    return Promise.resolve();
  }
  if (_leafletHeatLoadPromise) return _leafletHeatLoadPromise;
  const cdns = [
    'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js',
    'https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js'
  ];
  _leafletHeatLoadPromise = (async () => {
    let lastErr = null;
    for (const url of cdns) {
      try {
        console.warn('Intentando cargar leaflet.heat desde:', url);
        await loadScriptOnce(url);
        if (typeof L !== 'undefined' && typeof L.heatLayer === 'function') {
          console.info('leaflet.heat cargado correctamente');
          return;
        }
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('No se pudo cargar leaflet.heat desde los CDNs configurados');
  })();
  return _leafletHeatLoadPromise.catch(err => {
    // reset para permitir reintentos futuros si el usuario acciona de nuevo
    _leafletHeatLoadPromise = null;
    throw err;
  });
}

// Polyfill/fallback sencillo de heatmap si el plugin real no está disponible
function ensureHeatFallbackPolyfill() {
  try {
    if (typeof L === 'undefined') return;
    if (typeof L.heatLayer === 'function') return; // ya existe el plugin real

    const SimpleHeatLayer = L.Layer.extend({
      initialize: function(latlngs, options) {
        L.setOptions(this, options || {});
        this._latlngs = latlngs || [];
      },
      onAdd: function(map) {
        this._map = map;
        const panes = map.getPanes();
        this._canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer');
        this._canvas.style.pointerEvents = 'none';
        this._ctx = this._canvas.getContext('2d', { willReadFrequently: true }) || this._canvas.getContext('2d');
        panes.overlayPane.appendChild(this._canvas);
        this._reset();
        map.on('moveend zoomend resize', this._reset, this);
        this._draw();
      },
      onRemove: function(map) {
        if (this._canvas && this._canvas.parentNode) {
          this._canvas.parentNode.removeChild(this._canvas);
        }
        map.off('moveend zoomend resize', this._reset, this);
      },
      setLatLngs: function(latlngs) {
        this._latlngs = latlngs || [];
        this._draw();
        return this;
      },
      setOptions: function(options) {
        L.setOptions(this, options);
        this._draw();
        return this;
      },
      _reset: function() {
        if (!this._map || !this._canvas) return;
        const size = this._map.getSize();
        this._canvas.width = size.x;
        this._canvas.height = size.y;
        const topLeft = this._map.containerPointToLayerPoint([0,0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
        this._draw();
      },
      _draw: function() {
        if (!this._map || !this._ctx) return;
        const ctx = this._ctx;
        const canvas = this._canvas;
        ctx.clearRect(0,0,canvas.width, canvas.height);
        const r = this.options.radius || 25;
        const blur = this.options.blur || 15;
        const minOpacity = this.options.minOpacity || 0.35;
        const max = this.options.max || 1;
        const gradient = this.options.gradient || { 0.1: 'blue', 0.4: 'lime', 0.7: 'yellow', 1.0: 'red' };

        // kernel (radial) cache
        const size = (r + blur) * 2;
        const stamp = document.createElement('canvas');
        stamp.width = stamp.height = size;
        const gctx = stamp.getContext('2d');
        const grd = gctx.createRadialGradient(size/2, size/2, r*0.2, size/2, size/2, r+blur);
        grd.addColorStop(0, 'rgba(0,0,0,1)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        gctx.fillStyle = grd;
        gctx.fillRect(0,0,size,size);

        // paso 1: máscara en alpha
        const points = this._latlngs || [];
        points.forEach(p => {
          const lat = p[0], lon = p[1], v = Math.max(0, Math.min(1, (p[2] || 0) / max));
          const pos = this._map.latLngToContainerPoint([lat, lon]);
          ctx.globalAlpha = v;
          ctx.drawImage(stamp, pos.x - (r+blur), pos.y - (r+blur));
        });

        // paso 2: colorizar según alpha usando LUT del gradiente
        const img = ctx.getImageData(0,0,canvas.width, canvas.height);
        const pix = img.data;
        const lutCanvas = document.createElement('canvas');
        lutCanvas.width = 256; lutCanvas.height = 1;
        const lutCtx = lutCanvas.getContext('2d');
        const lutGrad = lutCtx.createLinearGradient(0,0,256,0);
        Object.keys(gradient).sort((a,b)=>parseFloat(a)-parseFloat(b)).forEach(stop => {
          lutGrad.addColorStop(parseFloat(stop), gradient[stop]);
        });
        lutCtx.fillStyle = lutGrad;
        lutCtx.fillRect(0,0,256,1);
        const lut = lutCtx.getImageData(0,0,256,1).data;
        for (let i=0; i<pix.length; i+=4) {
          const alpha = pix[i+3];
          if (!alpha) continue;
          const idx = (alpha << 2); // *4
          pix[i]   = lut[idx];     // R
          pix[i+1] = lut[idx+1];   // G
          pix[i+2] = lut[idx+2];   // B
          pix[i+3] = Math.max(alpha, minOpacity*255);
        }
        ctx.putImageData(img, 0, 0);
        ctx.globalAlpha = 1;
      }
    });

    L.heatLayer = function(latlngs, options) {
      return new SimpleHeatLayer(latlngs, options);
    };
    console.info('leaflet.heat no disponible; usando fallback de heatmap integrado.');
  } catch (e) {
    console.warn('No se pudo instalar el fallback de heatmap:', e);
  }
}

function initMapa(){
  mapa = L.map('map', { worldCopyJump: true }).setView([0,0], 2);
  L.tileLayer('https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG%3A3857@png/{z}/{x}/{-y}.png', {
    minZoom: 1,
    maxZoom: 20,
    attribution: '© IGN Argentina'
  }).addTo(mapa);
}
initMapa();
// Pane dedicado al heatmap para asegurar que quede por encima de tiles y capas vectoriales ligeras
const heatPane = mapa.createPane('heatPane');
heatPane.style.zIndex = '450';
heatPane.style.pointerEvents = 'none';

capaPuntos = L.layerGroup().addTo(mapa);

// datos iniciales: cargar JSON
(async function cargarDatos() {
  try {
    const r = await fetch("data/debris.json");
    debris = await r.json();
  } catch(e) {
    debris = [];
    console.warn("No se pudo cargar data/debris.json:", e);
    showAlert('No se pudieron cargar los datos (data/debris.json). Si abriste el archivo con doble clic, usa un servidor local o sube a GitHub Pages.', 'danger', 10000);
  }
  // construir índice de búsqueda NORAD
  noradIndex = debris
    .filter(d => d.norad_id || d.NORAD || d.norad || d.id_norad)
    .map(d => ({
      norad: String(d.norad_id || d.NORAD || d.norad || d.id_norad).trim(),
      pais: d.pais || d.country || "",
      clase: d.clase_objeto || d.tipo || "",
      nombre: d.nombre || d.name || ""
    }));
  poblarDropdown("dropdownPaisMenu", "dropdownPaisBtn", valoresUnicos(debris.map(d=>d.pais)), "Todos");
  poblarDropdown("dropdownClaseMenu", "dropdownClaseBtn", valoresUnicos(debris.map(d=>d.clase_objeto)), "Todas");
  listeners();
  actualizarMapa();
})();

function valoresUnicos(arr){ return Array.from(new Set(arr.filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b),'es')); }
function anio(str){ if(!str) return null; const y = parseInt(String(str).slice(0,4),10); return Number.isFinite(y)?y:null; }
function numOrNull(v){ if(v===""||v==null) return null; const n=Number(v); return Number.isFinite(n)?n:null; }
function getLat(d){ return numOrNull(d?.lugar_caida?.lat ?? d?.lat ?? d?.latitude ?? d?.latitud ?? d?.Lat); }
function getLon(d){ return numOrNull(d?.lugar_caida?.lon ?? d?.lon ?? d?.longitude ?? d?.longitud ?? d?.Lon); }

function getMasaReingresadaKg(d) {
  return Number(d.masa_en_orbita) || 0;
}
function getDiasEnOrbita(d){
  return Number(d.dias_en_orbita) || 0;
}

function poblarDropdown(menuId, btnId, items, etiquetaTodos="Todos"){
  const menu = document.getElementById(menuId);
  const btn  = document.getElementById(btnId);
  menu.innerHTML = `<li><a class="dropdown-item" href="#" data-value="">${etiquetaTodos}</a></li>` +
    items.map(v=>`<li><a class="dropdown-item" href="#" data-value="${v}">${v}</a></li>`).join("");
  btn.textContent = etiquetaTodos;
  btn.dataset.value = "";
  menu.querySelectorAll(".dropdown-item").forEach(a=>{
    a.addEventListener("click",(e)=>{
      e.preventDefault();
      btn.dataset.value = a.dataset.value || "";
      btn.textContent = a.textContent.trim();
      if (window.bootstrap && bootstrap.Dropdown) {
        bootstrap.Dropdown.getOrCreateInstance(btn).hide();
      }
      actualizarMapa();
    });
  });
}

function obtenerFiltros(){
  const constAll = document.getElementById('const-all') ? document.getElementById('const-all').checked : true;
  const constYes = document.getElementById('const-yes') ? document.getElementById('const-yes').checked : false;
  const constNo  = document.getElementById('const-no') ? document.getElementById('const-no').checked : false;

  return {
    pais: document.getElementById("dropdownPaisBtn") ? document.getElementById("dropdownPaisBtn").dataset.value ?? "" : "",
    fechaDesde: document.getElementById("fecha-desde") ? document.getElementById("fecha-desde").value : "",
    fechaHasta: document.getElementById("fecha-hasta") ? document.getElementById("fecha-hasta").value : "",
    inclinacionMin: document.getElementById("inclinacion-min") ? document.getElementById("inclinacion-min").value : "",
    inclinacionMax: document.getElementById("inclinacion-max") ? document.getElementById("inclinacion-max").value : "",
    masaOrbitaMin: document.getElementById("masa-orbita-min") ? document.getElementById("masa-orbita-min").value : "",
    masaOrbitaMax: document.getElementById("masa-orbita-max") ? document.getElementById("masa-orbita-max").value : "",
    clase_objeto: document.getElementById("dropdownClaseBtn") ? document.getElementById("dropdownClaseBtn").dataset.value ?? "" : "",
    constelacion: constAll ? "todas" : (constYes ? "si" : "no"),
    latMin: document.getElementById("lat-min") ? document.getElementById("lat-min").value : "",
    latMax: document.getElementById("lat-max") ? document.getElementById("lat-max").value : "",
    lonMin: document.getElementById("lon-min") ? document.getElementById("lon-min").value : "",
    lonMax: document.getElementById("lon-max") ? document.getElementById("lon-max").value : "",
  };
}

function pointInBBox(lat, lon, latMin, latMax, lonMin, lonMax){
  if (latMin===null && latMax===null && lonMin===null && lonMax===null) return true;
  if (lat===null || lon===null) return false;
  if (latMin!==null && lat<latMin) return false;
  if (latMax!==null && lat>latMax) return false;
  if (lonMin!==null && lonMax!==null){
    if (lonMin<=lonMax) { if (lon<lonMin || lon>lonMax) return false; }
    else { if (!(lon>=lonMin || lon<=lonMax)) return false; }
  } else {
    if (lonMin!==null && lon<lonMin) return false;
    if (lonMax!==null && lon>lonMax) return false;
  }
  return true;
}

function filtrarDatos(){
  const f = obtenerFiltros();
  const latMin = f.latMin!=="" ? Number(f.latMin) : null;
  const latMax = f.latMax!=="" ? Number(f.latMax) : null;
  const lonMin = f.lonMin!=="" ? Number(f.lonMin) : null;
  const lonMax = f.lonMax!=="" ? Number(f.lonMax) : null;

  return debris.filter(d=>{
    if (!disabledFilters.has('pais') && f.pais && d.pais!==f.pais) return false;
    if (!disabledFilters.has('fecha') && f.fechaDesde && d.fecha < f.fechaDesde) return false;
    if (!disabledFilters.has('fecha') && f.fechaHasta && d.fecha > f.fechaHasta) return false;
    if (!disabledFilters.has('inclinacion') && f.inclinacionMin && Number(d.inclinacion_orbita) < Number(f.inclinacionMin)) return false;
    if (!disabledFilters.has('inclinacion') && f.inclinacionMax && Number(d.inclinacion_orbita) > Number(f.inclinacionMax)) return false;
    if (!disabledFilters.has('masa') && f.masaOrbitaMin && (!d.masa_en_orbita || Number(d.masa_en_orbita) < Number(f.masaOrbitaMin))) return false;
    if (!disabledFilters.has('masa') && f.masaOrbitaMax && (!d.masa_en_orbita || Number(d.masa_en_orbita) > Number(f.masaOrbitaMax))) return false;
    if (!disabledFilters.has('clase_objeto') && f.clase_objeto && d.clase_objeto !== f.clase_objeto) return false;
    if (!disabledFilters.has('constelacion') && f.constelacion !== "todas"){
      const v = String(d.constelacion||"").toLowerCase();
      const enConst = v && v!=="noconstelacion" && v!=="no" ? true : false;
      if (f.constelacion==="si" && !enConst) return false;
      if (f.constelacion==="no" &&  enConst) return false;
    }
    const lat = getLat(d), lon = getLon(d);
    if (!disabledFilters.has('region') && !pointInBBox(lat, lon, latMin, latMax, lonMin, lonMax)) return false;
    return true;
  });
}

function marcadorPorFecha(fecha) {
  const year = parseInt(String(fecha ?? "").slice(0,4),10);
  if (year >= 2004 && year <= 2010) return iconoAzul;
  if (year >= 2011 && year <= 2017) return iconoVerde;
  if (year >= 2018 && year <= 2026) return iconoRojo;
  return iconoAmarillo;
}

function getNoradId(d){
  return d?.norad_id || d?.NORAD_ID || d?.norad || d?.noradId || d?.id_norad || null;
}
function popupContenidoDebris(d,index){
  const norad = getNoradId(d);
  let nombre = d.nombre ?? '';
  if (norad) nombre += ` (${norad})`;
  let contenido = `<strong>${nombre}</strong><br>`;
  if(d.pais) contenido += `País: ${d.pais}<br>`;
  if(d.clase_objeto) contenido += `Clase: ${d.clase_objeto}<br>`;
  if(d.masa_en_orbita !== null && d.masa_en_orbita !== undefined) contenido += `Masa en órbita: ${d.masa_en_orbita} kg<br>`;
  if(d.tamano_caida_kg !== null && d.tamano_caida_kg !== undefined) contenido += `Masa caída: ${d.tamano_caida_kg} kg<br>`;
  if(d.material_principal) contenido += `Material: ${d.material_principal}<br>`;
  if(d.inclinacion_orbita !== null && d.inclinacion_orbita !== undefined) contenido += `Inclinación órbita: ${d.inclinacion_orbita}°<br>`;
  if(d.fecha) contenido += `Fecha: ${d.fecha}<br>`;
  if(d.imagen) contenido += `<img src="${d.imagen}" alt="${d.nombre}"><br>`;
  if(d.tle1 && d.tle2) {
    contenido += `<button class="btn btn-sm btn-info mt-2" onclick="mostrarTrayectoria(${index})">Ver trayectoria</button>`;
    contenido += `<button class="btn btn-sm btn-warning mt-2 ms-1" onclick="mostrarOrbita3D(${index})">Órbita 3D</button>`;
  }
  return contenido;
}

function actualizarMapa(){
  const datosFiltrados = filtrarDatos();
  document.getElementById("countSpan") && (document.getElementById("countSpan").textContent = String(datosFiltrados.length));

  if(capaPuntos){ try{ capaPuntos.clearLayers(); mapa.removeLayer(capaPuntos); }catch(e){} capaPuntos=null; }
  if(capaCalor && mapa.hasLayer(capaCalor)){ mapa.removeLayer(capaCalor); capaCalor=null; }
  if(leyendaPuntos) { try{ leyendaPuntos.remove(); }catch(e){} leyendaPuntos=null; }
  if(leyendaCalor)  { try{ leyendaCalor.remove(); }catch(e){}  leyendaCalor=null; }

  if(modo==="puntos"){
    capaPuntos=L.layerGroup();
    markersByNorad = {};
    datosFiltrados.forEach((d,i)=>{
      const lat = getLat(d), lon = getLon(d);
      if (lat===null || lon===null) return;
      const marker=L.marker([lat,lon],{icon:marcadorPorFecha(d.fecha)})
        .bindPopup(popupContenidoDebris(d,i),{autoPan:true});
      marker.on('popupopen',function(e){
        const imgs=e.popup._contentNode.querySelectorAll('img');
        imgs.forEach(img=>img.addEventListener('load',()=>{e.popup.update();}));
      });
      const nid = getNoradId(d);
      if (nid) markersByNorad[String(nid).trim()] = marker;
      capaPuntos.addLayer(marker);
    });
    capaPuntos.addTo(mapa);
    mostrarLeyendaPuntos();
  } else {
    // Construcción del heatData con intensidad y umbral mínimo
    const bucket = {};
    datosFiltrados.forEach(d => {
      const lat = getLat(d), lon = getLon(d);
      if (lat === null || lon === null) return;
      // Agrupar a 0.1° (~11 km) para lograr clusters más visibles en calor
      const key = lat.toFixed(1) + '|' + lon.toFixed(1);
      bucket[key] = (bucket[key] || 0) + 1;
    });
    const counts = Object.values(bucket);
    const maxCount = counts.length ? Math.max(...counts) : 1;
    const minIntensity = 0.03; // umbral mínimo (más bajo para menor intensidad general)
    const heatData = Object.keys(bucket).map(k => {
      const [latS, lonS] = k.split('|');
      const lat = Number(latS), lon = Number(lonS);
      // intensidad normalizada (0..1) con umbral y curva gamma (>1 para atenuar) + escala global
      const raw = bucket[k] / Math.max(1, maxCount);
      const gamma = 1.25;   // >1 atenúa las zonas brillantes
      const scale = 0.7;    // factor global para reducir intensidad
      const intensity = Math.min(1, Math.max(minIntensity, Math.pow(raw, gamma) * scale));
      return [lat, lon, intensity];
    });

    console.debug("heatData length:", heatData.length, "maxCount:", maxCount);
    // Depuración: mostrar parte de los datos y comprobar disponibilidad del plugin
    console.debug("heatData preview:", heatData.slice(0,5));
    if (typeof L === 'undefined' || typeof L.heatLayer !== 'function') {
      console.error('leaflet.heat no está disponible: L.heatLayer no definida. Asegúrate de haber cargado leaflet.heat.js antes de main.js');
    }

    // Si el plugin leaflet.heat no está listo, intentar cargarlo dinámicamente desde CDN
    if (typeof L === 'undefined' || typeof L.heatLayer !== 'function') {
      loadLeafletHeat()
        .then(() => {
          // Reintentar pintar el mapa una vez cargado
          _heatRetryCount = 0;
          actualizarMapa();
        })
        .catch((err) => {
          console.error('No se pudo cargar leaflet.heat:', err);
          showAlert('No se pudo cargar la capa de calor (leaflet.heat). Revisa tu conexión o bloqueadores de contenido.', 'danger', 9000);
        });
      return; // detener flujo actual
    }

    if (!heatData.length) {
      showAlert('No hay puntos para el modo calor con los filtros actuales.', 'warning', 4000);
      mostrarLeyendaCalor();
      return;
    }

    // asegurar que existe alguna implementación de heatLayer
    ensureHeatFallbackPolyfill();
    if (heatData.length) {
      _heatRetryCount = 0; // resetear contador si todo OK
      // Leer controles usuario (con fallback)
      const radius = Number(document.getElementById('heat-radius')?.value || 36);
      const blur   = Number(document.getElementById('heat-blur')?.value || 26);
      const scaleControl = Number(document.getElementById('heat-scale')?.value || 0.7);
      // Guardar preferencias
      try { localStorage.setItem('ui.heat.radius', radius); localStorage.setItem('ui.heat.blur', blur); localStorage.setItem('ui.heat.scale', scaleControl); } catch(e){}
      // Opciones heat
      const heatOptions = {
        pane: 'heatPane',
        radius: radius,
        blur: blur,
        minOpacity: 0.35,
        max: 1,
        maxZoom: 8,
        gradient: { 0.1: 'blue', 0.4: 'lime', 0.7: 'yellow', 1.0: 'red' }
      };

  // Ajustar intensidades según escala usuario
  const scaledData = heatData.map(p => [p[0], p[1], Math.min(1, p[2] * scaleControl)]);
  capaCalor = L.heatLayer(scaledData, heatOptions).addTo(mapa);
      try { if (capaCalor && capaCalor.bringToFront) capaCalor.bringToFront(); } catch(e){}

      // Depuración rápida: informar si el canvas se creó
      try {
        console.debug('capaCalor canvas:', !!(capaCalor && capaCalor._canvas));
      } catch (e) { console.debug('error comprobando canvas de heat layer', e); }

      // Asegurar que el canvas use willReadFrequently si es posible (fallback corto)
      (function trySetWillReadFrequently(retry){
        try {
          if (capaCalor && capaCalor._canvas && capaCalor._canvas.getContext) {
            try {
              capaCalor._ctx = capaCalor._canvas.getContext('2d', { willReadFrequently: true }) || capaCalor._ctx;
              console.debug("heat: contexto reasignado con willReadFrequently (post-add)");
            } catch (e) {
              // no soportado
            }
            // asegurar z-index si está oculto
            try {
              capaCalor._canvas.style.zIndex = capaCalor._canvas.style.zIndex || 650;
              capaCalor._canvas.style.pointerEvents = 'none';
            } catch(e){}
            return;
          }
        } catch (e) {
          // ignore
        }
        if (!retry) setTimeout(()=>trySetWillReadFrequently(true), 50);
      })(false);
    }

    mostrarLeyendaCalor();
  }
  construirChipsFiltros();
}

function mostrarLeyendaPuntos(){
  leyendaPuntos=L.control({position:'bottomright'});
  leyendaPuntos.onAdd=function(map){
    const div=L.DomUtil.create('div','info legend');
    div.innerHTML+=`<strong>Color del marcador según año de caída</strong><br>`;
    div.innerHTML+=`<img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png" style="width:13px;vertical-align:middle;"> <span style="color:#999">2004 a 2010</span><br>`;
    div.innerHTML+=`<img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png" style="width:13px;vertical-align:middle;"> <span style="color:#999">2011 a 2017</span><br>`;
    div.innerHTML+=`<img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" style="width:13px;vertical-align:middle;"> <span style="color:#999">2018 a 2025</span><br>`;
    div.innerHTML+=`<img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png" style="width:13px;vertical-align:middle;"> <span style="color:#999">Antes de 2004</span><br>`;
    return div;
  };
  leyendaPuntos.addTo(mapa);
}
function mostrarLeyendaCalor(){
  leyendaCalor=L.control({position:'bottomright'});
  leyendaCalor.onAdd=function(map){
    const div=L.DomUtil.create('div','info legend');
    const grades=['Bajo','Medio','Alto','Muy alto'];
    const colors=['blue','lime','yellow','red'];
    div.innerHTML+='<strong>Densidad de caídas</strong><br>';
    for(let i=0;i<grades.length;i++){
      div.innerHTML+=`<i style="background:${colors[i]};width:14px;height:14px;display:inline-block;margin-right:5px;border-radius:2px;"></i> ${grades[i]}<br>`;
    }
    return div;
  };
  leyendaCalor.addTo(mapa);
}

// --- Trayectoria ---
window.mostrarTrayectoria = function(index) {
  const d = filtrarDatos()[index];
  if (!d || !d.tle1 || !d.tle2) return alert("No hay TLE para este debris.");

  let mensajeDiferencia = '';
  if (d.dias_diferencia !== undefined && d.dias_diferencia !== null) {
    const horas = (d.dias_diferencia * 24).toFixed(2);
    mensajeDiferencia = `<div class="alert alert-warning p-2 mb-3" role="alert"><strong>Advertencia:</strong> Diferencia de tiempo estimada entre la caída y los últimos datos orbitales (TLE): <b>${horas} horas</b></div>`;
  }
  const infoDiv = document.getElementById('trayectoriaInfo');
  if (infoDiv) {
    infoDiv.innerHTML = mensajeDiferencia;
  }

  setTimeout(() => {
    if (mapaTrayectoria) { mapaTrayectoria.remove(); mapaTrayectoria = null; }
    mapaTrayectoria = L.map('mapTrayectoria').setView([getLat(d), getLon(d)], 3);
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { minZoom: 1, maxZoom: 20 }
    ).addTo(mapaTrayectoria);
    const satrec = satellite.twoline2satrec(d.tle1, d.tle2);
    const meanMotion = satrec.no * 1440 / (2 * Math.PI);
    const periodoMin = 1440 / meanMotion;
    const vueltas = 4;
    const minutosATrazar = periodoMin * vueltas;
    const jday = satrec.epochdays;
    const year = satrec.epochyr < 57 ? satrec.epochyr + 2000 : satrec.epochyr + 1900;
    const epochDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0) + (jday - 1) * 24 * 60 * 60 * 1000);
    let segments = [], segment = [], prevLon = null;
    for (let min = 0; min <= minutosATrazar; min += 1) {
      const time = new Date(epochDate.getTime() + min * 60000);
      const gmst = satellite.gstime(time);
      const pos = satellite.propagate(satrec, time);
      if (!pos || !pos.position) continue;
      const geo = satellite.eciToGeodetic(pos.position, gmst);
      let lat = satellite.degreesLat(geo.latitude);
      let lon = satellite.degreesLong(geo.longitude);
      if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90) continue;
      lon = ((lon + 180) % 360 + 360) % 360 - 180;
      if (prevLon !== null) {
        let delta = Math.abs(lon - prevLon);
        if (delta > 30) {
          if (segment.length > 1) segments.push(segment);
          segment = [];
        }
      }
      segment.push([lat, lon]);
      prevLon = lon;
    }
    if (segment.length > 1) segments.push(segment);
    segments.forEach(seg => {
      L.polyline(seg, { color: "#3f51b5", weight: 2 }).addTo(mapaTrayectoria);
    });
    L.marker([getLat(d), getLon(d)])
      .addTo(mapaTrayectoria)
      .bindPopup("Punto de caída")
      .openPopup();
    if (segments.length && segments[0].length > 1) {
      let bounds = segments.flat();
      mapaTrayectoria.fitBounds(bounds, {padding: [20, 20]});
    } else {
      mapaTrayectoria.setView([getLat(d), getLon(d)], 3);
    }
  }, 300);
  const modal = new bootstrap.Modal(document.getElementById('modalTrayectoria'));
  modal.show();
};

// --- Órbita 3D ---
window.mostrarOrbita3D = function(index) {
  const d = filtrarDatos()[index];
  if (!d || !d.tle1 || !d.tle2) {
    return alert("No hay TLE para este debris.");
  }

  let mensajeDiferencia = '';
  if (d.dias_diferencia !== undefined && d.dias_diferencia !== null) {
    const horas = (d.dias_diferencia * 24).toFixed(2);
    mensajeDiferencia = `<div class="alert alert-warning p-2 mb-3" role="alert"><strong>Advertencia:</strong> Diferencia de tiempo estimada entre la caída y los últimos datos orbitales (TLE): <b>${horas} horas</b></div>`;
  }
  const infoDiv = document.getElementById('orbita3DInfo');
  if (infoDiv) {
    infoDiv.innerHTML = mensajeDiferencia;
  }

  const modalElement = document.getElementById('modalOrbita3D');
  const modal = new bootstrap.Modal(modalElement);
  modalElement.addEventListener('shown.bs.modal', function onModalShown() {
    init(d);
    animate();
    modalElement.removeEventListener('shown.bs.modal', onModalShown);
  });
  modal.show();
  let scene, camera, renderer, earth, controls, line;
  function init(d) {
    const container = document.getElementById('orbita3DContainer');
    if (!container) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000010);
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 100000);
    camera.position.z = radioTierra * 3;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(EARTH_IMG_SRC,
      function(texture) {
        const geometry = new THREE.SphereGeometry(radioTierra, 64, 64);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        earth = new THREE.Mesh(geometry, material);
        scene.add(earth);
      },
      undefined,
      function(error) {
        console.error('Error al cargar la textura de la Tierra:', error);
      }
    );
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    plotOrbit(d);
  }
  function plotOrbit(d) {
    const satrec = satellite.twoline2satrec(d.tle1, d.tle2);
    const meanMotion = satrec.no * 1440 / (2 * Math.PI);
    const periodoMin = 1440 / meanMotion;
    const vueltas = 4;
    const minutosATrazar = periodoMin * vueltas;
    const epochDate = new Date(Date.UTC(satrec.epochyr < 57 ? satrec.epochyr + 2000 : satrec.epochyr + 1900, 0, 1) + (satrec.epochdays - 1) * 24 * 60 * 60 * 1000);
    const points = [];
    for (let min = 0; min <= minutosATrazar; min += 1) {
      const time = new Date(epochDate.getTime() + min * 60000);
      const gmst = satellite.gstime(time);
      const pos = satellite.propagate(satrec, time);
      if (!pos || !pos.position) continue;
      const eciPos = pos.position;
      points.push(new THREE.Vector3(eciPos.x, eciPos.z, -eciPos.y));
    }
    if (points.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xff9900 }));
      scene.add(line);
    }
  }
  function animate() {
    requestAnimationFrame(animate);
    if (earth) {
      earth.rotation.y += 0.01;
    }
    controls.update();
    renderer.render(scene, camera);
  }
}

// --- Listeners ---
function listeners(){
  if (_listenersInitialized) return; // evitar múltiples registros
  [
    'fecha-desde','fecha-hasta','inclinacion-min','inclinacion-max',
    'masa-orbita-min','masa-orbita-max','lat-min','lat-max','lon-min','lon-max'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', actualizarMapa);
  });
  const modoP = document.getElementById('modo-puntos');
  const modoC = document.getElementById('modo-calor');
  if (modoP) modoP.addEventListener('click', ()=>{ modo="puntos"; actualizarMapa(); });
  if (modoC) modoC.addEventListener('click', ()=>{ modo="calor"; actualizarMapa(); });
  const btnSelect = document.getElementById('btn-select-rect');
  if (btnSelect) btnSelect.addEventListener('click', (e)=>{ e.preventDefault(); activarSeleccionRect(); });
  const btnClear = document.getElementById('btn-clear-rect');
  if (btnClear) btnClear.addEventListener('click', (e)=>{ e.preventDefault(); limpiarSeleccionRect(); });
  ['const-all','const-yes','const-no'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', actualizarMapa);
  });
  const btnInforme = document.getElementById('btn-informe');
  if (btnInforme) btnInforme.addEventListener('click', abrirInforme);
  _listenersInitialized = true;
}

// --- Selección rectangular ---
let rectSeleccion = null, seleccionActiva = false, startLL = null;
function activarSeleccionRect(){
  if (seleccionActiva) return;
  seleccionActiva = true;
  const mapEl = document.getElementById('map');
  if (mapEl) mapEl.style.cursor = 'crosshair';
  mapa.dragging.disable();
  let moving = false;
  function onDown(e){ startLL = e.latlng; moving = true; if (rectSeleccion) { mapa.removeLayer(rectSeleccion); rectSeleccion=null; } }
  function onMove(e){
    if (!moving || !startLL) return;
    const b = L.latLngBounds(startLL, e.latlng);
    if (!rectSeleccion) rectSeleccion = L.rectangle(b, {color:'#0d6efd',weight:2,fillOpacity:0.15, className:'selecting-rect'}).addTo(mapa);
    else rectSeleccion.setBounds(b);
  }
  function onUp(){
    moving = false; seleccionActiva = false; mapa.dragging.enable();
    mapa.off('mousedown', onDown); mapa.off('mousemove', onMove); mapa.off('mouseup', onUp);
    if (mapEl) mapEl.style.cursor = '';
    if (!rectSeleccion) return;
    const b = rectSeleccion.getBounds();
    document.getElementById('lat-min') && (document.getElementById('lat-min').value = Math.min(b.getSouth(), b.getNorth()).toFixed(4));
    document.getElementById('lat-max') && (document.getElementById('lat-max').value = Math.max(b.getSouth(), b.getNorth()).toFixed(4));
    document.getElementById('lon-min') && (document.getElementById('lon-min').value = Math.min(b.getWest(), b.getEast()).toFixed(4));
    document.getElementById('lon-max') && (document.getElementById('lon-max').value = Math.max(b.getWest(), b.getEast()).toFixed(4));
    actualizarMapa();
  }
  mapa.on('mousedown', onDown);
  mapa.on('mousemove', onMove);
  mapa.on('mouseup', onUp);
}
function limpiarSeleccionRect(){
  if (rectSeleccion) { mapa.removeLayer(rectSeleccion); rectSeleccion=null; }
  ['lat-min','lat-max','lon-min','lon-max'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  actualizarMapa();
}

// --- Informe y PDF con solo mapa de puntos ---
let charts = {};

function abrirInforme() {
  const modal = new bootstrap.Modal(document.getElementById('informeModal'));
  modal.show();
  document.getElementById('informe-loading').style.display = "flex";

  Object.values(charts).forEach(c=>{ if(c) c.destroy(); });
  charts = {};
  document.getElementById('informe-resumen').innerText = "";
  const canvasMapaPuntos = document.getElementById('canvasMapaPuntos');
  if (canvasMapaPuntos) {
    const ctx = canvasMapaPuntos.getContext('2d');
    ctx.clearRect(0,0,canvasMapaPuntos.width,canvasMapaPuntos.height);
  }

  setTimeout(() => {
    const filtrados = filtrarDatos();
    document.getElementById('informe-resumen').innerText =
      `Cantidad de registros visibles: ${filtrados.length}`;

    const tramos = { "2004-2010": 0, "2011-2017": 0, "2018-2025": 0, "Antes de 2004": 0 };
    filtrados.forEach(d => {
      const y = anio(d.fecha);
      if (y >= 2004 && y <= 2010) tramos["2004-2010"]++;
      else if (y >= 2011 && y <= 2017) tramos["2011-2017"]++;
      else if (y >= 2018 && y <= 2025) tramos["2018-2025"]++;
      else tramos["Antes de 2004"]++;
    });
    charts.tramos = new Chart(document.getElementById('chartPieTramos'), {
      type: 'pie',
      data: {
        labels: Object.keys(tramos),
        datasets: [{
          data: Object.values(tramos),
          backgroundColor: ['#3f51b5','#43a047','#e53935','#ffc107'],
          borderColor: '#fff',
        }]
      },
      options: { plugins: { legend: { display: true }, title: { display: false } } }
    });

    const clases = {};
    filtrados.forEach(d => {
      const clase = d.clase_objeto || "Desconocido";
      clases[clase] = (clases[clase] || 0) + 1;
    });
    charts.clases = new Chart(document.getElementById('chartBarClases'), {
      type: 'bar',
      data: {
        labels: Object.keys(clases),
        datasets: [{
          label: 'Cantidad',
          data: Object.values(clases),
          backgroundColor: '#3f51b5'
        }]
      },
      options: { indexAxis: 'y', plugins: { legend: { display: false } } }
    });

    const tiposMasa = {};
    filtrados.forEach(d => {
      const tipo = d.clase_objeto || "Desconocido";
      tiposMasa[tipo] = (tiposMasa[tipo] || 0) + getMasaReingresadaKg(d);
    });
    charts.masa = new Chart(document.getElementById('chartBarTipoMasa'), {
      type: 'bar',
      data: {
        labels: Object.keys(tiposMasa),
        datasets: [{
          label: 'Masa (kg)',
          data: Object.values(tiposMasa).map(x=>Math.round(x)),
          backgroundColor: '#e53935'
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
          x: {
            title: { display: true, text: 'Masa total reingresada (kg)' },
            beginAtZero: true
          }
        }
      }
    });

    const tiempos = { "<1 año": 0, "1-5 años": 0, "5-10 años": 0, ">10 años": 0 };
    filtrados.forEach(d => {
      const dias = getDiasEnOrbita(d);
      const años = dias / 365.25;
      if (años < 1) tiempos["<1 año"]++;
      else if (años < 5) tiempos["1-5 años"]++;
      else if (años < 10) tiempos["5-10 años"]++;
      else tiempos[">10 años"]++;
    });
    charts.tiempos = new Chart(document.getElementById('chartPieTiempo'), {
      type: 'pie',
      data: {
        labels: Object.keys(tiempos),
        datasets: [{
          data: Object.values(tiempos),
          backgroundColor: ['#43a047','#ffb300','#e53935','#3f51b5'],
          borderColor: '#fff',
        }]
      },
      options: { plugins: { legend: { display: true }, title: { display: false } } }
    });

    drawMapaPuntos(filtrados, 'canvasMapaPuntos');
    document.getElementById('informe-loading').style.display = "none";
  }, 600);
}

document.getElementById('informeModal').addEventListener('hidden.bs.modal', () => {
  Object.values(charts).forEach(c=>{ if(c) c.destroy(); });
  charts = {};
  document.getElementById('informe-resumen').innerText = "";
  const c=document.getElementById('canvasMapaPuntos');
  if(c) c.getContext('2d').clearRect(0,0,c.width,c.height);
});

function exportInformePDF() {
  const doc = new window.jspdf.jsPDF("l", "pt", "a4");
  doc.setFontSize(20);
  doc.text("Informe de Debris Espaciales", 30, 40);
  doc.setFontSize(12);
  doc.text(document.getElementById('informe-resumen').innerText, 30, 70);

  const addChart = (canvasId, y) => {
    const chartCanvas = document.getElementById(canvasId);
    if (chartCanvas) {
      const imgData = chartCanvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", 40, y, 270, 140);
    }
  };
  addChart('chartPieTramos', 90);
  addChart('chartBarClases', 240);
  addChart('chartBarTipoMasa', 390);
  addChart('chartPieTiempo', 540);

  const canvasPuntos = document.getElementById('canvasMapaPuntos');
  if (canvasPuntos) {
    const imgData = canvasPuntos.toDataURL("image/png");
    doc.addPage();
    doc.text("Mapa de puntos (por año de caída)", 30, 40);
    doc.addImage(imgData, "PNG", 40, 60, 600, 320);
  }
  doc.save("informe-debris.pdf");
}

// ==================== MAPAS CANVAS PARA INFORME ====================

let earthmapImg = null;
let earthmapLoading = false;
let earthmapCallbacks = [];

function cargarEarthmap(callback) {
  if (earthmapImg && earthmapImg.complete) {
    callback(earthmapImg);
    return;
  }
  earthmapCallbacks.push(callback);
  if (!earthmapLoading) {
    earthmapLoading = true;
    earthmapImg = new window.Image();
    earthmapImg.src = "img/earthmap1k.jpg";
    earthmapImg.onload = () => {
      earthmapLoading = false;
      earthmapCallbacks.forEach(cb => cb(earthmapImg));
      earthmapCallbacks = [];
    };
    earthmapImg.onerror = () => {
      earthmapLoading = false;
      earthmapCallbacks.forEach(cb => cb(null));
      earthmapCallbacks = [];
    };
  }
}

function drawMapaPuntos(filtrados, canvasId) {
  cargarEarthmap((img) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = 0.5;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;

    filtrados.forEach(d => {
      const lat = getLat(d), lon = getLon(d);
      if (lat === null || lon === null) return;
      const x = (lon + 180) / 360 * canvas.width;
      const y = canvas.height - (lat + 90) / 180 * canvas.height;
      const year = anio(d.fecha);
      let color = "#ffc107";
      if (year >= 2004 && year <= 2010) color = "#3f51b5";
      else if (year >= 2011 && year <= 2017) color = "#43a047";
      else if (year >= 2018 && year <= 2025) color = "#e53935";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI, false);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    drawLeyendaAnios(canvas, ctx);
  });
}

function drawLeyendaAnios(canvas, ctx) {
  const leyenda = [
    { color: "#3f51b5", label: "2004-2010" },
    { color: "#43a047", label: "2011-2017" },
    { color: "#e53935", label: "2018-2025" },
    { color: "#ffc107", label: "Antes de 2004" }
  ];
  const x0 = canvas.width - 150, y0 = canvas.height - 75;
  ctx.save();
  ctx.globalAlpha = 0.93;
  ctx.fillStyle = "#fff";
  ctx.fillRect(x0 - 8, y0 - 8, 138, 56);
  ctx.globalAlpha = 1.0;
  ctx.font = "13px Inter, Arial";
  ctx.fillStyle = "#23272f";
  ctx.fillText("Color por año de caída", x0, y0 + 8);
  leyenda.forEach((item, i) => {
    ctx.beginPath();
    ctx.arc(x0 + 12, y0 + 24 + i * 13, 6, 0, 2 * Math.PI);
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.fillStyle = "#23272f";
    ctx.fillText(item.label, x0 + 25, y0 + 28 + i * 13);
  });
  ctx.restore();
}

document.addEventListener("DOMContentLoaded", ()=>{
  // asegúrate de que los elementos del DOM existan (p. ej. countSpan)
  listeners();
  // si los datos ya se cargaron antes del DOMContentLoaded, cargarDatos() ya corre; de lo contrario, inicializamos el mapa si aún no existe
  try {
    if (!mapa) {
      mapa = L.map('map', { worldCopyJump: true }).setView([0,0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 8,
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapa);
    }
  } catch(e){}
});

// ================== Chips de filtros activos ==================
function construirChipsFiltros(){
  const cont = document.getElementById('active-filters');
  if (!cont) return;
  const f = obtenerFiltros();
  const chips = [];
  const add = (key,label,value,displayValue)=>{
    if (!value) return;
    chips.push({key,label,displayValue:displayValue||value,active: !disabledFilters.has(key)});
  };
  add('pais','País', f.pais);
  add('clase_objeto','Clase', f.clase_objeto);
  if (f.fechaDesde || f.fechaHasta) {
    const disp = (f.fechaDesde||'∞') + '–' + (f.fechaHasta||'∞');
    chips.push({key:'fecha',label:'Fecha',displayValue:disp,active:!disabledFilters.has('fecha')});
  }
  if (f.inclinacionMin || f.inclinacionMax) {
    const disp = (f.inclinacionMin||'0') + '–' + (f.inclinacionMax||'180') + '°';
    chips.push({key:'inclinacion',label:'Inclinación',displayValue:disp,active:!disabledFilters.has('inclinacion')});
  }
  if (f.masaOrbitaMin || f.masaOrbitaMax) {
    const disp = (f.masaOrbitaMin||'0') + '–' + (f.masaOrbitaMax||'∞') + ' kg';
    chips.push({key:'masa',label:'Masa órbita',displayValue:disp,active:!disabledFilters.has('masa')});
  }
  if (f.constelacion !== 'todas') {
    const disp = f.constelacion === 'si' ? 'Solo constelaciones' : 'Sin constelaciones';
    chips.push({key:'constelacion',label:'Constelación',displayValue:disp,active:!disabledFilters.has('constelacion')});
  }
  if (f.latMin || f.latMax || f.lonMin || f.lonMax) {
    const disp = `Lat ${f.latMin||'-'}–${f.latMax||'-'}, Lon ${f.lonMin||'-'}–${f.lonMax||'-'}`;
    chips.push({key:'region',label:'Región',displayValue:disp,active:!disabledFilters.has('region')});
  }
  if (!chips.length){
    cont.innerHTML = '';
    // ocultar el contenedor si no hay chips para que no ocupe espacio
    try { cont.style.display = 'none'; } catch(e){}
    return;
  }
  // asegurar que se muestre si hay chips
  try { cont.style.display = ''; } catch(e){}
  cont.innerHTML = chips.map(c=>`
    <div class="filter-chip ${c.active?'':'inactive'}" data-key="${c.key}" title="Click para activar/desactivar. Doble click para limpiar">
      <span class="chip-toggle">${c.active? '✓':'✕'}</span>
      <span>${c.label}: ${c.displayValue}</span>
      <span class="chip-remove" data-remove="${c.key}" aria-label="Quitar filtro">×</span>
    </div>`).join('');
}

document.addEventListener('click', (e)=>{
  const chip = e.target.closest('.filter-chip');
  if (chip && chip.dataset.key){
    const key = chip.dataset.key;
    if (e.target.matches('.chip-remove')) {
      // limpiar valores asociados
      limpiarFiltro(key);
      disabledFilters.delete(key);
      actualizarMapa();
      return;
    }
    // toggle active/inactive
    if (disabledFilters.has(key)) disabledFilters.delete(key); else disabledFilters.add(key);
    actualizarMapa();
  }
});

function limpiarFiltro(key){
  switch(key){
    case 'pais': const btnP=document.getElementById('dropdownPaisBtn'); if(btnP){ btnP.dataset.value=''; btnP.textContent='Todos'; } break;
    case 'clase_objeto': const btnC=document.getElementById('dropdownClaseBtn'); if(btnC){ btnC.dataset.value=''; btnC.textContent='Todas'; } break;
    case 'fecha': ['fecha-desde','fecha-hasta'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; }); break;
    case 'inclinacion': ['inclinacion-min','inclinacion-max'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; }); break;
    case 'masa': ['masa-orbita-min','masa-orbita-max'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; }); break;
    case 'constelacion': const all=document.getElementById('const-all'); if(all) all.checked=true; break;
    case 'region': ['lat-min','lat-max','lon-min','lon-max'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; }); break;
  }
}
// ================== Language Toggle (ES/EN) ==================
const LANG_KEY = 'ui.lang';
const i18n = {
  es: {
    filtros: 'Filtros', idioma: 'Idioma', pais: 'País de origen', todos: 'Todos', clase: 'Clase de objeto', selClase: 'Seleccionar clase',
    fecha: 'Fecha de reentrada', inclinacion: 'Inclinación órbita (°)', masa: 'Masa en órbita (kg)', constelaciones: 'Constelaciones',
    solo: 'Solo', sin: 'Sin', region: 'Región (lat/lon)', zona: 'Zona geográfica', seleccionarZona: 'Seleccionar Zona', limpiar: 'Limpiar',
    informe: 'Generar informe', count: 'Registros mostrados:', puntos: 'Puntos', calor: 'Calor', basemap: 'Mapa base', ajustesCalor: 'Ajustes calor',
    radio: 'Radio', blur: 'Blur', intensidad: 'Intensidad'
  },
  en: {
    filtros: 'Filters', idioma: 'Language', pais: 'Country of origin', todos: 'All', clase: 'Object class', selClase: 'Select class',
    fecha: 'Reentry date', inclinacion: 'Orbit inclination (°)', masa: 'Mass in orbit (kg)', constelaciones: 'Constellations',
    solo: 'Only', sin: 'Without', region: 'Region (lat/lon)', zona: 'Geographic area', seleccionarZona: 'Select Area', limpiar: 'Clear',
    informe: 'Generate report', count: 'Shown records:', puntos: 'Points', calor: 'Heat', basemap: 'Base map', ajustesCalor: 'Heat settings',
    radio: 'Radius', blur: 'Blur', intensidad: 'Intensity'
  }
};
function applyLang(lang){
  const t = i18n[lang] || i18n.es;
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  setText('lbl-language', t.idioma);
  setText('title-filtros', t.filtros);
  setText('lbl-pais', t.pais);
  const btnPais = document.getElementById('dropdownPaisBtn'); if (btnPais) { btnPais.textContent = t.todos; }
  setText('lbl-clase', t.clase);
  const btnClase = document.getElementById('dropdownClaseBtn'); if (btnClase) { btnClase.textContent = t.selClase; }
  setText('lbl-fecha', t.fecha);
  setText('lbl-inclinacion', t.inclinacion);
  setText('lbl-masa', t.masa);
  setText('lbl-const', t.constelaciones);
  setText('lbl-const-solo', t.solo);
  setText('lbl-const-sin', t.sin);
  setText('lbl-region', t.region);
  setText('lbl-zona', t.zona);
  const btnSel = document.getElementById('btn-select-rect'); if (btnSel) btnSel.innerHTML = '<i class="bi bi-bounding-box"></i> ' + t.seleccionarZona;
  const btnClr = document.getElementById('btn-clear-rect'); if (btnClr) btnClr.textContent = t.limpiar;
  const btnInf = document.getElementById('btn-informe'); if (btnInf) btnInf.textContent = t.informe;
  setText('lbl-count', t.count);
  const mp = document.getElementById('modo-puntos'); if (mp) mp.innerHTML = '<i class="bi bi-geo-alt-fill me-1"></i>' + t.puntos;
  const mc = document.getElementById('modo-calor'); if (mc) mc.innerHTML = '<i class="bi bi-fire me-1"></i>' + t.calor;
  setText('lbl-basemap', t.basemap);
  setText('lbl-heat-settings', t.ajustesCalor);
  const lblR = document.getElementById('lbl-heat-radius'); if (lblR) lblR.childNodes[0].nodeValue = t.radio + ' ';
  const lblB = document.getElementById('lbl-heat-blur'); if (lblB) lblB.childNodes[0].nodeValue = t.blur + ' ';
  const lblS = document.getElementById('lbl-heat-scale'); if (lblS) lblS.childNodes[0].nodeValue = t.intensidad + ' ';
  const langBtn = document.getElementById('toggle-lang'); if (langBtn) langBtn.textContent = (lang==='es'?'ES':'EN');
  const noradInput = document.getElementById('norad-search-input');
  const noradBtn = document.getElementById('norad-search-btn');
  if (noradInput) noradInput.placeholder = (lang==='es'?'Buscar NORAD ID':'Search NORAD ID');
  if (noradBtn) noradBtn.textContent = (lang==='es'?'Buscar':'Search');
}
function initLang(){
  try {
    const stored = localStorage.getItem(LANG_KEY) || 'es';
    applyLang(stored);
  } catch(e) { applyLang('es'); }
}
document.addEventListener('click', (e)=>{
  if (e.target.closest && e.target.closest('#toggle-lang')){
    const current = (localStorage.getItem(LANG_KEY) || 'es');
    const next = current === 'es' ? 'en' : 'es';
    try { localStorage.setItem(LANG_KEY, next); } catch(e){}
    applyLang(next);
  }
});
document.addEventListener('DOMContentLoaded', initLang);

// ================== Heatmap slider listeners & restore ==================
function restoreHeatPrefs(){
  try {
    const r = localStorage.getItem('ui.heat.radius');
    const b = localStorage.getItem('ui.heat.blur');
    const s = localStorage.getItem('ui.heat.scale');
    if (r) document.getElementById('heat-radius').value = r;
    if (b) document.getElementById('heat-blur').value = b;
    if (s) document.getElementById('heat-scale').value = s;
    updateHeatLabels();
  } catch(e){}
}
function updateHeatLabels(){
  const rv = document.getElementById('heat-radius')?.value;
  const bv = document.getElementById('heat-blur')?.value;
  const sv = document.getElementById('heat-scale')?.value;
  if (rv) document.getElementById('heat-radius-val').textContent = rv;
  if (bv) document.getElementById('heat-blur-val').textContent = bv;
  if (sv) document.getElementById('heat-scale-val').textContent = sv;
}
document.addEventListener('input', (e)=>{
  if (['heat-radius','heat-blur','heat-scale'].includes(e.target.id)){
    updateHeatLabels();
    if (modo === 'calor') actualizarMapa();
  }
});
document.addEventListener('DOMContentLoaded', restoreHeatPrefs);

// Show heat controls only in heat mode
function updateHeatControlsVisibility(){
  const box = document.getElementById('heatmap-controls');
  if (!box) return;
  box.style.display = (modo === 'calor') ? '' : 'none';
}
// hook into mode buttons
document.addEventListener('click', (e)=>{
  if (e.target && (e.target.id === 'modo-puntos' || e.target.closest && e.target.closest('#modo-puntos'))) {
    setTimeout(updateHeatControlsVisibility, 0);
  }
  if (e.target && (e.target.id === 'modo-calor' || e.target.closest && e.target.closest('#modo-calor'))) {
    setTimeout(updateHeatControlsVisibility, 0);
  }
});
document.addEventListener('DOMContentLoaded', updateHeatControlsVisibility);

// ================== NORAD Search ==================
function buscarNorad(){
  const input = document.getElementById('norad-search-input');
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;
  if (modo === 'calor') { modo = 'puntos'; actualizarMapa(); }
  setTimeout(()=>{
    const marker = markersByNorad[val];
    if (!marker) { showAlert('NORAD ID no encontrado en los registros visibles.', 'warning', 6000); return; }
    try { mapa.panTo(marker.getLatLng()); marker.openPopup(); } catch(e){}
  }, 200);
}
document.addEventListener('click',(e)=>{
  if (e.target && e.target.id === 'norad-search-btn') buscarNorad();
});
document.addEventListener('keydown',(e)=>{
  if (e.key === 'Enter' && document.activeElement === document.getElementById('norad-search-input')) buscarNorad();
});

// ================== NORAD Autocomplete ==================
function filtrarNorad(query){
  const q = (query || '').trim();
  if (!q) return [];
  if (/^\d+$/.test(q)){
    return noradIndex.filter(n => n.norad.startsWith(q));
  }
  const lower = q.toLowerCase();
  return noradIndex.filter(n =>
    (n.nombre && n.nombre.toLowerCase().includes(lower)) ||
    (n.clase && n.clase.toLowerCase().includes(lower)) ||
    (n.pais && n.pais.toLowerCase().includes(lower))
  );
}

function renderNoradSuggestions(matches){
  const list = document.getElementById('norad-suggestions');
  if (!list) return;
  if (!matches || !matches.length){
    list.style.display = 'none';
    list.innerHTML = '';
    return;
  }
  list.innerHTML = matches.slice(0,30).map(m=>
    `<li class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-norad="${m.norad}">
      <span class="fw-semibold">${m.norad}</span>
      <span class="text-muted small">${[m.nombre, m.clase, m.pais].filter(Boolean).join(' · ')}</span>
    </li>`
  ).join('');
  list.style.display = '';
}

document.addEventListener('input',(e)=>{
  if (e.target && e.target.id === 'norad-search-input'){
    const matches = filtrarNorad(e.target.value);
    renderNoradSuggestions(matches);
  }
});

document.addEventListener('click',(e)=>{
  const list = document.getElementById('norad-suggestions');
  if (!list) return;
  const li = e.target.closest ? e.target.closest('#norad-suggestions li') : null;
  if (li){
    const code = li.getAttribute('data-norad');
    const input = document.getElementById('norad-search-input');
    if (input) input.value = code;
    list.style.display = 'none';
    buscarNorad();
    return;
  }
  if (!e.target.closest || !e.target.closest('#norad-search-box')){
    list.style.display = 'none';
  }
});
