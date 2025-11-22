import sys
import json
import os
import numpy as np

# Try to load models, but provide fallbacks if they don't exist
try:
    import joblib
    import pandas as pd
    models_dir = os.path.join(os.path.dirname(__file__), 'ml_models')

    mrl_model_path = os.path.join(models_dir, 'mrl_regressor.joblib')
    withdrawal_model_path = os.path.join(models_dir, 'withdrawal_regressor.joblib')

    if os.path.exists(mrl_model_path):
        mrl_model = joblib.load(mrl_model_path)
        # Print feature names if available
        if hasattr(mrl_model, 'feature_names_in_'):
            print(f"MRL model feature names: {list(mrl_model.feature_names_in_)}", file=sys.stderr)
    else:
        mrl_model = None

    if os.path.exists(withdrawal_model_path):
        withdrawal_model = joblib.load(withdrawal_model_path)
        # Print feature names if available
        if hasattr(withdrawal_model, 'feature_names_in_'):
            print(f"Withdrawal model feature names: {list(withdrawal_model.feature_names_in_)}", file=sys.stderr)
    else:
        withdrawal_model = None

    models_loaded = True
except Exception as e:
    print(json.dumps({"error": f"Failed to load models: {str(e)}"}))
    models_loaded = False
    mrl_model = None
    withdrawal_model = None

print(f"Debug: models_loaded={models_loaded}", file=sys.stderr)

# Load thresholds JSON
thresholds_path = os.path.join(models_dir, 's.json')
try:
    with open(thresholds_path, 'r') as f:
        thresholds_data = json.load(f)
    thresholds_loaded = True
except Exception as e:
    print(json.dumps({"error": f"Failed to load thresholds: {str(e)}"}))
    thresholds_data = None
    thresholds_loaded = False

def get_thresholds(species, matrix, category, medicine):
    if not thresholds_loaded or not thresholds_data:
        return None, None, None
    
    data = thresholds_data.get('data', {})
    species = species.lower()
    
    # Validate matrix for species
    valid_matrices = {
        'cattle': ['milk', 'meat'],
        'goat': ['meat'],
        'sheep': ['meat'],
        'pig': ['meat'],
        'poultry': ['meat', 'eggs']
    }
    
    if species not in valid_matrices or matrix not in valid_matrices[species]:
        return None, None, None
    
    if species not in data:
        return None, None, None
    if category not in data[species]:
        return None, None, None
    if medicine not in data[species][category]:
        return None, None, None
    if matrix not in data[species][category][medicine]:
        return None, None, None
    
    thresholds = data[species][category][medicine][matrix].get('thresholds')
    if not thresholds:
        return None, None, None
    
    safe_max = thresholds.get('safe_max')
    borderline_max = thresholds.get('borderline_max')
    unsafe_above = thresholds.get('unsafe_above')
    
    return safe_max, borderline_max, unsafe_above

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
        if not models_loaded or not mrl_model:
            # Provide reasonable defaults based on medication type and species
            base_mrl = 50.0  # ppb
            base_withdrawal = 7  # days

            # Adjust based on medication type
            if medication_type == 'antibiotic':
                base_mrl *= 2
                base_withdrawal = 14
            elif medication_type == 'antiparasitic':
                base_mrl *= 1.5
                base_withdrawal = 10
            elif medication_type == 'anti-inflammatory':
                base_mrl *= 1.2
                base_withdrawal = 5
            elif medication_type == 'NSAID':
                base_mrl *= 1.3
                base_withdrawal = 6
            elif medication_type == 'vitamin':
                base_mrl = 0
                base_withdrawal = 0
            elif medication_type == 'vaccine':
                base_mrl = 0
                base_withdrawal = 0
            elif medication_type == 'hormonal':
                base_mrl *= 0.5
                base_withdrawal = 3
            else:
                base_mrl = 50.0
                base_withdrawal = 7

            # Adjust based on species
            if species == 'cattle':
                base_mrl *= 1.0
            elif species == 'pig':
                base_mrl *= 1.2
            elif species == 'poultry':
                base_mrl *= 0.8
            elif species == 'goat':
                base_mrl *= 1.0
            elif species == 'sheep':
                base_mrl *= 1.0

            # Adjust based on dose
            if dose_amount > 10:
                base_mrl *= 1.5
                base_withdrawal += 2
            elif dose_amount < 1:
                base_mrl *= 0.5
                base_withdrawal -= 1

            predicted_mrl = base_mrl
            predicted_withdrawal_days = base_withdrawal
        else:
            # Create feature vector (this should match your model's training features)
            # Note: In production, use proper label encoders fitted during training

            # Simple encoding for demo (replace with proper encoders)
            species_map = {'cattle': 0, 'goat': 1, 'sheep': 2, 'pig': 3, 'poultry': 4}
            med_type_map = {'antibiotic': 0, 'antiparasitic': 1, 'anti-inflammatory': 2, 'NSAID': 3, 'vitamin': 4, 'vaccine': 5, 'hormonal': 6, 'other': 7}
            route_map = {'IM': 0, 'IV': 1, 'SC': 2, 'oral': 3, 'water': 4, 'feed': 5}
            dose_unit_map = {'ml': 0, 'mg': 1, 'g': 2, 'litre': 3, 'kg': 4, 'tablet': 5, 'sachet': 6}
            matrix_map = {'milk': 0, 'meat': 1, 'egg': 2}
            cause_map = {'Unknown': 0, 'Infection': 1, 'Prevention': 2, 'Other': 3}
            reason_map = {'Treatment': 0, 'Prevention': 1, 'Other': 2}

            try:
                # Create feature dictionary matching the model's expected features
                feature_dict = {
                    'species': float(species_map.get(species, 0)),
                    'matrix': float(matrix_map.get(matrix, 0)),
                    'active_ingredient': 0.0,  # Placeholder, need proper encoding
                    'category_type': float(med_type_map.get(medication_type, 7)),
                    'cause': float(cause_map.get(cause, 0)),
                    'dose_amount': float(dose_amount),
                    'dose_unit': float(dose_unit_map.get(dose_unit, 1)),
                    'frequency_per_day': float(int(frequency_per_day)),
                    'duration_days': float(int(duration_days)),
                    'reason': float(reason_map.get(reason, 0))
                }
                
                features_df = pd.DataFrame([feature_dict])
                print(f"Features: {feature_dict}", file=sys.stderr)

                # Make predictions
                predicted_mrl = float(mrl_model.predict(features_df)[0])
                raw_withdrawal = withdrawal_model.predict(features_df)[0] if withdrawal_model else 7
                predicted_withdrawal_days = int(raw_withdrawal)
                
                print(f"Debug: predicted_mrl={predicted_mrl}, raw_withdrawal={raw_withdrawal}, predicted_withdrawal_days={predicted_withdrawal_days}", file=sys.stderr)
                
                # Override withdrawal days for vaccine and vitamin categories
                if medication_type in ['vaccine', 'vitamin']:
                    predicted_withdrawal_days = 0
            except Exception as e:
                print(f"Model prediction failed: {e}", file=sys.stderr)
                # Use fallback predictions
                base_mrl = 50.0  # ppb
                base_withdrawal = 7  # days

                # Adjust based on medication type
                if medication_type == 'antibiotic':
                    base_mrl *= 2
                    base_withdrawal = 14
                elif medication_type == 'antiparasitic':
                    base_mrl *= 1.5
                    base_withdrawal = 10
                elif medication_type == 'anti-inflammatory':
                    base_mrl *= 1.2
                    base_withdrawal = 5
                elif medication_type == 'NSAID':
                    base_mrl *= 1.3
                    base_withdrawal = 6
                elif medication_type == 'vitamin':
                    base_mrl = 0
                    base_withdrawal = 0
                elif medication_type == 'vaccine':
                    base_mrl = 0
                    base_withdrawal = 0
                elif medication_type == 'hormonal':
                    base_mrl *= 0.5
                    base_withdrawal = 3
                else:
                    base_mrl = 50.0
                    base_withdrawal = 7

                # Adjust based on species
                if species == 'cattle':
                    base_mrl *= 1.0
                elif species == 'pig':
                    base_mrl *= 1.2
                elif species == 'poultry':
                    base_mrl *= 0.8
                elif species == 'goat':
                    base_mrl *= 1.0
                elif species == 'sheep':
                    base_mrl *= 1.0

                # Adjust based on dose
                if dose_amount > 10:
                    base_mrl *= 1.5
                    base_withdrawal += 2
                elif dose_amount < 1:
                    base_mrl *= 0.5
                    base_withdrawal -= 1

                predicted_mrl = base_mrl
                predicted_withdrawal_days = base_withdrawal

        # Get thresholds
        safe_max, borderline_max, unsafe_above = get_thresholds(species, matrix, medication_type, medicine)

        # Determine risk category
        if safe_max is None:
            risk_category = 'not applicable'
        elif predicted_mrl <= safe_max:
            risk_category = 'safe'
        elif predicted_mrl <= borderline_max:
            risk_category = 'borderline'
        else:
            risk_category = 'unsafe'

        return {
            "predicted_mrl": max(0, predicted_mrl),  # Ensure non-negative
            "predicted_withdrawal_days": max(0, predicted_withdrawal_days),
            "predicted_mrl_risk": predicted_mrl / 100,  # Normalize
            "risk_category": risk_category,
            "safe_max": safe_max,
            "borderline_max": borderline_max,
            "unsafe_above": unsafe_above
        }

    except Exception as e:
        # Fallback predictions
        return {
            "predicted_mrl": 50.0,
            "predicted_withdrawal_days": 7,
            "predicted_mrl_risk": 0.5,
            "risk_category": "safe",
            "safe_max": None,
            "borderline_max": None,
            "unsafe_above": None,
            "error": f"Prediction failed: {str(e)}"
        }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(f"Input: {sys.argv[1]}", file=sys.stderr)
        try:
            input_data = json.loads(sys.argv[1])
            result = predict(input_data)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        print(json.dumps({"error": "No input data provided"}))