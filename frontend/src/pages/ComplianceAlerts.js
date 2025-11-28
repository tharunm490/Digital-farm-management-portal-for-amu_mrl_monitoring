import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import axios from 'axios';
import './ComplianceAlerts.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ComplianceAlerts = () => {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [filter, setFilter] = useState('all'); // all, high, medium, low
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            // Fetch treatments and generate alerts
            const response = await axios.get(`${API_URL}/api/treatments`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            const treatments = response.data;
            const generatedAlerts = [];

            treatments.forEach(treatment => {
                // Withdrawal violation check
                if (treatment.withdrawal_end_date) {
                    const withdrawalEnd = new Date(treatment.withdrawal_end_date);
                    const now = new Date();

                    if (withdrawalEnd > now) {
                        generatedAlerts.push({
                            id: `withdrawal-${treatment.treatment_id}`,
                            type: 'withdrawal_violation',
                            severity: 'high',
                            farm: treatment.farm_name || 'Unknown Farm',
                            species: treatment.species,
                            medicine: treatment.medicine,
                            message: `Active withdrawal period until ${withdrawalEnd.toLocaleDateString('en-IN')}`,
                            date: treatment.start_date
                        });
                    }
                }

                // High AMU usage
                if (treatment.risk_category === 'unsafe') {
                    generatedAlerts.push({
                        id: `mrl-${treatment.treatment_id}`,
                        type: 'mrl_risk',
                        severity: 'critical',
                        farm: treatment.farm_name || 'Unknown Farm',
                        species: treatment.species,
                        medicine: treatment.medicine,
                        message: `Unsafe MRL risk detected for ${treatment.medicine}`,
                        date: treatment.start_date
                    });
                }

                // Borderline cases
                if (treatment.risk_category === 'borderline') {
                    generatedAlerts.push({
                        id: `borderline-${treatment.treatment_id}`,
                        type: 'borderline_mrl',
                        severity: 'medium',
                        farm: treatment.farm_name || 'Unknown Farm',
                        species: treatment.species,
                        medicine: treatment.medicine,
                        message: `Borderline MRL levels for ${treatment.medicine}`,
                        date: treatment.start_date
                    });
                }
            });

            setAlerts(generatedAlerts);
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAlerts = filter === 'all'
        ? alerts
        : alerts.filter(a => a.severity === filter);

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'critical';
            case 'high': return 'high';
            case 'medium': return 'medium';
            case 'low': return 'low';
            default: return 'medium';
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical': return '🔴';
            case 'high': return '🟠';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚠️';
        }
    };

    if (loading) {
        return (
            <div className="compliance-alerts-container">
                <Navigation />
                <div className="loading">Loading compliance alerts...</div>
            </div>
        );
    }

    return (
        <div className="compliance-alerts-container">
            <Navigation />

            <div className="compliance-alerts-content">
                <h1>⚠️ Compliance Alerts</h1>
                <p className="subtitle">Monitor violations and high-risk activities across all farms</p>

                {/* Summary Stats */}
                <div className="alert-stats">
                    <div className="stat-card critical">
                        <h3>{alerts.filter(a => a.severity === 'critical').length}</h3>
                        <p>Critical Alerts</p>
                    </div>
                    <div className="stat-card high">
                        <h3>{alerts.filter(a => a.severity === 'high').length}</h3>
                        <p>High Priority</p>
                    </div>
                    <div className="stat-card medium">
                        <h3>{alerts.filter(a => a.severity === 'medium').length}</h3>
                        <p>Medium Priority</p>
                    </div>
                    <div className="stat-card low">
                        <h3>{alerts.filter(a => a.severity === 'low').length}</h3>
                        <p>Low Priority</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="alert-filters">
                    <button
                        className={filter === 'all' ? 'active' : ''}
                        onClick={() => setFilter('all')}
                    >
                        All Alerts ({alerts.length})
                    </button>
                    <button
                        className={filter === 'critical' ? 'active critical' : ''}
                        onClick={() => setFilter('critical')}
                    >
                        Critical ({alerts.filter(a => a.severity === 'critical').length})
                    </button>
                    <button
                        className={filter === 'high' ? 'active high' : ''}
                        onClick={() => setFilter('high')}
                    >
                        High ({alerts.filter(a => a.severity === 'high').length})
                    </button>
                    <button
                        className={filter === 'medium' ? 'active medium' : ''}
                        onClick={() => setFilter('medium')}
                    >
                        Medium ({alerts.filter(a => a.severity === 'medium').length})
                    </button>
                </div>

                {/* Alerts List */}
                <div className="alerts-list">
                    {filteredAlerts.length === 0 ? (
                        <div className="empty-state">
                            <p>✅ No {filter !== 'all' ? filter : ''} alerts found. All farms are compliant!</p>
                        </div>
                    ) : (
                        filteredAlerts.map(alert => (
                            <div key={alert.id} className={`alert-item ${getSeverityColor(alert.severity)}`}>
                                <div className="alert-icon">
                                    {getSeverityIcon(alert.severity)}
                                </div>
                                <div className="alert-content">
                                    <div className="alert-header">
                                        <h3>{alert.farm}</h3>
                                        <span className={`severity-badge ${getSeverityColor(alert.severity)}`}>
                                            {alert.severity.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="alert-message">{alert.message}</p>
                                    <div className="alert-meta">
                                        <span>🐄 {alert.species}</span>
                                        <span>💊 {alert.medicine}</span>
                                        <span>📅 {new Date(alert.date).toLocaleDateString('en-IN')}</span>
                                    </div>
                                </div>
                                <div className="alert-actions">
                                    <button onClick={() => navigate('/farms')} className="btn-view">
                                        View Farm
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="action-buttons">
                    <button onClick={() => navigate('/authority/analytics')} className="btn-primary">
                        📈 View Analytics
                    </button>
                    <button onClick={() => navigate('/dashboard')} className="btn-secondary">
                        🏠 Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComplianceAlerts;
