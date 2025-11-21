import sys
import json
import os
import numpy as np

# Try to load models, but provide fallbacks if they don't exist
try:
    import joblib
    models_dir = os.path.join(os.path.dirname(__file__), 'ml_models')

    mrl_model_path = os.path.join(models_dir, 'mrl_model.pkl')
    withdrawal_model_path = os.path.join(models_dir, 'withdrawal_model.pkl')
    safety_model_path = os.path.join(models_dir, 'safety_model.pkl')

    if os.path.exists(mrl_model_path):
        mrl_model = joblib.load(mrl_model_path)
    else:
        mrl_model = None

    if os.path.exists(withdrawal_model_path):
        withdrawal_model = joblib.load(withdrawal_model_path)
    else:
        withdrawal_model = None

    if os.path.exists(safety_model_path):
        safety_model = joblib.load(safety_model_path)
    else:
        safety_model = None

    models_loaded = True
except Exception as e:
    print(json.dumps({"error": f"Failed to load models: {str(e)}"}))
    models_loaded = False
    mrl_model = None
    withdrawal_model = None
    safety_model = None

def predict(input_data):
    try:
        # Extract input features
        species = input_data.get('species', 'cattle')
        medication_type = input_data.get('medication_type', 'antibiotic')
        medicine = input_data.get('medicine', 'Unknown')
        route = input_data.get('route', 'oral')
        dose_amount = input_data.get('dose_amount', 1.0) or 1.0
        dose_unit = input_data.get('dose_unit', 'mg')
        frequency_per_day = input_data.get('frequency_per_day', 1) or 1
        duration_days = input_data.get('duration_days', 1) or 1
        cause = input_data.get('cause', 'Unknown')
        reason = input_data.get('reason', 'Treatment')
        matrix = input_data.get('matrix', 'milk')

        # Default predictions if models are not available
        if not models_loaded or not mrl_model or not withdrawal_model or not safety_model:
            # Provide reasonable defaults based on medication type and species
            base_mrl = 50.0  # ppb
            base_withdrawal = 7  # days

            # Adjust based on medication type
            if medication_type == 'antibiotic':
                base_mrl *= 2
                base_withdrawal = 14
            elif medication_type == 'vaccine':
                base_mrl = 0
                base_withdrawal = 0
            elif medication_type == 'vitamin':
                base_mrl = 0
                base_withdrawal = 0

            # Adjust based on species
            if species in ['pig', 'poultry']:
                base_withdrawal = max(1, base_withdrawal // 2)

            # Determine risk category
            if medication_type in ['vaccine', 'vitamin']:
                risk_category = 'safe'
            elif dose_amount > 10 or duration_days > 7:
                risk_category = 'unsafe'
            else:
                risk_category = 'borderline'

            predicted_mrl_risk = base_mrl / 100  # Normalize

            return {
                "predicted_mrl": base_mrl,
                "predicted_withdrawal_days": base_withdrawal,
                "predicted_mrl_risk": predicted_mrl_risk,
                "risk_category": risk_category
            }

        # If models are loaded, try to use them
        # Create feature vector (this should match your model's training features)
        # Note: In production, use proper label encoders fitted during training

        # Simple encoding for demo (replace with proper encoders)
        species_map = {'cattle': 0, 'goat': 1, 'sheep': 2, 'pig': 3, 'poultry': 4}
        med_type_map = {'antibiotic': 0, 'antiparasitic': 1, 'anti-inflammatory': 2, 'NSAID': 3, 'vitamin': 4, 'vaccine': 5, 'hormonal': 6, 'other': 7}
        route_map = {'IM': 0, 'IV': 1, 'SC': 2, 'oral': 3, 'water': 4, 'feed': 5}
        dose_unit_map = {'ml': 0, 'mg': 1, 'g': 2, 'litre': 3, 'kg': 4, 'tablet': 5, 'sachet': 6}
        matrix_map = {'milk': 0, 'meat': 1, 'egg': 2}

        features = np.array([
            species_map.get(species, 0),
            med_type_map.get(medication_type, 7),
            route_map.get(route, 3),
            dose_unit_map.get(dose_unit, 1),
            matrix_map.get(matrix, 0),
            float(dose_amount),
            int(frequency_per_day),
            int(duration_days)
        ]).reshape(1, -1)

        # Make predictions
        predicted_mrl = float(mrl_model.predict(features)[0]) if mrl_model else 50.0
        predicted_withdrawal_days = int(withdrawal_model.predict(features)[0]) if withdrawal_model else 7

        # For safety model
        if safety_model:
            safety_pred = safety_model.predict(features)[0]
            risk_categories = ['safe', 'borderline', 'unsafe']
            risk_category = risk_categories[min(int(safety_pred), 2)]
        else:
            risk_category = 'borderline'

        # Calculate risk score
        predicted_mrl_risk = predicted_mrl / 100  # Normalize

        return {
            "predicted_mrl": max(0, predicted_mrl),  # Ensure non-negative
            "predicted_withdrawal_days": max(0, predicted_withdrawal_days),
            "predicted_mrl_risk": min(1.0, max(0, predicted_mrl_risk)),  # 0-1 range
            "risk_category": risk_category
        }

    except Exception as e:
        # Fallback predictions
        return {
            "predicted_mrl": 50.0,
            "predicted_withdrawal_days": 7,
            "predicted_mrl_risk": 0.5,
            "risk_category": "borderline",
            "error": f"Prediction failed: {str(e)}"
        }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            result = predict(input_data)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        print(json.dumps({"error": "No input data provided"}))