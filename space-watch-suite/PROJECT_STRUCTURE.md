# Project Structure

```
space-watch-suite/
├── public/
│   └── data/                           # CSV data files
│       ├── debris_total.csv
│       ├── debris_orbita.csv
│       ├── debris_reingresados.csv
│       └── debris_reingresados_con_pos.csv
│
├── src/
│   ├── modules/                        # Feature modules
│   │   ├── GlobalAnalytics.jsx         # Module A: Analytics dashboard
│   │   ├── GlobalAnalytics.css
│   │   ├── ReentryMap.jsx              # Module B: 2D Leaflet map
│   │   ├── ReentryMap.css
│   │   ├── OrbitMonitor.jsx            # Module C: 3D Globe
│   │   ├── OrbitMonitor.css
│   │   ├── RiskCollision.jsx           # Module D: Coming soon
│   │   └── RiskCollision.css
│   │
│   ├── App.jsx                         # Main app with routing & sidebar
│   ├── App.css                         # App-wide styles
│   ├── main.jsx                        # React entry point
│   └── index.css                       # Global CSS reset
│
├── package.json                        # Dependencies & scripts
├── vite.config.js                      # Vite configuration
├── README.md                           # Main documentation
├── DATA_INSTRUCTIONS.md                # CSV data guide
├── DEPLOYMENT.md                       # Deployment guide
└── PROJECT_STRUCTURE.md                # This file
```

## Module Architecture

### App.jsx
- Router setup (React Router)
- Sidebar navigation component
- Module switching logic
- Collapsible sidebar state management

### Module A: GlobalAnalytics
**Purpose**: Comprehensive analytics dashboard

**Data Source**:
- `debris_total.csv` (all objects)
- `debris_orbita.csv` (active satellites)
- `debris_reingresados.csv` (reentered objects)

**Components**:
- KPI Cards (4 stats)
- Orbit vs Decay pie chart
- Top 10 polluters bar chart
- Launch history timeline
- Loading state

**Libraries**: Recharts, Papaparse

### Module B: ReentryMap
**Purpose**: Interactive 2D map of reentry locations

**Data Source**: `debris_reingresados_con_pos.csv`

**Features**:
- Leaflet map with CartoDB Dark tiles
- Custom markers sized by mass
- Color-coded by object class
- Toggle: Markers / Heatmap
- Class filter dropdown
- Detailed popups
- Real-time stats

**Libraries**: react-leaflet, Leaflet, Papaparse

### Module C: OrbitMonitor
**Purpose**: Real-time 3D orbital visualization

**Data Source**: `debris_orbita.csv`

**Features**:
- 3D globe with Earth texture
- Real-time TLE propagation
- Up to 3000 satellites rendered
- Click for details
- Live simulation time
- Color-coded: Payloads (cyan) vs Debris (pink)

**Libraries**: react-globe.gl, satellite.js, three.js, Papaparse

### Module D: RiskCollision
**Purpose**: Future collision risk analysis

**Features**:
- Coming soon page
- Animated wireframe globe
- Feature roadmap
- Development timeline
- Contact section

**Status**: UI complete, functionality planned

## Design System

### Color Palette
```css
--bg-primary: #02040a          /* Deep space background */
--bg-secondary: #0a0e1a        /* Secondary surfaces */
--bg-glass: rgba(10,14,26,0.7) /* Glassmorphism */
--border-glass: rgba(255,255,255,0.1)

--text-primary: #e0e6ed        /* Main text */
--text-secondary: #8b92a8      /* Muted text */

--accent-cyan: #00d9ff         /* Primary accent */
--accent-pink: #ff006e         /* Secondary accent */
--accent-purple: #8338ec       /* Tertiary accent */
--accent-yellow: #ffbe0b       /* Warning/info */
```

### Typography
- **UI Text**: Inter (weights: 300, 400, 500, 600, 700)
- **Data/Numbers**: JetBrains Mono (weights: 400, 500, 600)

### Components
- Glass cards with backdrop blur
- Gradient text for headings
- Smooth transitions (0.3s ease)
- Hover states with elevation
- Responsive grid layouts

## Data Flow

1. **CSV Loading**: Papaparse fetches from `/data/` folder
2. **Parsing**: Automatic delimiter detection
3. **Validation**: Filters invalid records
4. **Computation**: Derived metrics calculated
5. **Visualization**: Data passed to chart/map components
6. **Updates**: React state triggers re-renders

## State Management

Currently using React useState hooks. Future considerations:
- Context API for shared state
- Zustand for global state
- React Query for data fetching

## Performance Optimizations

1. **Code Splitting**: Dynamic imports ready (Vite default)
2. **Lazy Loading**: Module-based routing
3. **Memoization**: Chart data computed once
4. **Throttling**: 3D globe limited to 3000 objects
5. **Asset Optimization**: CDN for libraries

## Browser Compatibility

- Chrome 90+ ✓
- Firefox 88+ ✓
- Safari 14+ ✓
- Edge 90+ ✓

Requires: ES6+, WebGL (for 3D), CSS Grid

## Future Enhancements

1. **Database Integration**: Supabase for live data
2. **Real-time Updates**: WebSocket for TLE updates
3. **User Accounts**: Authentication & saved views
4. **Export Features**: PDF reports, CSV downloads
5. **Advanced Filters**: Multi-criteria search
6. **Collision Prediction**: AI/ML risk scoring
7. **Notifications**: Alert system for high-risk events
8. **Mobile App**: React Native version

## Testing Strategy

Future implementation:
- Vitest for unit tests
- React Testing Library for components
- Playwright for E2E tests
- Lighthouse for performance

## Accessibility

Current:
- Semantic HTML
- ARIA labels on interactive elements
- Keyboard navigation (partial)

Future:
- Full keyboard navigation
- Screen reader optimization
- High contrast mode
- Reduced motion support

## Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes
4. Test thoroughly
5. Submit pull request

## Credits

**Developed by**: CIEE - UNLP

**Inspired by**:
- [spacedata.aei.org](https://spacedata.aei.org)
- [LeoLabs Platform](https://platform.leolabs.space)
- [SatelitesArg](https://satelitesarg.com.ar)

**Libraries**:
- React, Vite, React Router
- Leaflet, react-leaflet
- Three.js, react-globe.gl
- satellite.js, Papaparse
- Recharts

## License

Educational and research use.
Contact CIEE for collaboration opportunities.
