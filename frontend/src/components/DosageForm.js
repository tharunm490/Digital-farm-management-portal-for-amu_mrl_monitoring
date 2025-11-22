import React, { useState, useEffect } from 'react';
import dosageData from '../data/dosage_reference_full_extended.json';
import { predictAPI } from '../services/api';

const DosageForm = () => {
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState('');
  const [doseMin, setDoseMin] = useState('');
  const [doseMax, setDoseMax] = useState('');
  const [doseUnit, setDoseUnit] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [selectedCause, setSelectedCause] = useState('');
  const [selectedMatrix, setSelectedMatrix] = useState('milk');
  const [predictionResult, setPredictionResult] = useState(null);

  const speciesOptions = Object.keys(dosageData);
  const categoryOptions = selectedSpecies ? Object.keys(dosageData[selectedSpecies]) : [];
  const medicineOptions = selectedSpecies && selectedCategory ? Object.keys(dosageData[selectedSpecies][selectedCategory]) : [];

  const getAllowedRoutes = (species) => {
    if (['cattle', 'goat', 'sheep'].includes(species)) {
      return ['IM', 'IV', 'SC', 'oral'];
    } else if (['pig', 'poultry'].includes(species)) {
      return ['water', 'feed', 'oral'];
    }
    return [];
  };

  const getFilteredRoutes = () => {
    if (!selectedSpecies || !selectedCategory || !selectedMedicine) return [];
    const medicineData = dosageData[selectedSpecies][selectedCategory][selectedMedicine];
    const allowedRoutes = getAllowedRoutes(selectedSpecies);
    return medicineData.ui.route_dropdown.filter(route => allowedRoutes.includes(route));
  };

  const getDefaultRoute = () => {
    const filteredRoutes = getFilteredRoutes();
    const medicineData = dosageData[selectedSpecies][selectedCategory][selectedMedicine];
    const defaultRoute = medicineData.ui.route_default;
    return filteredRoutes.includes(defaultRoute) ? defaultRoute : filteredRoutes[0] || '';
  };

  const getFrequencyOptions = () => {
    return [1, 2, 3, 4, 5];
  };

  const adjustFrequency = (delta) => {
    const newVal = parseInt(selectedFrequency) + delta;
    if (newVal >= 1 && newVal <= 5) setSelectedFrequency(newVal.toString());
  };

  const adjustDuration = (delta) => {
    const newVal = parseInt(selectedDuration) + delta;
    if (newVal >= 1) setSelectedDuration(newVal.toString());
  };

  useEffect(() => {
    if (selectedMedicine) {
      const medicineData = dosageData[selectedSpecies][selectedCategory][selectedMedicine];
      setDoseMin(medicineData.recommended_doses.safe.min);
      setDoseMax(medicineData.recommended_doses.safe.max);
      setDoseUnit(medicineData.recommended_doses.safe.unit);
      setSelectedRoute(getDefaultRoute());
      setSelectedFrequency(getFrequencyOptions()[0] || '');
      setSelectedDuration(getDurationOptions()[0] || '');
      setPredictionResult(null);
    }
  }, [selectedMedicine]);

  useEffect(() => {
    setSelectedMatrix(selectedSpecies ? (['cattle'].includes(selectedSpecies) ? 'milk' : 'meat') : '');
  }, [selectedSpecies]);

  const handlePredict = async () => {
    const data = {
      species: selectedSpecies,
      medication_type: selectedCategory,
      medicine: selectedMedicine,
      route: selectedRoute,
      dose_amount: parseFloat(doseMin),
      dose_unit: doseUnit,
      frequency_per_day: parseInt(selectedFrequency),
      duration_days: parseInt(selectedDuration),
      matrix: selectedMatrix
    };
    try {
      const result = await predictAPI.predict(data);
      setPredictionResult(result.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h2>Dosage Form</h2>
      <div>
        <label>Species:</label>
        <select value={selectedSpecies} onChange={e => setSelectedSpecies(e.target.value)}>
          <option value="">Select Species</option>
          {speciesOptions.map(species => (
            <option key={species} value={species}>{species}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Category:</label>
        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} disabled={!selectedSpecies}>
          <option value="">Select Category</option>
          {categoryOptions.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Medicine:</label>
        <select value={selectedMedicine} onChange={e => setSelectedMedicine(e.target.value)} disabled={!selectedCategory}>
          <option value="">Select Medicine</option>
          {medicineOptions.map(medicine => (
            <option key={medicine} value={medicine}>{medicine}</option>
          ))}
        </select>
      </div>
      {selectedMedicine && (
        <>
          <div>
            <label>Recommended Dose:</label>
            <input type="number" value={doseMin} onChange={e => setDoseMin(e.target.value)} /> - <input type="number" value={doseMax} readOnly /> {doseUnit}
          </div>
          <div>
            <label>Route:</label>
            <select value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)}>
              {getFilteredRoutes().map(route => (
                <option key={route} value={route}>{route}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Matrix:</label>
            <select value={selectedMatrix} onChange={e => setSelectedMatrix(e.target.value)}>
              <option value="milk">milk</option>
              <option value="meat">meat</option>
            </select>
          </div>
          <div className="form-row two-cols">
            <div className="form-group">
              <label>Frequency (per day) *</label>
              <div className="frequency-input-group">
                <button type="button" className="adjust-btn" onClick={() => adjustFrequency(-1)}>-</button>
                <input
                  type="number"
                  value={selectedFrequency}
                  onChange={e => setSelectedFrequency(e.target.value)}
                  min="1"
                  max="5"
                  className="form-control"
                  required
                />
                <button type="button" className="adjust-btn" onClick={() => adjustFrequency(1)}>+</button>
              </div>
              <small className="form-help">💡 Select from recommended frequency options</small>
            </div>
            <div className="form-group">
              <label>Duration (days) *</label>
              <div className="duration-input-group">
                <button type="button" className="adjust-btn" onClick={() => adjustDuration(-1)}>-</button>
                <input
                  type="number"
                  value={selectedDuration}
                  onChange={e => setSelectedDuration(e.target.value)}
                  min="1"
                  className="form-control"
                  required
                />
                <button type="button" className="adjust-btn" onClick={() => adjustDuration(1)}>+</button>
              </div>
              <small className="form-help">💡 Use +/- buttons to adjust or select from dropdown</small>
            </div>
          </div>
          <button style={{ marginTop: '20px' }} onClick={handlePredict}>Predict Safety</button>
          {predictionResult && (
            <div style={{ marginTop: '10px' }}>
              Predicted Risk: {predictionResult.risk_category}
              {predictionResult.risk_category === 'unsafe' && <div style={{color: 'red'}}>Over dosage given</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DosageForm;
