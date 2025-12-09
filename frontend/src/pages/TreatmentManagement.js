import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { commonMedicines } from '../data/medicines';
import medicineMap from '../data/medicineMap';
import api, { vetFarmAPI } from '../services/api';
import dosageReference from '../data/dosage_reference_full_extended_with_mrl.json';
import './TreatmentManagement.css';
import './EnhancedModules.css';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';

const TreatmentManagement = () => {
  const [treatments, setTreatments] = useState([]);
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [mrlData, setMrlData] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // dosageReference is imported
  const [formData, setFormData] = useState({
    species: 'cattle', // Default species for testing
    medication_type: '',
    medicine: '',
    dose_amount: '',
    dose_unit: '',
    frequency_per_day: '',
    duration_days: '',
    route: '',
    reason: '',
    cause: '',
    start_date: '',
    end_date: '',
    vet_id: '',
    vet_name: '',
    is_vaccine: false,
    vaccine_interval_days: '',
    vaccine_total_months: '',
    next_due_date: '',
    vaccine_end_date: '',
    prescription: '',
    prescription_date: '',
    prescription_number: '',
    body_weight_kg: ''
  });
  const [medicationType, setMedicationType] = useState('');
  const [medicine, setMedicine] = useState('');
  const [manualMedicine, setManualMedicine] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCategory, setManualCategory] = useState('');
  const [showManualCategoryInput, setShowManualCategoryInput] = useState(false);
  const [unit, setUnit] = useState('');
  const [manualUnit, setManualUnit] = useState('');
  const [showManualUnitInput, setShowManualUnitInput] = useState(false);
  const [showManualFrequency, setShowManualFrequency] = useState(false);
  const [showManualDuration, setShowManualDuration] = useState(false);
  const [showManualReason, setShowManualReason] = useState(false);
  const [showManualCause, setShowManualCause] = useState(false);
  const [manualReason, setManualReason] = useState('');
  const [manualCause, setManualCause] = useState('');
  const [manualFrequency, setManualFrequency] = useState('');
  const [manualDuration, setManualDuration] = useState('');
  const [vaccinationHistory, setVaccinationHistory] = useState([]);
  const [showVaccinationSection, setShowVaccinationSection] = useState(false);
  const [selectedMedicineData, setSelectedMedicineData] = useState(null);
  const [amuRecords, setAmuRecords] = useState([]);
  const [hasVetAssigned, setHasVetAssigned] = useState(null);
  
  const [requestDetails, setRequestDetails] = useState(null);
  
  const [requestFormData, setRequestFormData] = useState({
    symptoms: ''
  });
  
  const navigate = useNavigate();
  const { entity_id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  // Format date as DD/MM/YYYY
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  // Download prescription PDF for a treatment
  const downloadPrescription = async (treatmentId, prescriptionNumber) => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || '/api';
      console.log('Requesting prescription for', treatmentId);
      const res = await fetch(`${API_URL}/prescription/${treatmentId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        // Try to parse JSON error or text for more info
        let msg = `Server returned ${res.status}`;
        try {
          const json = await res.json();
          msg = json.error || json.message || JSON.stringify(json);
        } catch (e) {
          try {
            const text = await res.text();
            if (text) msg = text;
          } catch (_) {}
        }
        console.error('Prescription download failed:', msg);
        alert('Failed to download prescription: ' + msg);
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/pdf')) {
        // backend returned something unexpected
        const text = await res.text();
        console.error('Unexpected response from server:', text);
        alert('Failed to download prescription: unexpected server response');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prescriptionNumber || 'prescription'}_${treatmentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Prescription download error:', err);
      alert('Failed to download prescription. Check server logs and network connection.');
    }
  };

  // Convert date to integer format YYYYMMDD
  const dateToInt = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return parseInt(`${year}${month}${day}`);
  };

  useEffect(() => {
    fetchEntities();
    if (entity_id) {
      fetchTreatmentsByEntity(entity_id);
    }
    // Check for request_id in query params
    const searchParams = new URLSearchParams(location.search);
    const requestId = searchParams.get('request_id');
    if (requestId) {
      fetchRequestDetails(requestId);
    }
    // Dosage reference is imported

    // Pre-fill vet info for veterinarians
    if (user?.role === 'veterinarian') {
      setFormData(prev => ({
        ...prev,
        vet_id: user.vet_id || '',
        vet_name: user.vet_name || user.display_name || ''
      }));
    }
  }, [entity_id, location.search, user]);

  const fetchRequestDetails = async (requestId) => {
    try {
      const response = await api.get(`/treatment-requests/${requestId}`);
      setRequestDetails(response.data);
      // Pre-fill reason with symptoms
      setFormData(prev => ({
        ...prev,
        reason: response.data.symptoms || ''
      }));
      // Load the entity/treatments/AMU records and open the add form for vets
      if (response.data.entity_id) {
        await fetchTreatmentsByEntity(response.data.entity_id);
        // Ensure the add form is visible so vet can approve and treat using recommendations
        setShowAddForm(true);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
    }
  };

  const fetchEntities = async () => {
    try {
      const response = await api.get('/entities');
      setEntities(response.data);
      // Reset vet assignment check when entities are refetched
      setHasVetAssigned(null);
    } catch (err) {
      console.error('Failed to fetch entities:', err);
      setError('Failed to load entities');
    }
  };

  const fetchTreatmentsByEntity = async (id) => {
    try {
      setLoading(true);
      const [treatmentsResponse, amuResponse, entityResponse] = await Promise.all([
        api.get(`/treatments/entity/${id}`),
        api.get(`/amu/entity/${id}`),
        api.get(`/entities/${id}`)
      ]);
      setTreatments(treatmentsResponse.data);
      setAmuRecords(amuResponse.data);
      
      // Use the entity data from the direct API call
      const entity = entityResponse.data.entity || entityResponse.data;
      if (entity) {
        setSelectedEntity(entity);
        setFormData(prev => ({
          ...prev,
          entity_id: id,
          species: entity.species
        }));
      }
    } catch (err) {
      console.error('Failed to fetch treatments:', err);
      setError('Failed to load treatments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.entity_id) {
      setError('Please select an animal or batch');
      return;
    }
    if (!formData.species) {
      setError('Species is required');
      return;
    }
    if (!formData.medication_type) {
      setError('Medication type is required');
      return;
    }
    if (!formData.medicine) {
      setError('Medicine is required');
      return;
    }
    if (!formData.dose_amount) {
      setError('Dose amount is required');
      return;
    }
    if (!formData.dose_unit) {
      setError('Dose unit is required');
      return;
    }
    if (!formData.route) {
      setError('Route is required');
      return;
    }
    if (!formData.frequency_per_day) {
      setError('Frequency is required');
      return;
    }
    if (!formData.duration_days) {
      setError('Duration is required');
      return;
    }
    if (!formData.start_date) {
      setError('Start date is required');
      return;
    }

    // Species-specific validations
    const species = formData.species.toLowerCase();
    const allowedRoutes = getAllowedRoutesForSpecies(formData.species);
    if (!allowedRoutes.includes(formData.route)) {
      setError(`Route ${formData.route} is not allowed for ${formData.species}`);
      return;
    }

    if (['cattle', 'goat', 'sheep', 'pig'].includes(species)) {
      if (!formData.vet_id || !formData.vet_name) {
        setError('Vet ID and Vet Name are required for cattle, goat, sheep, and pig');
        return;
      }
    } else if (['chicken', 'poultry'].includes(species)) {
      if (formData.vet_id || formData.vet_name) {
        setError('Vet information should not be provided for poultry');
        return;
      }
    }

    // For vaccines, additional validations
    if (formData.is_vaccine) {
      if (!formData.vaccine_interval_days || !formData.vaccine_total_months) {
        setError('Vaccine interval and total months are required for vaccines');
        return;
      }
    }

    try {
      const submitData = {
        entity_id: formData.entity_id,
        species: formData.species,
        medication_type: formData.medication_type,
        medicine: formData.medicine,
        body_weight_kg: formData.body_weight_kg || null,
        dose_amount: formData.dose_amount,
        dose_unit: formData.dose_unit,
        frequency_per_day: formData.frequency_per_day,
        duration_days: formData.duration_days,
        route: formData.route,
        reason: formData.reason,
        cause: formData.cause,
        start_date: dateToInt(formData.start_date),
        end_date: dateToInt(formData.end_date),
        vet_id: formData.vet_id || null,
        vet_name: formData.vet_name || null,
        is_vaccine: formData.is_vaccine,
        vaccination_date: formData.is_vaccine ? dateToInt(formData.start_date) : null,
        vaccine_interval_days: formData.vaccine_interval_days || null,
        vaccine_total_months: formData.vaccine_total_months || null,
        next_due_date: dateToInt(formData.next_due_date) || null,
        vaccine_end_date: dateToInt(formData.vaccine_end_date) || null,
        prescription: formData.prescription || null,
        prescription_date: formData.prescription_date || null,
        prescription_number: formData.prescription_number || null,
        request_id: requestDetails ? requestDetails.request_id : null
      };

      await api.post('/treatments', submitData);
      alert('Treatment added successfully!');
      setShowAddForm(false);
      resetForm();
      if (entity_id) {
        fetchTreatmentsByEntity(entity_id);
      }

      // If this was from a treatment request, mark the request as completed
      if (requestDetails) {
        try {
          await api.put(`/treatment-requests/${requestDetails.request_id}/status`, { status: 'completed' });
          alert('Treatment request has been completed!');
        } catch (requestError) {
          console.error('Failed to update request status:', requestError);
          // Don't fail the whole operation if request update fails
        }
      }
    } catch (err) {
      console.error('Error adding treatment:', err);
      setError(err.response?.data?.error || 'Failed to add treatment');
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.entity_id) {
      setError('Please select an animal or batch');
      return;
    }
    if (!requestFormData.symptoms.trim()) {
      setError('Please describe the symptoms');
      return;
    }

    try {
      await api.post('/treatment-requests', {
        entity_id: formData.entity_id,
        symptoms: requestFormData.symptoms.trim()
      });
      alert('Treatment request submitted successfully! A veterinarian will review and respond to your request.');
      setShowRequestForm(false);
      setRequestFormData({ symptoms: '' });
    } catch (err) {
      console.error('Error submitting treatment request:', err);
      setError(err.response?.data?.error || 'Failed to submit treatment request');
    }
  };

  const resetForm = () => {
    setFormData({
      species: 'cattle', // Keep default species
      medication_type: '',
      medicine: '',
      dose_amount: '',
      dose_unit: '',
      frequency_per_day: '',
      duration_days: '',
      route: '',
      reason: '',
      cause: '',
      start_date: '',
      end_date: '',
      vet_id: '',
      vet_name: '',
      is_vaccine: false,
      vaccine_interval_days: '',
      vaccine_total_months: '',
      next_due_date: '',
      vaccine_end_date: '',
      prescription: '',
      prescription_date: '',
      prescription_number: ''
    });
    setMedicationType('');
    setMedicine('');
    setManualMedicine('');
    setShowManualInput(false);
    setManualCategory('');
    setShowManualCategoryInput(false);
    setSelectedMedicineData(null);
    setShowManualReason(false);
    setShowManualCause(false);
    setManualReason('');
    setManualCause('');
    setRequestFormData({ symptoms: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };

      // Auto-calculate end date when start date and duration change
      if (name === 'start_date' || name === 'duration_days') {
        const startDate = name === 'start_date' ? value : newData.start_date;
        const duration = name === 'duration_days' ? value : newData.duration_days;

        if (startDate && duration) {
          const start = new Date(startDate);
          const end = new Date(start);
          end.setDate(end.getDate() + parseInt(duration));

          newData.end_date = end.toISOString().split('T')[0];
        }
      }

      // Auto-calculate vaccine dates
      if (formData.is_vaccine && (name === 'start_date' || name === 'vaccine_interval_days' || name === 'vaccine_total_months')) {
        const startDate = name === 'start_date' ? value : newData.start_date;
        const interval = name === 'vaccine_interval_days' ? value : newData.vaccine_interval_days;
        const totalMonths = name === 'vaccine_total_months' ? value : newData.vaccine_total_months;

        if (startDate && interval && interval > 0) {
          try {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
              const nextDue = new Date(start);
              nextDue.setDate(nextDue.getDate() + parseInt(interval));
              newData.next_due_date = nextDue.toISOString().split('T')[0];
            }
          } catch (error) {
            console.error('Error calculating next due date:', error);
          }
        }

        if (startDate && totalMonths && totalMonths > 0) {
          try {
            const start = new Date(startDate);
            if (!isNaN(start.getTime())) {
              const endDate = new Date(start);
              endDate.setMonth(endDate.getMonth() + parseInt(totalMonths));
              newData.end_date = endDate.toISOString().split('T')[0];
            }
          } catch (error) {
            console.error('Error calculating vaccine end date:', error);
          }
        }
      }

      return newData;
    });

    // Handle medication type change
    if (name === 'medication_type') {
      if (value === 'manual_entry') {
        setShowManualCategoryInput(true);
        setFormData(prev => ({
          ...prev,
          medication_type: ''
        }));
      } else {
        setShowManualCategoryInput(false);
        setManualCategory('');
        setMedicationType(value);
        setMedicine('');
        setManualMedicine('');
        setShowManualInput(false);
        setSelectedMedicineData(null);
        setShowManualFrequency(false);
        setShowManualDuration(false);
        setManualFrequency('');
        setManualDuration('');
        setShowManualReason(false);
        setShowManualCause(false);
        setFormData(prev => ({
          ...prev,
          medication_type: value,
          medicine: '',
          is_vaccine: value === 'vaccine',
          vaccine_interval_days: '',
          vaccine_total_months: '',
          next_due_date: '',
          vaccine_end_date: ''
        }));
      }
    }
  };

  const handleMedicineChange = (e) => {
    const value = e.target.value;
    if (value === 'manual_entry') {
      setShowManualInput(true);
      setMedicine(value);
      setSelectedMedicineData(null);
      setFormData(prev => ({
        ...prev,
        medicine: ''
      }));
    } else {
      setShowManualInput(false);
      setMedicine(value);

      // Find medicine data from dosage reference
      let medicineData = null;
      if (formData.species && formData.medication_type) {
        // Map species names to match JSON keys
        const speciesMap = {
          'cow': 'cattle',
          'goat': 'goat',
          'sheep': 'sheep',
          'pig': 'pig',
          'chicken': 'poultry',
          'poultry': 'poultry'
        };
        const speciesKey = speciesMap[formData.species.toLowerCase()] || formData.species.toLowerCase();
        const speciesData = dosageReference[speciesKey];
        
        if (speciesData && speciesData[formData.medication_type] && speciesData[formData.medication_type][value]) {
          medicineData = speciesData[formData.medication_type][value];
        }
      }

      setSelectedMedicineData(medicineData);

      // Auto-fill form with recommended values from ui section
      if (medicineData?.ui) {
        const routeOptions = getAllowedRoutesForSpecies(formData.species);
        let defaultRoute = medicineData.ui.route_default;
        if (!routeOptions.includes(defaultRoute)) {
          defaultRoute = routeOptions[0] || '';
        }
        setFormData(prev => ({
          ...prev,
          medicine: value,
          dose_unit: medicineData.recommended_doses?.safe?.unit || '',
          route: defaultRoute,
          frequency_per_day: medicineData.ui.frequency_dropdown?.[0]?.toString() || '',
          duration_days: medicineData.ui.duration_dropdown?.[0]?.toString() || '',
          reason: medicineData.ui.reasons_dropdown?.[0] || '',
          cause: medicineData.ui.causes_dropdown?.[0] || ''
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          medicine: value
        }));
      }
    }
  };

  const handleManualMedicineChange = (e) => {
    const value = e.target.value;
    setManualMedicine(value);
    setFormData(prev => ({
      ...prev,
      medicine: value
    }));
  };

  const handleManualCategoryChange = (e) => {
    const value = e.target.value;
    setManualCategory(value);
    setFormData(prev => ({
      ...prev,
      medication_type: value
    }));
  };

  const handleEntitySelect = (entityId) => {
    const entity = entities.find(e => e.entity_id === parseInt(entityId));
    if (entity) {
      setSelectedEntity(entity);
      setFormData(prev => ({
        ...prev,
        entity_id: entityId,
        species: entity.species
      }));
      // Check vet assignment for the farm
      checkVetAssignment(entity.farm_id);
      // Reset form states when entity changes
      setShowAddForm(false);
      setShowRequestForm(false);
      setRequestFormData({ symptoms: '' });
    }
  };

  // Get allowed routes based on species SQL rules
  const getAllowedRoutesForSpecies = (species) => {
    if (!species) return [];
    const lowerSpecies = species.toLowerCase();
    if (['cattle', 'goat', 'sheep', 'pig'].includes(lowerSpecies)) {
      return ['IM', 'IV', 'SC', 'oral', 'water', 'feed'];
    } else if (['chicken', 'poultry'].includes(lowerSpecies)) {
      return ['water', 'feed', 'oral'];
    }
    return ['IM', 'IV', 'SC', 'oral', 'water', 'feed'];
  };

  // Get recommended route for selected medicine
  const getRecommendedRoute = () => {
    if (selectedMedicineData?.ui?.route_default) {
      const allowedRoutes = getAllowedRoutesForSpecies(selectedEntity?.species);
      if (allowedRoutes.includes(selectedMedicineData.ui.route_default)) {
        return selectedMedicineData.ui.route_default;
      } else {
        return allowedRoutes[0] || '';
      }
    }
    return selectedMedicineData?.recommended_route || null;
  };

  // Get available routes based on medicine ui data and species rules
  const getAvailableRoutes = () => {
    const allowedRoutes = getAllowedRoutesForSpecies(selectedEntity?.species);
    if (selectedMedicineData?.ui?.route_dropdown) {
      return selectedMedicineData.ui.route_dropdown.filter(route => allowedRoutes.includes(route));
    }
    return allowedRoutes;
  };

  // Check if vet fields are required
  const isVetRequired = () => {
    return selectedEntity?.species && ['cattle', 'goat', 'sheep', 'pig'].includes(selectedEntity.species.toLowerCase());
  };
  const getAllRouteOptions = () => {
    if (!selectedEntity?.species || !formData.medication_type) return [];
    
    const speciesMap = {
      'cow': 'cattle',
      'goat': 'goat',
      'sheep': 'sheep',
      'pig': 'pig',
      'chicken': 'poultry',
      'poultry': 'poultry'
    };
    const speciesKey = speciesMap[selectedEntity.species.toLowerCase()] || selectedEntity.species.toLowerCase();
    const speciesData = dosageReference[speciesKey];
    
    if (!speciesData || !speciesData[formData.medication_type]) return [];
    
    // Get allowed routes for this species
    const allowedRoutes = getAllowedRoutesForSpecies(selectedEntity.species);
    
    const routes = new Set();
    Object.values(speciesData[formData.medication_type]).forEach(medicine => {
      if (medicine.ui?.route_dropdown) {
        medicine.ui.route_dropdown.forEach(route => {
          // Only include routes that are allowed for this species
          if (allowedRoutes.includes(route)) {
            routes.add(route);
          }
        });
      }
    });
    
    const routeArray = Array.from(routes);
    
    // Sort routes so recommended route comes first
    if (selectedMedicineData?.ui?.route_default) {
      const recommendedRoute = selectedMedicineData.ui.route_default;
      routeArray.sort((a, b) => {
        if (a === recommendedRoute) return -1;
        if (b === recommendedRoute) return 1;
        return 0;
      });
    }
    
    return routeArray;
  };

  const getAllFrequencyOptions = () => {
    if (!selectedEntity?.species || !formData.medication_type) return [];
    
    const speciesMap = {
      'cow': 'cattle',
      'goat': 'goat',
      'sheep': 'sheep',
      'pig': 'pig',
      'chicken': 'poultry',
      'poultry': 'poultry'
    };
    const speciesKey = speciesMap[selectedEntity.species.toLowerCase()] || selectedEntity.species.toLowerCase();
    const speciesData = dosageReference[speciesKey];
    
    if (!speciesData || !speciesData[formData.medication_type]) return [];
    
    const frequencies = new Set();
    Object.values(speciesData[formData.medication_type]).forEach(medicine => {
      if (medicine.frequency_per_day) {
        medicine.frequency_per_day.forEach(freq => frequencies.add(freq));
      }
    });
    
    return Array.from(frequencies).sort((a, b) => a - b);
  };

  const getAllDurationOptions = () => {
    if (!selectedEntity?.species || !formData.medication_type) return [];
    
    const speciesMap = {
      'cow': 'cattle',
      'goat': 'goat',
      'sheep': 'sheep',
      'pig': 'pig',
      'chicken': 'poultry',
      'poultry': 'poultry'
    };
    const speciesKey = speciesMap[selectedEntity.species.toLowerCase()] || selectedEntity.species.toLowerCase();
    const speciesData = dosageReference[speciesKey];
    
    if (!speciesData || !speciesData[formData.medication_type]) return [];
    
    const durations = new Set();
    Object.values(speciesData[formData.medication_type]).forEach(medicine => {
      if (medicine.duration_days) {
        medicine.duration_days.forEach(duration => durations.add(duration));
      }
    });
    
    return Array.from(durations).sort((a, b) => a - b);
  };

  const getAllReasonOptions = () => {
    if (!selectedEntity?.species || !formData.medication_type) return [];
    
    const speciesMap = {
      'cow': 'cattle',
      'goat': 'goat',
      'sheep': 'sheep',
      'pig': 'pig',
      'chicken': 'poultry',
      'poultry': 'poultry'
    };
    const speciesKey = speciesMap[selectedEntity.species.toLowerCase()] || selectedEntity.species.toLowerCase();
    const speciesData = dosageReference[speciesKey];
    
    if (!speciesData || !speciesData[formData.medication_type]) return [];
    
    const reasons = new Set();
    Object.values(speciesData[formData.medication_type]).forEach(medicine => {
      if (medicine.common_reasons) {
        medicine.common_reasons.forEach(reason => reasons.add(reason));
      }
    });
    
    return Array.from(reasons);
  };

  const getAllCauseOptions = () => {
    if (!selectedEntity?.species || !formData.medication_type) return [];
    
    const speciesMap = {
      'cow': 'cattle',
      'goat': 'goat',
      'sheep': 'sheep',
      'pig': 'pig',
      'chicken': 'poultry',
      'poultry': 'poultry'
    };
    const speciesKey = speciesMap[selectedEntity.species.toLowerCase()] || selectedEntity.species.toLowerCase();
    const speciesData = dosageReference[speciesKey];
    
    if (!speciesData || !speciesData[formData.medication_type]) return [];
    
    const causes = new Set();
    Object.values(speciesData[formData.medication_type]).forEach(medicine => {
      if (medicine.common_causes) {
        medicine.common_causes.forEach(cause => causes.add(cause));
      }
    });
    
    return Array.from(causes);
  };

  // Get dose level based on recommended doses
  const getDoseLevel = (dose, unit) => {
    if (!selectedMedicineData?.recommended_doses || !dose || !unit) return 'unknown';
    
    const numDose = parseFloat(dose);
    if (isNaN(numDose)) return 'unknown';
    
    const safe = selectedMedicineData.recommended_doses.safe;
    const moderate = selectedMedicineData.recommended_doses.moderate;
    const overdose = selectedMedicineData.recommended_doses.overdose;
    
    // Check if units match
    if (safe?.unit !== unit || moderate?.unit !== unit || overdose?.unit !== unit) return 'unknown';
    
    if (numDose < (safe?.min || 0)) return 'under-dose';
    if (numDose <= (safe?.max || 0)) return 'safe';
    if (moderate?.max && numDose <= moderate.max) return 'moderate';
    if (numDose > (moderate?.max || safe?.max || 0)) return 'overdose';
    
    return 'unknown';
  };

  // Get duration suggestions based on medicine duration_days
  const getDurationSuggestions = () => {
    if (!selectedMedicineData) return [];

    const durations = selectedMedicineData.duration_days || [];
    return durations.map((duration, index) => ({
      value: duration.toString(),
      label: index === 0 ? `Recommended: ${duration} days` : `${duration} days`,
      level: 'recommended' // All medicine durations are considered recommended
    }));
  };

  // Get frequency suggestions based on medicine frequency_per_day
  const getFrequencySuggestions = () => {
    if (!selectedMedicineData) return [];

    const frequencies = selectedMedicineData.frequency_per_day || [];
    return frequencies.map((freq, index) => ({
      value: freq.toString(),
      label: index === 0 ? `Recommended: ${freq}x per day` : `${freq}x per day`,
      level: 'recommended' // All medicine frequencies are considered recommended
    }));
  };

  // Get available dose units based on FSSAI standards and species
  const getAvailableDoseUnits = () => {
    const baseUnits = ['mg/kg', 'mcg/kg', 'g/kg', 'ml/kg', 'litre/kg'];

    // Add species-specific units
    if (selectedEntity?.species) {
      const species = selectedEntity.species.toLowerCase();
      if (species === 'pig' || species === 'chicken') {
        // For pigs and poultry, add feed-based units
        baseUnits.push('mg/litre', 'g/litre', 'ml/litre');
      }
    }

    return baseUnits;
  };

  // Get unit suggestions based on medicine ui data only
  const getUnitSuggestions = () => {
    const medicineUnits = new Set();

    if (selectedMedicineData?.ui_dropdown_options?.dose_unit_default) {
      medicineUnits.add(selectedMedicineData.ui_dropdown_options.dose_unit_default);
    }

    // Also add units from recommended_doses
    if (selectedMedicineData?.recommended_doses) {
      Object.values(selectedMedicineData.recommended_doses).forEach(dose => {
        if (dose.unit) {
          medicineUnits.add(dose.unit);
        }
      });
    }

    // Use only medicine units from JSON
    const allUnits = [...medicineUnits];

    return allUnits.map(unit => ({
      value: unit,
      label: unit,
      level: 'recommended'
    }));
  };

  // Get dose suggestions based on medicine recommended_doses
  const getDoseSuggestions = () => {
    if (!selectedMedicineData?.recommended_doses) return [];

    const suggestions = [];

    if (selectedMedicineData.recommended_doses.safe && selectedMedicineData.recommended_doses.safe.max !== null) {
      suggestions.push({
        value: selectedMedicineData.recommended_doses.safe.max.toString(),
        label: `Safe: ${selectedMedicineData.recommended_doses.safe.max} ${selectedMedicineData.recommended_doses.safe.unit}`,
        level: 'safe',
        unit: selectedMedicineData.recommended_doses.safe.unit
      });
    }

    if (selectedMedicineData.recommended_doses.moderate && selectedMedicineData.recommended_doses.moderate.max !== null) {
      suggestions.push({
        value: selectedMedicineData.recommended_doses.moderate.max.toString(),
        label: `Moderate: ${selectedMedicineData.recommended_doses.moderate.max} ${selectedMedicineData.recommended_doses.moderate.unit}`,
        level: 'moderate',
        unit: selectedMedicineData.recommended_doses.moderate.unit
      });
    }

    if (selectedMedicineData.recommended_doses.overdose && selectedMedicineData.recommended_doses.overdose.min !== null) {
      suggestions.push({
        value: (selectedMedicineData.recommended_doses.overdose.min + 0.1).toString(),
        label: `Avoid: >${selectedMedicineData.recommended_doses.overdose.min} ${selectedMedicineData.recommended_doses.overdose.unit}`,
        level: 'overdose',
        unit: selectedMedicineData.recommended_doses.overdose.unit
      });
    }

    return suggestions;
  };

  const adjustDose = (delta) => {
    const current = parseFloat(formData.dose_amount) || 0;
    const step = selectedMedicineData?.recommended_doses?.safe?.unit === 'mcg/kg' ? 1 : 0.1;
    const newValue = Math.max(0, current + (delta * step));
    setFormData(prev => ({
      ...prev,
      dose_amount: newValue.toFixed(selectedMedicineData?.recommended_doses?.safe?.unit === 'mcg/kg' ? 0 : 1)
    }));
  };

  const fetchVaccinationHistory = async (treatmentId) => {
    try {
      const response = await api.get(`/treatments/${treatmentId}/vaccination-history`);
      setVaccinationHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch vaccination history:', err);
    }
  };

  const markVaccinationGiven = async (treatmentId) => {
    try {
      await api.post(`/treatments/${treatmentId}/vaccination-history`);
      // Refresh the vaccination history after marking as given
      fetchVaccinationHistory(treatmentId);
      // Also refresh the treatments list to update the treatment status
      if (entity_id) {
        fetchTreatmentsByEntity(entity_id);
      }
      alert('Vaccination marked as given successfully!');
    } catch (err) {
      console.error('Failed to mark vaccination as given:', err);
      setError(err.response?.data?.error || 'Failed to mark vaccination as given');
    }
  };

  const checkVetAssignment = async (farmId) => {
    try {
      const response = await vetFarmAPI.getVetForFarm(farmId);
      if (response.data.hasVet) {
        setHasVetAssigned(true);
      } else {
        // Try to auto-assign a vet based on farm location
        try {
          const autoAssignResponse = await api.post(`/vet-farm-mapping/auto-assign/${farmId}`);
          if (autoAssignResponse.data.success) {
            setHasVetAssigned(true);
          } else {
            console.log('Auto-assignment failed:', autoAssignResponse.data.message);
            setHasVetAssigned(false);
          }
        } catch (autoAssignError) {
          console.error('Failed to auto-assign vet:', autoAssignError);
          setHasVetAssigned(false);
        }
      }
    } catch (err) {
      console.error('Failed to check vet assignment:', err);
      setHasVetAssigned(false);
    }
  };

  const checkMRL = async (medicine, species) => {
    try {
      // This would typically call an API to get MRL data
      // For now, we'll set mock data or call the backend API
      const response = await api.get(`/mrl?medicine=${encodeURIComponent(medicine)}&species=${encodeURIComponent(species)}`);
      setMrlData(response.data);
    } catch (err) {
      console.error('Failed to fetch MRL data:', err);
      setMrlData([]);
    }
  };

  useEffect(() => {
    if (formData.medicine && selectedEntity?.species) {
      checkMRL(formData.medicine, selectedEntity.species);
    }
  }, [formData.medicine, selectedEntity]);

  if (loading && !showAddForm) {
    return (
      <div className="treatment-page">
        <Navigation />
        <div className="loading">Loading treatments...</div>
      </div>
    );
  }

  return (
    <div className="treatment-page">
      <Navigation />
      <div className="treatment-container">
        <div className="page-header">
          <div className="header-content">
            <h1>💊 Treatment Management</h1>
            <p className="header-subtitle">Manage medical treatments and monitor animal health</p>
          </div>
          {!(user?.role === 'veterinarian' && !requestDetails) && (
            <button
              onClick={() => {
                if (selectedEntity && !['chicken', 'poultry'].includes(selectedEntity.species.toLowerCase())) {
                  setShowRequestForm(!showRequestForm);
                  setShowAddForm(false); // Ensure add form is hidden
                } else {
                  setShowAddForm(!showAddForm);
                  setShowRequestForm(false); // Ensure request form is hidden
                }
              }}
              className="btn-primary"
            >
              <span className="btn-icon">+</span>
              {selectedEntity && !['chicken', 'poultry'].includes(selectedEntity.species.toLowerCase()) 
                ? (showRequestForm ? 'Cancel Request' : 'Request Treatment') 
                : (showAddForm ? 'Cancel' : 'Add Treatment')
              }
            </button>
          )}
        </div>

        {requestDetails && (
          <div className="alert alert-info">
            <span className="alert-icon">📋</span>
            Treating request from {requestDetails.farmer_name} for {requestDetails.species} - {requestDetails.tag_id || requestDetails.batch_name}
          </div>
        )}

        {user?.role === 'veterinarian' && !requestDetails && (
          <div className="alert alert-info">
            <span className="alert-icon">ℹ️</span>
            As a veterinarian, you can only add treatments from approved treatment requests. Please visit the Treatment Requests page to approve and treat animal requests.
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}

        {selectedEntity && hasVetAssigned === false && !['chicken', 'poultry'].includes(selectedEntity.species.toLowerCase()) && (
          <div className="alert alert-warning">
            <span className="alert-icon">⚠️</span>
            No veterinarian assigned to this farm. Please ensure your farmer profile includes location details (state, district, taluk) for automatic vet assignment.
            <button 
              onClick={async () => {
                try {
                  const debugResponse = await vetFarmAPI.debugVetAssignment(selectedEntity.farm_id);
                  console.log('Vet Assignment Debug:', debugResponse.data);
                  alert(`Debug Info:\nFarm Location: ${debugResponse.data.farm.location.state || 'N/A'}, ${debugResponse.data.farm.location.district || 'N/A'}, ${debugResponse.data.farm.location.taluk || 'N/A'}\nAvailable Vets: ${debugResponse.data.availableVets.length}\nCurrent Vet: ${debugResponse.data.currentVet ? debugResponse.data.currentVet.display_name : 'None'}`);
                } catch (error) {
                  console.error('Debug error:', error);
                  alert('Failed to get debug info');
                }
              }}
              className="debug-btn"
              style={{ marginLeft: '10px', padding: '4px 8px', fontSize: '12px' }}
            >
              Debug
            </button>
          </div>
        )}

        {selectedEntity && !['chicken', 'poultry'].includes(selectedEntity.species.toLowerCase()) && (
          <div className="alert alert-info">
            <span className="alert-icon">ℹ️</span>
            Farmers can only add treatments for poultry directly. For other species, please submit a treatment request.
          </div>
        )}

        {showAddForm && (
          <div className="treatment-form-card">
            <div className="form-header">
              <h2>📋 Add New Treatment Record</h2>
              <div className="form-badges">
                {selectedEntity && (
                  <span className={`badge ${selectedEntity.entity_type}`}>
                    {selectedEntity.entity_type === 'animal' ? 'Individual Animal' : 'Batch'}
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="treatment-form">
              {/* Animal/Batch Selection */}
              <div className="form-section">
                <h3>🏷️ Select Animal/Batch</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Animal/Batch *</label>
                    <select
                      name="entity_id"
                      value={formData.entity_id}
                      onChange={(e) => handleEntitySelect(e.target.value)}
                      required
                      className="form-control"
                    >
                      <option value="">Select Animal/Batch</option>
                      {entities.map(entity => (
                        <option key={entity.entity_id} value={entity.entity_id}>
                          {entity.entity_type === 'animal' ? entity.tag_id : entity.batch_name}
                          ({entity.species}) - {entity.farm_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedEntity && (
                  <div className="entity-summary-card">
                    <h4>Selected Entity Details</h4>
                    <div className="entity-details-grid">
                      <div className="detail-item">
                        <span className="label">Type:</span>
                        <span className="value">{selectedEntity.entity_type === 'animal' ? 'Individual Animal' : 'Batch'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Species:</span>
                        <span className="value">{selectedEntity.species}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Farm:</span>
                        <span className="value">{selectedEntity.farm_name}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Product:</span>
                        <span className="value">{selectedEntity.matrix}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Medication Selection */}
                  <div className="form-section">
                    <h3>💊 Medication Selection</h3>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Medication Category for {selectedEntity?.species || 'Unknown Species'} *</label> {/* Hardcoded species for testing */}
                        <select
                          name="medication_type"
                          value={formData.medication_type}
                          onChange={handleInputChange}
                          required
                          className="form-control"
                        >
                          <option value="">Select Category</option>
                          {(() => {
                            if (!selectedEntity?.species) return null;
                            
                            const speciesMap = {
                              'cow': 'cattle',
                              'goat': 'goat',
                              'sheep': 'sheep',
                              'pig': 'pig',
                              'chicken': 'poultry',
                              'poultry': 'poultry'
                            };
                            const speciesKey = speciesMap[selectedEntity.species.toLowerCase()] || selectedEntity.species.toLowerCase();
                            const speciesData = dosageReference[speciesKey];
                            const availableCategories = Object.keys(speciesData || {});
                            
                            return availableCategories.map((category, index) => {
                              const displayName = category.split('-').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ');
                              return (
                                <option key={`category-${index}`} value={category}>
                                  {displayName}
                                </option>
                              );
                            });
                          })()}
                          <option value="manual_entry">➕ Enter manually</option>
                        </select>
                        <small className="form-help">
                          💡 Categories available for {selectedEntity?.species || 'Unknown Species'}
                        </small>
                      </div>

                      <div className="form-group">
                        <label>Medicine for {selectedEntity?.species || 'Unknown Species'} - {formData.medication_type} *</label>
                        <select
                          value={medicine}
                          onChange={handleMedicineChange}
                          required
                          className="form-control"
                        >
                          <option value="">Select Medicine</option>
                          {(() => {
                            if (!selectedEntity?.species || !formData.medication_type) return null;
                            
                            const speciesMap = {
                              'cow': 'cattle',
                              'goat': 'goat',
                              'sheep': 'sheep',
                              'pig': 'pig',
                              'chicken': 'poultry',
                              'poultry': 'poultry'
                            };
                            const speciesKey = speciesMap[selectedEntity.species.toLowerCase()] || selectedEntity.species.toLowerCase();
                            const speciesData = dosageReference[speciesKey];
                            
                            if (!speciesData?.[formData.medication_type]) {
                              return <option value="" disabled>No data available for this selection</option>;
                            }
                            
                            const availableMedicines = Object.keys(speciesData[formData.medication_type]);
                            
                            return availableMedicines.map((medName, index) => (
                              <option key={`medicine-${index}`} value={medName}>
                                {medName}
                              </option>
                            ));
                          })()}
                          <option value="manual_entry">➕ Enter manually</option>
                        </select>
                        <small className="form-help">
                          💡 Medicines available for {selectedEntity?.species || 'Unknown Species'} in {formData.medication_type} category
                        </small>
                      </div>
                    </div>

                    {showManualCategoryInput && (
                      <div className="manual-entry-section">
                        <div className="form-group">
                          <label>Enter Category Name Manually *</label>
                          <input
                            type="text"
                            value={manualCategory}
                            onChange={handleManualCategoryChange}
                            required
                            className="form-control"
                            placeholder="Type the category name here..."
                            autoFocus
                          />
                          <small className="form-help">
                            💡 Enter the complete category name as it should appear in records
                          </small>
                        </div>
                      </div>
                    )}

                    {showManualInput && (
                      <div className="manual-entry-section">
                        <div className="form-group">
                          <label>Enter Medicine Name Manually *</label>
                          <input
                            type="text"
                            value={manualMedicine}
                            onChange={handleManualMedicineChange}
                            required
                            className="form-control"
                            placeholder="Type the medicine name here..."
                            autoFocus
                          />
                          <small className="form-help">
                            💡 Enter the complete medicine name as it should appear in records
                          </small>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dosage & Route */}
                  {formData.medication_type && (
                    <div className="form-section">
                      <h3>⚖️ Dosage & Administration</h3>
                    <div className="form-row three-cols">
                      <div className="form-group">
                        <label>Dose Amount *</label>
                        <div className="dose-input-group">
                          <button
                            type="button"
                            className="adjust-btn"
                            onClick={() => adjustDose(-1)}
                            disabled={!formData.dose_amount}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.01"
                            name="dose_amount"
                            value={formData.dose_amount}
                            onChange={handleInputChange}
                            required
                            className="form-control"
                            placeholder="e.g., 5.5"
                          />
                          <button
                            type="button"
                            className="adjust-btn"
                            onClick={() => adjustDose(1)}
                            disabled={!formData.dose_amount}
                          >
                            +
                          </button>
                          {formData.dose_amount && selectedMedicineData && (
                            <span className={`dose-level-indicator ${getDoseLevel(formData.dose_amount, formData.dose_unit)}`}>
                              {getDoseLevel(formData.dose_amount, formData.dose_unit) === 'safe' && '✅ Safe'}
                              {getDoseLevel(formData.dose_amount, formData.dose_unit) === 'moderate' && '⚠️ Moderate'}
                              {getDoseLevel(formData.dose_amount, formData.dose_unit) === 'overdose' && '❌ Overdose'}
                              {getDoseLevel(formData.dose_amount, formData.dose_unit) === 'under-dose' && '⚠️ Under-dose'}
                              {getDoseLevel(formData.dose_amount, formData.dose_unit) === 'unknown' && '❓ Unknown'}
                            </span>
                          )}
                        </div>
                        {selectedMedicineData && (
                          <div className="dose-recommendations">
                            <small>💡 Quick reference - {selectedMedicineData.medicine}:</small>
                            <div className="dose-ranges">
                              {selectedMedicineData.recommended_doses?.safe && selectedMedicineData.recommended_doses.safe.max !== null && (
                                <button
                                  type="button"
                                  className="dose-range-btn safe"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    dose_amount: selectedMedicineData.recommended_doses.safe.max?.toString() || '',
                                    dose_unit: selectedMedicineData.recommended_doses.safe.unit || prev.dose_unit
                                  }))}
                                  title={`Safe range: ${selectedMedicineData.recommended_doses.safe.min || 'N/A'}-${selectedMedicineData.recommended_doses.safe.max || 'N/A'} ${selectedMedicineData.recommended_doses.safe.unit}`}
                                >
                                  Safe: {selectedMedicineData.recommended_doses.safe.max || 'N/A'} {selectedMedicineData.recommended_doses.safe.unit}
                                </button>
                              )}
                              {selectedMedicineData.recommended_doses?.moderate && selectedMedicineData.recommended_doses.moderate.max !== null && (
                                <button
                                  type="button"
                                  className="dose-range-btn moderate"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    dose_amount: selectedMedicineData.recommended_doses.moderate.max?.toString() || '',
                                    dose_unit: selectedMedicineData.recommended_doses.moderate.unit || prev.dose_unit
                                  }))}
                                  title={`Moderate range: ${selectedMedicineData.recommended_doses.moderate.min || 'N/A'}-${selectedMedicineData.recommended_doses.moderate.max || 'N/A'} ${selectedMedicineData.recommended_doses.moderate.unit}`}
                                >
                                  Moderate: {selectedMedicineData.recommended_doses.moderate.max || 'N/A'} {selectedMedicineData.recommended_doses.moderate.unit}
                                </button>
                              )}
                              {selectedMedicineData.recommended_doses?.overdose && selectedMedicineData.recommended_doses.overdose.min !== null && (
                                <button
                                  type="button"
                                  className="dose-range-btn overdose"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    dose_amount: (selectedMedicineData.recommended_doses.overdose.min + 0.1)?.toString() || '',
                                    dose_unit: selectedMedicineData.recommended_doses.overdose.unit || prev.dose_unit
                                  }))}
                                  title={`Avoid doses above: ${selectedMedicineData.recommended_doses.overdose.min || 'N/A'} ${selectedMedicineData.recommended_doses.overdose.unit}`}
                                >
                                  Avoid: &gt;{selectedMedicineData.recommended_doses.overdose.min || 'N/A'} {selectedMedicineData.recommended_doses.overdose.unit}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        {getDoseSuggestions().length > 0 && (
                          <div className="dose-suggestions">
                            <small>💡 Quick select doses:</small>
                            <div className="suggestion-buttons">
                              {getDoseSuggestions().map((dose, index) => (
                                <button
                                  key={`dose-${index}`}
                                  type="button"
                                  className={`suggestion-btn ${dose.level}`}
                                  onClick={() => setFormData(prev => ({ 
                                    ...prev, 
                                    dose_amount: dose.value,
                                    dose_unit: dose.unit || prev.dose_unit
                                  }))}
                                  title={`${dose.level.charAt(0).toUpperCase() + dose.level.slice(1)} dose: ${dose.label}`}
                                >
                                  {dose.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Body Weight (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="body_weight_kg"
                          value={formData.body_weight_kg}
                          onChange={handleInputChange}
                          className="form-control"
                          placeholder="Enter measured body weight (kg)"
                        />
                        <small className="form-help">Enter body weight used for dosage calculations (optional but recommended)</small>
                      </div>

                      <div className="form-group">
                        <label>Dose Unit *</label>
                        <input
                          type="text"
                          value={formData.dose_unit}
                          readOnly
                          className="form-control"
                          placeholder="Auto-filled from medicine"
                        />
                        <small className="form-help">
                          💡 Dose unit is auto-filled from the selected medicine and cannot be changed
                        </small>
                        {getUnitSuggestions().length > 0 && (
                          <div className="dose-suggestions">
                            <small>💡 Quick select units:</small>
                            <div className="suggestion-buttons">
                              {getUnitSuggestions().map((unit, index) => (
                                <button
                                  key={`unit-${index}`}
                                  type="button"
                                  className={`suggestion-btn ${index === 0 ? 'recommended' : ''}`}
                                  onClick={() => setFormData(prev => ({ ...prev, dose_unit: unit.value }))}
                                  title={index === 0 ? 'Recommended unit' : 'Alternative unit'}
                                >
                                  {unit.label}
                                  {index === 0 ? ' ⭐' : ''}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Route of Administration *</label>
                        <select
                          name="route"
                          value={formData.route}
                          onChange={handleInputChange}
                          required
                          className="form-control"
                        >
                          <option value="">Select Route</option>
                          {getAllRouteOptions().map((route, index) => {
                            const isRecommended = selectedMedicineData?.ui?.route_default === route;
                            return (
                              <option key={`route-${index}`} value={route}>
                                {route === 'IM' ? 'Intramuscular (IM)' :
                                 route === 'IV' ? 'Intravenous (IV)' :
                                 route === 'SC' ? 'Subcutaneous (SC)' :
                                 route.charAt(0).toUpperCase() + route.slice(1)}
                                {isRecommended ? ' ⭐ Recommended' : ''}
                              </option>
                            );
                          })}
                        </select>
                        {getAllRouteOptions().length > 0 && (
                          <div className="dose-suggestions">
                            <small>💡 Quick select routes:</small>
                            <div className="suggestion-buttons">
                              {getAllRouteOptions().map((route, index) => {
                                const isRecommended = selectedMedicineData?.ui?.route_default === route;
                                return (
                                  <button
                                    key={`route-btn-${index}`}
                                    type="button"
                                    className={`suggestion-btn ${isRecommended ? 'recommended' : ''}`}
                                    onClick={() => setFormData(prev => ({ ...prev, route }))}
                                    title={isRecommended ? 'Recommended route' : 'Alternative route'}
                                  >
                                    {route === 'IM' ? 'Intramuscular (IM)' :
                                     route === 'IV' ? 'Intravenous (IV)' :
                                     route === 'SC' ? 'Subcutaneous (SC)' :
                                     route.charAt(0).toUpperCase() + route.slice(1)}
                                    {isRecommended ? ' ⭐' : ''}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-row two-cols">
                      <div className="form-group">
                        <label>Frequency (per day) *</label>
                        <div className="frequency-input-group">
                          <button
                            type="button"
                            className="adjust-btn"
                            onClick={() => {
                              const current = parseInt(formData.frequency_per_day) || 1;
                              if (current > 1) {
                                setFormData(prev => ({ ...prev, frequency_per_day: (current - 1).toString() }));
                              }
                            }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={formData.frequency_per_day}
                            onChange={(e) => setFormData(prev => ({ ...prev, frequency_per_day: e.target.value }))}
                            min="1"
                            max="5"
                            required
                            className="form-control"
                          />
                          <button
                            type="button"
                            className="adjust-btn"
                            onClick={() => {
                              const current = parseInt(formData.frequency_per_day) || 1;
                              setFormData(prev => ({ ...prev, frequency_per_day: (current + 1).toString() }));
                            }}
                          >
                            +
                          </button>
                        </div>
                        <small className="form-help">
                          💡 Use +/- buttons to adjust
                        </small>
                        {getFrequencySuggestions().length > 0 && (
                          <div className="frequency-suggestions">
                            <small>💡 Quick select frequencies:</small>
                            <div className="suggestion-buttons">
                              {getFrequencySuggestions().map((freq, index) => (
                                <button
                                  key={`freq-${index}`}
                                  type="button"
                                  className={`suggestion-btn ${index === 0 ? 'recommended' : ''}`}
                                  onClick={() => setFormData(prev => ({ ...prev, frequency_per_day: freq.value }))}
                                  title={index === 0 ? 'Recommended frequency' : 'Alternative frequency'}
                                >
                                  {freq.label}
                                  {index === 0 ? ' ⭐' : ''}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Duration (days) *</label>
                        <div className="duration-input-group">
                          <button
                            type="button"
                            className="adjust-btn"
                            onClick={() => {
                              const current = parseInt(formData.duration_days) || 1;
                              if (current > 1) {
                                setFormData(prev => ({ ...prev, duration_days: (current - 1).toString() }));
                              }
                            }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={formData.duration_days}
                            onChange={(e) => setFormData(prev => ({ ...prev, duration_days: e.target.value }))}
                            min="1"
                            required
                            className="form-control"
                          />
                          <button
                            type="button"
                            className="adjust-btn"
                            onClick={() => {
                              const current = parseInt(formData.duration_days) || 1;
                              setFormData(prev => ({ ...prev, duration_days: (current + 1).toString() }));
                            }}
                          >
                            +
                          </button>
                        </div>
                        <small className="form-help">
                          💡 Use +/- buttons to adjust
                        </small>
                        {getDurationSuggestions().length > 0 && (
                          <div className="duration-suggestions">
                            <small>💡 Quick select durations:</small>
                            <div className="suggestion-buttons">
                              {getDurationSuggestions().map((dur, index) => (
                                <button
                                  key={`dur-${index}`}
                                  type="button"
                                  className={`suggestion-btn ${index === 0 ? 'recommended' : ''}`}
                                  onClick={() => setFormData(prev => ({ ...prev, duration_days: dur.value }))}
                                  title={index === 0 ? 'Recommended duration' : 'Alternative duration'}
                                >
                                  {dur.label}
                                  {index === 0 ? ' ⭐' : ''}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Treatment Schedule */}
                  {formData.medication_type && (
                    <div className="form-section">
                      <h3>📅 Treatment Schedule</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Start Date *</label>
                          <input
                            type="date"
                            name="start_date"
                            value={formData.start_date}
                            onChange={handleInputChange}
                            required
                            className="form-control"
                          />
                        </div>

                        <div className="form-group">
                          <label>End Date</label>
                          <input
                            type="date"
                            name="end_date"
                            value={formData.end_date}
                            onChange={handleInputChange}
                            readOnly
                            className="form-control"
                          />
                          <small className="form-help">Auto-calculated from start date and duration</small>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Veterinary Information */}
                  {isVetRequired() && user?.role !== 'veterinarian' && (
                    <div className="form-section">
                      <h3>👨‍⚕️ Veterinary Information</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Vet ID *</label>
                          <input
                            type="text"
                            name="vet_id"
                            value={formData.vet_id}
                            onChange={handleInputChange}
                            required
                            className="form-control"
                            placeholder="Veterinarian ID"
                          />
                        </div>

                        <div className="form-group">
                          <label>Vet Name *</label>
                          <input
                            type="text"
                            name="vet_name"
                            value={formData.vet_name}
                            onChange={handleInputChange}
                            required
                            className="form-control"
                            placeholder="Veterinarian Name"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warning for Poultry */}
                  {formData.species && ['chicken', 'poultry'].includes(formData.species.toLowerCase()) && (formData.vet_id || formData.vet_name) && (
                    <div className="alert alert-warning">
                      <span className="alert-icon">⚠️</span>
                      Warning: Veterinary information should not be assigned to poultry treatments. Vet ID and Vet Name will be set to NULL.
                    </div>
                  )}

                  {/* Vaccine Information */}
                  {formData.is_vaccine && (
                    <div className="form-section">
                      <h3>💉 Vaccination Schedule</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Start Date *</label>
                          <input
                            type="date"
                            name="start_date"
                            value={formData.start_date}
                            onChange={handleInputChange}
                            required
                            className="form-control"
                          />
                        </div>

                        <div className="form-group">
                          <label>Vaccine Interval (days) *</label>
                          <input
                            type="number"
                            min="1"
                            name="vaccine_interval_days"
                            value={formData.vaccine_interval_days}
                            onChange={handleInputChange}
                            required
                            className="form-control"
                            placeholder="e.g., 30"
                          />
                        </div>

                        <div className="form-group">
                          <label>Total Vaccination Period (months) *</label>
                          <input
                            type="number"
                            min="1"
                            name="vaccine_total_months"
                            value={formData.vaccine_total_months}
                            onChange={handleInputChange}
                            required
                            className="form-control"
                            placeholder="e.g., 12"
                          />
                        </div>

                        <div className="form-group">
                          <label>Next Due Date</label>
                          <input
                            type="date"
                            name="next_due_date"
                            value={formData.next_due_date}
                            readOnly
                            className="form-control"
                          />
                        </div>

                        <div className="form-group">
                          <label>End Date</label>
                          <input
                            type="date"
                            name="end_date"
                            value={formData.end_date}
                            readOnly
                            className="form-control"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Clinical Information */}
                  {formData.medication_type && (
                    <div className="form-section">
                      <h3>🏥 Clinical Information</h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Reason</label>
                          <select
                            value={formData.reason}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === 'manual_entry') {
                                setShowManualReason(true);
                                setFormData(prev => ({ ...prev, reason: '' }));
                              } else {
                                setShowManualReason(false);
                                setManualReason('');
                                setFormData(prev => ({ ...prev, reason: value }));
                              }
                            }}
                            className="form-control"
                          >
                            <option value="">Select Reason</option>
                            {getAllReasonOptions().map((reason, index) => (
                              <option key={`reason-${index}`} value={reason}>
                                {reason}
                              </option>
                            ))}
                            <option value="manual_entry">➕ Enter manually</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Cause</label>
                          <select
                            value={formData.cause}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === 'manual_entry') {
                                setShowManualCause(true);
                                setFormData(prev => ({ ...prev, cause: '' }));
                              } else {
                                setShowManualCause(false);
                                setManualCause('');
                                setFormData(prev => ({ ...prev, cause: value }));
                              }
                            }}
                            className="form-control"
                          >
                            <option value="">Select Cause</option>
                            {getAllCauseOptions().map((cause, index) => (
                              <option key={`cause-${index}`} value={cause}>
                                {cause}
                              </option>
                            ))}
                            <option value="manual_entry">➕ Enter manually</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Reason Input */}
                  {showManualReason && (
                    <div className="manual-entry-section">
                      <div className="form-group">
                        <label>Enter Reason Manually</label>
                        <input
                          type="text"
                          value={manualReason}
                          onChange={(e) => {
                            setManualReason(e.target.value);
                            setFormData(prev => ({ ...prev, reason: e.target.value }));
                          }}
                          className="form-control"
                          placeholder="Type the reason here..."
                          autoFocus
                        />
                        <small className="form-help">
                          💡 Enter the complete reason as it should appear in records
                        </small>
                      </div>
                    </div>
                  )}

                  {/* Manual Cause Input */}
                  {showManualCause && (
                    <div className="manual-entry-section">
                      <div className="form-group">
                        <label>Enter Cause Manually</label>
                        <input
                          type="text"
                          value={manualCause}
                          onChange={(e) => {
                            setManualCause(e.target.value);
                            setFormData(prev => ({ ...prev, cause: e.target.value }));
                          }}
                          className="form-control"
                          placeholder="Type the cause here..."
                          autoFocus
                        />
                        <small className="form-help">
                          💡 Enter the complete cause as it should appear in records
                        </small>
                      </div>
                    </div>
                  )}

                  {/* Prescription Information */}
                  {user?.role === 'veterinarian' && (
                    <div className="form-section">
                      <h3>📋 Prescription Details</h3>
                      <div className="form-row">
                        <div className="form-group" style={{ flex: '1 1 100%' }}>
                          <label>Prescription Text *</label>
                          <textarea
                            name="prescription"
                            value={formData.prescription}
                            onChange={handleInputChange}
                            placeholder="Enter prescription instructions and drugs (e.g., Amoxicillin 250mg twice daily for 5 days)"
                            rows="4"
                            className="form-control"
                            style={{ fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Prescription Date</label>
                          <input
                            type="date"
                            name="prescription_date"
                            value={formData.prescription_date}
                            onChange={handleInputChange}
                            className="form-control"
                          />
                        </div>
                        <div className="form-group">
                          <label>Prescription Number</label>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input
                              type="text"
                              name="prescription_number"
                              value={formData.prescription_number}
                              onChange={handleInputChange}
                              placeholder="Auto-generated or manual"
                              className="form-control"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const year = new Date().getFullYear();
                                const vetId = formData.vet_id || 'VET';
                                setFormData(prev => ({
                                  ...prev,
                                  prescription_number: `PRESC-${vetId}-${year}`
                                }));
                              }}
                              className="btn-secondary"
                              style={{ whiteSpace: 'nowrap', padding: '10px 15px' }}
                              title="Auto-generate prescription number"
                            >
                              🔢 Generate
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MRL Information */}
                  {mrlData.length > 0 && (
                    <div className="mrl-section">
                      <h3>📊 MRL Compliance Information</h3>
                      <div className="mrl-grid">
                        {mrlData.map((mrl, idx) => (
                          <div key={`mrl-${mrl.species}-${mrl.matrix}-${idx}`} className="mrl-card">
                            <div className="mrl-header">
                              <span className="mrl-species">{mrl.species}</span>
                              <span className="mrl-matrix">{mrl.matrix}</span>
                            </div>
                            <div className="mrl-details">
                              <div className="mrl-item">
                                <span className="label">MRL Limit:</span>
                                <span className="value">{mrl.mrl_value_ppb} ppb</span>
                              </div>
                              <div className="mrl-item">
                                <span className="label">Withdrawal:</span>
                                <span className="value">{mrl.withdrawal_period_days} days</span>
                              </div>
                              {mrl.notes && (
                                <div className="mrl-item full-width">
                                  <span className="label">Notes:</span>
                                  <span className="value">{mrl.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="btn-primary"
                      disabled={!formData.entity_id || !formData.medication_type || !formData.medicine || !formData.dose_amount || !formData.dose_unit || !formData.route || !formData.frequency_per_day || !formData.duration_days || !formData.start_date}
                    >
                      <span className="btn-icon">💾</span>
                      Add Treatment Record
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        resetForm();
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
            </form>
          </div>
        )}

        {showRequestForm && (
          <div className="treatment-form-card">
            <div className="form-header">
              <h2>📋 {t('request_treatment_for')} {selectedEntity?.species}</h2>
              <div className="form-badges">
                {selectedEntity && (
                  <span className={`badge ${selectedEntity.entity_type}`}>
                    {selectedEntity.entity_type === 'animal' ? t('individual_animal') : t('batch')}
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleRequestSubmit} className="treatment-form">
              {/* Animal/Batch Selection */}
              <div className="form-section">
                <h3>🏷️ {t('selected_animal_batch')}</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('animal_batch_required')}</label>
                    <select
                      name="entity_id"
                      value={formData.entity_id}
                      onChange={(e) => handleEntitySelect(e.target.value)}
                      required
                      className="form-control"
                    >
                      <option value="">{t('select_animal_batch')}</option>
                      {entities.map(entity => (
                        <option key={entity.entity_id} value={entity.entity_id}>
                          {entity.entity_type === 'animal' ? entity.tag_id : entity.batch_name}
                          ({entity.species}) - {entity.farm_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedEntity && (
                  <div className="entity-summary-card">
                    <h4>{t('selected_entity_details')}</h4>
                    <div className="entity-details-grid">
                      <div className="detail-item">
                        <span className="label">{t('type')}:</span>
                        <span className="value">{selectedEntity.entity_type === 'animal' ? t('individual_animal') : t('batch')}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">{t('species')}:</span>
                        <span className="value">{selectedEntity.species}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">{t('farm')}:</span>
                        <span className="value">{selectedEntity.farm_name}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">{t('product')}:</span>
                        <span className="value">{selectedEntity.matrix}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Symptoms Description */}
              <div className="form-section">
                <h3>🏥 {t('symptoms_request_details')}</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('symptoms_description_required')}</label>
                    <textarea
                      name="symptoms"
                      value={requestFormData.symptoms}
                      onChange={(e) => setRequestFormData(prev => ({ ...prev, symptoms: e.target.value }))}
                      required
                      className="form-control"
                      placeholder={t('describe_symptoms_placeholder')}
                      rows="4"
                    />
                    <small className="form-help">
                      💡 {t('symptoms_help_text')}
                    </small>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={!formData.entity_id || !requestFormData.symptoms.trim()}
                >
                  <span className="btn-icon">📤</span>
                  {t('submit_treatment_request')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestForm(false);
                    setRequestFormData({ symptoms: '' });
                  }}
                  className="btn-secondary"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {!showAddForm && !showRequestForm && entity_id && (
          <div className="treatments-section">
            <div className="section-header">
              <h2>{t('treatment_history')}</h2>
              <div className="treatment-stats">
                <span className="stat-item">
                  <strong>{treatments.length}</strong> {t('total_treatments')}
                </span>
              </div>
            </div>

            {treatments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💊</div>
                <h3>{t('no_treatments_found')}</h3>
                <p>{t('no_treatments_yet')}</p>
                {!(user?.role === 'veterinarian' && !requestDetails) && (
                  <button 
                    onClick={() => {
                      if (selectedEntity && !['chicken', 'poultry'].includes(selectedEntity.species.toLowerCase())) {
                        setShowRequestForm(true);
                        setShowAddForm(false);
                      } else {
                        setShowAddForm(true);
                        setShowRequestForm(false);
                      }
                    }} 
                    className="btn-primary"
                  >
                    {selectedEntity && !['chicken', 'poultry'].includes(selectedEntity.species.toLowerCase()) 
                      ? 'Request First Treatment' 
                      : 'Add First Treatment'
                    }
                  </button>
                )}
              </div>
            ) : (
              <div className="treatments-grid">
                {treatments.map(treatment => {
                  const amu = amuRecords.find(a => a.treatment_id === treatment.treatment_id);
                  return (
                  <div key={treatment.treatment_id} className="treatment-card">
                    <div className="treatment-header">
                      <div className="treatment-title">
                        <h3>{treatment.species} - {treatment.entity_type === 'animal' ? (treatment.tag_id || 'No Tag') : (treatment.batch_name || 'No Batch')} - {treatment.medicine || treatment.active_ingredient} ({treatment.medication_type})</h3>
                        <div className="status-badges">
                          <span className={`status-badge ${new Date() > new Date(treatment.end_date) ? 'completed' : 'active'}`}>
                            {new Date() > new Date(treatment.end_date) ? 'Completed' : 'Active'}
                          </span>
                          <span className={`approval-badge ${treatment.status === 'approved' ? 'approved' : 'pending'}`}>
                            {treatment.status === 'approved' ? '✅ Approved' : '⏳ Pending'}
                          </span>
                        </div>
                        {treatment.is_vaccine && (
                          <span className="vaccine-badge">💉 Vaccine</span>
                        )}
                      </div>
                      <div className="treatment-meta">
                        <span className="treatment-date">
                          {formatDate(treatment.start_date)}
                        </span>
                      </div>
                    </div>

                    <div className="treatment-content">
                      <div className="treatment-details">
                        <div className="detail-row">
                          <span className="label">Category:</span>
                          <span className="value">{treatment.medication_type}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Dose:</span>
                          <span className="value">{treatment.dose_amount} {treatment.dose_unit}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Route:</span>
                          <span className="value">{treatment.route}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Frequency:</span>
                          <span className="value">{treatment.frequency_per_day}x per day</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Duration:</span>
                          <span className="value">{treatment.duration_days} days</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">End Date:</span>
                          <span className="value">
                            {formatDate(treatment.end_date)}
                          </span>
                        </div>
                        {treatment.vet_name && (
                          <div className="detail-row">
                            <span className="label">Veterinarian:</span>
                            <span className="value">{treatment.vet_name}</span>
                          </div>
                        )}
                        {treatment.reason && (
                          <div className="detail-row">
                            <span className="label">Reason:</span>
                            <span className="value">{treatment.reason}</span>
                          </div>
                        )}
                        {amu && (
                          <>
                            <div className="detail-row">
                              <span className="label">Predicted Residual Limit:</span>
                              <span className="value">{amu.predicted_mrl} µg/kg</span>
                            </div>
                            <div className="detail-row">
                              <span className="label">Predicted Withdrawal Days:</span>
                              <span className="value">{Math.max(0, amu.predicted_withdrawal_days || 0)} days</span>
                            </div>
                            <div className="detail-row">
                              <span className="label">Risk Category:</span>
                              <span className={`value risk-${amu.risk_category?.toLowerCase()}`}>
                                {amu.risk_category}
                              </span>
                            </div>
                            {amu.overdosage && (
                              <div className="detail-row">
                                <span className="label">Overdosage:</span>
                                <span className="value overdosage-alert">⚠️ OVERDOSAGE DETECTED</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Prescription Section */}
                      {treatment.prescription && (
                        <div className="prescription-section" style={{ 
                          backgroundColor: '#f0f8ff', 
                          border: '2px solid #4169e1',
                          borderRadius: '8px',
                          padding: '15px',
                          marginTop: '15px'
                        }}>
                          <h4 style={{ marginTop: 0, color: '#4169e1' }}>📋 Prescription Details</h4>
                          <div className="detail-row">
                            <span className="label">Prescription Number:</span>
                            <span className="value" style={{ fontWeight: 'bold', color: '#4169e1' }}>
                              {treatment.prescription_number || 'N/A'}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="label">Prescription Date:</span>
                            <span className="value">
                              {treatment.prescription_date ? formatDate(treatment.prescription_date) : 'N/A'}
                            </span>
                          </div>
                          <div className="detail-row" style={{ marginTop: '10px' }}>
                            <span className="label">Veterinarian License:</span>
                            <span className="value">
                              {treatment.vet_id || 'N/A'}
                            </span>
                          </div>
                          <div style={{ 
                            marginTop: '12px', 
                            padding: '10px', 
                            backgroundColor: 'white',
                            border: '1px solid #d0e0f0',
                            borderRadius: '5px',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontSize: '13px',
                            lineHeight: '1.5'
                          }}>
                            {treatment.prescription}
                          </div>
                          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                            ✓ This prescription is legally tied to this treatment record and cannot be modified
                          </div>
                          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                            <button
                              className="btn-primary"
                              onClick={() => downloadPrescription(treatment.treatment_id, treatment.prescription_number)}
                            >
                              Download Prescription PDF
                            </button>
                          </div>
                        </div>
                      )}

                      {treatment.is_vaccine && (
                        <div className="vaccination-section">
                          <h4>💉 Vaccination Schedule</h4>
                          <div className="vaccination-info">
                            <div className="vaccination-details-grid">
                              <div className="detail-item">
                                <span className="label">Interval:</span>
                                <span className="value">{treatment.vaccine_interval_days} days</span>
                              </div>
                              <div className="detail-item">
                                <span className="label">Total Period:</span>
                                <span className="value">{treatment.vaccine_total_months} months</span>
                              </div>
                              <div className="detail-item">
                                <span className="label">End Date:</span>
                                <span className="value">{treatment.vaccine_end_date ? formatDate(treatment.vaccine_end_date) : 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="vaccination-actions">
                            <button
                              onClick={() => markVaccinationGiven(treatment.treatment_id)}
                              className="btn-vaccine"
                              disabled={vaccinationHistory.length > 0 && new Date() < new Date(vaccinationHistory[0].next_due_date) || new Date() >= new Date(treatment.vaccine_end_date)}
                            >
                              {new Date() >= new Date(treatment.vaccine_end_date) ? 'Cycle Completed' : 
                               vaccinationHistory.length > 0 && new Date() < new Date(vaccinationHistory[0].next_due_date) ? 'Not Due Yet' :
                               'Mark Vaccination Given'}
                            </button>
                            <button
                              onClick={() => {
                                fetchVaccinationHistory(treatment.treatment_id);
                                setShowVaccinationSection(!showVaccinationSection);
                              }}
                              className="btn-secondary"
                            >
                              {showVaccinationSection ? 'Hide History' : 'View History'}
                            </button>
                          </div>

                          {showVaccinationSection && (
                            <div className="vaccination-history">
                              <h5>Vaccination History</h5>
                              {vaccinationHistory.length > 0 ? (
                                <div className="history-list">
                                  {vaccinationHistory.map((vacc, index) => {
                                    const today = new Date();
                                    const nextDue = new Date(vacc.next_due_date);
                                    const isOverdue = nextDue < today && new Date(vacc.vaccine_end_date) > today;
                                    const isDueToday = nextDue.toDateString() === today.toDateString();
                                    const isCompleted = new Date(vacc.vaccine_end_date) <= today;
                                    
                                    let status = 'active';
                                    if (isCompleted) status = 'completed';
                                    else if (isOverdue) status = 'overdue';
                                    else if (isDueToday) status = 'due-today';
                                    
                                    return (
                                      <div key={vacc.vacc_id} className={`history-item ${status}`}>
                                        <div className="history-header">
                                          <span className="dose-number">Dose {index + 1}</span>
                                          <span className={`status-indicator ${status}`}>
                                            {status === 'completed' && '✅ Completed'}
                                            {status === 'overdue' && '❌ Overdue'}
                                            {status === 'due-today' && '⚠️ Due Today'}
                                            {status === 'active' && '⏳ Active'}
                                          </span>
                                        </div>
                                        <div className="history-details">
                                          <div className="detail-row">
                                            <span className="label">Given Date:</span>
                                            <span className="value">{formatDate(vacc.given_date)}</span>
                                          </div>
                                          <div className="detail-row">
                                            <span className="label">Next Due:</span>
                                            <span className="value">{formatDate(vacc.next_due_date)}</span>
                                          </div>
                                          {!isCompleted && (
                                            <div className="detail-row">
                                              <span className="label">Days Remaining:</span>
                                              <span className="value">
                                                {Math.max(0, Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24)))} days
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="no-history">
                                  <p>No vaccination history available. The initial vaccination may still be in progress.</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!showAddForm && !entity_id && (
          <div className="entity-selection-section">
            <div className="selection-prompt">
              <div className="prompt-icon">🔍</div>
              <h2>Select an Animal or Batch</h2>
              <p>Choose an animal or batch to view and manage their treatment records.</p>
              <div className="entity-selector">
                <label>Select Entity:</label>
                <select
                  onChange={(e) => navigate(`/treatments/entity/${e.target.value}`)}
                  className="form-control"
                >
                  <option value="">-- Choose Entity --</option>
                  {entities.map(entity => (
                    <option key={entity.entity_id} value={entity.entity_id}>
                      {entity.entity_type === 'animal' ? entity.tag_id : entity.batch_name}
                      ({entity.species}) - {entity.farm_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TreatmentManagement;
