export const speciesBreeds = {
  "cow": [
    "Gir",
    "Sahiwal", 
    "Red Sindhi",
    "Tharparkar",
    "Rathi",
    "Holstein Friesian",
    "Jersey",
    "Crossbreed",
    "Hariana",
    "Kangayam",
    "Ongole",
    "Umblachery"
  ],
  "buffalo": [
    "Murrah",
    "Jaffarabadi",
    "Mehsana",
    "Surti",
    "Nili-Ravi",
    "Banni",
    "Bhadawari",
    "Nagpuri"
  ],
  "goat": [
    "Jamunapari",
    "Beetal",
    "Black Bengal",
    "Sirohi",
    "Barbari",
    "Osmanabadi",
    "Marwari",
    "Malabari",
    "Surti",
    "Zalawadi"
  ],
  "sheep": [
    "Nellore",
    "Marwari",
    "Deccani",
    "Madras Red",
    "Mandya",
    "Malpura",
    "Chokla",
    "Magra",
    "Patanwadi",
    "Sonadi"
  ],
  "chicken": [
    "Broiler",
    "Layer White",
    "Layer Brown",
    "Kadaknath",
    "Aseel",
    "Chittagong",
    "Gramapriya",
    "Vanaraja",
    "Srinidhi"
  ],
  "pig": [
    "Large White Yorkshire",
    "Landrace",
    "Hampshire",
    "Duroc",
    "Ghungroo",
    "Crossbreed"
  ],
  "camel": [
    "Bikaneri",
    "Jaisalmeri",
    "Kachchhi",
    "Mewari"
  ],
  "yak": [
    "Tibetan Yak",
    "Himalayan Yak",
    "Arunachali Yak"
  ]
};

export const getAllSpecies = () => Object.keys(speciesBreeds).sort();

export const getBreedsBySpecies = (species) => speciesBreeds[species?.toLowerCase()] || [];

export const matrixOptions = ["milk", "meat", "egg"];

export const routeOptions = [
  "Oral",
  "Injection",
  "Intramuscular (IM)",
  "Intravenous (IV)",
  "Subcutaneous",
  "Topical",
  "Water"
];
