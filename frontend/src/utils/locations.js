// Indian States and Districts for Laboratory Profile
export const indiaLocations = {
  "Andhra Pradesh": {
    "Anantapur": ["Anantapur", "Dharmavaram", "Gooty", "Hindupur", "Kadiri", "Tadpatri"],
    "Chittoor": ["Chittoor", "Madanapalle", "Nagari", "Palamaner", "Punganur", "Tirupati"],
    "East Godavari": ["Amalapuram", "Kakinada", "Rajahmundry", "Tuni"],
    "Guntur": ["Guntur", "Narasaraopet", "Tenali"],
    "Krishna": ["Machilipatnam", "Vijayawada"],
  },
  "Karnataka": {
    "Bangalore Urban": ["Bangalore North", "Bangalore South", "Bangalore East", "Bangalore West", "Bangalore Central"],
    "Belgaum": ["Belgaum", "Athani", "Chikodi", "Gokak", "Hukeri"],
    "Bellary": ["Bellary", "Hospet", "Sandur"],
    "Bidar": ["Bidar", "Basavakalyan", "Humnabad"],
    "Chikkaballapur": ["Chikkaballapur", "Gauribidanur", "Sidlaghatta"],
    "Dharwad": ["Dharwad", "Hubli", "Kalghatgi"],
    "Hassan": ["Hassan", "Alur", "Arsikere", "Belur"],
    "Kodagu": ["Madikeri", "Somvarpet", "Virajpet"],
    "Kolar": ["Kolar", "Bangarapet", "Malur"],
    "Mandya": ["Mandya", "Krishnarajpet", "Maddur"],
    "Mysore": ["Mysore", "Hunsur", "Nanjangud"],
    "Raichur": ["Raichur", "Lingsugur", "Manvi"],
    "Shimoga": ["Shimoga", "Bhadravati", "Sagar"],
    "Tumkur": ["Tumkur", "Tiptur", "Sira"],
    "Udupi": ["Udupi", "Karkala", "Kundapura"],
    "Uttara Kannada": ["Karwar", "Ankola", "Bhatkal"],
    "Vijayapura": ["Vijayapura", "Basavana Bagevadi", "Indi"],
  },
  "Maharashtra": {
    "Pune": ["Pune", "Bhor", "Baramati", "Indapur", "Velha"],
    "Mumbai": ["Mumbai North", "Mumbai South", "Mumbai East", "Mumbai West", "Mumbai Central"],
    "Ahmednagar": ["Ahmednagar", "Akola", "Jamkhed", "Kopargaon"],
    "Nagpur": ["Nagpur", "Kamptee", "Narkhed"],
    "Nashik": ["Nashik", "Igatpuri", "Malegaon"],
    "Aurangabad": ["Aurangabad", "Paithan", "Sambhajinagar"],
    "Jalna": ["Jalna", "Ambad", "Bhokardan"],
    "Satara": ["Satara", "Koregaon", "Wai"],
    "Sangli": ["Sangli", "Miraj", "Kupwad"],
    "Solapur": ["Solapur", "Akkalkot", "Barshi"],
    "Kolhapur": ["Kolhapur", "Gaganbavada", "Radhanagari"],
  },
  "Tamil Nadu": {
    "Chennai": ["Chennai Central", "Chennai North", "Chennai South", "Chennai East"],
    "Coimbatore": ["Coimbatore", "Pollachi", "Mettupalayam"],
    "Madurai": ["Madurai", "Melur", "Usilampatti"],
    "Salem": ["Salem", "Attur", "Edapadi"],
    "Tiruppur": ["Tiruppur", "Avinashi", "Mulanur"],
  },
  "Telangana": {
    "Hyderabad": ["Hyderabad North", "Hyderabad South", "Hyderabad East", "Hyderabad West"],
    "Rangareddy": ["Rangareddy", "Tandur", "Vikarabad"],
    "Medchal": ["Medchal", "Jinnaram"],
    "Telangana": ["Secunderabad", "Begumpet"],
  },
  "Rajasthan": {
    "Jaipur": ["Jaipur", "Dudu", "Chomu"],
    "Ajmer": ["Ajmer", "Kishangarh", "Beawar"],
    "Jodhpur": ["Jodhpur", "Bilara", "Osian"],
    "Udaipur": ["Udaipur", "Khimsar", "Vallabhnagar"],
    "Bikaner": ["Bikaner", "Lunarsar", "Nokha"],
  },
  "Uttar Pradesh": {
    "Lucknow": ["Lucknow", "Hardoi", "Barabanki"],
    "Kanpur": ["Kanpur", "Jajmau"],
    "Agra": ["Agra", "Fatehpur Sikri"],
    "Varanasi": ["Varanasi", "Ghazipur"],
    "Ghaziabad": ["Ghaziabad", "Loni"],
  },
  "Haryana": {
    "Faridabad": ["Faridabad", "Ballabgarh"],
    "Gurgaon": ["Gurgaon", "Manesar"],
    "Hisar": ["Hisar", "Barwala"],
    "Rohtak": ["Rohtak", "Maham"],
  },
  "Punjab": {
    "Mohali": ["Mohali", "Derabassi"],
    "Ludhiana": ["Ludhiana", "Khanna"],
    "Amritsar": ["Amritsar", "Majitha"],
    "Jalandhar": ["Jalandhar", "Phillaur"],
  },
  "Himachal Pradesh": {
    "Shimla": ["Shimla", "Rampur", "Chirgaon"],
    "Kangra": ["Kangra", "Palampur", "Baijnath"],
    "Solan": ["Solan", "Nalagarh"],
  },
  "Uttarakhand": {
    "Dehradun": ["Dehradun", "Vikasnagar"],
    "Haridwar": ["Haridwar", "Roorkee"],
    "Udham Singh Nagar": ["Udham Singh Nagar", "Khatima"],
  },
};

export const getStates = () => Object.keys(indiaLocations).sort();

export const getDistricts = (state) => {
  if (!state || !indiaLocations[state]) return [];
  return Object.keys(indiaLocations[state]).sort();
};

export const getTaluks = (state, district) => {
  if (!state || !district || !indiaLocations[state] || !indiaLocations[state][district]) return [];
  return indiaLocations[state][district].sort();
};
