import { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import Globe from 'react-globe.gl';
import * as satellite from 'satellite.js';
import './OrbitMonitor.css';

const EARTH_RADIUS_KM = 6371;
const SAT_SIZE = 80;
const TIME_STEP = 3000;

function OrbitMonitor() {
  const [satellites, setSatellites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [selectedSat, setSelectedSat] = useState(null);
  const [stats, setStats] = useState({ total: 0, payload: 0, debris: 0 });
  const globeEl = useRef();

  useEffect(() => {
    loadSatelliteData();
    const interval = setInterval(() => {
      setTime(new Date(Date.now() + TIME_STEP));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const loadSatelliteData = async () => {
    try {
      Papa.parse('/data/debris_orbita.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const validSats = results.data
            .filter(item => item.TLE_LINE1 && item.TLE_LINE2)
            .slice(0, 3000)
            .map(item => {
              try {
                const satrec = satellite.twoline2satrec(
                  item.TLE_LINE1.trim(),
                  item.TLE_LINE2.trim()
                );
                return {
                  ...item,
                  satrec,
                  name: item.OBJECT_NAME || item.nombre || 'Unknown',
                  class: item.OBJECT_CLASS || item.clase_objeto || 'Unknown',
                  noradId: item.NORAD_CAT_ID || item.norad_id
                };
              } catch (e) {
                return null;
              }
            })
            .filter(Boolean);

          setSatellites(validSats);

          const payload = validSats.filter(s => s.class.includes('Payload')).length;
          const debris = validSats.filter(s => s.class.includes('Debris') || s.class.includes('Rocket')).length;

          setStats({
            total: validSats.length,
            payload,
            debris
          });

          setLoading(false);
        },
        error: (error) => {
          console.error('Error loading satellite data:', error);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const getSatellitePositions = () => {
    return satellites.map(sat => {
      try {
        const positionAndVelocity = satellite.propagate(sat.satrec, time);
        const positionEci = positionAndVelocity.position;

        if (!positionEci || typeof positionEci === 'boolean') {
          return null;
        }

        const gmst = satellite.gstime(time);
        const positionGd = satellite.eciToGeodetic(positionEci, gmst);

        const latitude = satellite.degreesLat(positionGd.latitude);
        const longitude = satellite.degreesLong(positionGd.longitude);
        const altitude = positionGd.height;

        return {
          lat: latitude,
          lng: longitude,
          alt: altitude / EARTH_RADIUS_KM,
          name: sat.name,
          class: sat.class,
          noradId: sat.noradId,
          color: sat.class.includes('Payload') ? '#00d9ff' : '#ff006e'
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
  };

  const satData = getSatellitePositions();

  if (loading) {
    return (
      <div className="module-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading Orbital Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-container orbit-module">
      <div className="module-header">
        <div>
          <h1 className="module-title">Orbit Monitor 3D</h1>
          <p className="module-subtitle">Real-time visualization of LEO environment</p>
        </div>
        <div className="orbit-stats">
          <div className="orbit-stat">
            <span className="orbit-stat-label">Total Objects</span>
            <span className="orbit-stat-value">{stats.total}</span>
          </div>
          <div className="orbit-stat">
            <span className="orbit-stat-label">Payloads</span>
            <span className="orbit-stat-value" style={{ color: '#00d9ff' }}>{stats.payload}</span>
          </div>
          <div className="orbit-stat">
            <span className="orbit-stat-label">Debris</span>
            <span className="orbit-stat-value" style={{ color: '#ff006e' }}>{stats.debris}</span>
          </div>
        </div>
      </div>

      <div className="globe-container">
        <Globe
          ref={globeEl}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          pointsData={satData}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude="alt"
          pointRadius={0.5}
          pointLabel={d => `
            <div style="background: rgba(0,0,0,0.9); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);">
              <strong>${d.name}</strong><br/>
              Class: ${d.class}<br/>
              NORAD ID: ${d.noradId}<br/>
              Alt: ${(d.alt * EARTH_RADIUS_KM).toFixed(0)} km
            </div>
          `}
          onPointClick={setSelectedSat}
          animateIn={false}
        />

        {selectedSat && (
          <div className="sat-detail glass-card">
            <button className="close-btn" onClick={() => setSelectedSat(null)}>×</button>
            <h3>{selectedSat.name}</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">NORAD ID</span>
                <span className="detail-value">{selectedSat.noradId}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Class</span>
                <span className="detail-value">{selectedSat.class}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Altitude</span>
                <span className="detail-value">{(selectedSat.alt * EARTH_RADIUS_KM).toFixed(0)} km</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Latitude</span>
                <span className="detail-value">{selectedSat.lat.toFixed(2)}°</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Longitude</span>
                <span className="detail-value">{selectedSat.lng.toFixed(2)}°</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="time-display glass-card">
        <span className="time-label">Simulation Time</span>
        <span className="time-value">{time.toUTCString()}</span>
      </div>
    </div>
  );
}

export default OrbitMonitor;
