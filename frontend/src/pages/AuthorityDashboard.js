import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navigation from '../components/Navigation';
import axios from 'axios';
import {
    BarChart, Bar, PieChart, Pie, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell
} from 'recharts';
import './AuthorityDashboard.css';

const AuthorityDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('farms');
    const [farms, setFarms] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [analytics, setAnalytics] = useState({});
    const [auditTrail, setAuditTrail] = useState([]);
    const [filters, setFilters] = useState({ state: '', district: '', taluk: '' });

    // Redirect if not authority
    useEffect(() => {
        if (user && user.role !== 'authority') {
            navigate('/dashboard');
            return;
        }
    }, [user, navigate]);

    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAuthorityData();
    }, [activeTab]); // Refetch when tab changes

    const fetchAuthorityData = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No token found');
                return;
            }
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch all farms
            const farmsRes = await axios.get('/api/farms', { headers });
            const farmsData = farmsRes.data?.data || farmsRes.data || [];
            setFarms(Array.isArray(farmsData) ? farmsData : []);

            // Fetch all prescriptions
            const prescriptionsRes = await axios.get('/api/prescriptions', { headers });
            const prescriptionsData = prescriptionsRes.data?.data || prescriptionsRes.data || [];
            setPrescriptions(Array.isArray(prescriptionsData) ? prescriptionsData : []);

            // Fetch analytics
            const analyticsRes = await axios.get('/api/authority/dashboard-stats', { headers });
            setAnalytics(analyticsRes.data?.data || analyticsRes.data || {});

        } catch (error) {
            console.error('Failed to fetch authority data:', error);
            setError(error.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const approvePrescription = async (prescriptionId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/prescriptions/${prescriptionId}/approve`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAuthorityData(); // Refresh data
        } catch (error) {
            console.error('Failed to approve prescription:', error);
        }
    };

    const rejectPrescription = async (prescriptionId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/prescriptions/${prescriptionId}/reject`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAuthorityData(); // Refresh data
        } catch (error) {
            console.error('Failed to reject prescription:', error);
        }
    };

    const renderFarms = () => (
        <div className="farms-section">
            <h3>🏡 All Farms</h3>
            <div className="farms-grid">
                {farms.map(farm => (
                    <div key={farm.farm_id} className="farm-card">
                        <div className="farm-header">
                            <h4>{farm.farm_name}</h4>
                            <span className="farm-status active">Active</span>
                        </div>
                        <div className="farm-details">
                            <p><strong>Farmer:</strong> {farm.farmer_name}</p>
                            <p><strong>Location:</strong> {farm.district}, {farm.state}</p>
                            <p><strong>Phone:</strong> {farm.phone}</p>
                            <p><strong>Animals:</strong> {farm.total_animals || 0}</p>
                            <p><strong>Treatments:</strong> {farm.total_treatments || 0}</p>
                        </div>
                        <div className="farm-actions">
                            <button className="btn-inspect" onClick={() => navigate(`/farm/${farm.farm_id}`)}>🔍 Inspect</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderPrescriptions = () => (
        <div className="prescriptions-section">
            <h3>💊 All Prescriptions</h3>
            <div className="prescriptions-list">
                {prescriptions.map(prescription => (
                    <div key={prescription.prescription_id} className="prescription-card">
                        <div className="prescription-header">
                            <h4>Prescription #{prescription.prescription_id}</h4>
                            <span className={`status ${prescription.status}`}>{prescription.status}</span>
                        </div>
                        <div className="prescription-details">
                            <p><strong>Veterinarian:</strong> {prescription.vet_name}</p>
                            <p><strong>Farm:</strong> {prescription.farm_name}</p>
                            <p><strong>Medicine:</strong> {prescription.medicine}</p>
                            <p><strong>Dosage:</strong> {prescription.dosage}</p>
                            <p><strong>Date:</strong> {new Date(prescription.created_at).toLocaleDateString()}</p>
                        </div>
                        {prescription.status === 'pending' && (
                            <div className="prescription-actions">
                                <button
                                    className="btn-approve"
                                    onClick={() => approvePrescription(prescription.prescription_id)}
                                >
                                    ✅ Approve
                                </button>
                                <button
                                    className="btn-reject"
                                    onClick={() => rejectPrescription(prescription.prescription_id)}
                                >
                                    ❌ Reject
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderAnalytics = () => {
        // Sample trend data
        const trendData = [
            { month: 'Jan', treatments: 120, unsafe: 15, borderline: 25 },
            { month: 'Feb', treatments: 135, unsafe: 18, borderline: 22 },
            { month: 'Mar', treatments: 150, unsafe: 12, borderline: 28 },
            { month: 'Apr', treatments: 140, unsafe: 20, borderline: 30 },
            { month: 'May', treatments: 165, unsafe: 8, borderline: 35 },
            { month: 'Jun', treatments: 180, unsafe: 25, borderline: 40 }
        ];

        const speciesData = [
            { name: 'Cattle', value: 45, fill: '#3b82f6' },
            { name: 'Goat', value: 25, fill: '#10b981' },
            { name: 'Sheep', value: 15, fill: '#f59e0b' },
            { name: 'Poultry', value: 10, fill: '#ef4444' },
            { name: 'Pig', value: 5, fill: '#8b5cf6' }
        ];

        const riskData = [
            { category: 'Safe', count: 450, fill: '#10b981' },
            { category: 'Borderline', count: 180, fill: '#f59e0b' },
            { category: 'Unsafe', count: 98, fill: '#ef4444' }
        ];

        return (
            <div className="analytics-section">
                <h3>📊 Analytics & Trends</h3>

                {/* Key Metrics */}
                <div className="analytics-grid">
                    <div className="metric-card">
                        <div className="metric-icon">🏡</div>
                        <div className="metric-content">
                            <h3>{analytics.total_farms || 0}</h3>
                            <p>Total Farms</p>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-icon">💊</div>
                        <div className="metric-content">
                            <h3>{analytics.total_treatments || 0}</h3>
                            <p>Total Treatments</p>
                        </div>
                    </div>
                    <div className="metric-card danger">
                        <div className="metric-icon">⚠️</div>
                        <div className="metric-content">
                            <h3>{analytics.unsafe_treatments || 0}</h3>
                            <p>Unsafe Treatments</p>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-icon">📋</div>
                        <div className="metric-content">
                            <h3>{prescriptions.length}</h3>
                            <p>Total Prescriptions</p>
                        </div>
                    </div>
                </div>

                {/* Treatment Trends Chart */}
                <div className="chart-container">
                    <h4>📈 Monthly Treatment Trends</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="treatments" stroke="#3b82f6" strokeWidth={3} name="Total Treatments" />
                            <Line type="monotone" dataKey="unsafe" stroke="#ef4444" strokeWidth={2} name="Unsafe" />
                            <Line type="monotone" dataKey="borderline" stroke="#f59e0b" strokeWidth={2} name="Borderline" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Charts Grid */}
                <div className="charts-grid">
                    <div className="chart-container">
                        <h4>🐄 Species Distribution</h4>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={speciesData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                >
                                    {speciesData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="chart-container">
                        <h4>⚠️ Risk Category Distribution</h4>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={riskData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="category" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill={(entry) => entry.fill} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    };

    const renderReports = () => (
        <div className="reports-section">
            <h3>📄 Generate Reports</h3>
            <div className="reports-grid">
                <div className="report-card">
                    <h4>📊 AMU Usage Report</h4>
                    <p>Comprehensive antimicrobial usage across all farms</p>
                    <button className="btn-primary">Generate Report</button>
                </div>
                <div className="report-card">
                    <h4>🗺️ Geographic Analysis</h4>
                    <p>Regional distribution of treatments and compliance</p>
                    <button className="btn-primary">Generate Report</button>
                </div>
                <div className="report-card">
                    <h4>⚠️ Compliance Report</h4>
                    <p>MRL violations and withdrawal period compliance</p>
                    <button className="btn-primary">Generate Report</button>
                </div>
            </div>
        </div>
    );

    const renderMaps = () => {
        const regionData = [
            { region: 'Karnataka', farms: 45, treatments: 320, risk: 'Medium', riskScore: 65 },
            { region: 'Tamil Nadu', farms: 38, treatments: 280, risk: 'Low', riskScore: 35 },
            { region: 'Kerala', farms: 22, treatments: 150, risk: 'High', riskScore: 85 },
            { region: 'Andhra Pradesh', farms: 31, treatments: 210, risk: 'Medium', riskScore: 55 }
        ];

        return (
            <div className="maps-section">
                <h3>🗺️ Geographic Distribution & Maps</h3>

                {/* Map Controls */}
                <div className="map-controls">
                    <button className="map-btn active">State View</button>
                    <button className="map-btn">District View</button>
                    <button className="map-btn">Risk Heatmap</button>
                    <button className="map-btn">Treatment Density</button>
                </div>

                {/* Map Visualization */}
                <div className="map-visualization">
                    <div className="map-placeholder">
                        <h4>🗺️ Interactive Map</h4>
                        <p>Geographic distribution of farms and risk levels</p>
                        <div className="map-legend">
                            <div className="legend-item">
                                <span className="legend-color high"></span>
                                <span>High Risk</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color medium"></span>
                                <span>Medium Risk</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color low"></span>
                                <span>Low Risk</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Regional Statistics */}
                <div className="regions-grid">
                    {regionData.map(region => (
                        <div key={region.region} className="region-card">
                            <div className="region-header">
                                <h4>{region.region}</h4>
                                <span className={`risk-indicator ${region.risk.toLowerCase()}`}>
                                    {region.risk}
                                </span>
                            </div>
                            <div className="region-stats">
                                <div className="stat">
                                    <span className="stat-label">Farms:</span>
                                    <span className="stat-value">{region.farms}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Treatments:</span>
                                    <span className="stat-value">{region.treatments}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Risk Score:</span>
                                    <span className="stat-value">{region.riskScore}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderAuditTrail = () => (
        <div className="audit-section">
            <h3>🔗 Blockchain Audit Trail</h3>
            <div className="audit-list">
                <div className="audit-item">
                    <div className="audit-icon">🔗</div>
                    <div className="audit-details">
                        <h4>Treatment Record Added</h4>
                        <p>Farm: Green Valley | Animal: COW001 | Medicine: Amoxicillin</p>
                        <p className="audit-time">2 hours ago</p>
                    </div>
                    <div className="audit-hash">Hash: 0x1a2b3c...</div>
                </div>
                <div className="audit-item">
                    <div className="audit-icon">🔗</div>
                    <div className="audit-details">
                        <h4>Prescription Approved</h4>
                        <p>Vet: Dr. Smith | Farm: Sunny Acres | Status: Approved</p>
                        <p className="audit-time">4 hours ago</p>
                    </div>
                    <div className="audit-hash">Hash: 0x4d5e6f...</div>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="authority-analytics-container">
                <Navigation />
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="authority-analytics-container">
            <Navigation />

            <div className="authority-analytics-content">
                <div className="analytics-header">
                    <h1>🏛️ Authority Dashboard</h1>
                    <p className="subtitle">Comprehensive monitoring and oversight</p>
                    {error && <div style={{ color: 'red', padding: '10px', border: '1px solid red' }}>{error}</div>}
                </div>

                {/* Filters */}
                <div className="dashboard-filters">
                    <select
                        value={filters.state}
                        onChange={(e) => setFilters({ ...filters, state: e.target.value, district: '', taluk: '' })}
                    >
                        <option value="">All States</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Kerala">Kerala</option>
                        <option value="Andhra Pradesh">Andhra Pradesh</option>
                        <option value="Maharashtra">Maharashtra</option>
                    </select>

                    {filters.state && (
                        <select
                            value={filters.district}
                            onChange={(e) => setFilters({ ...filters, district: e.target.value, taluk: '' })}
                        >
                            <option value="">All Districts</option>
                            <option value="Bangalore Urban">Bangalore Urban</option>
                            <option value="Bangalore Rural">Bangalore Rural</option>
                            <option value="Mysore">Mysore</option>
                            <option value="Mandya">Mandya</option>
                            <option value="Hassan">Hassan</option>
                        </select>
                    )}

                    {filters.district && (
                        <select
                            value={filters.taluk}
                            onChange={(e) => setFilters({ ...filters, taluk: e.target.value })}
                        >
                            <option value="">All Taluks</option>
                            <option value="Bangalore North">Bangalore North</option>
                            <option value="Bangalore South">Bangalore South</option>
                            <option value="Yelahanka">Yelahanka</option>
                            <option value="Devanahalli">Devanahalli</option>
                        </select>
                    )}
                </div>

                {/* Authority-Specific Tabs */}
                <div className="dashboard-tabs">
                    <button
                        className={activeTab === 'farms' ? 'active' : ''}
                        onClick={() => setActiveTab('farms')}
                    >
                        🏡 All Farms
                    </button>
                    <button
                        className={activeTab === 'prescriptions' ? 'active' : ''}
                        onClick={() => setActiveTab('prescriptions')}
                    >
                        💊 Prescriptions
                    </button>
                    <button
                        className={activeTab === 'analytics' ? 'active' : ''}
                        onClick={() => setActiveTab('analytics')}
                    >
                        📊 Analytics
                    </button>
                    <button
                        className={activeTab === 'maps' ? 'active' : ''}
                        onClick={() => setActiveTab('maps')}
                    >
                        🗺️ Maps
                    </button>
                    <button
                        className={activeTab === 'reports' ? 'active' : ''}
                        onClick={() => setActiveTab('reports')}
                    >
                        📄 Reports
                    </button>
                    <button
                        className={activeTab === 'audit' ? 'active' : ''}
                        onClick={() => setActiveTab('audit')}
                    >
                        🔗 Audit Trail
                    </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'farms' && renderFarms()}
                    {activeTab === 'prescriptions' && renderPrescriptions()}
                    {activeTab === 'analytics' && renderAnalytics()}
                    {activeTab === 'maps' && renderMaps()}
                    {activeTab === 'reports' && renderReports()}
                    {activeTab === 'audit' && renderAuditTrail()}
                </div>
            </div>
        </div>
    );
};

export default AuthorityDashboard;