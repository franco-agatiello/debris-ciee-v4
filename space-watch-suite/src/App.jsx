import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import GlobalAnalytics from './modules/GlobalAnalytics';
import ReentryMap from './modules/ReentryMap';
import OrbitMonitor from './modules/OrbitMonitor';
import RiskCollision from './modules/RiskCollision';
import './App.css';

function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();

  const modules = [
    { path: '/', icon: '📊', label: 'Global Analytics', color: '#00d9ff' },
    { path: '/reentry-map', icon: '🗺️', label: 'Reentry Map 2D', color: '#ff006e' },
    { path: '/orbit-monitor', icon: '🌍', label: 'Orbit Monitor 3D', color: '#8338ec' },
    { path: '/risk-collision', icon: '⚠️', label: 'Risk & Collision', color: '#ffbe0b' }
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-section">
          <div className="logo-icon">🛰️</div>
          {!collapsed && (
            <div className="logo-text">
              <h1>CIEE</h1>
              <p>Space Watch Suite</p>
            </div>
          )}
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="nav-menu">
        {modules.map((module) => (
          <Link
            key={module.path}
            to={module.path}
            className={`nav-item ${location.pathname === module.path ? 'active' : ''}`}
            style={{ '--item-color': module.color }}
          >
            <span className="nav-icon">{module.icon}</span>
            {!collapsed && <span className="nav-label">{module.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="footer-content">
            <p className="footer-text">CIEE - UNLP</p>
            <p className="footer-subtext">Space Surveillance & Analytics</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function AppContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="app-container">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        <Routes>
          <Route path="/" element={<GlobalAnalytics />} />
          <Route path="/reentry-map" element={<ReentryMap />} />
          <Route path="/orbit-monitor" element={<OrbitMonitor />} />
          <Route path="/risk-collision" element={<RiskCollision />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
