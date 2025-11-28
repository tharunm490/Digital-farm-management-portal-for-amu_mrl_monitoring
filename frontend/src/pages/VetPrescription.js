import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import axios from 'axios';
import './VetPrescription.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const VetPrescription = () => {
    const navigate = useNavigate();
    const [farms, setFarms] = useState([]);
    const [entities, setEntities] = useState([]);
    const [selectedFarm, setSelectedFarm] = useState('');
    const [selectedEntity, setSelectedEntity] = useState('');
    const [formData, setFormData] = useState({
        diagnosis: '',
        medicine: '',
        medication_type: 'antibiotic',
        dose_amount: '',
        dose_unit: 'ml',
        route: 'IM',
        frequency_per_day: '',
        duration_days: '',
        reason: '',
        cause: ''
    });
    const [withdrawalInfo, setWithdrawalInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchFarms();
    }, []);

    useEffect(() => {
        if (selectedFarm) {
            fetchEntities(selectedFarm);
        }
    }, [selectedFarm]);

    const fetchFarms = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/farms`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setFarms(response.data);
        } catch (err) {
            setError('Failed to load farms');
        }
    };

    const fetchEntities = async (farmId) => {
        try {
            const response = await axios.get(`${API_URL}/api/entities/farm/${farmId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setEntities(response.data);
        } catch (err) {
            setError('Failed to load animals');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const calculateWithdrawal = () => {
        // Simple withdrawal calculation based on medication type
        const withdrawalDays = {
            'antibiotic': 7,
            'antiparasitic': 14,
            'anti-inflammatory': 3,
            'NSAID': 3,
            'vitamin': 0,
            'vaccine': 0,
            'hormonal': 21,
            'other': 7
        };

        const days = withdrawalDays[formData.medication_type] || 7;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + parseInt(formData.duration_days || 0) + days);

        setWithdrawalInfo({
            withdrawalDays: days,
            safeDate: endDate.toLocaleDateString('en-IN'),
            warning: days > 0 ? 'Products cannot be sold until safe date' : 'No withdrawal period required'
        });
    };

    useEffect(() => {
        if (formData.medication_type && formData.duration_days) {
            calculateWithdrawal();
        }
    }, [formData.medication_type, formData.duration_days]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const user = JSON.parse(localStorage.getItem('user'));

            const treatmentData = {
                entity_id: selectedEntity,
                user_id: user.user_id,
                vet_id: user.user_id,
                vet_name: user.full_name,
                ...formData,
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + formData.duration_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };

            await axios.post(`${API_URL}/api/treatments`, treatmentData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            setSuccess('✅ Prescription created successfully!');
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create prescription');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="vet-prescription-container">
            <Navigation />

            <div className="vet-prescription-content">
                <h1>📋 Create E-Prescription</h1>
                <p className="subtitle">Issue digital prescription for animal treatment</p>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <form onSubmit={handleSubmit} className="prescription-form">
                    {/* Farm Selection */}
                    <div className="form-section">
                        <h3>1. Select Farm & Animal</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Farm *</label>
                                <select
                                    value={selectedFarm}
                                    onChange={(e) => setSelectedFarm(e.target.value)}
                                    required
                                >
                                    <option value="">Select Farm</option>
                                    {farms.map(farm => (
                                        <option key={farm.farm_id} value={farm.farm_id}>
                                            {farm.farm_name} - {farm.farmer_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Animal/Batch *</label>
                                <select
                                    value={selectedEntity}
                                    onChange={(e) => setSelectedEntity(e.target.value)}
                                    required
                                    disabled={!selectedFarm}
                                >
                                    <option value="">Select Animal/Batch</option>
                                    {entities.map(entity => (
                                        <option key={entity.entity_id} value={entity.entity_id}>
                                            {entity.entity_type === 'animal' ? `${entity.tag_id} (${entity.species})` : `${entity.batch_name} (${entity.batch_count} ${entity.species})`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Diagnosis */}
                    <div className="form-section">
                        <h3>2. Diagnosis & Indication</h3>
                        <div className="form-group">
                            <label>Diagnosis *</label>
                            <input
                                type="text"
                                name="diagnosis"
                                value={formData.diagnosis}
                                onChange={handleChange}
                                placeholder="e.g., Mastitis, Respiratory infection"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Reason</label>
                                <input
                                    type="text"
                                    name="reason"
                                    value={formData.reason}
                                    onChange={handleChange}
                                    placeholder="Treatment reason"
                                />
                            </div>

                            <div className="form-group">
                                <label>Cause</label>
                                <input
                                    type="text"
                                    name="cause"
                                    value={formData.cause}
                                    onChange={handleChange}
                                    placeholder="Disease cause"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Medication */}
                    <div className="form-section">
                        <h3>3. Medication Details</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Medicine Name *</label>
                                <input
                                    type="text"
                                    name="medicine"
                                    value={formData.medicine}
                                    onChange={handleChange}
                                    placeholder="e.g., Oxytetracycline"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Medication Type *</label>
                                <select
                                    name="medication_type"
                                    value={formData.medication_type}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="antibiotic">Antibiotic</option>
                                    <option value="antiparasitic">Antiparasitic</option>
                                    <option value="anti-inflammatory">Anti-inflammatory</option>
                                    <option value="NSAID">NSAID</option>
                                    <option value="vitamin">Vitamin</option>
                                    <option value="vaccine">Vaccine</option>
                                    <option value="hormonal">Hormonal</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Dose Amount *</label>
                                <input
                                    type="number"
                                    name="dose_amount"
                                    value={formData.dose_amount}
                                    onChange={handleChange}
                                    step="0.1"
                                    placeholder="10"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Dose Unit *</label>
                                <select
                                    name="dose_unit"
                                    value={formData.dose_unit}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="ml">ml</option>
                                    <option value="mg">mg</option>
                                    <option value="g">g</option>
                                    <option value="tablet">tablet</option>
                                    <option value="sachet">sachet</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Route *</label>
                                <select
                                    name="route"
                                    value={formData.route}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="IM">IM (Intramuscular)</option>
                                    <option value="IV">IV (Intravenous)</option>
                                    <option value="SC">SC (Subcutaneous)</option>
                                    <option value="oral">Oral</option>
                                    <option value="water">Water</option>
                                    <option value="feed">Feed</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Frequency (per day) *</label>
                                <input
                                    type="number"
                                    name="frequency_per_day"
                                    value={formData.frequency_per_day}
                                    onChange={handleChange}
                                    placeholder="2"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Duration (days) *</label>
                                <input
                                    type="number"
                                    name="duration_days"
                                    value={formData.duration_days}
                                    onChange={handleChange}
                                    placeholder="5"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Withdrawal Info */}
                    {withdrawalInfo && (
                        <div className="withdrawal-info">
                            <h3>⏰ Withdrawal Period Information</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="label">Withdrawal Days:</span>
                                    <span className="value">{withdrawalInfo.withdrawalDays} days</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Safe Sale Date:</span>
                                    <span className="value">{withdrawalInfo.safeDate}</span>
                                </div>
                                <div className="info-item warning">
                                    <span className="label">⚠️ Warning:</span>
                                    <span className="value">{withdrawalInfo.warning}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : '✅ Create Prescription'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VetPrescription;
