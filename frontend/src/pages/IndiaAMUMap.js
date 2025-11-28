import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import axios from 'axios';
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON } from 'react-leaflet';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import 'leaflet/dist/leaflet.css';
import './IndiaAMUMap.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#ff6b6b', '#feca57'];

const IndiaAMUMap = () => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('map'); // map, charts, both
    const [level, setLevel] = useState('state');
    const [selectedState, setSelectedState] = useState('Karnataka');
    const [farms, setFarms] = useState([]);
    const [amuData, setAmuData] = useState([]);
    const [stateData, setStateData] = useState([]);
    const [districtData, setDistrictData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selectedRegion, setSelectedRegion] = useState(null);

    // India center coordinates
    const indiaCenter = [20.5937, 78.9629];

    // State coordinates for markers
    const stateCoordinates = {
        'Karnataka': [15.3173, 75.7139],
        'Tamil Nadu': [11.1271, 78.6569],
        'Kerala': [10.8505, 76.2711],
        'Maharashtra': [19.7515, 75.7139],
        'Gujarat': [22.2587, 71.1924],
        'Punjab': [31.1471, 75.3412],
        'Haryana': [29.0588, 76.0856],
        'Uttar Pradesh': [26.8467, 80.9462],
        'West Bengal': [22.9868, 87.8550],
        'Rajasthan': [27.0238, 74.2179],
        'Andhra Pradesh': [15.9129, 79.7400],
        'Telangana': [18.1124, 79.0193],
        'Madhya Pradesh': [22.9734, 78.6569],
        'Bihar': [25.0961, 85.3131],
        'Odisha': [20.9517, 85.0985]
    };

    useEffect(() => {
        fetchData();
    }, [selectedState, level, fromDate, toDate]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch geo-aggregated data from new endpoint
            const geoParams = new URLSearchParams({
                level,
                ...(level !== 'state' && selectedState && { selectedState }),
                ...(fromDate && { from: fromDate }),
                ...(toDate && { to: toDate })
            });

            const geoRes = await axios.get(`${API_URL}/api/analytics/geo?${geoParams}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            const geoData = geoRes.data.data || [];
            
            // Also fetch farms for district-level map pins
            const [farmsRes, treatmentsRes] = await Promise.all([
                axios.get(`${API_URL}/api/farms`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }),
                axios.get(`${API_URL}/api/treatments`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            const farmsData = farmsRes.data;
            const treatments = treatmentsRes.data;

            setFarms(farmsData);

            // Organize geo data by level
            if (level === 'state') {
                setStateData(geoData);
                setAmuData(geoData.slice(0, 10));
            } else if (level === 'district') {
                setDistrictData(geoData);
                setAmuData(geoData.slice(0, 10));
            }

        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getMarkerColor = (intensity) => {
        const intensityNum = parseFloat(intensity);
        if (intensityNum >= 10) return '#ff6b6b';
        if (intensityNum >= 7) return '#ff9ff3';
        if (intensityNum >= 4) return '#feca57';
        if (intensityNum >= 2) return '#a8e6cf';
        return '#43e97b';
    };

    const getMarkerRadius = (intensity) => {
        const intensityNum = parseFloat(intensity);
        return Math.min(Math.max(intensityNum * 3, 5), 30);
    };

    const resetDateFilters = () => {
        setFromDate('');
        setToDate('');
    };

    return (
        <div className="india-amu-map-container">
            <Navigation />

            <div className="india-amu-map-content">
                <h1>🗺️ India AMU Geographic Visualization</h1>
                <p className="subtitle">Interactive maps and charts for antimicrobial usage monitoring across India</p>

                {/* View Mode Toggle */}
                <div className="view-mode-selector">
                    <button
                        className={viewMode === 'map' ? 'active' : ''}
                        onClick={() => setViewMode('map')}
                    >
                        🗺️ Map View
                    </button>
                    <button
                        className={viewMode === 'charts' ? 'active' : ''}
                        onClick={() => setViewMode('charts')}
                    >
                        📊 Charts View
                    </button>
                    <button
                        className={viewMode === 'both' ? 'active' : ''}
                        onClick={() => setViewMode('both')}
                    >
                        🔀 Combined View
                    </button>
                </div>

                {/* Level Selector */}
                <div className="level-selector">
                    <button
                        className={level === 'state' ? 'active' : ''}
                        onClick={() => setLevel('state')}
                    >
                        🇮🇳 State Level
                    </button>
                    <button
                        className={level === 'district' ? 'active' : ''}
                        onClick={() => setLevel('district')}
                    >
                        🏛️ District Level ({selectedState})
                    </button>
                </div>

                {level === 'district' && (
                    <div className="state-selector">
                        <label>Select State:</label>
                        <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
                            {Object.keys(stateCoordinates).map(state => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Time Range Selector */}
                <div className="time-range-selector">
                    <div className="time-range-group">
                        <label>From Date:</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>
                    <div className="time-range-group">
                        <label>To Date:</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>
                    <button onClick={resetDateFilters} className="btn-secondary-small">
                        🔄 Reset Dates
                    </button>
                </div>

                {loading ? (
                    <div className="loading">Loading geographic data...</div>
                ) : (
                    <>
                        {/* Map View */}
                        {(viewMode === 'map' || viewMode === 'both') && (
                            <div className="map-section">
                                <h2>📍 Interactive India Map</h2>
                                <div className="map-legend">
                                    <h4>AMU Intensity (Treatments/Farm)</h4>
                                    <div className="legend-items">
                                        <div><span className="dot" style={{ background: '#ff6b6b' }}></span> Very High (≥10)</div>
                                        <div><span className="dot" style={{ background: '#ff9ff3' }}></span> High (7-9)</div>
                                        <div><span className="dot" style={{ background: '#feca57' }}></span> Medium (4-6)</div>
                                        <div><span className="dot" style={{ background: '#a8e6cf' }}></span> Low (2-3)</div>
                                        <div><span className="dot" style={{ background: '#43e97b' }}></span> Very Low (&lt;2)</div>
                                    </div>
                                </div>

                                <div className="map-container-wrapper">
                                    <MapContainer
                                        center={level === 'state' ? indiaCenter : stateCoordinates[selectedState]}
                                        zoom={level === 'state' ? 5 : 7}
                                        style={{ height: '500px', width: '100%', borderRadius: '15px' }}
                                    >
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        />

                                        {level === 'state' && stateData.map((state, index) => {
                                            const coords = stateCoordinates[state.region_name || state.name];
                                            if (!coords) return null;

                                            return (
                                                <CircleMarker
                                                    key={index}
                                                    center={coords}
                                                    radius={getMarkerRadius(state.amu_intensity || 0)}
                                                    fillColor={getMarkerColor(state.amu_intensity || 0)}
                                                    color="#fff"
                                                    weight={2}
                                                    opacity={1}
                                                    fillOpacity={0.7}
                                                    eventHandlers={{
                                                        click: () => setSelectedRegion(state)
                                                    }}
                                                >
                                                    <Popup>
                                                        <div className="map-popup">
                                                            <h3>{state.region_name || state.name}</h3>
                                                            <p><strong>Farms:</strong> {state.farm_count || 0}</p>
                                                            <p><strong>Treatments:</strong> {state.treatment_count || 0}</p>
                                                            <p><strong>AMU Intensity:</strong> {state.amu_intensity || 0}</p>
                                                            <p><strong>Avg MRL %:</strong> {state.avg_mrl_percentage || 'N/A'}%</p>
                                                            <div className="risk-mini">
                                                                <span style={{ color: '#43e97b' }}>✅ {state.safe_count || 0}</span>
                                                                <span style={{ color: '#feca57' }}>⚠️ {state.borderline_count || 0}</span>
                                                                <span style={{ color: '#ff6b6b' }}>🔴 {state.unsafe_count || 0}</span>
                                                            </div>
                                                        </div>
                                                    </Popup>
                                                </CircleMarker>
                                            );
                                        })}

                                        {level === 'district' && farms
                                            .filter(f => f.state === selectedState && f.latitude && f.longitude)
                                            .map((farm, index) => (
                                                <CircleMarker
                                                    key={index}
                                                    center={[farm.latitude, farm.longitude]}
                                                    radius={8}
                                                    fillColor="#667eea"
                                                    color="#fff"
                                                    weight={2}
                                                    opacity={1}
                                                    fillOpacity={0.8}
                                                >
                                                    <Popup>
                                                        <div className="map-popup">
                                                            <h4>{farm.farm_name}</h4>
                                                            <p><strong>District:</strong> {farm.district}</p>
                                                            <p><strong>Farmer:</strong> {farm.farmer_name}</p>
                                                        </div>
                                                    </Popup>
                                                </CircleMarker>
                                            ))}
                                    </MapContainer>
                                </div>
                            </div>
                        )}

                        {/* Charts View */}
                        {(viewMode === 'charts' || viewMode === 'both') && (
                            <div className="charts-section">
                                <h2>📊 AMU Analytics Charts</h2>

                                <div className="charts-grid">
                                    {/* AMU Intensity Bar Chart */}
                                    <div className="chart-card">
                                        <h3>AMU Intensity by {level === 'state' ? 'State' : 'District'}</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={amuData.map(d => ({ name: d.region_name || d.name, amuIntensity: d.amu_intensity || 0 }))}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                                <YAxis label={{ value: 'Treatments/Farm', angle: -90, position: 'insideLeft' }} />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="amuIntensity" fill="#667eea" name="AMU Intensity" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Treatment Distribution */}
                                    <div className="chart-card">
                                        <h3>Total Treatments Distribution</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={amuData.map(d => ({ name: d.region_name || d.name, treatments: d.treatment_count || 0 }))}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="treatments" fill="#764ba2" name="Total Treatments" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Risk Category Pie Chart */}
                                    <div className="chart-card">
                                        <h3>Overall Risk Distribution</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Safe', value: amuData.reduce((sum, d) => sum + (d.safe_count || 0), 0), color: '#43e97b' },
                                                        { name: 'Borderline', value: amuData.reduce((sum, d) => sum + (d.borderline_count || 0), 0), color: '#feca57' },
                                                        { name: 'Unsafe', value: amuData.reduce((sum, d) => sum + (d.unsafe_count || 0), 0), color: '#ff6b6b' }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={100}
                                                    dataKey="value"
                                                >
                                                    {[
                                                        { color: '#43e97b' },
                                                        { color: '#feca57' },
                                                        { color: '#ff6b6b' }
                                                    ].map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Farms Distribution */}
                                    <div className="chart-card">
                                        <h3>Farms by {level === 'state' ? 'State' : 'District'}</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={amuData.map(d => ({ name: d.region_name || d.name, farms: d.farm_count || 0 }))}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="farms" fill="#4facfe" name="Number of Farms" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div className="action-buttons">
                    <button onClick={() => navigate('/authority/analytics')} className="btn-primary">
                        📈 View Full Analytics
                    </button>
                    <button onClick={() => navigate('/dashboard')} className="btn-secondary">
                        🏠 Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IndiaAMUMap;
