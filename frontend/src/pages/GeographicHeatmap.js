import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import axios from 'axios';
import './GeographicHeatmap.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const GeographicHeatmap = () => {
    const navigate = useNavigate();
    const [level, setLevel] = useState('district'); // village, taluk, district, state
    const [selectedState, setSelectedState] = useState('Karnataka');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedTaluk, setSelectedTaluk] = useState('');
    const [amuData, setAmuData] = useState([]);
    const [loading, setLoading] = useState(true);

    // India-specific data
    const states = [
        'Andhra Pradesh', 'Karnataka', 'Kerala', 'Tamil Nadu', 'Telangana',
        'Maharashtra', 'Gujarat', 'Rajasthan', 'Punjab', 'Haryana',
        'Uttar Pradesh', 'Bihar', 'West Bengal', 'Odisha', 'Madhya Pradesh'
    ];

    const districtsByState = {
        'Karnataka': ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Mandya', 'Hassan', 'Tumakuru', 'Kolar', 'Chikkaballapur', 'Ramanagara', 'Chitradurga', 'Davanagere', 'Shivamogga', 'Belagavi', 'Vijayapura', 'Bagalkot', 'Dharwad', 'Gadag', 'Haveri', 'Uttara Kannada', 'Ballari', 'Koppal', 'Raichur', 'Kalaburagi', 'Bidar', 'Yadgir', 'Chamarajanagar', 'Kodagu', 'Dakshina Kannada', 'Udupi', 'Chikkamagaluru', 'Vijayanagara'],
        'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli'],
        'Kerala': ['Thiruvananthapuram', 'Kollam', 'Kottayam', 'Ernakulam', 'Thrissur', 'Kozhikode'],
        'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur'],
        'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar'],
        'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali'],
        'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal', 'Hisar'],
        'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut'],
        'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman']
    };

    const taluksByDistrict = {
        'Bengaluru Urban': ['Bengaluru North', 'Bengaluru South', 'Anekal', 'Bengaluru East'],
        'Mysuru': ['Mysuru', 'Hunsur', 'K.R. Nagar', 'Periyapatna', 'T. Narasipura'],
        'Mandya': ['Mandya', 'Maddur', 'Malavalli', 'Nagamangala', 'Pandavapura', 'Srirangapatna'],
        'Hassan': ['Hassan', 'Alur', 'Arkalgud', 'Arsikere', 'Belur', 'Channarayapatna', 'Holenarasipura', 'Sakleshpur']
    };

    useEffect(() => {
        fetchAMUData();
    }, [level, selectedState, selectedDistrict, selectedTaluk]);

    const fetchAMUData = async () => {
        try {
            setLoading(true);

            // Fetch all farms and treatments
            const [farmsRes, treatmentsRes] = await Promise.all([
                axios.get(`${API_URL}/api/farms`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }),
                axios.get(`${API_URL}/api/treatments`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            const farms = farmsRes.data;
            const treatments = treatmentsRes.data;

            // Aggregate AMU data by geographic level
            const aggregated = {};

            farms.forEach(farm => {
                let key;
                switch (level) {
                    case 'state':
                        key = farm.state || 'Unknown';
                        break;
                    case 'district':
                        if (!selectedState || farm.state === selectedState) {
                            key = farm.district || 'Unknown';
                        }
                        break;
                    case 'taluk':
                        if ((!selectedState || farm.state === selectedState) &&
                            (!selectedDistrict || farm.district === selectedDistrict)) {
                            key = farm.taluk || farm.block || 'Unknown';
                        }
                        break;
                    case 'village':
                        if ((!selectedState || farm.state === selectedState) &&
                            (!selectedDistrict || farm.district === selectedDistrict) &&
                            (!selectedTaluk || farm.taluk === selectedTaluk)) {
                            key = farm.village || farm.location || 'Unknown';
                        }
                        break;
                    default:
                        key = farm.district || 'Unknown';
                }

                if (key) {
                    if (!aggregated[key]) {
                        aggregated[key] = {
                            name: key,
                            farms: 0,
                            treatments: 0,
                            unsafe: 0,
                            borderline: 0,
                            safe: 0,
                            amuIntensity: 0
                        };
                    }
                    aggregated[key].farms++;
                }
            });

            // Add treatment data
            treatments.forEach(treatment => {
                const farm = farms.find(f => f.farm_id === treatment.farm_id);
                if (!farm) return;

                let key;
                switch (level) {
                    case 'state':
                        key = farm.state || 'Unknown';
                        break;
                    case 'district':
                        if (!selectedState || farm.state === selectedState) {
                            key = farm.district || 'Unknown';
                        }
                        break;
                    case 'taluk':
                        if ((!selectedState || farm.state === selectedState) &&
                            (!selectedDistrict || farm.district === selectedDistrict)) {
                            key = farm.taluk || farm.block || 'Unknown';
                        }
                        break;
                    case 'village':
                        if ((!selectedState || farm.state === selectedState) &&
                            (!selectedDistrict || farm.district === selectedDistrict) &&
                            (!selectedTaluk || farm.taluk === selectedTaluk)) {
                            key = farm.village || farm.location || 'Unknown';
                        }
                        break;
                    default:
                        key = farm.district || 'Unknown';
                }

                if (key && aggregated[key]) {
                    aggregated[key].treatments++;

                    if (treatment.risk_category === 'unsafe') aggregated[key].unsafe++;
                    else if (treatment.risk_category === 'borderline') aggregated[key].borderline++;
                    else aggregated[key].safe++;
                }
            });

            // Calculate AMU intensity (treatments per farm)
            Object.values(aggregated).forEach(area => {
                area.amuIntensity = area.farms > 0 ? (area.treatments / area.farms).toFixed(2) : 0;
            });

            setAmuData(Object.values(aggregated).sort((a, b) => b.amuIntensity - a.amuIntensity));
        } catch (error) {
            console.error('Failed to fetch AMU data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getIntensityColor = (intensity) => {
        if (intensity >= 10) return 'very-high';
        if (intensity >= 7) return 'high';
        if (intensity >= 4) return 'medium';
        if (intensity >= 2) return 'low';
        return 'very-low';
    };

    const getRiskColor = (area) => {
        const totalTreatments = area.unsafe + area.borderline + area.safe;
        if (totalTreatments === 0) return 'safe';

        const unsafePercent = (area.unsafe / totalTreatments) * 100;
        if (unsafePercent >= 20) return 'critical';
        if (unsafePercent >= 10) return 'high';
        if (unsafePercent >= 5) return 'medium';
        return 'low';
    };

    return (
        <div className="geographic-heatmap-container">
            <Navigation />

            <div className="geographic-heatmap-content">
                <h1>🗺️ Geographic AMU Heatmap</h1>
                <p className="subtitle">India-specific antimicrobial usage monitoring at village, taluk, district, and state levels</p>

                {/* Level Selection */}
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
                        🏛️ District Level
                    </button>
                    <button
                        className={level === 'taluk' ? 'active' : ''}
                        onClick={() => setLevel('taluk')}
                    >
                        🏘️ Taluk Level
                    </button>
                    <button
                        className={level === 'village' ? 'active' : ''}
                        onClick={() => setLevel('village')}
                    >
                        🏡 Village Level
                    </button>
                </div>

                {/* Geographic Filters */}
                <div className="geographic-filters">
                    {(level === 'district' || level === 'taluk' || level === 'village') && (
                        <div className="filter-group">
                            <label>State:</label>
                            <select value={selectedState} onChange={(e) => {
                                setSelectedState(e.target.value);
                                setSelectedDistrict('');
                                setSelectedTaluk('');
                            }}>
                                {states.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(level === 'taluk' || level === 'village') && selectedState && (
                        <div className="filter-group">
                            <label>District:</label>
                            <select value={selectedDistrict} onChange={(e) => {
                                setSelectedDistrict(e.target.value);
                                setSelectedTaluk('');
                            }}>
                                <option value="">All Districts</option>
                                {(districtsByState[selectedState] || []).map(district => (
                                    <option key={district} value={district}>{district}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {level === 'village' && selectedDistrict && (
                        <div className="filter-group">
                            <label>Taluk:</label>
                            <select value={selectedTaluk} onChange={(e) => setSelectedTaluk(e.target.value)}>
                                <option value="">All Taluks</option>
                                {(taluksByDistrict[selectedDistrict] || []).map(taluk => (
                                    <option key={taluk} value={taluk}>{taluk}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="heatmap-legend">
                    <h3>AMU Intensity Legend (Treatments per Farm)</h3>
                    <div className="legend-items">
                        <div className="legend-item very-high">
                            <span className="color-box"></span>
                            <span>Very High (≥10)</span>
                        </div>
                        <div className="legend-item high">
                            <span className="color-box"></span>
                            <span>High (7-9)</span>
                        </div>
                        <div className="legend-item medium">
                            <span className="color-box"></span>
                            <span>Medium (4-6)</span>
                        </div>
                        <div className="legend-item low">
                            <span className="color-box"></span>
                            <span>Low (2-3)</span>
                        </div>
                        <div className="legend-item very-low">
                            <span className="color-box"></span>
                            <span>Very Low (&lt;2)</span>
                        </div>
                    </div>
                </div>

                {/* Heatmap Grid */}
                {loading ? (
                    <div className="loading">Loading geographic data...</div>
                ) : (
                    <div className="heatmap-grid">
                        {amuData.length === 0 ? (
                            <div className="empty-state">
                                <p>No data available for the selected geographic level.</p>
                            </div>
                        ) : (
                            amuData.map((area, index) => (
                                <div
                                    key={index}
                                    className={`heatmap-card ${getIntensityColor(area.amuIntensity)} ${getRiskColor(area)}-risk`}
                                >
                                    <div className="card-header">
                                        <h3>{area.name}</h3>
                                        <span className="intensity-badge">{area.amuIntensity}</span>
                                    </div>

                                    <div className="card-stats">
                                        <div className="stat">
                                            <span className="label">🏡 Farms:</span>
                                            <span className="value">{area.farms}</span>
                                        </div>
                                        <div className="stat">
                                            <span className="label">💊 Treatments:</span>
                                            <span className="value">{area.treatments}</span>
                                        </div>
                                    </div>

                                    <div className="risk-breakdown">
                                        <div className="risk-bar">
                                            <div
                                                className="risk-segment safe"
                                                style={{ width: `${(area.safe / area.treatments * 100) || 0}%` }}
                                            ></div>
                                            <div
                                                className="risk-segment borderline"
                                                style={{ width: `${(area.borderline / area.treatments * 100) || 0}%` }}
                                            ></div>
                                            <div
                                                className="risk-segment unsafe"
                                                style={{ width: `${(area.unsafe / area.treatments * 100) || 0}%` }}
                                            ></div>
                                        </div>
                                        <div className="risk-labels">
                                            <span>✅ {area.safe}</span>
                                            <span>⚠️ {area.borderline}</span>
                                            <span>🔴 {area.unsafe}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                <div className="action-buttons">
                    <button onClick={() => navigate('/authority/analytics')} className="btn-primary">
                        📊 View Analytics
                    </button>
                    <button onClick={() => navigate('/dashboard')} className="btn-secondary">
                        🏠 Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GeographicHeatmap;
