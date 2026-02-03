import './RiskCollision.css';

function RiskCollision() {
  return (
    <div className="module-container risk-module">
      <div className="module-header">
        <h1 className="module-title">Risk & Collision Analysis</h1>
        <p className="module-subtitle">Advanced predictive analytics for space safety</p>
      </div>

      <div className="coming-soon-container">
        <div className="wireframe-globe">
          <div className="orbit-ring ring-1"></div>
          <div className="orbit-ring ring-2"></div>
          <div className="orbit-ring ring-3"></div>
          <div className="globe-core"></div>
          <div className="collision-marker marker-1">⚠️</div>
          <div className="collision-marker marker-2">⚠️</div>
          <div className="collision-marker marker-3">⚠️</div>
        </div>

        <div className="coming-soon-content glass-card">
          <div className="status-badge">
            <span className="status-dot"></span>
            <span>IN DEVELOPMENT</span>
          </div>

          <h2>Advanced Risk Analytics Coming Soon</h2>

          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">🎯</div>
              <h3>Reentry Prediction</h3>
              <p>High-precision modeling of uncontrolled reentry trajectories with impact probability zones</p>
            </div>

            <div className="feature-item">
              <div className="feature-icon">💥</div>
              <h3>Collision Probability</h3>
              <p>Real-time conjunction analysis and collision avoidance recommendations</p>
            </div>

            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <h3>Risk Scoring</h3>
              <p>Automated threat assessment based on object size, velocity, and orbit characteristics</p>
            </div>

            <div className="feature-item">
              <div className="feature-icon">🚨</div>
              <h3>Alert System</h3>
              <p>Configurable notifications for high-risk events and critical conjunctions</p>
            </div>
          </div>

          <div className="integration-info">
            <h3>Data Integration in Progress</h3>
            <ul>
              <li>Space-Track.org conjunction data streams</li>
              <li>ESA DISCOS fragmentation models</li>
              <li>NASA CARA screening volumes</li>
              <li>Machine learning risk prediction models</li>
            </ul>
          </div>

          <div className="timeline">
            <div className="timeline-item completed">
              <div className="timeline-marker">✓</div>
              <div className="timeline-content">
                <h4>Phase 1: Data Collection</h4>
                <p>Completed Q4 2024</p>
              </div>
            </div>

            <div className="timeline-item active">
              <div className="timeline-marker">⏳</div>
              <div className="timeline-content">
                <h4>Phase 2: Algorithm Development</h4>
                <p>In Progress - Q1 2025</p>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-marker">○</div>
              <div className="timeline-content">
                <h4>Phase 3: Beta Testing</h4>
                <p>Planned Q2 2025</p>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-marker">○</div>
              <div className="timeline-content">
                <h4>Phase 4: Public Launch</h4>
                <p>Planned Q3 2025</p>
              </div>
            </div>
          </div>

          <div className="contact-section">
            <p>Interested in beta access or collaboration?</p>
            <a href="https://www.ciee.unlp.edu.ar/" target="_blank" rel="noopener noreferrer" className="contact-btn">
              Contact CIEE Research Team
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskCollision;
