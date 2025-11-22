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

  // Species restrictions for routes
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
    if (!selectedSpecies || !selectedCategory || !selectedMedicine) return [];
    return dosageData[selectedSpecies][selectedCategory][selectedMedicine].ui.frequency_dropdown;
  };

  const getDurationOptions = () => {
    if (!selectedSpecies || !selectedCategory || !selectedMedicine) return [];
    return dosageData[selectedSpecies][selectedCategory][selectedMedicine].ui.duration_dropdown;
  };

  const getReasonOptions = () => {
    if (!selectedSpecies || !selectedCategory || !selectedMedicine) return [];
    return dosageData[selectedSpecies][selectedCategory][selectedMedicine].ui.reasons_dropdown;
  };

  const getCauseOptions = () => {
    if (!selectedSpecies || !selectedCategory || !selectedMedicine) return [];
    return dosageData[selectedSpecies][selectedCategory][selectedMedicine].ui.causes_dropdown;
  };

  const getMatrixOptions = () => {
    if (['cattle'].includes(selectedSpecies)) return ['milk', 'meat'];
    if (['goat', 'sheep'].includes(selectedSpecies)) return ['meat'];
    if (['pig'].includes(selectedSpecies)) return ['meat'];
    if (['poultry'].includes(selectedSpecies)) return ['meat', 'eggs'];
    return [];
  };

  const isManualAdjustAllowed = () => {
    if (!selectedSpecies || !selectedCategory || !selectedMedicine) return false;
    return dosageData[selectedSpecies][selectedCategory][selectedMedicine].ui.manual_adjust_allowed;
  };

  const isVaccine = () => {
    return selectedCategory === 'vaccine';
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
      setSelectedReason(getReasonOptions()[0] || '');
      setSelectedCause(getCauseOptions()[0] || '');
      setPredictionResult(null);
    }
  }, [selectedMedicine]);

  useEffect(() => {
    setSelectedMatrix(getMatrixOptions()[0] || '');
  }, [selectedSpecies]);

  const handleSpeciesChange = (e) => {
    setSelectedSpecies(e.target.value);
    setSelectedCategory('');
    setSelectedMedicine('');
    setDoseMin('');
    setDoseMax('');
    setDoseUnit('');
    setSelectedRoute('');
    setSelectedFrequency('');
    setSelectedDuration('');
    setSelectedReason('');
    setSelectedCause('');
    setSelectedMatrix('');
    setPredictionResult(null);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setSelectedMedicine('');
    setDoseMin('');
    setDoseMax('');
    setDoseUnit('');
    setSelectedRoute('');
    setSelectedFrequency('');
    setSelectedDuration('');
    setSelectedReason('');
    setSelectedCause('');
    setPredictionResult(null);
  };

  const handleMedicineChange = (e) => {
    setSelectedMedicine(e.target.value);
  };

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
      cause: selectedCause,
      reason: selectedReason,
      matrix: selectedMatrix
    };
    try {
      const result = await predictAPI.predict(data);
      setPredictionResult(result.data);
    } catch (error) {
      console.error(error);
    }
  };

  const increaseFrequency = () => {
    const current = parseInt(selectedFrequency) || 1;
    setSelectedFrequency((current + 1).toString());
  };

  const decreaseFrequency = () => {
    const current = parseInt(selectedFrequency) || 1;
    if (current > 1) {
      setSelectedFrequency((current - 1).toString());
    }
  };

  const increaseDuration = () => {
    const current = parseInt(selectedDuration) || 1;
    setSelectedDuration((current + 1).toString());
  };

  const decreaseDuration = () => {
    const current = parseInt(selectedDuration) || 1;
    if (current > 1) {
      setSelectedDuration((current - 1).toString());
    }
  };

  const increaseDoseMin = () => {
    const current = parseFloat(doseMin) || 0;
    const step = doseUnit === 'mcg/kg' ? 1 : 0.1;
    setDoseMin((current + step).toFixed(doseUnit === 'mcg/kg' ? 0 : 1));
  };

  const decreaseDoseMin = () => {
    const current = parseFloat(doseMin) || 0;
    const step = doseUnit === 'mcg/kg' ? 1 : 0.1;
    if (current > 0) {
      setDoseMin(Math.max(0, current - step).toFixed(doseUnit === 'mcg/kg' ? 0 : 1));
    }
  };

  return (
    <div>
      <h2>Dosage Form</h2>
      <div>
        <label>Species:</label>
        <select value={selectedSpecies} onChange={handleSpeciesChange}>
          <option value="">Select Species</option>
          {speciesOptions.map(species => (
            <option key={species} value={species}>{species}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Category:</label>
        <select value={selectedCategory} onChange={handleCategoryChange} disabled={!selectedSpecies}>
          <option value="">Select Category</option>
          {categoryOptions.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>
      <div>
        <label>Medicine:</label>
        <select value={selectedMedicine} onChange={handleMedicineChange} disabled={!selectedCategory}>
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
            <button onClick={decreaseDoseMin}>-</button>
            <input type="number" value={doseMin} onChange={(e) => setDoseMin(e.target.value)} step={doseUnit === 'mcg/kg' ? 1 : 0.1} /> - <input type="number" value={doseMax} readOnly /> {doseUnit}
            <button onClick={increaseDoseMin}>+</button>
          </div>
          <div>
            <label>Route:</label>
            <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
              {getFilteredRoutes().map(route => (
                <option key={route} value={route}>{route}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Matrix:</label>
            <select value={selectedMatrix} onChange={(e) => setSelectedMatrix(e.target.value)}>
              {getMatrixOptions().map(matrix => (
                <option key={matrix} value={matrix}>{matrix}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Frequency per day:</label>
            <select value={selectedFrequency} onChange={(e) => setSelectedFrequency(e.target.value)}>
              {getFrequencyOptions().map(freq => (
                <option key={freq} value={freq}>{freq}</option>
              ))}
            </select>
            <button onClick={decreaseFrequency}>-</button>
            <button onClick={increaseFrequency}>+</button>
          </div>
          <div>
            <label>Duration (days):</label>
            <select value={selectedDuration} onChange={(e) => setSelectedDuration(e.target.value)}>
              {getDurationOptions().map(dur => (
                <option key={dur} value={dur}>{dur}</option>
              ))}
            </select>
            <button onClick={decreaseDuration}>-</button>
            <button onClick={increaseDuration}>+</button>
          </div>
          <div>
            <label>Reason:</label>
            <select value={selectedReason} onChange={(e) => setSelectedReason(e.target.value)}>
              {getReasonOptions().map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Cause:</label>
            <select value={selectedCause} onChange={(e) => setSelectedCause(e.target.value)}>
              {getCauseOptions().map(cause => (
                <option key={cause} value={cause}>{cause}</option>
              ))}
            </select>
          </div>
          <button onClick={handlePredict}>Predict Safety</button>
          {predictionResult && (
            <div>
              Predicted Risk: {predictionResult.risk_category === 'not applicable' ? 'safe' : predictionResult.risk_category}
              {predictionResult.risk_category === 'unsafe' && <div style={{color: 'red'}}>Over dosage given</div>}
            </div>
          )}
          {isVaccine() && (
            <div>
              <h3>Vaccine Specific Fields</h3>
              {/* Add vaccine specific fields here, e.g., batch number, expiry date, etc. */}
              <label>Batch Number:</label>
              <input type="text" />
              <label>Expiry Date:</label>
              <input type="date" />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DosageForm;