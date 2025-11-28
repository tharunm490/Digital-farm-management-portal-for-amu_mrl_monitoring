import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import axios from 'axios';
import './WithdrawalAlerts.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const WithdrawalAlerts = () => {
    const navigate = useNavigate();
    const [activeWithdrawals, setActiveWithdrawals] = useState([]);
    const [upcomingSafe, setUpcomingSafe] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWithdrawalData();
    }, []);

    const fetchWithdrawalData = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));

            // Fetch AMU records with withdrawal info
            const response = await axios.get(`${API_URL}/api/amu/farmer/${user.farmer_id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            const amuData = response.data?.data || response.data || [];
            const amuRecords = Array.isArray(amuData) ? amuData : [];
            const now = new Date();

            // Filter active withdrawals
            const active = amuRecords.filter(record => {
                if (!record.safe_date) return false;
                const safeDate = new Date(record.safe_date);
                return safeDate > now;
            });

            // Filter upcoming safe dates (next 7 days)
            const upcoming = amuRecords.filter(record => {
                if (!record.safe_date) return false;
                const safeDate = new Date(record.safe_date);
                const daysDiff = Math.ceil((safeDate - now) / (1000 * 60 * 60 * 24));
                return daysDiff >= 0 && daysDiff <= 7;
            });

            setActiveWithdrawals(active);
            setUpcomingSafe(upcoming);
        } catch (error) {
            console.error('Failed to fetch withdrawal data:', error);
            setActiveWithdrawals([]);
            setUpcomingSafe([]);
        } finally {
            setLoading(false);
        }
    };

    const getDaysRemaining = (safeDate) => {
        const now = new Date();
        const safe = new Date(safeDate);
        const days = Math.ceil((safe - now) / (1000 * 60 * 60 * 24));
        return days;
    };

    const getStatusColor = (days) => {
        if (days <= 0) return 'green';
        if (days <= 3) return 'yellow';
        return 'red';
    };

    if (loading) {
        return (
            <div className="withdrawal-alerts-container">
                <Navigation />
                <div className="loading">Loading withdrawal information...</div>
            </div>
        );
    }

    return (
        <div className="withdrawal-alerts-container">
            <Navigation />

            <div className="withdrawal-alerts-content">
                <h1>⏰ Withdrawal Period Alerts</h1>
                <p className="subtitle">Monitor safe sale dates for your animals and products</p>

                {/* Summary Cards */}
                <div className="summary-cards">
                    <div className="summary-card danger">
                        <div className="card-icon">🚫</div>
                        <div className="card-content">
                            <h3>{activeWithdrawals.length}</h3>
                            <p>Active Withdrawals</p>
                        </div>
                    </div>

                    <div className="summary-card success">
                        <div className="card-icon">✅</div>
                        <div className="card-content">
                            <h3>{upcomingSafe.length}</h3>
                            <p>Safe Within 7 Days</p>
                        </div>
                    </div>
                </div>

                {/* Active Withdrawals */}
                <div className="alerts-section">
                    <h2>🔴 Active Withdrawal Periods</h2>
                    {activeWithdrawals.length === 0 ? (
                        <div className="empty-state">
                            <p>✅ No active withdrawal periods. All animals are safe for sale!</p>
                        </div>
                    ) : (
                        <div className="alerts-grid">
                            {activeWithdrawals.map(record => {
                                const daysRemaining = getDaysRemaining(record.safe_date);
                                const statusColor = getStatusColor(daysRemaining);

                                return (
                                    <div key={record.amu_id} className={`alert-card ${statusColor}`}>
                                        <div className="alert-header">
                                            <h3>{record.medicine}</h3>
                                            <span className={`status-badge ${statusColor}`}>
                                                {daysRemaining} days left
                                            </span>
                                        </div>

                                        <div className="alert-details">
                                            <div className="detail-row">
                                                <span className="label">Species:</span>
                                                <span className="value">{record.species}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="label">Matrix:</span>
                                                <span className="value">{record.matrix}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="label">Treatment End:</span>
                                                <span className="value">{new Date(record.end_date).toLocaleDateString('en-IN')}</span>
                                            </div>
                                            <div className="detail-row">
                                                <span className="label">Safe Date:</span>
                                                <span className="value safe-date">{new Date(record.safe_date).toLocaleDateString('en-IN')}</span>
                                            </div>
                                        </div>

                                        <div className="alert-warning">
                                            ⚠️ Do not sell {record.matrix} until {new Date(record.safe_date).toLocaleDateString('en-IN')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Upcoming Safe Dates */}
                <div className="alerts-section">
                    <h2>🟢 Upcoming Safe Dates (Next 7 Days)</h2>
                    {upcomingSafe.length === 0 ? (
                        <div className="empty-state">
                            <p>No products becoming safe in the next 7 days.</p>
                        </div>
                    ) : (
                        <div className="timeline">
                            {upcomingSafe.map(record => (
                                <div key={record.amu_id} className="timeline-item">
                                    <div className="timeline-date">
                                        {new Date(record.safe_date).toLocaleDateString('en-IN', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </div>
                                    <div className="timeline-content">
                                        <h4>{record.medicine} - {record.species}</h4>
                                        <p>{record.matrix} safe for sale</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="action-buttons">
                    <button onClick={() => navigate('/treatments')} className="btn-primary">
                        View All Treatments
                    </button>
                    <button onClick={() => navigate('/dashboard')} className="btn-secondary">
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WithdrawalAlerts;
