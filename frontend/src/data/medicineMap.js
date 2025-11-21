// India-specific medicine mapping for Add Treatment form
const medicineMap = {
  cattle: {
    antibiotic: [
      "Oxytetracycline", "Enrofloxacin", "Ceftriaxone", "Ceftiofur",
      "Amoxicillin", "Amoxicillin + Clavulanic Acid",
      "Penicillin–Streptomycin", "Sulfonamides", "Gentamicin", "Tylosin"
    ],
    antiparasitic: [
      "Ivermectin", "Albendazole", "Fenbendazole", "Levamisole", "Closantel"
    ],
    "anti-inflammatory": [
      "Meloxicam", "Flunixin Meglumine", "Ketoprofen", "Diclofenac"
    ],
    NSAID: ["Meloxicam", "Flunixin Meglumine", "Ketoprofen"],
    vitamin: [
      "Vitamin B-Complex", "Calcium-Borogluconate", "Electrolytes ORS"
    ],
    vaccine: [
      "FMD Vaccine", "HS Vaccine", "BQ Vaccine",
      "Brucellosis Vaccine", "Theileria Vaccine"
    ],
    other: []
  },
  goat: {
    antibiotic: [
      "Oxytetracycline", "Penicillin–Streptomycin", "Amoxicillin",
      "Enrofloxacin", "Tylosin", "Sulfonamides"
    ],
    antiparasitic: ["Ivermectin", "Albendazole", "Levamisole"],
    "anti-inflammatory": ["Meloxicam", "Ketoprofen"],
    vitamin: ["Vitamin B-Complex", "ORS"],
    vaccine: ["PPR Vaccine", "FMD Vaccine"],
    other: []
  },
  sheep: {
    antibiotic: [
      "Tetracycline", "Penicillin–Streptomycin", "Enrofloxacin",
      "Amoxicillin", "Sulfonamides"
    ],
    antiparasitic: ["Ivermectin", "Albendazole", "Closantel"],
    vaccine: ["PPR Vaccine", "Enterotoxemia Vaccine"],
    other: []
  },
  pig: {
    antibiotic: [
      "Amoxicillin", "Colistin", "Tylosin", "Doxycycline",
      "Oxytetracycline", "Enrofloxacin", "Florfenicol"
    ],
    antiparasitic: ["Ivermectin", "Albendazole"],
    vaccine: ["Classical Swine Fever Vaccine", "FMD Vaccine"],
    other: []
  },
  poultry: {
    antibiotic: [
      "Doxycycline", "Enrofloxacin", "Tylosin", "Colistin",
      "Oxytetracycline", "Furazolidone"
    ],
    anticoccidial: [
      "Amprolium", "Toltrazuril", "Sulfaquinoxaline", "Decoquinate"
    ],
    antiparasitic: ["Ivermectin"],
    vaccine: [
      "ND Vaccine", "IB Vaccine", "IBD (Gumboro)", 
      "Marek’s Disease Vaccine", "Fowl Pox Vaccine", "Lasota"
    ],
    other: []
  }
};

export default medicineMap;
