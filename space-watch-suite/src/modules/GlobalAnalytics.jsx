import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './GlobalAnalytics.css';

const COLORS = ['#00d9ff', '#8338ec', '#ff006e', '#ffbe0b', '#06ffa5', '#ff5733'];

function GlobalAnalytics() {
  const [loading, setLoading] = useState(true);
  const [totalData, setTotalData] = useState([]);
  const [orbitData, setOrbitData] = useState([]);
  const [reenteredData, setReenteredData] = useState([]);
  const [stats, setStats] = useState({
    totalInOrbit: 0,
    totalReentered: 0,
    massInOrbit: 0,
    massReentered: 0
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [totalResponse, orbitResponse, reenteredResponse] = await Promise.all([
        loadCSV('/data/debris_total.csv'),
        loadCSV('/data/debris_orbita.csv'),
        loadCSV('/data/debris_reingresados.csv')
      ]);

      setTotalData(totalResponse);
      setOrbitData(orbitResponse);
      setReenteredData(reenteredResponse);

      const massInOrbit = orbitResponse.reduce((sum, item) => sum + (parseFloat(item.masa_en_orbita || item.MASS || 0)), 0);
      const massReentered = reenteredResponse.reduce((sum, item) => sum + (parseFloat(item.masa_en_orbita || item.MASS || 0)), 0);

      setStats({
        totalInOrbit: orbitResponse.length,
        totalReentered: reenteredResponse.length,
        massInOrbit: Math.round(massInOrbit),
        massReentered: Math.round(massReentered)
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const loadCSV = (url) => {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(error)
      });
    });
  };

  const getOrbitVsDecayData = () => {
    return [
      { name: 'Active in Orbit', value: stats.totalInOrbit },
      { name: 'Reentered/Decayed', value: stats.totalReentered }
    ];
  };

  const getTopPolluters = () => {
    const countryCounts = {};
    totalData.forEach(item => {
      const country = item.COUNTRY_CODE || item.pais || 'Unknown';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });

    return Object.entries(countryCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const getLaunchHistory = () => {
    const yearCounts = {};
    totalData.forEach(item => {
      const launchDate = item.LAUNCH_DATE || item.lanzamiento;
      if (launchDate) {
        const year = launchDate.split('-')[0];
        if (year && year.length === 4) {
          yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
      }
    });

    return Object.entries(yearCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year)
      .filter(item => item.year >= 1957 && item.year <= 2025);
  };

  if (loading) {
    return (
      <div className="module-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading Space Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <h1 className="module-title">Global Analytics</h1>
        <p className="module-subtitle">Comprehensive analysis of the space environment</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon">🛰️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalInOrbit.toLocaleString()}</div>
            <div className="stat-label">Objects in Orbit</div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon">🌍</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalReentered.toLocaleString()}</div>
            <div className="stat-label">Reentered Objects</div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon">⚖️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.massInOrbit.toLocaleString()}</div>
            <div className="stat-label">Mass in Orbit (kg)</div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon">📉</div>
          <div className="stat-content">
            <div className="stat-value">{stats.massReentered.toLocaleString()}</div>
            <div className="stat-label">Mass Reentered (kg)</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card glass-card">
          <h3 className="chart-title">Orbit vs. Decay Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getOrbitVsDecayData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {getOrbitVsDecayData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card glass-card">
          <h3 className="chart-title">Top 10 Space Polluters</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getTopPolluters()}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="country" stroke="#8b92a8" />
              <YAxis stroke="#8b92a8" />
              <Tooltip contentStyle={{ background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Bar dataKey="count" fill="#00d9ff" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card glass-card chart-wide">
          <h3 className="chart-title">Launch History Timeline</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getLaunchHistory()}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="year" stroke="#8b92a8" />
              <YAxis stroke="#8b92a8" />
              <Tooltip contentStyle={{ background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8338ec" strokeWidth={2} dot={{ fill: '#8338ec' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default GlobalAnalytics;
