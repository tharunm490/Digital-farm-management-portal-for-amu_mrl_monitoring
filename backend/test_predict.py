import json
from predict import predict

# Example 1: Cattle, Antibiotic
data1 = {
    "species": "cattle",
    "medication_type": "antibiotic",
    "medicine": "Amoxicillin",
    "route": "oral",
    "dose_amount": 10,
    "dose_unit": "mg",
    "frequency_per_day": 2,
    "duration_days": 5,
    "cause": "Infection",
    "reason": "Treatment",
    "matrix": "milk"
}

# Example 2: Pig, Antiparasitic
data2 = {
    "species": "pig",
    "medication_type": "antiparasitic",
    "medicine": "Ivermectin",
    "route": "oral",
    "dose_amount": 0.2,
    "dose_unit": "mg",
    "frequency_per_day": 1,
    "duration_days": 3,
    "cause": "Prevention",
    "reason": "Prevention",
    "matrix": "meat"
}

# Example 3: Poultry, Vitamin
data3 = {
    "species": "poultry",
    "medication_type": "vitamin",
    "medicine": "Vitamin A",
    "route": "water",
    "dose_amount": 1000,
    "dose_unit": "IU",
    "frequency_per_day": 1,
    "duration_days": 7,
    "cause": "Prevention",
    "reason": "Prevention",
    "matrix": "eggs"
}

print("Example 1:", json.dumps(predict(data1)))
print("Example 2:", json.dumps(predict(data2)))
print("Example 3:", json.dumps(predict(data3)))