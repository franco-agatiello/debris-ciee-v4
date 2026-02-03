import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import Papa from 'papaparse';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ReentryMap.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CLASS_COLORS = {
  'Payload': '#00d9ff',
  'Rocket Body': '#ff006e',
  'Debris': '#ffbe0b',
  'Unknown': '#8b92a8'
};

function ReentryMap() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [filterClass, setFilterClass] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      Papa.parse('/data/debris_reingresados_con_pos.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const validData = results.data.filter(item => {
            const lat = parseFloat(item.lat_caida || item.lugar_caida?.lat);
            const lon = parseFloat(item.lon_caida || item.lugar_caida?.lon);
            return !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
          });
          setData(validData);
          setLoading(false);
        },
        error: (error) => {
          console.error('Error loading CSV:', error);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const getMarkerIcon = (item) => {
    const className = item.clase_objeto || item.OBJECT_CLASS || 'Unknown';
    const color = CLASS_COLORS[className] || CLASS_COLORS['Unknown'];
    const mass = parseFloat(item.masa_en_orbita || item.MASS || 100);
    const radius = Math.max(8, Math.min(20, Math.log(mass + 1) * 3));

    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background: ${color}; width: ${radius}px; height: ${radius}px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.4); box-shadow: 0 0 10px ${color};"></div>`,
      iconSize: [radius, radius],
      iconAnchor: [radius / 2, radius / 2]
    });
  };

  const filteredData = filterClass === 'all'
    ? data
    : data.filter(item => {
        const className = item.clase_objeto || item.OBJECT_CLASS || 'Unknown';
        return className === filterClass;
      });

  if (loading) {
    return (
      <div className="module-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading Reentry Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-container map-module">
      <div className="module-header">
        <div>
          <h1 className="module-title">Reentry Map 2D</h1>
          <p className="module-subtitle">Historical impact points of space debris</p>
        </div>
        <div className="map-controls">
          <button
            className={`control-btn ${!showHeatmap ? 'active' : ''}`}
            onClick={() => setShowHeatmap(false)}
          >
            Markers
          </button>
          <button
            className={`control-btn ${showHeatmap ? 'active' : ''}`}
            onClick={() => setShowHeatmap(true)}
          >
            Heatmap
          </button>
          <select
            className="filter-select"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="all">All Classes</option>
            <option value="Payload">Payload</option>
            <option value="Rocket Body">Rocket Body</option>
            <option value="Debris">Debris</option>
          </select>
        </div>
      </div>

      <div className="map-container glass-card">
        <MapContainer
          center={[0, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%', borderRadius: '12px' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {!showHeatmap && filteredData.map((item, index) => {
            const lat = parseFloat(item.lat_caida || item.lugar_caida?.lat);
            const lon = parseFloat(item.lon_caida || item.lugar_caida?.lon);

            return (
              <Marker
                key={index}
                position={[lat, lon]}
                icon={getMarkerIcon(item)}
              >
                <Popup>
                  <div className="popup-content">
                    <h4>{item.nombre || item.OBJECT_NAME || 'Unknown Object'}</h4>
                    <p><strong>NORAD ID:</strong> {item.norad_id || item.NORAD_CAT_ID || 'N/A'}</p>
                    <p><strong>Class:</strong> {item.clase_objeto || item.OBJECT_CLASS || 'Unknown'}</p>
                    <p><strong>Mass:</strong> {item.masa_en_orbita || item.MASS || 'N/A'} kg</p>
                    <p><strong>Country:</strong> {item.pais || item.COUNTRY_CODE || 'N/A'}</p>
                    <p><strong>Reentry Date:</strong> {item.fecha || item.DECAY_DATE || 'N/A'}</p>
                    <p><strong>Location:</strong> {lat.toFixed(2)}°, {lon.toFixed(2)}°</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div className="map-legend">
          <h4>Object Classes</h4>
          {Object.entries(CLASS_COLORS).map(([className, color]) => (
            <div key={className} className="legend-item">
              <div className="legend-color" style={{ background: color }}></div>
              <span>{className}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="map-stats glass-card">
        <div className="stat-item">
          <span className="stat-label">Total Reentries</span>
          <span className="stat-value">{data.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Filtered</span>
          <span className="stat-value">{filteredData.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Coverage</span>
          <span className="stat-value">Global</span>
        </div>
      </div>
    </div>
  );
}

export default ReentryMap;
