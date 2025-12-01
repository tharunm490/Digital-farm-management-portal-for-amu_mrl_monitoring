import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import api from '../services/api';
import Navigation from '../components/Navigation';
import './ApplyForLoan.css';

const ApplyForLoan = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [noFarms, setNoFarms] = useState(false);
  
  const [formData, setFormData] = useState({
    farm_id: '',
    purpose: '',
    amount_requested: '',
    description: ''
  });

  const purposeOptions = [
    { value: 'animal_purchase', labelKey: 'animal_purchase' },
    { value: 'feed_nutrition', labelKey: 'feed_nutrition_loan' },
    { value: 'farm_infrastructure', labelKey: 'farm_infrastructure' }
  ];

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const response = await api.get('/loans/farmer/farms');
      if (response.data && response.data.length > 0) {
        setFarms(response.data);
        setNoFarms(false);
      } else {
        setFarms([]);
        setNoFarms(true);
      }
    } catch (err) {
      console.error('Error fetching farms:', err);
      if (err.response?.status === 404) {
        setNoFarms(true);
        setError('');
      } else {
        setError('Failed to load farms. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.farm_id) {
      setError(t('please_select_farm'));
      return;
    }
    if (!formData.purpose) {
      setError(t('please_select_purpose'));
      return;
    }
    if (!formData.amount_requested || parseFloat(formData.amount_requested) <= 0) {
      setError(t('please_enter_valid_amount'));
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post('/loans/apply', {
        farm_id: parseInt(formData.farm_id),
        purpose: formData.purpose,
        amount_requested: parseFloat(formData.amount_requested),
        description: formData.description || null
      });

      setSuccess(response.data.message);
      setFormData({
        farm_id: '',
        purpose: '',
        amount_requested: '',
        description: ''
      });

      // Redirect to loan status after 2 seconds
      setTimeout(() => {
        navigate('/loan-status');
      }, 2000);
    } catch (err) {
      console.error('Error submitting loan application:', err);
      setError(err.response?.data?.error || 'Failed to submit loan application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="apply-loan-container">
          <div className="loading-spinner">{t('loading')}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="apply-loan-container">
        <div className="apply-loan-header">
          <h1>💰 {t('apply_financial_assistance')}</h1>
          <p>{t('submit_loan_application')}</p>
        </div>

        {noFarms ? (
          <div className="no-farms-card">
            <div className="no-farms-icon">🏡</div>
            <h3>{t('no_farms_registered')}</h3>
            <p>{t('register_farm_before_loan')}</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/add-farm')}
            >
              ➕ {t('register_a_farm')}
            </button>
          </div>
        ) : (
          <div className="apply-loan-card">
            <form onSubmit={handleSubmit} className="loan-form">
              {error && (
                <div className="alert alert-error">
                  <span className="alert-icon">❌</span>
                  {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success">
                  <span className="alert-icon">✅</span>
                  {success}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="farm_id">
                  <span className="label-icon">🏡</span>
                  {t('select_farm')} <span className="required">*</span>
            </label>
            <select
              id="farm_id"
              name="farm_id"
              value={formData.farm_id}
              onChange={handleChange}
              className="form-control"
              disabled={submitting}
            >
              <option value="">{t('select_a_farm')}</option>
              {farms.map(farm => (
                <option key={farm.farm_id} value={farm.farm_id}>
                  {farm.farm_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="purpose">
              <span className="label-icon">🎯</span>
              {t('loan_purpose')} <span className="required">*</span>
            </label>
            <select
              id="purpose"
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              className="form-control"
              disabled={submitting}
            >
              <option value="">{t('select_purpose')}</option>
              {purposeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="amount_requested">
              <span className="label-icon">💵</span>
              {t('amount_requested')} <span className="required">*</span>
            </label>
            <input
              type="number"
              id="amount_requested"
              name="amount_requested"
              value={formData.amount_requested}
              onChange={handleChange}
              className="form-control"
              placeholder={t('enter_amount_rupees')}
              min="1"
              step="0.01"
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">
              <span className="label-icon">📝</span>
              {t('description_reason')}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-control"
              placeholder={t('provide_additional_details')}
              rows="4"
              disabled={submitting}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/dashboard')}
              disabled={submitting}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? t('submitting') : t('submit_application')}
            </button>
          </div>
        </form>
          </div>
        )}

        <div className="loan-info-card">
          <h3>ℹ️ {t('important_information')}</h3>
          <ul>
            <li>{t('loan_info_1')}</li>
            <li>{t('loan_info_2')}</li>
            <li>{t('loan_info_3')}</li>
            <li>{t('loan_info_4')}</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default ApplyForLoan;
