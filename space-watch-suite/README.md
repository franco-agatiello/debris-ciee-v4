# CIEE Space Watch Suite

A modular Space Situational Awareness (SSA) platform for comprehensive debris tracking and orbital monitoring.

## Features

### Module A: Global Analytics
- Comprehensive data analysis of the space environment
- Interactive charts showing orbit vs. decay distribution
- Top space polluters by country
- Launch history timeline
- Real-time KPI cards for mass and object counts

### Module B: Reentry Map 2D
- Interactive Leaflet map with historical impact points
- Marker visualization with size proportional to mass
- Color-coded by object class (Payload, Rocket Body, Debris)
- Heatmap toggle for density visualization
- Detailed popups with object information

### Module C: Orbit Monitor 3D
- Real-time 3D globe visualization using react-globe.gl
- Live orbital propagation using satellite.js
- Deep space aesthetic with glowing atmosphere
- Supports up to 3000 active satellites
- Click for detailed object information

### Module D: Risk & Collision
- Under development
- Future features: reentry prediction, collision probability, risk scoring
- Timeline showing development phases

## Tech Stack

- **React** + **Vite** - Modern build tooling
- **React Router** - Client-side routing
- **Papaparse** - CSV parsing
- **Recharts** - Analytics charts
- **Leaflet** + **react-leaflet** - 2D mapping
- **react-globe.gl** - 3D globe visualization
- **satellite.js** - Orbital mechanics and TLE propagation
- **Supabase** - Database (ready for integration)

## Design System

- **Theme**: Deep Space / Cyberpunk
- **Background**: `#02040a`
- **Glassmorphism**: Throughout UI elements
- **Typography**:
  - Inter for UI text
  - JetBrains Mono for data/numbers
- **Colors**:
  - Cyan: `#00d9ff`
  - Pink: `#ff006e`
  - Purple: `#8338ec`
  - Yellow: `#ffbe0b`

## Data Files

Place your CSV files in `public/data/`:

1. `debris_total.csv` - Master catalog for global analytics
2. `debris_orbita.csv` - Active satellites with TLEs for 3D monitor
3. `debris_reingresados.csv` - Full decay history
4. `debris_reingresados_con_pos.csv` - Decayed objects with lat/lon

### CSV Format Requirements

**debris_total.csv**
```csv
NORAD_CAT_ID,OBJECT_NAME,COUNTRY_CODE,LAUNCH_DATE,OBJECT_CLASS,MASS
```

**debris_orbita.csv**
```csv
NORAD_CAT_ID,OBJECT_NAME,OBJECT_CLASS,COUNTRY_CODE,TLE_LINE1,TLE_LINE2,MASS
```

**debris_reingresados.csv**
```csv
NORAD_CAT_ID,OBJECT_NAME,OBJECT_CLASS,COUNTRY_CODE,DECAY_DATE,MASS
```

**debris_reingresados_con_pos.csv**
```csv
norad_id,nombre,clase_objeto,pais,fecha,lat_caida,lon_caida,masa_en_orbita
```

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Building for Production

```bash
npm run build
npm run preview
```

## Navigation

Use the sidebar to switch between modules. The sidebar collapses for smaller screens and can be toggled with the arrow button.

## Browser Support

Modern browsers with ES6+ support:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Credits

Developed by CIEE - UNLP
Centro Interdisciplinario de Estudios Espaciales
Universidad Nacional de La Plata

Inspired by:
- spacedata.aei.org
- LeoLabs Platform
- SatelitesArg

## License

Educational and research use. Contact CIEE for collaboration opportunities.
